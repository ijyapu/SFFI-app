"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// ─── Exported types ────────────────────────────────────────────────────────────

export type CashEntry = {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  method: string | null;
  reference: string | null;
  /** Which physical pool this moved — lets the UI filter to bank-only or cash-only movement. */
  bucket: "CASH" | "BANK";
};

export type DayCashFlow = {
  dateStr: string;
  openingBalance: number;
  inflows: CashEntry[];
  outflows: CashEntry[];
  totalIn: number;
  totalOut: number;
  closingBalance: number;
};

export type DeferredItem = {
  id: string;
  type: "purchase_invoice" | "purchase_order" | "payroll";
  label: string;
  reference: string;
  dateLabel: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
};

export type BankTransferEntry = {
  id: string;
  direction: "DEPOSIT" | "WITHDRAWAL";
  bankName: string | null;
  amount: number;
  reference: string | null;
  notes: string | null;
  photoUrl: string | null;
  transactedAt: string; // ISO string
};

export type CashFlowData = {
  days: DayCashFlow[];
  periodOpeningBalance: number;
  periodClosingBalance: number;
  totalIn: number;
  totalOut: number;
  deferred: DeferredItem[];
  cashOpeningBalance: number;
  bankOpeningBalance: number;
  cashBalance: number;
  bankBalance: number;
  bankTransfers: BankTransferEntry[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toNepalDate(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
}

// End of a Nepal calendar day in UTC (Nepal = UTC+5:45)
function nepalDayEnd(dateStr: string): Date {
  return new Date(dateStr + "T23:59:59.999+05:45");
}

function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from + "T12:00:00Z");
  const end = new Date(to + "T12:00:00Z");
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function fmtMethod(method: string | null | undefined): string | null {
  if (!method) return null;
  const map: Record<string, string> = {
    CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHECK: "Cheque",
    ESEWA: "eSewa", KHALTI: "Khalti", IME_PAY: "IME Pay",
    FONEPAY: "FonePay", OTHER: "Other", ONLINE: "Online",
  };
  return map[method] ?? method;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

// Which physical pool a transaction's money sits in — used to split Cash-in-Hand
// from Bank Balance. BANK_TRANSFER/CHECK/eSewa/Khalti/IME Pay/FonePay are all
// non-physical-cash rails; CASH/OTHER/unset default to physical cash-in-hand.
type Bucket = "CASH" | "BANK";
const BANK_METHODS = new Set(["BANK_TRANSFER", "CHECK", "ESEWA", "KHALTI", "IME_PAY", "FONEPAY"]);

function bucketOfMethod(method: string | null | undefined): Bucket {
  return method && BANK_METHODS.has(method) ? "BANK" : "CASH";
}

function bucketOfPaymentMode(mode: string | null | undefined): Bucket {
  return mode === "ONLINE" ? "BANK" : "CASH";
}

// ─── Main cash flow query ──────────────────────────────────────────────────────

export async function getCashFlow(from: string, to: string): Promise<CashFlowData> {
  await requirePermission("cashFlow");

  const cutoff = nepalDayEnd(to);

  const [
    salesmanPayments,
    receipts,
    receiptPayments,
    supplierPayments,
    vendorPayments,
    expenses,
    payrollDeductions,
    salaryWithdrawals,
    settings,
    purchases,
    purchaseOrders,
    payrollItems,
    purchaseAllocations,
    bankTransfers,
  ] = await Promise.all([
    prisma.salesmanPayment.findMany({
      where: { paidAt: { lte: cutoff } },
      include: {
        salesOrder: { select: { orderNumber: true } },
        salesman:   { select: { name: true } },
      },
      orderBy: { paidAt: "asc" },
    }),

    prisma.receipt.findMany({
      where: { receivedAt: { lte: cutoff }, deletedAt: null },
      orderBy: { receivedAt: "asc" },
    }),

    prisma.receiptPayment.findMany({
      where: { paidAt: { lte: cutoff }, deletedAt: null },
      orderBy: { paidAt: "asc" },
    }),

    prisma.supplierPayment.findMany({
      where: { paidAt: { lte: cutoff } },
      include: {
        purchaseOrder: { select: { orderNumber: true } },
        supplier:      { select: { name: true } },
      },
      orderBy: { paidAt: "asc" },
    }),

    prisma.vendorPayment.findMany({
      where: { paidAt: { lte: cutoff } },
      include: { supplier: { select: { name: true } } },
      orderBy: { paidAt: "asc" },
    }),

    prisma.expense.findMany({
      where: { status: "APPROVED", date: { lte: cutoff }, deletedAt: null },
      include: { category: true },
      orderBy: { date: "asc" },
    }),

    // Only count fresh payroll payments — NOT applied-withdrawal deductions
    // (those were already counted as cash outflow when the SalaryWithdrawal was recorded).
    prisma.payrollDeduction.findMany({
      where: { givenAt: { lte: cutoff }, withdrawalId: null },
      include: {
        payrollItem: {
          include: { employee: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { givenAt: "asc" },
    }),

    prisma.salaryWithdrawal.findMany({
      where: { takenAt: { lte: cutoff } },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { takenAt: "asc" },
    }),

    prisma.companySettings.findUnique({ where: { id: "main" } }),

    // Deferred: unpaid purchase invoices
    prisma.purchase.findMany({
      where: { deletedAt: null },
      include: { supplier: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),

    // Deferred: unpaid purchase orders
    prisma.purchaseOrder.findMany({
      where: { deletedAt: null, status: { notIn: ["CANCELLED"] } },
      include: { supplier: { select: { name: true } } },
      orderBy: { orderDate: "desc" },
    }),

    // Deferred: outstanding finalized payroll
    prisma.payrollItem.findMany({
      where: { payrollRun: { status: "FINALIZED" } },
      include: {
        employee:   { select: { firstName: true, lastName: true } },
        payrollRun: { select: { month: true, year: true } },
      },
    }),

    // Deferred: VendorPaymentAllocation totals per purchase invoice
    // Used to show accurate remaining balance on each invoice (totalCost - amountPaid - allocated)
    prisma.vendorPaymentAllocation.groupBy({
      by:   ["purchaseId"],
      _sum: { amount: true },
    }),

    prisma.bankTransfer.findMany({
      where: { transactedAt: { lte: cutoff }, deletedAt: null },
      orderBy: { transactedAt: "asc" },
    }),
  ]);

  const cashOpeningBalance = settings ? Number(settings.cashOpeningBalance) : 0;
  const bankOpeningBalance = settings ? Number(settings.bankOpeningBalance) : 0;

  // ─── Build flat entry list ────────────────────────────────────────────────

  type TimedEntry = CashEntry & { timestamp: Date; bucket: Bucket };
  const allEntries: TimedEntry[] = [];

  for (const p of salesmanPayments) {
    // The salesman's commission is retained before this money ever reaches the
    // company — it was never company cash, so it must not be grossed into (or
    // netted back out of) this entry. `p.amount` is the real cash received,
    // already net of any returns applied before payment, and it already
    // matches the Salesman Ledger's Payment line and the SO detail's
    // "Collected" figure — show that number directly.
    allEntries.push({
      id: p.id,
      // Dated by when the payment actually happened, not by the order's date —
      // a payment can land days after the order was placed.
      timestamp: p.paidAt,
      category:    "Sales Collected",
      subcategory: p.salesman.name,
      description: `${p.salesOrder.orderNumber}`,
      amount:    Number(p.amount),
      direction: "in",
      method:    fmtMethod(p.method),
      reference: p.reference ?? null,
      bucket:    bucketOfMethod(p.method),
    });
  }

  for (const r of receipts) {
    allEntries.push({
      id: r.id,
      timestamp: r.receivedAt,
      category: "Receipt",
      subcategory: r.receivedFrom,
      description: r.notes ?? "Cash received",
      amount: Number(r.amount),
      direction: "in",
      method: fmtMethod(r.method),
      reference: r.reference ?? null,
      bucket: bucketOfMethod(r.method),
    });
  }

  for (const p of receiptPayments) {
    allEntries.push({
      id: p.id,
      timestamp: p.paidAt,
      category: "Receipt Payment",
      subcategory: p.paidTo,
      description: p.notes ?? "Payment made",
      amount: Number(p.amount),
      direction: "out",
      method: fmtMethod(p.method),
      reference: p.reference ?? null,
      bucket: bucketOfMethod(p.method),
    });
  }

  for (const p of supplierPayments) {
    allEntries.push({
      id: p.id,
      timestamp: p.paidAt,
      category: "Supplier Payment",
      subcategory: p.supplier.name,
      description: `Payment for ${p.purchaseOrder.orderNumber}`,
      amount: Number(p.amount),
      direction: "out",
      method: fmtMethod(p.method),
      reference: p.reference ?? null,
      bucket: bucketOfMethod(p.method),
    });
  }

  for (const p of vendorPayments) {
    allEntries.push({
      id: p.id,
      timestamp: p.paidAt,
      category: "Vendor Payment",
      subcategory: p.supplier.name,
      description: p.notes ?? "Vendor payment",
      amount: Number(p.amount),
      direction: "out",
      method: fmtMethod(p.method),
      reference: p.reference ?? null,
      bucket: bucketOfMethod(p.method),
    });
  }

  for (const e of expenses) {
    allEntries.push({
      id: e.id,
      timestamp: e.date,
      category: "Expense",
      subcategory: e.category.name,
      description: e.description,
      amount: Number(e.amount),
      direction: "out",
      method: null,
      reference: null,
      // Expenses have no payment-method field today — assumed paid from cash-in-hand.
      bucket: "CASH",
    });
  }

  for (const d of payrollDeductions) {
    const emp = d.payrollItem.employee;
    allEntries.push({
      id: d.id,
      timestamp: d.givenAt,
      category: "Payroll Payment",
      subcategory: `${emp.firstName} ${emp.lastName}`,
      description: d.notes ?? "Payroll payment",
      amount: Number(d.amount),
      direction: "out",
      method: fmtMethod(d.paymentMode),
      reference: null,
      bucket: bucketOfPaymentMode(d.paymentMode),
    });
  }

  for (const w of salaryWithdrawals) {
    const emp = w.employee;
    allEntries.push({
      id: w.id,
      timestamp: w.takenAt,
      category: "Salary Advance",
      subcategory: `${emp.firstName} ${emp.lastName}`,
      description: w.notes ?? "Salary advance",
      amount: Number(w.amount),
      direction: "out",
      method: fmtMethod(w.paymentMode),
      reference: null,
      bucket: bucketOfPaymentMode(w.paymentMode),
    });
  }

  // ─── Cash-in-Hand vs Bank Balance (point-in-time snapshot as of `to`) ─────
  // Unlike periodOpeningBalance below, these are not scoped to `from` — they're
  // a running balance since inception, split by which physical pool the money
  // sits in. Bank Transfers move money between the two pools without changing
  // the combined total, so they're intentionally excluded from totalIn/totalOut.

  let cashBalance = cashOpeningBalance;
  let bankBalance = bankOpeningBalance;
  for (const entry of allEntries) {
    const signed = entry.direction === "in" ? entry.amount : -entry.amount;
    if (entry.bucket === "CASH") cashBalance += signed;
    else bankBalance += signed;
  }

  const serialisedBankTransfers: BankTransferEntry[] = [];
  for (const t of bankTransfers) {
    const amt = Number(t.amount);
    if (t.direction === "DEPOSIT") {
      cashBalance -= amt;
      bankBalance += amt;
    } else {
      cashBalance += amt;
      bankBalance -= amt;
    }
    serialisedBankTransfers.push({
      id: t.id,
      direction: t.direction,
      bankName: t.bankName,
      amount: amt,
      reference: t.reference,
      notes: t.notes,
      photoUrl: t.photoUrl,
      transactedAt: t.transactedAt.toISOString(),
    });
  }

  // ─── Compute opening balance for the period ───────────────────────────────
  // Start from the seed balance and accumulate every transaction before `from`

  let runningBalance = cashOpeningBalance;
  for (const entry of allEntries) {
    if (toNepalDate(entry.timestamp) < from) {
      runningBalance += entry.direction === "in" ? entry.amount : -entry.amount;
    }
  }
  const periodOpeningBalance = runningBalance;

  // ─── Group into per-day buckets ───────────────────────────────────────────

  const datesInRange = generateDateRange(from, to);
  const dayMap = new Map<string, { inflows: CashEntry[]; outflows: CashEntry[] }>();
  for (const d of datesInRange) dayMap.set(d, { inflows: [], outflows: [] });

  for (const entry of allEntries) {
    const dateStr = toNepalDate(entry.timestamp);
    if (dateStr < from || dateStr > to) continue;
    const day = dayMap.get(dateStr);
    if (!day) continue;
    const { id, category, subcategory, description, amount, direction, method, reference, bucket } = entry;
    if (direction === "in") day.inflows.push({ id, category, subcategory, description, amount, direction, method, reference, bucket });
    else                    day.outflows.push({ id, category, subcategory, description, amount, direction, method, reference, bucket });
  }

  // ─── Build DayCashFlow with running balance ───────────────────────────────

  let balance = periodOpeningBalance;
  let totalIn  = 0;
  let totalOut = 0;
  const days: DayCashFlow[] = [];

  for (const dateStr of datesInRange) {
    const { inflows, outflows } = dayMap.get(dateStr)!;
    const dayIn  = inflows.reduce((s, e)  => s + e.amount, 0);
    const dayOut = outflows.reduce((s, e) => s + e.amount, 0);
    const openingBalance = balance;
    balance  = balance + dayIn - dayOut;
    totalIn  += dayIn;
    totalOut += dayOut;
    days.push({ dateStr, openingBalance, inflows, outflows, totalIn: dayIn, totalOut: dayOut, closingBalance: balance });
  }

  // ─── Deferred obligations ─────────────────────────────────────────────────

  // Build allocation map: purchaseId → total amount allocated via VendorPaymentAllocations
  const purchaseAllocMap = new Map<string, number>(
    purchaseAllocations.map((r) => [r.purchaseId, Number(r._sum.amount ?? 0)])
  );

  const deferred: DeferredItem[] = [];

  for (const p of purchases) {
    const total     = Number(p.totalCost);
    const paid      = Number(p.amountPaid);                       // always 0 in current workflow
    const allocated = purchaseAllocMap.get(p.id) ?? 0;           // sum of VendorPaymentAllocations
    const remaining = total - paid - allocated;
    if (remaining > 0.005) {
      deferred.push({
        id: p.id,
        type: "purchase_invoice",
        label: p.supplier.name,
        reference: p.invoiceNo,
        dateLabel: toNepalDate(p.date),
        totalAmount: total,
        paidAmount:  paid + allocated,
        remaining,
      });
    }
  }

  for (const po of purchaseOrders) {
    const total = Number(po.totalAmount);
    const paid  = Number(po.amountPaid);
    if (paid < total - 0.005) {
      deferred.push({
        id: po.id,
        type: "purchase_order",
        label: po.supplier.name,
        reference: po.orderNumber,
        dateLabel: toNepalDate(po.orderDate),
        totalAmount: total,
        paidAmount: paid,
        remaining: total - paid,
      });
    }
  }

  for (const item of payrollItems) {
    const remaining = Number(item.netPay);
    if (remaining > 0.005) {
      const mon = MONTH_NAMES[(item.payrollRun.month - 1)!]!;
      deferred.push({
        id: item.id,
        type: "payroll",
        label: `${item.employee.firstName} ${item.employee.lastName}`,
        reference: `${mon} ${item.payrollRun.year}`,
        dateLabel: `${mon} ${item.payrollRun.year}`,
        totalAmount: Number(item.basicSalary) + Number(item.carryoverIn),
        paidAmount: Number(item.deductions),
        remaining,
      });
    }
  }

  return {
    days,
    periodOpeningBalance,
    periodClosingBalance: balance,
    totalIn,
    totalOut,
    deferred,
    cashOpeningBalance,
    bankOpeningBalance,
    cashBalance,
    bankBalance,
    bankTransfers: serialisedBankTransfers,
  };
}

// ─── Update opening balance ────────────────────────────────────────────────────

export async function setCashOpeningBalance(amount: number): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "admin" && role !== "superadmin") throw new Error("Only admins can set the opening balance");

  await prisma.companySettings.update({
    where: { id: "main" },
    data: { cashOpeningBalance: amount },
  });

  revalidatePath("/cash-flow");
}
