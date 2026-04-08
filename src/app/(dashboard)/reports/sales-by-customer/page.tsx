import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { CustomerSalesTable, type CustomerSalesRow } from "./_components/customer-sales-table";

export const metadata = { title: "Sales by Customer — Reports" };

export default async function SalesByCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
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
    include: { customer: true },
  });

  // Group by customer
  const customerMap = new Map<string, CustomerSalesRow>();
  for (const o of orders) {
    const existing = customerMap.get(o.customerId) ?? {
      customerId:    o.customerId,
      customerName:  o.customer.name,
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
    customerMap.set(o.customerId, existing);
  }

  const rows: CustomerSalesRow[] = Array.from(customerMap.values()).map((r) => ({
    ...r,
    avgOrderValue: r.orderCount > 0 ? r.totalRevenue / r.orderCount : 0,
  }));

  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);

  return (
    <CustomerSalesTable
      rows={rows}
      from={format(from, "yyyy-MM-dd")}
      to={format(to, "yyyy-MM-dd")}
      totalRevenue={totalRevenue}
    />
  );
}
