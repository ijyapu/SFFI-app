"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { receiptSchema, type ReceiptFormValues } from "@/lib/validators/receipts";

async function requireAccess() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (!role || !["admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

async function generateReceiptNumber(): Promise<string> {
  const year   = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const count  = await prisma.receipt.count({
    where: { receiptNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export async function createReceipt(values: ReceiptFormValues) {
  const userId = await requireAccess();
  const data   = receiptSchema.parse(values);

  await prisma.receipt.create({
    data: {
      receiptNumber: await generateReceiptNumber(),
      receivedFrom:  data.receivedFrom,
      amount:        data.amount,
      method:        data.method,
      reference:     data.reference || null,
      notes:         data.notes || null,
      receivedAt:    new Date(data.receivedAt),
      createdBy:     userId,
    },
  });

  revalidatePath("/receipts");
}

export async function updateReceipt(id: string, values: ReceiptFormValues) {
  await requireAccess();
  const data = receiptSchema.parse(values);

  await prisma.receipt.update({
    where: { id },
    data: {
      receivedFrom: data.receivedFrom,
      amount:       data.amount,
      method:       data.method,
      reference:    data.reference || null,
      notes:        data.notes || null,
      receivedAt:   new Date(data.receivedAt),
    },
  });

  revalidatePath("/receipts");
}

export async function deleteReceipt(id: string) {
  await requireAccess();
  await prisma.receipt.update({
    where: { id },
    data:  { deletedAt: new Date() },
  });
  revalidatePath("/receipts");
}
