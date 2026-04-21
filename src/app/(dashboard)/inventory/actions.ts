"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { productSchema, categorySchema } from "@/lib/validators/product";
import type { ProductFormValues, CategoryFormValues } from "@/lib/validators/product";

async function requireInventoryAccess() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (!role || !["admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return userId;
}

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────

export async function getNextSkuPreview(categoryName: string): Promise<string> {
  const prefix = categoryName.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "XXX";
  const last = await prisma.product.findFirst({
    where: { sku: { startsWith: prefix + "-" }, deletedAt: null },
    orderBy: { sku: "desc" },
  });
  const next = last ? (parseInt(last.sku.split("-")[1] ?? "0") || 0) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export async function createProduct(values: ProductFormValues) {
  await requireInventoryAccess();
  const data = productSchema.parse(values);

  const active = await prisma.product.findFirst({ where: { sku: data.sku, deletedAt: null } });
  if (active) throw new Error(`SKU "${data.sku}" is already in use`);

  // If a soft-deleted product has the same SKU, restore it rather than violating the unique constraint
  const deleted = await prisma.product.findFirst({ where: { sku: data.sku, deletedAt: { not: null } } });
  if (deleted) {
    await prisma.product.update({
      where: { id: deleted.id },
      data: { ...data, reorderLevel: data.reorderLevel ?? 0, deletedAt: null },
    });
  } else {
    await prisma.product.create({
      data: { ...data, currentStock: 0 },
    });
  }

  revalidatePath("/inventory");
}

export async function updateProduct(id: string, values: ProductFormValues) {
  await requireInventoryAccess();
  const data = productSchema.parse(values);

  const existing = await prisma.product.findFirst({
    where: { sku: data.sku, deletedAt: null, NOT: { id } },
  });
  if (existing) throw new Error(`SKU "${data.sku}" is already in use by another product`);

  await prisma.product.update({
    where: { id },
    data: {
      name:            data.name,
      sku:             data.sku,
      description:     data.description,
      categoryId:      data.categoryId,
      unitId:          data.unitId,
      costPrice:       data.costPrice,
      sellingPrice:    data.sellingPrice,
      reorderLevel:    data.reorderLevel ?? 0,
      piecesPerPacket: data.piecesPerPacket ?? null,
    },
  });

  revalidatePath("/inventory");
}

export async function deleteProduct(id: string) {
  await requireInventoryAccess();

  // Soft delete only
  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/inventory");
}

// ─────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────

export async function createCategory(values: CategoryFormValues) {
  await requireInventoryAccess();
  const data = categorySchema.parse(values);

  const existing = await prisma.category.findUnique({ where: { name: data.name } });
  if (existing) throw new Error(`Category "${data.name}" already exists`);

  await prisma.category.create({ data });
  revalidatePath("/inventory");
}

export async function deleteCategory(id: string) {
  await requireInventoryAccess();

  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });
  if (productCount > 0) {
    throw new Error(`Cannot delete — ${productCount} product(s) still use this category`);
  }

  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/inventory");
}

// ─────────────────────────────────────────────
// UNITS
// ─────────────────────────────────────────────

export async function createUnit(name: string) {
  await requireInventoryAccess();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Unit name is required");

  const existing = await prisma.unit.findFirst({ where: { name: trimmed } });
  if (existing) throw new Error(`Unit "${trimmed}" already exists`);

  await prisma.unit.create({ data: { name: trimmed } });
  revalidatePath("/inventory");
}

export async function deleteUnit(id: string) {
  await requireInventoryAccess();

  const productCount = await prisma.product.count({ where: { unitId: id } });
  if (productCount > 0) {
    throw new Error(`Cannot delete — ${productCount} product(s) still use this unit`);
  }

  await prisma.unit.delete({ where: { id } });
  revalidatePath("/inventory");
}
