import { z } from "zod";

export const receiptSchema = z.object({
  receivedFrom: z.string().min(1, "Name is required"),
  amount:       z.number().min(0.01, "Amount must be > 0"),
  method:       z.enum(["CASH", "BANK_TRANSFER", "CHECK", "ESEWA", "KHALTI", "IME_PAY", "FONEPAY", "OTHER"]),
  reference:    z.string().optional(),
  notes:        z.string().optional(),
  photoUrl:     z.string().nullable().optional(),
  receivedAt:   z.string().min(1, "Date is required"),
});

export type ReceiptFormValues = z.infer<typeof receiptSchema>;
