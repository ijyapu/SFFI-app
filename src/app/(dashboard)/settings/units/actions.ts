"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { z } from "zod/v4";

const nameSchema = z.string().min(1, "Name is required").max(40);

export async function createUnit(formData: FormData) {
  await requirePermission("settings");
  const name = nameSchema.parse((formData.get("name") as string)?.trim());

  const existing = await prisma.unit.findFirst({ where: { name } });
  if (existing) throw new Error("A unit with this name already exists.");

  await prisma.unit.create({ data: { name } });
  revalidatePath("/settings/units");
}

export async function renameUnit(id: string, formData: FormData) {
  await requirePermission("settings");
  const name = nameSchema.parse((formData.get("name") as string)?.trim());

  const existing = await prisma.unit.findFirst({ where: { name, NOT: { id } } });
  if (existing) throw new Error("A unit with this name already exists.");

  await prisma.unit.update({ where: { id }, data: { name } });
  revalidatePath("/settings/units");
}

export async function deleteUnit(id: string) {
  await requirePermission("settings");

  const productCount = await prisma.product.count({ where: { unitId: id, deletedAt: null } });
  if (productCount > 0) throw new Error(`Cannot delete: ${productCount} product(s) use this unit.`);

  await prisma.unit.delete({ where: { id } });
  revalidatePath("/settings/units");
}
