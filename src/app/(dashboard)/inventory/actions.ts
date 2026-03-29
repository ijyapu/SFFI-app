"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { productSchema, categorySchema } from "@/lib/validators/product";
import type { ProductFormValues, CategoryFormValues } from "@/lib/validators/product";

async function requireInventoryAccess() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const role = sessionClaims?.publicMetadata?.role as string | undefined;
  if (!role || !["admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return userId;
}

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────

export async function createProduct(values: ProductFormValues) {
  await requireInventoryAccess();
  const data = productSchema.parse(values);

  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) throw new Error(`SKU "${data.sku}" is already in use`);

  await prisma.product.create({
    data: {
      ...data,
      currentStock: 0,
    },
  });

  revalidatePath("/inventory");
}

export async function updateProduct(id: string, values: ProductFormValues) {
  await requireInventoryAccess();
  const data = productSchema.parse(values);

  const existing = await prisma.product.findFirst({
    where: { sku: data.sku, NOT: { id } },
  });
  if (existing) throw new Error(`SKU "${data.sku}" is already in use by another product`);

  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      sku: data.sku,
      description: data.description,
      categoryId: data.categoryId,
      unitId: data.unitId,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      reorderLevel: data.reorderLevel,
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
    where: { categoryId: id, deletedAt: null },
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
