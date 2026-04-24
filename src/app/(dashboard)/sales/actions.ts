"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/stock";
import { StockMovementType } from "@prisma/client";
import {
  salesmanSchema, createSoSchema, updateSoSchema, salesmanPaymentSchema, salesReturnSchema,
  type SalesmanFormValues, type CreateSoValues, type UpdateSoValues,
  type SalesmanPaymentValues, type SalesReturnValues,
} from "@/lib/validators/sales";

async function requireSalesAccess() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (!role || !["admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

async function generateSoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SO-${year}-`;
  const count = await prisma.salesOrder.count({
    where: { orderNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SR-${year}-`;
  const count = await prisma.salesReturn.count({
    where: { returnNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

/** Best-effort: increment (+1) or decrement (-1) soldQty in today's open daily log. */
async function syncDailyLogSoldQty(
  items: Array<{ productId: string; quantity: number }>,
  delta: 1 | -1,
): Promise<void> {
  try {
    const now      = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const openLog  = await prisma.dailyLog.findUnique({
      where:  { logDate: todayUTC },
      select: { id: true, status: true },
    });
    if (openLog?.status !== "OPEN") return;
    for (const item of items) {
      await prisma.dailyLogItem.updateMany({
        where: { dailyLogId: openLog.id, productId: item.productId },
        data:  delta === 1
          ? { soldQty: { increment: item.quantity } }
          : { soldQty: { decrement: item.quantity } },
      });
    }
  } catch {
    // Best-effort — never fail the caller
  }
}

// ─── Salesmen ─────────────────────────────────

export async function createSalesman(values: SalesmanFormValues) {
  await requireSalesAccess();
  const data = salesmanSchema.parse(values);
  await prisma.salesman.create({
    data: {
      name:          data.name,
      email:         data.email || null,
      phone:         data.phone || null,
      address:       data.address || null,
      citizenshipNo: data.citizenshipNo || null,
      openingBalance: data.openingBalance ?? 0,
      commissionPct:  data.commissionPct ?? 0,
    },
  });
  revalidatePath("/sales/salesmen");
}

export async function updateSalesman(id: string, values: SalesmanFormValues) {
  await requireSalesAccess();
  const data = salesmanSchema.parse(values);
  await prisma.salesman.update({
    where: { id },
    data: {
      name:          data.name,
      email:         data.email || null,
      phone:         data.phone || null,
      address:       data.address || null,
      citizenshipNo: data.citizenshipNo || null,
      openingBalance: data.openingBalance ?? 0,
      commissionPct:  data.commissionPct ?? 0,
    },
  });
  revalidatePath("/sales/salesmen");
}

export async function deleteSalesman(id: string) {
  await requireSalesAccess();
  await prisma.salesman.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/sales/salesmen");
}

// ─── Sales Orders ─────────────────────────────

export async function createSalesOrder(values: CreateSoValues) {
  const userId = await requireSalesAccess();
  const data = createSoSchema.parse(values);

  // Snapshot the customer's commission rate
  const customer = await prisma.salesman.findUnique({
    where: { id: data.customerId },
    select: { commissionPct: true },
  });
  const commissionPct = Number(customer?.commissionPct ?? 0);
  const orderNumber   = await generateSoNumber();
  const subtotal      = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  // Check stock availability before touching anything
  for (const item of data.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { name: true, currentStock: true },
    });
    if (!product) throw new Error("Product not found");
    if (Number(product.currentStock) < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${Number(product.currentStock).toLocaleString(undefined, { maximumFractionDigits: 3 })}, needed: ${item.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}`
      );
    }
  }

  // Factor in any immediate waste returns
  const validReturnItems = (data.returnItems ?? []).filter(
    (i) => i.productId && i.quantity > 0 && i.unitPrice >= 0
  );
  const hasReturn   = validReturnItems.length > 0;
  const returnTotal = hasReturn
    ? validReturnItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
    : 0;

  // Factor in any immediate fresh returns (also reduce net, but get restocked)
  const validFreshItems = (data.freshReturnItems ?? []).filter(
    (i) => i.productId && i.quantity > 0 && i.unitPrice >= 0
  );
  const hasFreshReturn   = validFreshItems.length > 0;
  const freshReturnTotal = hasFreshReturn
    ? validFreshItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
    : 0;

  const netAmount        = subtotal - returnTotal - freshReturnTotal;
  const commissionAmount = Math.round(netAmount * commissionPct) / 100;
  const factoryAmount    = netAmount - commissionAmount;

  const returnNumber      = hasReturn ? await generateReturnNumber() : null;
  const freshReturnNumber = hasFreshReturn ? await generateReturnNumber() : null;

  const paidNow = Math.min(data.amountPaid, factoryAmount);
  const status  = paidNow >= factoryAmount - 0.001 ? "PAID"
                : paidNow > 0                       ? "PARTIALLY_PAID"
                :                                     "CONFIRMED";

  await prisma.$transaction(async (tx) => {
    const so = await tx.salesOrder.create({
      data: {
        orderNumber,
        customerId:      data.customerId,
        dueDate:         data.dueDate ? new Date(data.dueDate) : null,
        notes:           data.notes || null,
        subtotal,
        taxAmount:       0,
        totalAmount:     subtotal,
        commissionPct,
        commissionAmount,
        factoryAmount,
        amountPaid:      paidNow,
        status,
        createdBy:       userId,
        items: {
          create: data.items.map((item) => ({
            productId:  item.productId,
            quantity:   item.quantity,
            unitPrice:  item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
    });

    // Record payment only if something was paid
    if (paidNow > 0) {
      await tx.salesmanPayment.create({
        data: {
          salesOrderId: so.id,
          customerId:   data.customerId,
          amount:       paidNow,
          method:       "CASH",
          notes:        paidNow >= factoryAmount - 0.001 ? "Payment on delivery" : "Partial payment on delivery",
          createdBy:    userId,
        },
      });
    }

    // Deduct stock immediately
    for (const item of data.items) {
      await applyStockMovement(
        {
          productId:     item.productId,
          type:          StockMovementType.SALE,
          quantity:      item.quantity,
          unitCost:      item.unitPrice,
          notes:         `Sale via ${orderNumber}`,
          referenceId:   so.id,
          referenceType: "SalesOrder",
          createdBy:     userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }

    if (hasReturn && returnNumber) {
      await tx.salesReturn.create({
        data: {
          returnNumber,
          salesOrderId: so.id,
          returnType:   "WASTE",
          notes:        data.returnNotes || null,
          totalAmount:  returnTotal,
          createdBy:    userId,
          items: {
            create: validReturnItems.map((item) => ({
              productId: item.productId,
              quantity:  item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      });
    }

    if (hasFreshReturn && freshReturnNumber) {
      await tx.salesReturn.create({
        data: {
          returnNumber: freshReturnNumber,
          salesOrderId: so.id,
          returnType:   "FRESH",
          notes:        data.freshReturnNotes || null,
          totalAmount:  freshReturnTotal,
          createdBy:    userId,
          items: {
            create: validFreshItems.map((item) => ({
              productId: item.productId,
              quantity:  item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      });

      // Restock fresh return items
      for (const item of validFreshItems) {
        await applyStockMovement(
          {
            productId:     item.productId,
            type:          StockMovementType.RETURN_IN,
            quantity:      item.quantity,
            unitCost:      item.unitPrice,
            notes:         `Fresh return via ${orderNumber}`,
            referenceId:   so.id,
            referenceType: "SalesReturn",
            createdBy:     userId,
          },
          tx as Parameters<typeof applyStockMovement>[1]
        );
      }
    }
  }, { timeout: 30000 });

  await syncDailyLogSoldQty(data.items, 1);

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/daily-log");
}

export async function confirmSalesOrder(id: string) {
  const userId = await requireSalesAccess();

  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status !== "DRAFT") throw new Error("Only draft orders can be confirmed");

  // Check sufficient stock for all items before touching anything
  for (const item of so.items) {
    const available = Number(item.product.currentStock);
    const needed    = Number(item.quantity);
    if (available < needed) {
      throw new Error(
        `Insufficient stock for "${item.product.name}". Available: ${available.toLocaleString(undefined, { maximumFractionDigits: 3 })}, needed: ${needed.toLocaleString(undefined, { maximumFractionDigits: 3 })}`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of so.items) {
      await applyStockMovement(
        {
          productId:     item.productId,
          type:          StockMovementType.SALE,
          quantity:      Number(item.quantity),
          unitCost:      Number(item.unitPrice),
          notes:         `Sale via ${so.orderNumber}`,
          referenceId:   id,
          referenceType: "SalesOrder",
          createdBy:     userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }

    await tx.salesOrder.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });
  }, { timeout: 30000 });

  await syncDailyLogSoldQty(
    so.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
    1,
  );

  revalidatePath(`/sales/${id}`);
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/daily-log");
}

export async function updateSalesOrder(id: string, values: UpdateSoValues) {
  const userId = await requireSalesAccess();
  const data = updateSoSchema.parse(values);

  const so = await prisma.salesOrder.findUnique({
    where: { id, deletedAt: null },
    include: {
      items:   true,
      returns: { select: { totalAmount: true } },
    },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status === "CANCELLED") throw new Error("Cannot edit a cancelled order");

  const subtotal             = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const existingReturnTotal  = so.returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const netAmount            = subtotal - existingReturnTotal;
  const commissionPct        = Number(so.commissionPct);
  const commissionAmount     = Math.round(netAmount * commissionPct) / 100;
  const factoryAmount        = netAmount - commissionAmount;
  const amountPaid           = Number(so.amountPaid);
  const newStatus            = so.status === "DRAFT"        ? "DRAFT"
                             : amountPaid >= factoryAmount - 0.001 ? "PAID"
                             : amountPaid > 0               ? "PARTIALLY_PAID"
                             :                                "CONFIRMED";

  const needsStock = so.status !== "DRAFT";

  await prisma.$transaction(async (tx) => {
    if (needsStock) {
      // Restore old stock
      for (const item of so.items) {
        await applyStockMovement(
          {
            productId:     item.productId,
            type:          StockMovementType.ADJUSTMENT_IN,
            quantity:      Number(item.quantity),
            notes:         `Edit reversal: ${so.orderNumber}`,
            referenceId:   id,
            referenceType: "SalesOrder",
            createdBy:     userId,
          },
          tx as Parameters<typeof applyStockMovement>[1]
        );
      }

      // Validate new stock (stock is now restored from reversals above)
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where:  { id: item.productId },
          select: { name: true, currentStock: true },
        });
        if (!product) throw new Error("Product not found");
        if (Number(product.currentStock) < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${Number(product.currentStock).toLocaleString(undefined, { maximumFractionDigits: 3 })}, needed: ${item.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}`
          );
        }
      }
    }

    // Replace items
    await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

    await tx.salesOrder.update({
      where: { id },
      data: {
        dueDate:          data.dueDate ? new Date(data.dueDate) : null,
        notes:            data.notes || null,
        subtotal,
        totalAmount:      subtotal,
        commissionAmount,
        factoryAmount,
        status:           newStatus,
        items: {
          create: data.items.map((item) => ({
            productId:  item.productId,
            quantity:   item.quantity,
            unitPrice:  item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
    });

    if (needsStock) {
      for (const item of data.items) {
        await applyStockMovement(
          {
            productId:     item.productId,
            type:          StockMovementType.SALE,
            quantity:      item.quantity,
            unitCost:      item.unitPrice,
            notes:         `Sale via ${so.orderNumber} (edited)`,
            referenceId:   id,
            referenceType: "SalesOrder",
            createdBy:     userId,
          },
          tx as Parameters<typeof applyStockMovement>[1]
        );
      }
    }
  }, { timeout: 30000 });

  if (needsStock) {
    await syncDailyLogSoldQty(
      so.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      -1,
    );
    await syncDailyLogSoldQty(data.items, 1);
  }

  revalidatePath(`/sales/${id}`);
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/daily-log");
}

export async function cancelSalesOrder(id: string) {
  await requireSalesAccess();

  const so = await prisma.salesOrder.findUnique({
    where: { id },
    select: { status: true, items: { select: { productId: true, quantity: true } } },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status === "PAID") throw new Error("Cannot cancel a fully paid order");
  if (so.status === "CANCELLED") throw new Error("Order is already cancelled");

  const wasConfirmed = ["CONFIRMED", "PARTIALLY_PAID"].includes(so.status);

  await prisma.salesOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  if (wasConfirmed) {
    await syncDailyLogSoldQty(
      so.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      -1,
    );
  }

  revalidatePath(`/sales/${id}`);
  revalidatePath("/sales");
  revalidatePath("/daily-log");
}

export async function deleteSalesOrder(id: string) {
  const userId = await requireSalesAccess();

  const so = await prisma.salesOrder.findUnique({
    where: { id },
    select: {
      status:      true,
      orderNumber: true,
      items:       { select: { productId: true, quantity: true } },
    },
  });
  if (!so) throw new Error("Sales order not found");

  // For confirmed/paid orders, reverse stock movements
  const needsReversal = !["DRAFT", "CANCELLED"].includes(so.status);

  await prisma.$transaction(async (tx) => {
    if (needsReversal) {
      for (const item of so.items) {
        await applyStockMovement(
          {
            productId:     item.productId,
            type:          StockMovementType.ADJUSTMENT_IN,
            quantity:      Number(item.quantity),
            notes:         `Sale deleted: ${so.orderNumber}`,
            referenceId:   id,
            referenceType: "SalesOrder",
            createdBy:     userId,
          },
          tx as Parameters<typeof applyStockMovement>[1]
        );
      }
    }

    await tx.salesOrder.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });
  }, { timeout: 30000 });

  if (needsReversal) {
    await syncDailyLogSoldQty(
      so.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      -1,
    );
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/daily-log");
}

// ─── Salesman Payments ────────────────────────

export async function recordSalesmanPayment(soId: string, values: SalesmanPaymentValues) {
  const userId = await requireSalesAccess();
  const data = salesmanPaymentSchema.parse(values);

  if (data.amount === 0) return; // caller chose "no payment"

  const so = await prisma.salesOrder.findUnique({
    where: { id: soId },
    select: { customerId: true, factoryAmount: true, amountPaid: true, status: true },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status === "DRAFT") throw new Error("Confirm the order before recording a payment");
  if (so.status === "CANCELLED") throw new Error("Cannot record payment for a cancelled order");

  // Validate against the salesman's TOTAL outstanding (not just this order), so they can
  // pay more than this order's balance to reduce previous debt.
  const salesman = await prisma.salesman.findUnique({
    where: { id: so.customerId },
    select: {
      openingBalance: true,
      salesOrders: {
        where: { deletedAt: null, status: { notIn: ["CANCELLED", "DRAFT"] } },
        select: { factoryAmount: true, amountPaid: true },
      },
    },
  });
  const salesmanTotalOutstanding =
    Number(salesman?.openingBalance ?? 0) +
    (salesman?.salesOrders ?? []).reduce(
      (sum, o) => sum + Number(o.factoryAmount) - Number(o.amountPaid),
      0
    );

  if (data.amount > salesmanTotalOutstanding + 0.001) {
    throw new Error(
      `Payment of Rs ${data.amount.toFixed(2)} exceeds the total outstanding balance of Rs ${salesmanTotalOutstanding.toFixed(2)}`
    );
  }

  const factoryDue = Number(so.factoryAmount);
  const newPaid    = Number(so.amountPaid) + data.amount;
  const newStatus  = newPaid >= factoryDue - 0.001 ? "PAID" : "PARTIALLY_PAID";

  await prisma.$transaction(async (tx) => {
    await tx.salesmanPayment.create({
      data: {
        salesOrderId: soId,
        customerId:   so.customerId,
        amount:       data.amount,
        method:       data.method,
        reference:    data.reference || null,
        notes:        data.notes || null,
        createdBy:    userId,
      },
    });

    await tx.salesOrder.update({
      where: { id: soId },
      data: {
        amountPaid: { increment: data.amount },
        status:     newStatus,
      },
    });
  });

  revalidatePath(`/sales/${soId}`);
  revalidatePath("/sales");
}

// ─── Sales Returns ────────────────────────────

export async function processSalesReturn(soId: string, values: SalesReturnValues) {
  const userId = await requireSalesAccess();
  const data = salesReturnSchema.parse(values);

  const so = await prisma.salesOrder.findUnique({
    where: { id: soId },
    select: { status: true, orderNumber: true, totalAmount: true, commissionPct: true, returns: { select: { totalAmount: true } } },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status === "DRAFT" || so.status === "CANCELLED") {
    throw new Error("Cannot process a return for a draft or cancelled order");
  }

  const returnNumber  = await generateReturnNumber();
  const returnTotal   = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  // Recalculate commission/factory amounts after this waste return
  const prevWaste        = so.returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const netAmount        = Number(so.totalAmount) - prevWaste - returnTotal;
  const commissionPct    = Number(so.commissionPct);
  const commissionAmount = Math.round(netAmount * commissionPct) / 100;
  const factoryAmount    = netAmount - commissionAmount;

  await prisma.$transaction(async (tx) => {
    await tx.salesReturn.create({
      data: {
        returnNumber,
        salesOrderId: soId,
        notes:        data.notes || null,
        returnType:   data.returnType,
        totalAmount:  returnTotal,
        createdBy:    userId,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity:  item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });

    // Update commission/factory amounts on the order
    await tx.salesOrder.update({
      where: { id: soId },
      data: { commissionAmount, factoryAmount },
    });

    // Fresh returns: restock the items back into inventory
    if (data.returnType === "FRESH") {
      for (const item of data.items) {
        await applyStockMovement(
          {
            productId:     item.productId,
            type:          StockMovementType.RETURN_IN,
            quantity:      item.quantity,
            unitCost:      item.unitPrice,
            notes:         `Fresh return via ${so.orderNumber}`,
            referenceId:   soId,
            referenceType: "SalesReturn",
            createdBy:     userId,
          },
          tx as Parameters<typeof applyStockMovement>[1]
        );
      }
    }
  });

  revalidatePath(`/sales/${soId}`);
  revalidatePath("/sales");
  revalidatePath("/inventory");
}
