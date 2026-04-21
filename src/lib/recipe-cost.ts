import { type PrismaClient } from "@prisma/client";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Recomputes a product's costPrice from its recipe (if one exists).
 * No-op when the product has no recipe.
 */
export async function recalcProductCostFromRecipe(
  productId: string,
  tx: Tx
): Promise<void> {
  const recipe = await tx.recipe.findUnique({
    where: { productId },
    include: {
      ingredients: {
        include: { product: { select: { costPrice: true } } },
      },
    },
  });
  if (!recipe) return;

  const yieldQty = Number(recipe.yieldQty);
  if (yieldQty <= 0) return;

  const batchCost = recipe.ingredients.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.product.costPrice),
    0
  );

  await tx.product.update({
    where: { id: productId },
    data:  { costPrice: batchCost / yieldQty },
  });
}

/**
 * After an ingredient's costPrice changes, find every recipe that uses it
 * and recompute the parent product's costPrice.
 */
export async function recalcRecipesUsingIngredient(
  ingredientProductId: string,
  tx: Tx
): Promise<void> {
  const usages = await tx.recipeIngredient.findMany({
    where:  { productId: ingredientProductId },
    select: { recipe: { select: { productId: true } } },
  });

  for (const usage of usages) {
    await recalcProductCostFromRecipe(usage.recipe.productId, tx);
  }
}
