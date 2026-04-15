import { z } from "zod";

export const supplierSchema = z.object({
  name:           z.string().min(1, "Name is required"),
  contactName:    z.string().optional(),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  phone:          z.string().optional(),
  address:        z.string().optional(),
  pan:            z.string().optional(),
  openingBalance: z.number().min(0).optional(),
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
  paidAt:    z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  notes:     z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

// ─── Purchase Invoice ─────────────────────────

export const purchaseItemSchema = z.object({
  productId:   z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  categoryId:  z.string().optional(),
  unitId:      z.string().optional(),
  description: z.string().optional(),
  quantity:    z.number().min(0.001, "Quantity must be > 0"),
  unitPrice:   z.number().min(0, "Price must be ≥ 0"),
  vatPct:      z.number().min(0).max(100),
  excisePct:   z.number().min(0).max(100),
});

export const createPurchaseSchema = z.object({
  invoiceNo:  z.string().min(1, "Invoice number is required"),
  supplierId: z.string().min(1, "Select a supplier"),
  date:       z.string().min(1, "Date is required"),
  notes:      z.string().optional(),
  invoiceUrl: z.string().optional(),
  items:      z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

export type CreatePurchaseValues = z.infer<typeof createPurchaseSchema>;

export const newSupplierSchema = z.object({
  name:           z.string().min(1, "Name is required"),
  contactName:    z.string().optional(),
  email:          z.string().optional(),
  phone:          z.string().optional(),
  address:        z.string().optional(),
  pan:            z.string().optional(),
  openingBalance: z.number().min(0).default(0),
});

export type NewSupplierValues = z.infer<typeof newSupplierSchema>;

export const newProductSchema = z.object({
  name:         z.string().min(2, "Name must be at least 2 characters"),
  sku:          z.string().min(1, "SKU is required").toUpperCase(),
  categoryId:   z.string().min(1, "Select a category"),
  unitId:       z.string().min(1, "Select a unit"),
  costPrice:    z.number({ error: "Enter a valid number" }).min(0),
  sellingPrice: z.number({ error: "Enter a valid number" }).min(0),
  reorderLevel: z.number({ error: "Enter a valid number" }).min(0),
  description:  z.string().optional(),
});

export type NewProductValues = z.infer<typeof newProductSchema>;
