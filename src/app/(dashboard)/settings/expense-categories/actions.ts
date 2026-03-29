"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { z } from "zod/v4";

const nameSchema = z.string().min(1, "Name is required").max(80);

export async function createExpenseCategory(formData: FormData) {
  await requirePermission("settings");
  const name = nameSchema.parse((formData.get("name") as string)?.trim());

  const existing = await prisma.expenseCategory.findFirst({ where: { name, deletedAt: null } });
  if (existing) throw new Error("An expense category with this name already exists.");

  await prisma.expenseCategory.create({ data: { name } });
  revalidatePath("/settings/expense-categories");
}

export async function renameExpenseCategory(id: string, formData: FormData) {
  await requirePermission("settings");
  const name = nameSchema.parse((formData.get("name") as string)?.trim());

  const existing = await prisma.expenseCategory.findFirst({
    where: { name, deletedAt: null, NOT: { id } },
  });
  if (existing) throw new Error("An expense category with this name already exists.");

  await prisma.expenseCategory.update({ where: { id }, data: { name } });
  revalidatePath("/settings/expense-categories");
}

export async function deleteExpenseCategory(id: string) {
  await requirePermission("settings");

  const expenseCount = await prisma.expense.count({ where: { categoryId: id, deletedAt: null } });
  if (expenseCount > 0) throw new Error(`Cannot delete: ${expenseCount} expense(s) use this category.`);

  await prisma.expenseCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/settings/expense-categories");
}
