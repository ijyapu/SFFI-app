"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { receiptSchema, type ReceiptFormValues } from "@/lib/validators/receipts";
import { getNextDocumentNumber } from "@/lib/doc-counter";

type Db = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

async function requireAccess() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (!role || !["superadmin", "admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

async function generateReceiptNumber(db: Db = prisma): Promise<string> {
  return getNextDocumentNumber(`REC-${new Date().getFullYear()}-`, db);
}

export async function createReceipt(values: ReceiptFormValues) {
  const userId = await requireAccess();
  const data   = receiptSchema.parse(values);

  await prisma.$transaction(async (tx) => {
    const receiptNumber = await generateReceiptNumber(tx as Db);
    await tx.receipt.create({
      data: {
        receiptNumber,
        receivedFrom:  data.receivedFrom,
        amount:        data.amount,
        method:        data.method,
        reference:     data.reference || null,
        notes:         data.notes || null,
        photoUrl:      data.photoUrl ?? null,
        receivedAt:    new Date(data.receivedAt),
        createdBy:     userId,
      },
    });
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
      photoUrl:     data.photoUrl ?? null,
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
