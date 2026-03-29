"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/stock";
import { StockMovementType } from "@prisma/client";
import {
  supplierSchema, createPoSchema, receiveGoodsSchema, paymentSchema,
  type SupplierFormValues, type CreatePoValues,
  type ReceiveGoodsValues, type PaymentFormValues,
} from "@/lib/validators/purchase";

async function requirePurchasesAccess() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const role = sessionClaims?.publicMetadata?.role as string | undefined;
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
