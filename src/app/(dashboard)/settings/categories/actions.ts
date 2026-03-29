"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { z } from "zod/v4";

const nameSchema = z.string().min(1, "Name is required").max(80);

export async function createCategory(formData: FormData) {
  await requirePermission("settings");
  const name = nameSchema.parse((formData.get("name") as string)?.trim());

  const existing = await prisma.category.findFirst({ where: { name, deletedAt: null } });
  if (existing) throw new Error("A category with this name already exists.");

  await prisma.category.create({ data: { name } });
  revalidatePath("/settings/categories");
}

export async function renameCategory(id: string, formData: FormData) {
  await requirePermission("settings");
  const name = nameSchema.parse((formData.get("name") as string)?.trim());

  const existing = await prisma.category.findFirst({
    where: { name, deletedAt: null, NOT: { id } },
  });
  if (existing) throw new Error("A category with this name already exists.");

  await prisma.category.update({ where: { id }, data: { name } });
  revalidatePath("/settings/categories");
}

export async function deleteCategory(id: string) {
  await requirePermission("settings");

  const productCount = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
  if (productCount > 0) throw new Error(`Cannot delete: ${productCount} product(s) use this category.`);

  await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/settings/categories");
}
