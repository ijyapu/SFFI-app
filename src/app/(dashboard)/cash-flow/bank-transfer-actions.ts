"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/roles";
import type { AppRole } from "@/types/globals";
import {
  bankTransferSchema, type BankTransferFormValues,
} from "@/lib/validators/bank-transfer";

async function requireAccess() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as AppRole | undefined;
  if (!hasPermission(role, "cashFlow")) throw new Error("Unauthorized");
  return user.id;
}

export async function createBankTransfer(values: BankTransferFormValues) {
  const userId = await requireAccess();
  const data   = bankTransferSchema.parse(values);

  await prisma.bankTransfer.create({
    data: {
      direction:    data.direction,
      bankName:     data.bankName || null,
      amount:       data.amount,
      reference:    data.reference || null,
      notes:        data.notes || null,
      photoUrl:     data.photoUrl ?? null,
      transactedAt: new Date(data.transactedAt),
      createdBy:    userId,
    },
  });

  revalidatePath("/cash-flow");
}

export async function updateBankTransfer(id: string, values: BankTransferFormValues) {
  await requireAccess();
  const data = bankTransferSchema.parse(values);

  await prisma.bankTransfer.update({
    where: { id },
    data: {
      direction:    data.direction,
      bankName:     data.bankName || null,
      amount:       data.amount,
      reference:    data.reference || null,
      notes:        data.notes || null,
      photoUrl:     data.photoUrl ?? null,
      transactedAt: new Date(data.transactedAt),
    },
  });

  revalidatePath("/cash-flow");
}

export async function deleteBankTransfer(id: string) {
  await requireAccess();
  await prisma.bankTransfer.update({
    where: { id },
    data:  { deletedAt: new Date() },
  });
  revalidatePath("/cash-flow");
}

export async function setBankOpeningBalance(amount: number): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "admin" && role !== "superadmin") throw new Error("Only admins can set the opening balance");

  await prisma.companySettings.update({
    where: { id: "main" },
    data: { bankOpeningBalance: amount },
  });

  revalidatePath("/cash-flow");
}
