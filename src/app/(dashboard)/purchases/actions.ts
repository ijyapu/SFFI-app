"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/stock";
import { StockMovementType } from "@prisma/client";
import {
  supplierSchema, createPoSchema, receiveGoodsSchema, paymentSchema,
  createPurchaseSchema, newSupplierSchema, newProductSchema,
  type SupplierFormValues, type CreatePoValues,
  type ReceiveGoodsValues, type PaymentFormValues,
  type CreatePurchaseValues, type NewProductValues,
} from "@/lib/validators/purchase";

async function requirePurchasesAccess() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (!role || !["admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return userId;
}

async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const count = await prisma.purchaseOrder.count({
    where: { orderNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

// ─── Suppliers ────────────────────────────────

export async function createSupplier(values: SupplierFormValues) {
  await requirePurchasesAccess();
  const data = supplierSchema.parse(values);
  await prisma.supplier.create({
    data: {
      name:        data.name,
      contactName: data.contactName || null,
      email:       data.email || null,
      phone:       data.phone || null,
      address:     data.address || null,
      pan:         data.pan || null,
    },
  });
  revalidatePath("/purchases/suppliers");
}

export async function updateSupplier(id: string, values: SupplierFormValues) {
  await requirePurchasesAccess();
  const data = supplierSchema.parse(values);
  await prisma.supplier.update({
    where: { id },
    data: {
      name:        data.name,
      contactName: data.contactName || null,
      email:       data.email || null,
      phone:       data.phone || null,
      address:     data.address || null,
      pan:         data.pan || null,
    },
  });
  revalidatePath("/purchases/suppliers");
  revalidatePath("/purchases");
}

export async function deleteSupplier(id: string) {
  await requirePurchasesAccess();
  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/purchases/suppliers");
}

// ─── Purchase Orders ──────────────────────────

export async function createPurchaseOrder(values: CreatePoValues) {
  const userId = await requirePurchasesAccess();
  const data = createPoSchema.parse(values);

  const orderNumber = await generatePoNumber();

  const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      supplierId:   data.supplierId,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      notes:        data.notes || null,
      subtotal,
      taxAmount:    0,
      totalAmount:  subtotal,
      createdBy:    userId,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity:  item.quantity,
          unitCost:  item.unitCost,
          totalCost: item.quantity * item.unitCost,
        })),
      },
    },
  });

  revalidatePath("/purchases");
}

export async function confirmPurchaseOrder(id: string) {
  await requirePurchasesAccess();

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "DRAFT") throw new Error("Only draft orders can be confirmed");

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "CONFIRMED" },
  });

  revalidatePath(`/purchases/${id}`);
  revalidatePath("/purchases");
}

export async function cancelPurchaseOrder(id: string) {
  await requirePurchasesAccess();

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!po) throw new Error("Purchase order not found");
  if (po.status === "RECEIVED") throw new Error("Cannot cancel a fully received order");
  if (po.status === "CANCELLED") throw new Error("Order is already cancelled");

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/purchases/${id}`);
  revalidatePath("/purchases");
}

export async function deletePurchaseOrder(id: string) {
  await requirePurchasesAccess();

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { status: true, amountPaid: true },
  });
  if (!po) throw new Error("Purchase order not found");
  if (po.status === "RECEIVED") throw new Error("Cannot delete a received order");
  if (Number(po.amountPaid) > 0) throw new Error("Cannot delete an order with recorded payments");

  await prisma.purchaseOrder.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/purchases");
}

// ─── Receive Goods ────────────────────────────

export async function receiveGoods(poId: string, values: ReceiveGoodsValues) {
  const userId = await requirePurchasesAccess();
  const data = receiveGoodsSchema.parse(values);

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: { include: { product: true } } },
  });
  if (!po) throw new Error("Purchase order not found");
  if (po.status === "DRAFT") throw new Error("Confirm the order before receiving goods");
  if (po.status === "CANCELLED") throw new Error("Cannot receive goods for a cancelled order");
  if (po.status === "RECEIVED") throw new Error("All goods have already been received");

  // Filter to items with actual qty to receive
  const toReceive = data.items.filter((i) => i.receiveQty > 0);
  if (toReceive.length === 0) throw new Error("Enter at least one quantity to receive");

  await prisma.$transaction(async (tx) => {
    for (const entry of toReceive) {
      const poItem = po.items.find((i) => i.id === entry.itemId);
      if (!poItem) continue;

      const remaining = Number(poItem.quantity) - Number(poItem.receivedQty);
      if (entry.receiveQty > remaining) {
        throw new Error(
          `Cannot receive more than ordered for "${poItem.product.name}". ` +
          `Remaining: ${remaining}`
        );
      }

      // Apply stock movement
      await applyStockMovement(
        {
          productId:     poItem.productId,
          type:          StockMovementType.PURCHASE,
          quantity:      entry.receiveQty,
          unitCost:      Number(poItem.unitCost),
          notes:         data.notes || `Received via ${po.orderNumber}`,
          referenceId:   poId,
          referenceType: "PurchaseOrder",
          createdBy:     userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );

      // Update received qty on the item
      await tx.purchaseOrderItem.update({
        where: { id: entry.itemId },
        data: {
          receivedQty: {
            increment: entry.receiveQty,
          },
        },
      });
    }

    // Recompute PO status based on updated received quantities
    const updatedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: poId },
    });

    const allReceived = updatedItems.every(
      (i) => Number(i.receivedQty) >= Number(i.quantity)
    );
    const anyReceived = updatedItems.some((i) => Number(i.receivedQty) > 0);

    const newStatus = allReceived
      ? "RECEIVED"
      : anyReceived
      ? "PARTIALLY_RECEIVED"
      : "CONFIRMED";

    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus },
    });
  });

  revalidatePath(`/purchases/${poId}`);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
}

// ─── Supplier Payments ────────────────────────

export async function recordPayment(poId: string, values: PaymentFormValues) {
  const userId = await requirePurchasesAccess();
  const data = paymentSchema.parse(values);

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: { supplierId: true, totalAmount: true, amountPaid: true, status: true },
  });
  if (!po) throw new Error("Purchase order not found");
  if (po.status === "DRAFT") throw new Error("Confirm the order before recording a payment");
  if (po.status === "CANCELLED") throw new Error("Cannot record payment for a cancelled order");

  const alreadyPaid = Number(po.amountPaid);
  const total = Number(po.totalAmount);
  const remaining = total - alreadyPaid;

  if (data.amount > remaining + 0.001) {
    throw new Error(
      `Payment of Rs ${data.amount.toFixed(2)} exceeds the outstanding balance of Rs ${remaining.toFixed(2)}`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.create({
      data: {
        purchaseOrderId: poId,
        supplierId:      po.supplierId,
        amount:          data.amount,
        method:          data.method,
        paidAt:          new Date(data.paidAt),
        reference:       data.reference || null,
        notes:           data.notes || null,
        createdBy:       userId,
      },
    });

    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { amountPaid: { increment: data.amount } },
    });
  });

  revalidatePath(`/purchases/${poId}`);
  revalidatePath("/purchases");
}

// ─── Quick Product Create (returns new product for inline form use) ───────

export async function createProductInline(values: NewProductValues) {
  await requirePurchasesAccess();
  const data = newProductSchema.parse(values);

  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) throw new Error(`SKU "${data.sku}" is already in use`);

  const product = await prisma.product.create({
    data: {
      name:         data.name,
      sku:          data.sku,
      categoryId:   data.categoryId,
      unitId:       data.unitId,
      costPrice:    data.costPrice,
      sellingPrice: data.sellingPrice,
      reorderLevel: data.reorderLevel,
      description:  data.description ?? null,
    },
    select: { id: true, name: true, sku: true, costPrice: true, unit: { select: { name: true } } },
  });
  revalidatePath("/inventory");
  revalidatePath("/purchases/new");
  return { id: product.id, name: product.name, sku: product.sku, costPrice: Number(product.costPrice), unit: product.unit.name };
}

// ─── Quick Supplier Create (returns new supplier for inline form use) ──────

export async function createSupplierInline(
  values: { name: string; contactName?: string; phone?: string; address?: string }
) {
  await requirePurchasesAccess();
  const data = newSupplierSchema.parse(values);
  const supplier = await prisma.supplier.create({
    data: {
      name:        data.name,
      contactName: data.contactName || null,
      phone:       data.phone || null,
      address:     data.address || null,
    },
    select: { id: true, name: true, contactName: true, phone: true },
  });
  revalidatePath("/purchases");
  return supplier;
}

// ─── Purchase Invoice ──────────────────────────

export async function createPurchase(values: CreatePurchaseValues) {
  const userId = await requirePurchasesAccess();
  const data   = createPurchaseSchema.parse(values);

  // Compute per-item amounts
  const computedItems = data.items.map((item) => {
    const grossAmount = item.quantity * item.unitPrice;
    const vatAmount   = grossAmount * (item.vatPct / 100);
    const lineTotal   = grossAmount + vatAmount;
    return { ...item, grossAmount, vatAmount, lineTotal };
  });

  const subtotal  = computedItems.reduce((s, i) => s + i.grossAmount, 0);
  const vatTotal  = computedItems.reduce((s, i) => s + i.vatAmount, 0);
  const totalCost = subtotal + vatTotal;

  if (data.amountPaid > totalCost + 0.005) {
    throw new Error("Amount paid cannot exceed total cost");
  }

  await prisma.$transaction(async (tx) => {
    // Resolve productIds — auto-create products for free-text items that have a category
    const resolvedItems = await Promise.all(
      computedItems.map(async (item) => {
        if (item.productId) return item;
        if (!item.categoryId || !item.unitId) return item;
        // Check if a matching product already exists (by name, case-insensitive)
        const existing = await tx.product.findFirst({
          where: { name: { equals: item.productName, mode: "insensitive" }, deletedAt: null },
        });
        if (existing) return { ...item, productId: existing.id };
        // Auto-create the product with a proper SKU
        const cat = await tx.category.findUnique({ where: { id: item.categoryId }, select: { name: true } });
        const prefix = (cat?.name ?? "PRD").replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "XXX";
        const lastWithPrefix = await tx.product.findFirst({ where: { sku: { startsWith: prefix + "-" } }, orderBy: { sku: "desc" } });
        const nextNum = lastWithPrefix ? (parseInt(lastWithPrefix.sku.split("-")[1] ?? "0") || 0) + 1 : 1;
        const autoSku = `${prefix}-${String(nextNum).padStart(3, "0")}`;
        const created = await tx.product.create({
          data: {
            name:         item.productName,
            sku:          autoSku,
            categoryId:   item.categoryId,
            unitId:       item.unitId,
            costPrice:    item.unitPrice,
            sellingPrice: 0,
          },
        });
        return { ...item, productId: created.id };
      })
    );

    const purchase = await tx.purchase.create({
      data: {
        invoiceNo:     data.invoiceNo,
        supplierId:    data.supplierId,
        date:          new Date(data.date),
        paymentMethod: data.paymentMethod,
        subtotal,
        vatTotal,
        totalCost,
        amountPaid:    data.amountPaid,
        notes:         data.notes || null,
        invoiceUrl:    data.invoiceUrl || null,
        createdBy:     userId,
        items: {
          create: resolvedItems.map((i) => ({
            ...(i.productId ? { product: { connect: { id: i.productId } } } : {}),
            productName: i.productName,
            categoryId:  i.categoryId || null,
            unitId:      i.unitId || null,
            description: i.description || null,
            quantity:    i.quantity,
            unitPrice:   i.unitPrice,
            grossAmount: i.grossAmount,
            vatPct:      i.vatPct,
            vatAmount:   i.vatAmount,
            lineTotal:   i.lineTotal,
          })),
        },
      },
    });

    // Update inventory stock for all resolved items
    for (const item of resolvedItems) {
      if (!item.productId) continue;
      await applyStockMovement(
        {
          productId:     item.productId,
          type:          StockMovementType.PURCHASE,
          quantity:      item.quantity,
          unitCost:      item.unitPrice,
          notes:         `Purchase invoice ${data.invoiceNo}`,
          referenceId:   purchase.id,
          referenceType: "Purchase",
          createdBy:     userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }
  });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
}

export async function updatePurchase(id: string, values: CreatePurchaseValues) {
  const userId = await requirePurchasesAccess();
  const data   = createPurchaseSchema.parse(values);

  const computedItems = data.items.map((item) => {
    const grossAmount = item.quantity * item.unitPrice;
    const vatAmount   = grossAmount * (item.vatPct / 100);
    const lineTotal   = grossAmount + vatAmount;
    return { ...item, grossAmount, vatAmount, lineTotal };
  });

  const subtotal  = computedItems.reduce((s, i) => s + i.grossAmount, 0);
  const vatTotal  = computedItems.reduce((s, i) => s + i.vatAmount, 0);
  const totalCost = subtotal + vatTotal;

  if (data.amountPaid > totalCost + 0.005) {
    throw new Error("Amount paid cannot exceed total cost");
  }

  await prisma.$transaction(async (tx) => {
    // Reverse old stock movements for items that had a productId
    const oldItems = await tx.purchaseLineItem.findMany({
      where: { purchaseId: id },
      select: { productId: true, quantity: true, unitPrice: true },
    });

    for (const old of oldItems) {
      if (!old.productId) continue;
      await applyStockMovement(
        {
          productId:     old.productId,
          type:          StockMovementType.RETURN_OUT,
          quantity:      Number(old.quantity),
          unitCost:      Number(old.unitPrice),
          notes:         `Purchase edit reversal`,
          referenceId:   id,
          referenceType: "Purchase",
          createdBy:     userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }

    // Delete old items
    await tx.purchaseLineItem.deleteMany({ where: { purchaseId: id } });

    // Resolve productIds for new items
    const resolvedItems = await Promise.all(
      computedItems.map(async (item) => {
        if (item.productId) return item;
        if (!item.categoryId || !item.unitId) return item;
        const existing = await tx.product.findFirst({
          where: { name: { equals: item.productName, mode: "insensitive" }, deletedAt: null },
        });
        if (existing) return { ...item, productId: existing.id };
        const cat = await tx.category.findUnique({ where: { id: item.categoryId }, select: { name: true } });
        const prefix = (cat?.name ?? "PRD").replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "XXX";
        const lastWithPrefix = await tx.product.findFirst({ where: { sku: { startsWith: prefix + "-" } }, orderBy: { sku: "desc" } });
        const nextNum = lastWithPrefix ? (parseInt(lastWithPrefix.sku.split("-")[1] ?? "0") || 0) + 1 : 1;
        const autoSku = `${prefix}-${String(nextNum).padStart(3, "0")}`;
        const created = await tx.product.create({
          data: {
            name:         item.productName,
            sku:          autoSku,
            categoryId:   item.categoryId,
            unitId:       item.unitId,
            costPrice:    item.unitPrice,
            sellingPrice: 0,
          },
        });
        return { ...item, productId: created.id };
      })
    );

    // Update purchase header
    await tx.purchase.update({
      where: { id },
      data: {
        invoiceNo:     data.invoiceNo,
        supplierId:    data.supplierId,
        date:          new Date(data.date),
        paymentMethod: data.paymentMethod,
        subtotal,
        vatTotal,
        totalCost,
        amountPaid:    data.amountPaid,
        notes:         data.notes || null,
        invoiceUrl:    data.invoiceUrl || null,
        items: {
          create: resolvedItems.map((i) => ({
            ...(i.productId ? { product: { connect: { id: i.productId } } } : {}),
            productName: i.productName,
            categoryId:  i.categoryId || null,
            unitId:      i.unitId || null,
            description: i.description || null,
            quantity:    i.quantity,
            unitPrice:   i.unitPrice,
            grossAmount: i.grossAmount,
            vatPct:      i.vatPct,
            vatAmount:   i.vatAmount,
            lineTotal:   i.lineTotal,
          })),
        },
      },
    });

    // Apply new stock movements
    for (const item of resolvedItems) {
      if (!item.productId) continue;
      await applyStockMovement(
        {
          productId:     item.productId,
          type:          StockMovementType.PURCHASE,
          quantity:      item.quantity,
          unitCost:      item.unitPrice,
          notes:         `Purchase invoice ${data.invoiceNo} (edited)`,
          referenceId:   id,
          referenceType: "Purchase",
          createdBy:     userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }
  });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
}

export async function deletePurchase(id: string) {
  const userId = await requirePurchasesAccess();

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    select: {
      invoiceNo: true,
      items: { select: { productId: true, quantity: true, unitPrice: true } },
    },
  });
  if (!purchase) throw new Error("Purchase not found");

  await prisma.$transaction(async (tx) => {
    // Reverse stock for all linked products
    for (const item of purchase.items) {
      if (!item.productId) continue;
      await applyStockMovement(
        {
          productId:     item.productId,
          type:          StockMovementType.RETURN_OUT,
          quantity:      Number(item.quantity),
          unitCost:      Number(item.unitPrice),
          notes:         `Purchase ${purchase.invoiceNo} deleted`,
          referenceId:   id,
          referenceType: "Purchase",
          createdBy:     userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }

    await tx.purchase.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
}
