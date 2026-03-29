import { z } from "zod";

export const supplierSchema = z.object({
  name:        z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email:       z.string().email("Invalid email").optional().or(z.literal("")),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  pan:         z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

// ─── Purchase Order ───────────────────────────

export const poItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity:  z.number().min(0.001, "Quantity must be > 0"),
  unitCost:  z.number().min(0, "Cost must be ≥ 0"),
});

export const createPoSchema = z.object({
  supplierId:   z.string().min(1, "Select a supplier"),
  expectedDate: z.string().optional(),
  notes:        z.string().optional(),
  items:        z.array(poItemSchema).min(1, "Add at least one item"),
});

export type CreatePoValues = z.infer<typeof createPoSchema>;

// ─── Receive Goods ────────────────────────────

export const receiveItemSchema = z.object({
  itemId:     z.string(),
  receiveQty: z.number().min(0),
});

export const receiveGoodsSchema = z.object({
  items: z.array(receiveItemSchema),
  notes: z.string().optional(),
});

export type ReceiveGoodsValues = z.infer<typeof receiveGoodsSchema>;

// ─── Payment ──────────────────────────────────

export const paymentSchema = z.object({
  amount:    z.number().min(0.01, "Amount must be > 0"),
  method:    z.enum(["CASH", "BANK_TRANSFER", "CHECK", "ESEWA", "KHALTI", "IME_PAY", "FONEPAY", "OTHER"]),
  reference: z.string().optional(),
  notes:     z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
