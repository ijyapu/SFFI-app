import { z } from "zod";

export const supplierSchema = z.object({
  name:           z.string().min(1, "Name is required").max(200),
  contactName:    z.string().max(100).optional(),
  email:          z.string().email("Invalid email").max(254).optional().or(z.literal("")),
  phone:          z.string().max(20).optional(),
  address:        z.string().max(500).optional(),
  pan:            z.string().max(20).optional(),
  openingBalance: z.number().min(0).max(9_999_999).optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

// ─── Purchase Order ───────────────────────────

export const poItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity:  z.number().min(0.001, "Quantity must be > 0").max(999_999),
  unitCost:  z.number().min(0, "Cost must be ≥ 0").max(9_999_999),
});

export const createPoSchema = z.object({
  supplierId:   z.string().min(1, "Select a supplier"),
  expectedDate: z.string().optional(),
  notes:        z.string().max(2000).optional(),
  items:        z.array(poItemSchema).min(1, "Add at least one item").max(500),
});

export type CreatePoValues = z.infer<typeof createPoSchema>;

// ─── Receive Goods ────────────────────────────

export const receiveItemSchema = z.object({
  itemId:     z.string(),
  receiveQty: z.number().min(0).max(999_999),
});

export const receiveGoodsSchema = z.object({
  items: z.array(receiveItemSchema).max(500),
  notes: z.string().max(2000).optional(),
});

export type ReceiveGoodsValues = z.infer<typeof receiveGoodsSchema>;

// ─── Payment ──────────────────────────────────

export const paymentSchema = z.object({
  amount:    z.number().min(0.01, "Amount must be > 0").max(9_999_999),
  method:    z.enum(["CASH", "BANK_TRANSFER", "CHECK", "ESEWA", "KHALTI", "IME_PAY", "FONEPAY", "OTHER"]),
  paidAt:    z.string().min(1, "Date is required"),
  reference: z.string().max(100).optional(),
  notes:     z.string().max(2000).optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

// ─── Purchase Invoice ─────────────────────────

export const purchaseItemSchema = z.object({
  productId:   z.string().optional(),
  productName: z.string().min(1, "Product name is required").max(200),
  categoryId:  z.string().optional(),
  unitId:      z.string().optional(),
  description: z.string().max(500).optional(),
  quantity:    z.number().min(0.001, "Quantity must be > 0").max(999_999),
  unitPrice:   z.number().min(0, "Price must be ≥ 0").max(9_999_999),
  vatPct:      z.number().min(0).max(100),
  excisePct:   z.number().min(0).max(100),
});

export const createPurchaseSchema = z.object({
  invoiceNo:  z.string().min(1, "Invoice number is required").max(100),
  supplierId: z.string().min(1, "Select a supplier"),
  date:       z.string().min(1, "Date is required"),
  notes:      z.string().max(2000).optional(),
  invoiceUrl: z.string().max(2048).optional(),
  items:      z.array(purchaseItemSchema).min(1, "Add at least one item").max(500),
});

export type CreatePurchaseValues = z.infer<typeof createPurchaseSchema>;

export const newSupplierSchema = z.object({
  name:           z.string().min(1, "Name is required").max(200),
  contactName:    z.string().max(100).optional(),
  email:          z.string().max(254).optional(),
  phone:          z.string().max(20).optional(),
  address:        z.string().max(500).optional(),
  pan:            z.string().max(20).optional(),
  openingBalance: z.number().min(0).max(9_999_999).optional(),
});

export type NewSupplierValues = z.infer<typeof newSupplierSchema>;

export const newProductSchema = z.object({
  name:         z.string().min(2, "Name must be at least 2 characters").max(200),
  sku:          z.string().min(1, "SKU is required").max(50).toUpperCase(),
  categoryId:   z.string().min(1, "Select a category"),
  unitId:       z.string().min(1, "Select a unit"),
  costPrice:    z.number({ error: "Enter a valid number" }).min(0).max(9_999_999),
  sellingPrice: z.number({ error: "Enter a valid number" }).min(0).max(9_999_999),
  reorderLevel: z.number({ error: "Enter a valid number" }).min(0).max(999_999),
  description:  z.string().max(1000).optional(),
});

export type NewProductValues = z.infer<typeof newProductSchema>;
