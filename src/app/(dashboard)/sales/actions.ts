"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/stock";
import { StockMovementType } from "@prisma/client";
import {
  customerSchema, createSoSchema, customerPaymentSchema, salesReturnSchema,
  type CustomerFormValues, type CreateSoValues,
  type CustomerPaymentValues, type SalesReturnValues,
} from "@/lib/validators/sales";

async function requireSalesAccess() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const role = sessionClaims?.publicMetadata?.role as string | undefined;
  if (!role || !["admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return userId;
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

// ─── Customers ────────────────────────────────

export async function createCustomer(values: CustomerFormValues) {
  await requireSalesAccess();
  const data = customerSchema.parse(values);
  await prisma.customer.create({
    data: {
      name:           data.name,
      email:          data.email || null,
      phone:          data.phone || null,
      address:        data.address || null,
      pan:            data.pan || null,
      openingBalance: data.openingBalance ?? 0,
    },
  });
  revalidatePath("/sales/customers");
}

export async function updateCustomer(id: string, values: CustomerFormValues) {
  await requireSalesAccess();
  const data = customerSchema.parse(values);
  await prisma.customer.update({
    where: { id },
    data: {
      name:           data.name,
      email:          data.email || null,
      phone:          data.phone || null,
      address:        data.address || null,
      pan:            data.pan || null,
      openingBalance: data.openingBalance ?? 0,
    },
  });
  revalidatePath("/sales/customers");
}

export async function deleteCustomer(id: string) {
  await requireSalesAccess();
  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/sales/customers");
}

// ─── Sales Orders ─────────────────────────────

export async function createSalesOrder(values: CreateSoValues) {
  const userId = await requireSalesAccess();
  const data = createSoSchema.parse(values);

  const orderNumber = await generateSoNumber();
  const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  await prisma.salesOrder.create({
    data: {
      orderNumber,
      customerId:  data.customerId,
      dueDate:     data.dueDate ? new Date(data.dueDate) : null,
      notes:       data.notes || null,
      subtotal,
      taxAmount:   0,
      totalAmount: subtotal,
      createdBy:   userId,
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

// ─── Customer Payments ────────────────────────

export async function recordCustomerPayment(soId: string, values: CustomerPaymentValues) {
  const userId = await requireSalesAccess();
  const data = customerPaymentSchema.parse(values);

  const so = await prisma.salesOrder.findUnique({
    where: { id: soId },
    select: { customerId: true, totalAmount: true, amountPaid: true, status: true },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status === "DRAFT") throw new Error("Confirm the order before recording a payment");
  if (so.status === "CANCELLED") throw new Error("Cannot record payment for a cancelled order");

  const outstanding = Number(so.totalAmount) - Number(so.amountPaid);
  if (data.amount > outstanding + 0.001) {
    throw new Error(
      `Payment of Rs ${data.amount.toFixed(2)} exceeds the outstanding balance of Rs ${outstanding.toFixed(2)}`
    );
  }

  const newPaid = Number(so.amountPaid) + data.amount;
  const newStatus = newPaid >= Number(so.totalAmount) - 0.001 ? "PAID" : "PARTIALLY_PAID";

  await prisma.$transaction(async (tx) => {
    await tx.customerPayment.create({
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
    select: { status: true, orderNumber: true },
  });
  if (!so) throw new Error("Sales order not found");
  if (so.status === "DRAFT" || so.status === "CANCELLED") {
    throw new Error("Cannot process a return for a draft or cancelled order");
  }

  const returnNumber = await generateReturnNumber();
  const totalAmount = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  await prisma.$transaction(async (tx) => {
    const salesReturn = await tx.salesReturn.create({
      data: {
        returnNumber,
        salesOrderId: soId,
        reason:       data.reason,
        totalAmount,
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

    for (const item of data.items) {
      await applyStockMovement(
        {
          productId:     item.productId,
          type:          StockMovementType.RETURN_IN,
          quantity:      item.quantity,
          unitCost:      item.unitPrice,
          notes:         `Return ${returnNumber} — ${data.reason}`,
          referenceId:   salesReturn.id,
          referenceType: "SalesReturn",
          createdBy:     userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }
  });

  revalidatePath(`/sales/${soId}`);
  revalidatePath("/sales");
  revalidatePath("/inventory");
}
