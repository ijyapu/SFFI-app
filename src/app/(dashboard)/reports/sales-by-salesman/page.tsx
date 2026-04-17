import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { requirePermission } from "@/lib/auth";
import { SalesmanSalesTable, type SalesmanSalesRow } from "./_components/salesman-sales-table";

export const metadata = { title: "Sales by Salesman — Reports" };

export default async function SalesBySalesmanPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermission("reports");
  const { from: rawFrom, to: rawTo } = await searchParams;
  const now  = new Date();
  const from = rawFrom ? parseISO(rawFrom) : startOfMonth(now);
  const to   = rawTo   ? parseISO(rawTo)   : endOfMonth(now);

  const orders = await prisma.salesOrder.findMany({
    where: {
      deletedAt: null,
      status: { not: "CANCELLED" },
      orderDate: { gte: from, lte: to },
    },
    include: { salesman: true },
  });

  // Group by salesman
  const salesmanMap = new Map<string, SalesmanSalesRow>();
  for (const o of orders) {
    const existing = salesmanMap.get(o.customerId) ?? {
      customerId:    o.customerId,
      salesmanName:  o.salesman.name,
      orderCount:    0,
      totalRevenue:  0,
      totalPaid:     0,
      outstanding:   0,
      avgOrderValue: 0,
    };
    existing.orderCount   += 1;
    existing.totalRevenue += Number(o.totalAmount);
    existing.totalPaid    += Number(o.amountPaid);
    existing.outstanding  += Math.max(0, Number(o.totalAmount) - Number(o.amountPaid));
    salesmanMap.set(o.customerId, existing);
  }

  const rows: SalesmanSalesRow[] = Array.from(salesmanMap.values()).map((r) => ({
    ...r,
    avgOrderValue: r.orderCount > 0 ? r.totalRevenue / r.orderCount : 0,
  }));

  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);

  return (
    <SalesmanSalesTable
      rows={rows}
      from={format(from, "yyyy-MM-dd")}
      to={format(to, "yyyy-MM-dd")}
      totalRevenue={totalRevenue}
    />
  );
}
