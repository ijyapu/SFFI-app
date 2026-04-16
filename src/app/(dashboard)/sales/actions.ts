"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/stock";
import { StockMovementType } from "@prisma/client";
import {
  salesmanSchema, createSoSchema, salesmanPaymentSchema, salesReturnSchema,
  type SalesmanFormValues, type CreateSoValues,
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
      commissionPct:  data.commissionPct ?? 25,
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
      commissionPct:  data.commissionPct ?? 25,
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

  // Snapshot the customer's commission rate at dispatch time
  const customer = await prisma.salesman.findUnique({
    where: { id: data.customerId },
    select: { commissionPct: true },
  });
  const commissionPct    = Number(customer?.commissionPct ?? 25);
  const orderNumber      = await generateSoNumber();
  const subtotal         = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const commissionAmount = Math.round(subtotal * commissionPct) / 100;
  const factoryAmount    = subtotal - commissionAmount;

  await prisma.salesOrder.create({
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

  revalidatePath("/sales");
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
  });

  revalidatePath(`/sales/${id}`);
  revalidatePath("/sales");
  revalidatePath("/inventory");
}

export async function cancelSalesOrder(id: string) {
  await requireSalesAccess();

  const so = await prisma.salesOrder.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status === "PAID") throw new Error("Cannot cancel a fully paid order");
  if (so.status === "CANCELLED") throw new Error("Order is already cancelled");

  await prisma.salesOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/sales/${id}`);
  revalidatePath("/sales");
}

export async function deleteSalesOrder(id: string) {
  await requireSalesAccess();

  const so = await prisma.salesOrder.findUnique({
    where: { id },
    select: { status: true, amountPaid: true },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status !== "DRAFT" && so.status !== "CANCELLED") {
    throw new Error("Only draft or cancelled orders can be deleted");
  }
  if (Number(so.amountPaid) > 0) {
    throw new Error("Cannot delete an order with recorded payments");
  }

  await prisma.salesOrder.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/sales");
}

// ─── Salesman Payments ────────────────────────

export async function recordSalesmanPayment(soId: string, values: SalesmanPaymentValues) {
  const userId = await requireSalesAccess();
  const data = salesmanPaymentSchema.parse(values);

  const so = await prisma.salesOrder.findUnique({
    where: { id: soId },
    select: { customerId: true, factoryAmount: true, amountPaid: true, status: true },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status === "DRAFT") throw new Error("Confirm the order before recording a payment");
  if (so.status === "CANCELLED") throw new Error("Cannot record payment for a cancelled order");

  const factoryDue  = Number(so.factoryAmount);
  const outstanding = factoryDue - Number(so.amountPaid);
  if (data.amount > outstanding + 0.001) {
    throw new Error(
      `Payment of Rs ${data.amount.toFixed(2)} exceeds the factory outstanding balance of Rs ${outstanding.toFixed(2)}`
    );
  }

  const newPaid   = Number(so.amountPaid) + data.amount;
  const newStatus = newPaid >= factoryDue - 0.001 ? "PAID" : "PARTIALLY_PAID";

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
    // Waste returns are not restocked — goods are expired/damaged
  });

  revalidatePath(`/sales/${soId}`);
  revalidatePath("/sales");
  revalidatePath("/inventory");
}
