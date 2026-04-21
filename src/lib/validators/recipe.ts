import { z } from "zod";

export const recipeIngredientSchema = z.object({
  productId: z.string().min(1, "Select an ingredient"),
  quantity:  z.number().min(0.001, "Must be > 0"),
});

export const upsertRecipeSchema = z.object({
  yieldQty:    z.number().min(0.001, "Must be > 0"),
  notes:       z.string().optional(),
  ingredients: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient"),
});

export type UpsertRecipeValues = z.infer<typeof upsertRecipeSchema>;
