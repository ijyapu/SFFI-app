import { z } from "zod";

export const adjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
  quantity: z
    .number({ error: "Enter a valid quantity" })
    .positive("Quantity must be greater than zero"),
  notes: z.string().min(5, "Notes must be at least 5 characters (required for adjustments)"),
  isAdminOverride: z.boolean(),
});

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
