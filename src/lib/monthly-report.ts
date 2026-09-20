import NepaliDate from "nepali-date-converter";
import { prisma } from "@/lib/prisma";
import { getCashFlowData } from "@/app/(dashboard)/cash-flow/actions";
import { nepalNow } from "@/lib/nepali-date";

const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra", "Ashwin", "Kartik", "Mangsir",
  "Poush", "Magh", "Falgun", "Chaitra",
];

// ─── Nepali month arithmetic ─────────────────────────────────────────────────
// nepali-date-converter's own setMonth()/setYear() do not behave as documented
// (verified: setMonth(1) on Ashwin jumped to Jestha, not Kartik) -- so month/year
// rollover is done by hand here, using only the constructor and getAD(), both of
// which were verified directly against known dates before relying on them.

function adStrFromBs(year: number, monthIndex: number, day: number): string {
  const ad = new NepaliDate(year, monthIndex, day).getAD();
  return `${ad.year}-${String(ad.month + 1).padStart(2, "0")}-${String(ad.date).padStart(2, "0")}`;
}

export function shiftBsMonth(year: number, monthIndex: number, delta: 1 | -1): { year: number; monthIndex: number } {
  let m = monthIndex + delta;
  let y = year;
  if (m > 11) { m = 0; y += 1; }
  if (m < 0)  { m = 11; y -= 1; }
  return { year: y, monthIndex: m };
}

export type NepaliMonthRange = {
  year: number;
  monthIndex: number;
  label: string;      // "Ashwin 2083 B.S."
  startStr: string;    // "2026-09-17" (AD, Nepal calendar day)
  endStr: string;      // "2026-10-17"
  startDate: Date;      // UTC instant, Nepal midnight of startStr
  endDate: Date;        // UTC instant, Nepal 23:59:59.999 of endStr
};

export function getNepaliMonthRange(year: number, monthIndex: number): NepaliMonthRange {
  const startStr = adStrFromBs(year, monthIndex, 1);
  const next = shiftBsMonth(year, monthIndex, 1);
  const nextStartStr = adStrFromBs(next.year, next.monthIndex, 1);
  const endDateUTC = new Date(new Date(nextStartStr + "T00:00:00Z").getTime() - 24 * 60 * 60 * 1000);
  const endStr = endDateUTC.toISOString().slice(0, 10);

  return {
    year, monthIndex,
    label: `${NEPALI_MONTHS[monthIndex]} ${year} B.S.`,
    startStr, endStr,
    startDate: new Date(startStr + "T00:00:00.000+05:45"),
    endDate: new Date(endStr + "T23:59:59.999+05:45"),
  };
}

/** True when "today" (Nepal calendar) is the 5th of the current Nepali month. */
export function isTodayNepaliDay5(): boolean {
  const nd = new NepaliDate(nepalNow());
  return nd.getDate() === 5;
}

/** The Nepali month currently in progress, per Nepal's calendar today. */
export function currentNepaliMonth(): { year: number; monthIndex: number } {
  const nd = new NepaliDate(nepalNow());
  return { year: nd.getYear(), monthIndex: nd.getMonth() };
}

// ─── Report data ──────────────────────────────────────────────────────────────

function pctChange(curr: number, prev: number): number | null {
  if (Math.abs(prev) < 0.005) return null; // no meaningful base to compare against
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export type MonthlyReportData = {
  monthLabel: string;
  prevMonthLabel: string;

  sales: {
    revenue: number; revenueDeltaPct: number | null;
    orderCount: number;
    topProducts: { name: string; revenue: number }[];
    topSalesmen: { name: string; revenue: number }[];
  };
  purchases: {
    spend: number; spendDeltaPct: number | null;
    invoiceCount: number;
    topVendors: { name: string; amount: number }[];
  };
  production: {
    producedValue: number; producedDeltaPct: number | null;
    wasteValue: number; damagedValue: number;
  };
  expenses: {
    total: number; totalDeltaPct: number | null;
    byCategory: { name: string; amount: number }[];
  };
  cashFlow: {
    totalIn: number; totalOut: number; net: number;
    prevNet: number;
    closingCash: number; closingBank: number;
  };
  outstanding: { receivables: number; payables: number };
  inventoryAlerts: {
    negative: { name: string; sku: string; stock: number }[];
    low: { name: string; sku: string; stock: number; reorderLevel: number }[];
  };
};

export async function buildMonthlyReportData(year: number, monthIndex: number): Promise<MonthlyReportData> {
  const cur = getNepaliMonthRange(year, monthIndex);
  const prevM = shiftBsMonth(year, monthIndex, -1);
  const prev = getNepaliMonthRange(prevM.year, prevM.monthIndex);

  const [
    curSalesOrders, prevSalesAgg,
    curPurchases, prevPurchasesAgg,
    curProduction, prevProduction,
    curExpenses, prevExpensesAgg,
    cashFlow, prevCashFlow,
    receivableOrders, payableOrders,
    negativeStock, lowStock,
  ] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { deletedAt: null, status: { not: "CANCELLED" }, orderDate: { gte: cur.startDate, lte: cur.endDate } },
      include: {
        items: { include: { product: { select: { name: true } } } },
        salesman: { select: { name: true } },
      },
    }),
    prisma.salesOrder.aggregate({
      where: { deletedAt: null, status: { not: "CANCELLED" }, orderDate: { gte: prev.startDate, lte: prev.endDate } },
      _sum: { totalAmount: true },
    }),

    prisma.purchase.findMany({
      where: { deletedAt: null, date: { gte: cur.startDate, lte: cur.endDate } },
      include: { supplier: { select: { name: true } } },
    }),
    prisma.purchase.aggregate({
      where: { deletedAt: null, date: { gte: prev.startDate, lte: prev.endDate } },
      _sum: { totalCost: true },
    }),

    prisma.productionEntry.findMany({
      where: { deletedAt: null, date: { gte: cur.startDate, lte: cur.endDate } },
      include: { product: { select: { costPrice: true } } },
    }),
    prisma.productionEntry.findMany({
      where: { deletedAt: null, date: { gte: prev.startDate, lte: prev.endDate } },
      include: { product: { select: { costPrice: true } } },
    }),

    prisma.expense.findMany({
      where: { status: "APPROVED", deletedAt: null, date: { gte: cur.startDate, lte: cur.endDate } },
      include: { category: { select: { name: true } } },
    }),
    prisma.expense.aggregate({
      where: { status: "APPROVED", deletedAt: null, date: { gte: prev.startDate, lte: prev.endDate } },
      _sum: { amount: true },
    }),

    getCashFlowData(cur.startStr, cur.endStr),
    getCashFlowData(prev.startStr, prev.endStr),

    prisma.salesOrder.findMany({
      where: { deletedAt: null, status: { in: ["CONFIRMED", "PARTIALLY_PAID"] } },
      select: { factoryAmount: true, amountPaid: true },
    }),
    prisma.purchaseOrder.findMany({
      where: { deletedAt: null, status: { in: ["CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED"] } },
      select: { totalAmount: true, amountPaid: true },
    }),

    prisma.product.findMany({
      where: { deletedAt: null, currentStock: { lt: 0 } },
      select: { name: true, sku: true, currentStock: true },
      orderBy: { currentStock: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null, reorderLevel: { gt: 0 }, currentStock: { gte: 0 } },
      select: { name: true, sku: true, currentStock: true, reorderLevel: true },
    }),
  ]);

  // ─── Sales ───────────────────────────────────────────────────────────────
  const revenue = curSalesOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const prevRevenue = Number(prevSalesAgg._sum.totalAmount ?? 0);

  const productRevenue = new Map<string, number>();
  for (const o of curSalesOrders) {
    for (const item of o.items) {
      productRevenue.set(item.product.name, (productRevenue.get(item.product.name) ?? 0) + Number(item.totalPrice));
    }
  }
  const topProducts = [...productRevenue.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([name, revenue]) => ({ name, revenue }));

  const salesmanRevenue = new Map<string, number>();
  for (const o of curSalesOrders) {
    salesmanRevenue.set(o.salesman.name, (salesmanRevenue.get(o.salesman.name) ?? 0) + Number(o.totalAmount));
  }
  const topSalesmen = [...salesmanRevenue.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([name, revenue]) => ({ name, revenue }));

  // ─── Purchases ───────────────────────────────────────────────────────────
  const spend = curPurchases.reduce((s, p) => s + Number(p.totalCost), 0);
  const prevSpend = Number(prevPurchasesAgg._sum.totalCost ?? 0);

  const vendorSpend = new Map<string, number>();
  for (const p of curPurchases) {
    vendorSpend.set(p.supplier.name, (vendorSpend.get(p.supplier.name) ?? 0) + Number(p.totalCost));
  }
  const topVendors = [...vendorSpend.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([name, amount]) => ({ name, amount }));

  // ─── Production (valued at cost price — quantities span too many different
  // units to sum directly) ────────────────────────────────────────────────
  function productionValue(entries: typeof curProduction) {
    let produced = 0, waste = 0, damaged = 0;
    for (const e of entries) {
      const cost = Number(e.product.costPrice);
      produced += Number(e.producedQty) * cost;
      waste    += Number(e.wasteQty) * cost;
      damaged  += Number(e.damagedQty) * cost;
    }
    return { produced, waste, damaged };
  }
  const curProd = productionValue(curProduction);
  const prevProd = productionValue(prevProduction);

  // ─── Expenses ────────────────────────────────────────────────────────────
  const expenseTotal = curExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const prevExpenseTotal = Number(prevExpensesAgg._sum.amount ?? 0);

  const categoryTotal = new Map<string, number>();
  for (const e of curExpenses) {
    categoryTotal.set(e.category.name, (categoryTotal.get(e.category.name) ?? 0) + Number(e.amount));
  }
  const byCategory = [...categoryTotal.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount }));

  // ─── Outstanding (point-in-time snapshot, as of report generation) ───────
  const receivables = receivableOrders.reduce((s, o) => {
    const out = Number(o.factoryAmount) - Number(o.amountPaid);
    return out > 0.005 ? s + out : s;
  }, 0);
  const payables = payableOrders.reduce((s, o) => {
    const out = Number(o.totalAmount) - Number(o.amountPaid);
    return out > 0.005 ? s + out : s;
  }, 0);

  return {
    monthLabel: cur.label,
    prevMonthLabel: prev.label,
    sales: {
      revenue, revenueDeltaPct: pctChange(revenue, prevRevenue),
      orderCount: curSalesOrders.length,
      topProducts, topSalesmen,
    },
    purchases: {
      spend, spendDeltaPct: pctChange(spend, prevSpend),
      invoiceCount: curPurchases.length,
      topVendors,
    },
    production: {
      producedValue: curProd.produced, producedDeltaPct: pctChange(curProd.produced, prevProd.produced),
      wasteValue: curProd.waste, damagedValue: curProd.damaged,
    },
    expenses: {
      total: expenseTotal, totalDeltaPct: pctChange(expenseTotal, prevExpenseTotal),
      byCategory,
    },
    cashFlow: {
      totalIn: cashFlow.totalIn, totalOut: cashFlow.totalOut,
      net: cashFlow.totalIn - cashFlow.totalOut,
      prevNet: prevCashFlow.totalIn - prevCashFlow.totalOut,
      closingCash: cashFlow.cashBalance, closingBank: cashFlow.bankBalance,
    },
    outstanding: { receivables, payables },
    inventoryAlerts: {
      negative: negativeStock.map((p) => ({ name: p.name, sku: p.sku, stock: Number(p.currentStock) })),
      low: lowStock
        .filter((p) => Number(p.currentStock) <= Number(p.reorderLevel))
        .map((p) => ({ name: p.name, sku: p.sku, stock: Number(p.currentStock), reorderLevel: Number(p.reorderLevel) })),
    },
  };
}
