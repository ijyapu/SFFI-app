"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type CustomerLedgerEntry = {
  id:            string;
  date:          string; // ISO string
  type:          "INVOICE" | "PAYMENT" | "RETURN";
  reference:     string;
  description:   string;
  invoiceAmount: number; // amount salesman owes us
  paymentAmount: number; // amount received from salesman
  balance:       number; // running balance (positive = salesman owes us)
  taxAmount:     number; // VAT collected
  subtotal:      number; // before tax
  paymentMethod: string;
  salesOrderId:  string | null;
};

export type CustomerLedgerData = {
  salesman: {
    id:             string;
    name:           string;
    pan:            string | null;
    phone:          string | null;
    address:        string | null;
    email:          string | null;
    openingBalance: number;
  };
  openingBalance: number; // balance at start of period (receivable)
  closingBalance: number; // balance at end of period
  entries:        CustomerLedgerEntry[];
  taxSummary: {
    totalSales:      number; // gross before tax
    totalVat:        number; // output VAT collected (13%)
    totalInvoiced:   number; // total including taxes
    totalReceived:   number; // payments received
    totalReturns:    number; // returns/credits
    netReceivable:   number; // closing balance
    invoiceCount:    number;
    vatInvoiceCount: number; // invoices with VAT
  };
  from: string;
  to:   string;
};

export async function getCustomerLedger(
  customerId: string,
  from: Date,
  to: Date
): Promise<CustomerLedgerData> {
  await requirePermission("sales");

  const salesman = await prisma.salesman.findUnique({
    where: { id: customerId, deletedAt: null },
    select: {
      id: true, name: true, pan: true, phone: true,
      address: true, email: true, openingBalance: true,
    },
  });
  if (!salesman) throw new Error("Salesman not found");

  // All sales orders for this salesman (to compute opening balance)
  const allOrders = await prisma.salesOrder.findMany({
    where: { customerId, deletedAt: null },
    select: {
      id: true, orderNumber: true, orderDate: true, status: true,
      subtotal: true, taxAmount: true, totalAmount: true, amountPaid: true,
      notes: true,
      payments: {
        select: { id: true, amount: true, method: true, paidAt: true, reference: true, notes: true },
      },
    },
    orderBy: { orderDate: "asc" },
  });

  // Sales returns
  const allReturns = await prisma.salesReturn.findMany({
    where: { salesOrder: { customerId } },
    select: {
      id: true, returnNumber: true, createdAt: true, totalAmount: true, notes: true,
      salesOrderId: true,
      salesOrder: { select: { orderNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Compute opening balance: openingBalance field + invoices before `from` - payments before `from` - returns before `from`
  const baseOpening = Number(salesman.openingBalance);
  let computedOpening = baseOpening;

  for (const o of allOrders) {
    if (o.orderDate < from && o.status !== "CANCELLED") {
      computedOpening += Number(o.totalAmount);
      computedOpening -= Number(o.amountPaid);
    }
  }
  for (const r of allReturns) {
    if (r.createdAt < from) {
      computedOpening -= Number(r.totalAmount);
    }
  }

  // Build ledger entries within period
  type RawEntry = {
    id: string;
    date: Date;
    type: "INVOICE" | "PAYMENT" | "RETURN";
    reference: string;
    description: string;
    invoiceAmount: number;
    paymentAmount: number;
    taxAmount: number;
    subtotal: number;
    paymentMethod: string;
    salesOrderId: string | null;
  };

  const rawEntries: RawEntry[] = [];

  for (const o of allOrders) {
    if (o.orderDate < from || o.orderDate > to) continue;
    if (o.status === "CANCELLED") continue;

    rawEntries.push({
      id:            `inv-${o.id}`,
      date:          o.orderDate,
      type:          "INVOICE",
      reference:     o.orderNumber,
      description:   `Sales Invoice${o.notes ? ` · ${o.notes}` : ""}`,
      invoiceAmount: Number(o.totalAmount),
      paymentAmount: 0,
      taxAmount:     Number(o.taxAmount),
      subtotal:      Number(o.subtotal),
      paymentMethod: "",
      salesOrderId:  o.id,
    });

    // Payments linked to this order
    for (const p of o.payments) {
      if (p.paidAt < from || p.paidAt > to) continue;
      rawEntries.push({
        id:            `pay-${p.id}`,
        date:          p.paidAt,
        type:          "PAYMENT",
        reference:     o.orderNumber,
        description:   `Payment for ${o.orderNumber}${p.notes ? ` · ${p.notes}` : ""}`,
        invoiceAmount: 0,
        paymentAmount: Number(p.amount),
        taxAmount:     0,
        subtotal:      0,
        paymentMethod: p.method,
        salesOrderId:  o.id,
      });
    }
  }

  // Returns within period
  for (const r of allReturns) {
    if (r.createdAt < from || r.createdAt > to) continue;
    rawEntries.push({
      id:            `ret-${r.id}`,
      date:          r.createdAt,
      type:          "RETURN",
      reference:     r.returnNumber,
      description:   `Waste Return · ${r.salesOrder.orderNumber}${r.notes ? ` · ${r.notes}` : ""}`,
      invoiceAmount: 0,
      paymentAmount: Number(r.totalAmount), // return reduces balance
      taxAmount:     0,
      subtotal:      0,
      paymentMethod: "",
      salesOrderId:  r.salesOrderId,
    });
  }

  // Sort: invoices before same-day payments/returns
  rawEntries.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    if (a.type === "INVOICE" && b.type !== "INVOICE") return -1;
    if (a.type !== "INVOICE" && b.type === "INVOICE") return 1;
    return 0;
  });

  // Add running balance
  let balance = computedOpening;
  const entries: CustomerLedgerEntry[] = rawEntries.map((e) => {
    balance += e.invoiceAmount - e.paymentAmount;
    return { ...e, date: e.date.toISOString(), balance };
  });

  const closingBalance = balance;

  // Tax summary
  const invoiceEntries = rawEntries.filter((e) => e.type === "INVOICE");
  const returnEntries  = rawEntries.filter((e) => e.type === "RETURN");
  const paymentEntries = rawEntries.filter((e) => e.type === "PAYMENT");

  const totalSales    = invoiceEntries.reduce((s, e) => s + e.subtotal, 0);
  const totalVat      = invoiceEntries.reduce((s, e) => s + e.taxAmount, 0);
  const totalInvoiced = invoiceEntries.reduce((s, e) => s + e.invoiceAmount, 0);
  const totalReceived = paymentEntries.reduce((s, e) => s + e.paymentAmount, 0);
  const totalReturns  = returnEntries.reduce((s, e) => s + e.paymentAmount, 0);

  return {
    salesman: {
      ...salesman,
      openingBalance: Number(salesman.openingBalance),
    },
    openingBalance:  computedOpening,
    closingBalance,
    entries,
    taxSummary: {
      totalSales,
      totalVat,
      totalInvoiced,
      totalReceived,
      totalReturns,
      netReceivable:   closingBalance,
      invoiceCount:    invoiceEntries.length,
      vatInvoiceCount: invoiceEntries.filter((e) => e.taxAmount > 0).length,
    },
    from: from.toISOString(),
    to:   to.toISOString(),
  };
}

export async function getAllCustomers() {
  await requirePermission("sales");
  return prisma.salesman.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, pan: true },
    orderBy: { name: "asc" },
  });
}
