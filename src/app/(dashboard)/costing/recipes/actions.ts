"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { upsertRecipeSchema, type UpsertRecipeValues } from "@/lib/validators/recipe";
import { recalcProductCostFromRecipe } from "@/lib/recipe-cost";

async function requireCostingAccess() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "admin") throw new Error("Unauthorized");
  return user.id;
}

export async function upsertRecipe(productId: string, values: UpsertRecipeValues) {
  await requireCostingAccess();
  const data = upsertRecipeSchema.parse(values);

  const existing = await prisma.recipe.findUnique({ where: { productId } });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
      await tx.recipe.update({
        where: { id: existing.id },
        data: {
          yieldQty:    data.yieldQty,
          notes:       data.notes || null,
          ingredients: {
            create: data.ingredients.map((i) => ({
              productId: i.productId,
              quantity:  i.quantity,
            })),
          },
        },
      });
      await recalcProductCostFromRecipe(productId, tx);
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.recipe.create({
        data: {
          productId,
          yieldQty: data.yieldQty,
          notes:    data.notes || null,
          ingredients: {
            create: data.ingredients.map((i) => ({
              productId: i.productId,
              quantity:  i.quantity,
            })),
          },
        },
      });
      await recalcProductCostFromRecipe(productId, tx);
    });
  }

  revalidatePath("/costing/recipes");
  revalidatePath(`/costing/recipes/${productId}`);
  revalidatePath("/costing");
  revalidatePath("/inventory");
}

export async function deleteRecipe(productId: string) {
  await requireCostingAccess();
  await prisma.recipe.delete({ where: { productId } });
  revalidatePath("/costing/recipes");
  revalidatePath("/costing");
}

export type RecipeRow = {
  productId:   string;
  productName: string;
  productSku:  string;
  unitName:    string;
  costPrice:   number;
  yieldQty:    number;
  batchCost:   number;
  costPerUnit: number;
  notes:       string | null;
  ingredients: {
    id:          string;
    productId:   string;
    productName: string;
    unitName:    string;
    quantity:    number;
    costPrice:   number;
    lineCost:    number;
  }[];
};

export async function getRecipes(): Promise<RecipeRow[]> {
  const recipes = await prisma.recipe.findMany({
    include: {
      product: { include: { unit: true } },
      ingredients: {
        include: { product: { include: { unit: true } } },
      },
    },
    orderBy: { product: { name: "asc" } },
  });

  return recipes.map((r) => {
    const batchCost = r.ingredients.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.product.costPrice),
      0
    );
    const yieldQty = Number(r.yieldQty);
    return {
      productId:   r.productId,
      productName: r.product.name,
      productSku:  r.product.sku,
      unitName:    r.product.unit.name,
      costPrice:   Number(r.product.costPrice),
      yieldQty,
      batchCost,
      costPerUnit: yieldQty > 0 ? batchCost / yieldQty : 0,
      notes:       r.notes,
      ingredients: r.ingredients.map((i) => ({
        id:          i.id,
        productId:   i.productId,
        productName: i.product.name,
        unitName:    i.product.unit.name,
        quantity:    Number(i.quantity),
        costPrice:   Number(i.product.costPrice),
        lineCost:    Number(i.quantity) * Number(i.product.costPrice),
      })),
    };
  });
}
