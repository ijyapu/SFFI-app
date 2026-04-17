"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export type CustomerLedgerEntry = {
  id:            string;
  date:          string;
  type:          "INVOICE" | "PAYMENT" | "RETURN";
  reference:     string;
  description:   string;
  invoiceAmount: number;
  paymentAmount: number;
  balance:       number;
  paymentMethod: string;
  salesOrderId:  string | null;
};

export type CommissionInvoiceRow = {
  orderId:          string;
  orderNumber:      string;
  invoiceAmount:    number;
  wasteDeducted:    number;
  netAmount:        number;
  commissionPct:    number;
  commissionAmount: number;
  factoryAmount:    number;
};

export type CustomerLedgerData = {
  salesman: {
    id:             string;
    name:           string;
    commissionPct:  number;
    phone:          string | null;
    address:        string | null;
    email:          string | null;
    openingBalance: number;
  };
  openingBalance: number;
  closingBalance: number;
  entries:        CustomerLedgerEntry[];
  commissionSummary: {
    totalInvoiced:      number;
    totalWaste:         number;
    totalCommission:    number;
    totalFactoryAmount: number;
    totalReceived:      number;
    invoiceCount:       number;
    invoiceBreakdown:   CommissionInvoiceRow[];
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
      id: true, name: true, commissionPct: true, phone: true,
      address: true, email: true, openingBalance: true,
    },
  });
  if (!salesman) throw new Error("Salesman not found");

  const allOrders = await prisma.salesOrder.findMany({
    where: { customerId, deletedAt: null },
    select: {
      id: true, orderNumber: true, orderDate: true, status: true,
      totalAmount: true, amountPaid: true, notes: true,
      commissionPct: true, commissionAmount: true, factoryAmount: true,
      payments: {
        select: { id: true, amount: true, method: true, paidAt: true, reference: true, notes: true },
      },
    },
    orderBy: { orderDate: "asc" },
  });

  const allReturns = await prisma.salesReturn.findMany({
    where: { salesOrder: { customerId } },
    select: {
      id: true, returnNumber: true, createdAt: true, totalAmount: true, notes: true,
      salesOrderId: true,
      salesOrder: { select: { orderNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Opening balance
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
  const rawEntries: {
    id: string; date: Date; type: "INVOICE" | "PAYMENT" | "RETURN";
    reference: string; description: string;
    invoiceAmount: number; paymentAmount: number;
    paymentMethod: string; salesOrderId: string | null;
  }[] = [];

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
      paymentMethod: "",
      salesOrderId:  o.id,
    });

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
        paymentMethod: p.method,
        salesOrderId:  o.id,
      });
    }
  }

  for (const r of allReturns) {
    if (r.createdAt < from || r.createdAt > to) continue;
    rawEntries.push({
      id:            `ret-${r.id}`,
      date:          r.createdAt,
      type:          "RETURN",
      reference:     r.returnNumber,
      description:   `Waste Return · ${r.salesOrder.orderNumber}${r.notes ? ` · ${r.notes}` : ""}`,
      invoiceAmount: 0,
      paymentAmount: Number(r.totalAmount),
      paymentMethod: "",
      salesOrderId:  r.salesOrderId,
    });
  }

  rawEntries.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    if (a.type === "INVOICE" && b.type !== "INVOICE") return -1;
    if (a.type !== "INVOICE" && b.type === "INVOICE") return 1;
    return 0;
  });

  let balance = computedOpening;
  const entries: CustomerLedgerEntry[] = rawEntries.map((e) => {
    balance += e.invoiceAmount - e.paymentAmount;
    return { ...e, date: e.date.toISOString(), balance };
  });

  const closingBalance = balance;

  // Commission summary — uses stored values (updated live by processSalesReturn)
  const periodOrders = allOrders.filter(
    (o) => o.orderDate >= from && o.orderDate <= to && o.status !== "CANCELLED"
  );

  // Waste per order within the period
  const wasteByOrder = new Map<string, number>();
  for (const r of allReturns) {
    if (r.createdAt < from || r.createdAt > to) continue;
    if (!r.salesOrderId) continue;
    wasteByOrder.set(r.salesOrderId, (wasteByOrder.get(r.salesOrderId) ?? 0) + Number(r.totalAmount));
  }

  const invoiceBreakdown: CommissionInvoiceRow[] = periodOrders.map((o) => {
    const invoiceAmount    = Number(o.totalAmount);
    const wasteDeducted    = wasteByOrder.get(o.id) ?? 0;
    const netAmount        = invoiceAmount - wasteDeducted;
    const commissionPct    = Number(o.commissionPct);
    const commissionAmount = Number(o.commissionAmount); // already recalculated on each return
    const factoryAmount    = Number(o.factoryAmount);
    return { orderId: o.id, orderNumber: o.orderNumber, invoiceAmount, wasteDeducted, netAmount, commissionPct, commissionAmount, factoryAmount };
  });

  const paymentEntries = rawEntries.filter((e) => e.type === "PAYMENT");

  return {
    salesman: {
      id:             salesman.id,
      name:           salesman.name,
      commissionPct:  Number(salesman.commissionPct),
      phone:          salesman.phone,
      address:        salesman.address,
      email:          salesman.email,
      openingBalance: Number(salesman.openingBalance),
    },
    openingBalance:  computedOpening,
    closingBalance,
    entries,
    commissionSummary: {
      totalInvoiced:      invoiceBreakdown.reduce((s, r) => s + r.invoiceAmount, 0),
      totalWaste:         invoiceBreakdown.reduce((s, r) => s + r.wasteDeducted, 0),
      totalCommission:    invoiceBreakdown.reduce((s, r) => s + r.commissionAmount, 0),
      totalFactoryAmount: invoiceBreakdown.reduce((s, r) => s + r.factoryAmount, 0),
      totalReceived:      paymentEntries.reduce((s, e) => s + e.paymentAmount, 0),
      invoiceCount:       invoiceBreakdown.length,
      invoiceBreakdown,
    },
    from: from.toISOString(),
    to:   to.toISOString(),
  };
}

export async function getAllCustomers() {
  await requirePermission("sales");
  return prisma.salesman.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
