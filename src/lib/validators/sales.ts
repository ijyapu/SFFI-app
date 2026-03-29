import { z } from "zod";

export const customerSchema = z.object({
  name:    z.string().min(1, "Name is required"),
  email:   z.string().email("Invalid email").optional().or(z.literal("")),
  phone:   z.string().optional(),
  address: z.string().optional(),
  pan:     z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

// ─── Sales Order ──────────────────────────────

export const soItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity:  z.number().min(0.001, "Quantity must be > 0"),
  unitPrice: z.number().min(0, "Price must be ≥ 0"),
});

export const createSoSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  dueDate:    z.string().optional(),
  notes:      z.string().optional(),
  items:      z.array(soItemSchema).min(1, "Add at least one item"),
});

export type CreateSoValues = z.infer<typeof createSoSchema>;

// ─── Customer Payment ─────────────────────────

export const customerPaymentSchema = z.object({
  amount:    z.number().min(0.01, "Amount must be > 0"),
  method:    z.enum(["CASH", "BANK_TRANSFER", "CHECK", "ESEWA", "KHALTI", "IME_PAY", "FONEPAY", "OTHER"]),
  reference: z.string().optional(),
  notes:     z.string().optional(),
});

export type CustomerPaymentValues = z.infer<typeof customerPaymentSchema>;

// ─── Sales Return ─────────────────────────────

export const returnItemSchema = z.object({
  productId: z.string(),
  quantity:  z.number().min(0.001, "Quantity must be > 0"),
  unitPrice: z.number().min(0),
});

export const salesReturnSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  items:  z.array(returnItemSchema).min(1, "Add at least one item"),
});

export type SalesReturnValues = z.infer<typeof salesReturnSchema>;
