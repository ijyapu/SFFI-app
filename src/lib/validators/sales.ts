import { z } from "zod";

export const salesmanSchema = z.object({
  name:           z.string().min(1, "Name is required"),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  phone:          z.string().optional(),
  address:        z.string().optional(),
  citizenshipNo:  z.string().optional(),
  openingBalance: z.number().min(0).optional(),
  commissionPct:  z.number().min(0).max(100).optional(),
});

export type SalesmanFormValues = z.infer<typeof salesmanSchema>;

// ─── Shared item schemas ───────────────────────

export const soItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity:  z.number().min(0.001, "Quantity must be > 0"),
  unitPrice: z.number().min(0, "Price must be ≥ 0"),
});

export const returnItemSchema = z.object({
  productId: z.string().min(1),
  quantity:  z.number().min(0.001, "Quantity must be > 0"),
  unitPrice: z.number().min(0),
});

// ─── Sales Order ──────────────────────────────

export const createSoSchema = z.object({
  customerId:  z.string().min(1, "Select a salesman"),
  dueDate:     z.string().optional(),
  notes:       z.string().optional(),
  items:       z.array(soItemSchema).min(1, "Add at least one item"),
  returnItems: z.array(returnItemSchema).optional(),
  returnNotes: z.string().optional(),
});

export type CreateSoValues = z.infer<typeof createSoSchema>;

// ─── Salesman Payment ─────────────────────────

export const salesmanPaymentSchema = z.object({
  amount:    z.number().min(0.01, "Amount must be > 0"),
  method:    z.enum(["CASH", "BANK_TRANSFER", "CHECK", "ESEWA", "KHALTI", "IME_PAY", "FONEPAY", "OTHER"]),
  reference: z.string().optional(),
  notes:     z.string().optional(),
});

export type SalesmanPaymentValues = z.infer<typeof salesmanPaymentSchema>;

// ─── Sales Return ─────────────────────────────

export const salesReturnSchema = z.object({
  notes: z.string().optional(),
  items: z.array(returnItemSchema).min(1, "Add at least one item"),
});

export type SalesReturnValues = z.infer<typeof salesReturnSchema>;
