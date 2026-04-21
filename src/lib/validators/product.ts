import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(1, "SKU is required").toUpperCase(),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  costPrice: z.number({ error: "Enter a valid number" }).min(0, "Cost price must be 0 or more"),
  sellingPrice: z.number({ error: "Enter a valid number" }).min(0, "Selling price must be 0 or more"),
  reorderLevel:    z.number().min(0).optional().nullable(),
  piecesPerPacket: z.number().int().min(1).optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
