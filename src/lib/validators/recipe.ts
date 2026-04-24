import { z } from "zod";

export const recipeIngredientSchema = z.object({
  productId: z.string().min(1, "Select an ingredient"),
  quantity:  z.number().min(0.001, "Must be > 0").max(999_999),
});

export const upsertRecipeSchema = z.object({
  yieldQty:    z.number().min(0.001, "Must be > 0").max(999_999),
  notes:       z.string().max(1000).optional(),
  ingredients: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient").max(100),
});

export type UpsertRecipeValues = z.infer<typeof upsertRecipeSchema>;
