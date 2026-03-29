import { z } from "zod";

export const expenseSchema = z.object({
  categoryId:  z.string().min(1, "Select a category"),
  description: z.string().min(1, "Description is required"),
  amount:      z.number().min(0.01, "Amount must be > 0"),
  date:        z.string().min(1, "Date is required"),
  notes:       z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
