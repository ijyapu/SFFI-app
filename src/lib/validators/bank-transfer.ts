import { z } from "zod";

export const bankTransferSchema = z.object({
  direction:    z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount:       z.number().min(0.01, "Amount must be > 0").max(9_999_999),
  reference:    z.string().max(100).optional(),
  notes:        z.string().max(2000).optional(),
  photoUrl:     z.string().max(2048).nullable().optional(),
  transactedAt: z.string().min(1, "Date is required"),
});

export type BankTransferFormValues = z.infer<typeof bankTransferSchema>;
