import { z } from "zod";

export const receiptSchema = z.object({
  receivedFrom: z.string().min(1, "Name is required").max(200),
  amount:       z.number().min(0.01, "Amount must be > 0").max(9_999_999),
  method:       z.enum(["CASH", "BANK_TRANSFER", "CHECK", "ESEWA", "KHALTI", "IME_PAY", "FONEPAY", "OTHER"]),
  reference:    z.string().max(100).optional(),
  notes:        z.string().max(2000).optional(),
  photoUrl:     z.string().max(2048).nullable().optional(),
  receivedAt:   z.string().min(1, "Date is required"),
});

export type ReceiptFormValues = z.infer<typeof receiptSchema>;
