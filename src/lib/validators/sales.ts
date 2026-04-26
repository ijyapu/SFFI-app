import { z } from "zod";

export const salesmanSchema = z.object({
  name:           z.string().min(1, "Name is required").max(200),
  email:          z.string().email("Invalid email").max(254).optional().or(z.literal("")),
  phone:          z.string().max(20).optional(),
  address:        z.string().max(500).optional(),
  citizenshipNo:  z.string().max(50).optional(),
  openingBalance: z.number().min(0).max(9_999_999).optional(),
  commissionPct:  z.number().min(0).max(100).optional(),
});

export type SalesmanFormValues = z.infer<typeof salesmanSchema>;

// ─── Shared item schemas ───────────────────────

export const soItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity:  z.number().min(0.001, "Quantity must be > 0").max(999_999),
  unitPrice: z.number().min(0, "Price must be ≥ 0").max(9_999_999),
});

export const returnItemSchema = z.object({
  productId: z.string().min(1),
  quantity:  z.number().min(0.001, "Quantity must be > 0").max(999_999),
  unitPrice: z.number().min(0).max(9_999_999),
});

// ─── Sales Order ──────────────────────────────

export const createSoSchema = z.object({
  customerId:        z.string().min(1, "Select a salesman"),
  orderDate:         z.string().min(1, "Sale date is required"),
  notes:             z.string().max(2000).optional(),
  items:             z.array(soItemSchema).min(1, "Add at least one item").max(500),
  returnItems:       z.array(returnItemSchema).max(500).optional(),
  returnNotes:       z.string().max(2000).optional(),
  freshReturnItems:  z.array(returnItemSchema).max(500).optional(),
  freshReturnNotes:  z.string().max(2000).optional(),
  amountPaid:        z.number().min(0).max(9_999_999),
});

export type CreateSoValues = z.infer<typeof createSoSchema>;

// ─── Sales Order Edit ─────────────────────────

export const updateSoSchema = z.object({
  orderDate: z.string().min(1, "Sale date is required"),
  notes:     z.string().max(2000).optional(),
  items:   z.array(soItemSchema).min(1, "Add at least one item").max(500),
});

export type UpdateSoValues = z.infer<typeof updateSoSchema>;

// ─── Salesman Payment ─────────────────────────

export const salesmanPaymentSchema = z.object({
  amount:    z.number().min(0, "Amount must be ≥ 0").max(9_999_999),
  method:    z.enum(["CASH", "BANK_TRANSFER", "CHECK", "ESEWA", "KHALTI", "IME_PAY", "FONEPAY", "OTHER"]),
  reference: z.string().max(100).optional(),
  notes:     z.string().max(2000).optional(),
});

export type SalesmanPaymentValues = z.infer<typeof salesmanPaymentSchema>;

// ─── Sales Return ─────────────────────────────

export const salesReturnSchema = z.object({
  notes:      z.string().max(2000).optional(),
  returnType: z.enum(["WASTE", "FRESH"]).default("WASTE"),
  items:      z.array(returnItemSchema).min(1, "Add at least one item").max(500),
});

export type SalesReturnValues = z.infer<typeof salesReturnSchema>;
