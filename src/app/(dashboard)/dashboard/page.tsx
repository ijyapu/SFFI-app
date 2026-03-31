import Link from "next/link";
import { startOfMonth, subMonths, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireMinRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Receipt, DollarSign, CreditCard, Bell } from "lucide-react";
import { RevenueChart } from "./_components/revenue-chart";
import { RecentActivity } from "./_components/recent-activity";

export const metadata = { title: "Dashboard — Shanti Special Food Industry ERP" };

export default async function DashboardPage() {
  // Redirect no-role users → /pending; wrong role can't happen (all roles allowed)
  await requireMinRole("employee");

  const now        = new Date();
  const monthStart = startOfMonth(now);

  const [
    monthSales,
    monthPurchases,
    openPOs,
    pendingExpenses,
    lowStockProducts,
    receivables,
    payables,
    recentSalesOrders,
    recentPurchaseOrders,
    inventoryValue,
  ] = await Promise.all([
    // This month's confirmed sales revenue
    prisma.salesOrder.aggregate({
      where: { status: { not: "CANCELLED" }, orderDate: { gte: monthStart }, deletedAt: null },
      _sum: { totalAmount: true },
    }),

    // This month's confirmed purchase spending (received goods)
    prisma.purchaseOrder.aggregate({
      where: {
        status: { in: ["RECEIVED", "PARTIALLY_RECEIVED"] },
        orderDate: { gte: monthStart },
        deletedAt: null,
      },
      _sum: { totalAmount: true },
    }),

    // Open / active purchase orders
    prisma.purchaseOrder.count({
      where: { status: { in: ["CONFIRMED", "PARTIALLY_RECEIVED"] }, deletedAt: null },
    }),

    // Pending expense approvals
    prisma.expense.count({
      where: { status: "SUBMITTED", deletedAt: null },
    }),

    // Products at or below reorder level
    prisma.product.findMany({
      where: { deletedAt: null, reorderLevel: { gt: 0 } },
      select: { currentStock: true, reorderLevel: true },
    }),

    // Total outstanding receivables (sales)
    prisma.salesOrder.aggregate({
      where: { status: { notIn: ["CANCELLED", "DRAFT"] }, deletedAt: null },
      _sum: { totalAmount: true, amountPaid: true },
    }),

    // Total outstanding payables (purchases)
    prisma.purchaseOrder.aggregate({
      where: { status: { notIn: ["CANCELLED", "DRAFT"] }, deletedAt: null },
      _sum: { totalAmount: true, amountPaid: true },
    }),

    // Recent 5 sales orders
    prisma.salesOrder.findMany({
      where: { deletedAt: null },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Recent 5 purchase orders
    prisma.purchaseOrder.findMany({
      where: { deletedAt: null },
      include: { supplier: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Total inventory value
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { currentStock: true, costPrice: true },
    }),
  ]);

  // Derived stats
  const lowStockCount = lowStockProducts.filter(
    (p) => Number(p.currentStock) <= Number(p.reorderLevel)
  ).length;

  const totalReceivables =
    Number(receivables._sum.totalAmount ?? 0) - Number(receivables._sum.amountPaid ?? 0);
  const totalPayables =
    Number(payables._sum.totalAmount ?? 0) - Number(payables._sum.amountPaid ?? 0);
  const totalInventoryValue = inventoryValue.reduce(
    (sum, p) => sum + Number(p.currentStock) * Number(p.costPrice), 0
  );

  // Build last-6-months chart data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    return { month: format(d, "MMM"), year: d.getFullYear(), monthNum: d.getMonth() + 1, revenue: 0, purchases: 0 };
  });

  const [sixMonthSales, sixMonthPurchases] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        status: { not: "CANCELLED" },
        orderDate: { gte: subMonths(monthStart, 5) },
        deletedAt: null,
      },
      select: { orderDate: true, totalAmount: true },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["RECEIVED", "PARTIALLY_RECEIVED"] },
        orderDate: { gte: subMonths(monthStart, 5) },
        deletedAt: null,
      },
      select: { orderDate: true, totalAmount: true },
    }),
  ]);

  for (const so of sixMonthSales) {
    const m = so.orderDate.getMonth() + 1;
    const y = so.orderDate.getFullYear();
    const point = chartData.find((d) => d.monthNum === m && d.year === y);
    if (point) point.revenue += Number(so.totalAmount);
  }
  for (const po of sixMonthPurchases) {
    const m = po.orderDate.getMonth() + 1;
    const y = po.orderDate.getFullYear();
    const point = chartData.find((d) => d.monthNum === m && d.year === y);
    if (point) point.purchases += Number(po.totalAmount);
  }

  const serialisedChart = chartData.map(({ month, revenue, purchases }) => ({
    month, revenue, purchases,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(now, "EEEE, d MMMM yyyy")} · Shanti Special Food Industry Pvt. Ltd.
          </p>
        </div>
        <Link
          href="/profit-loss"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          Profit &amp; Loss
        </Link>
      </div>

      {/* KPI cards — row 1 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {Number(monthSales._sum.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{format(now, "MMMM yyyy")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Purchases This Month</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {Number(monthPurchases._sum.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Received goods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalReceivables > 0 ? "text-amber-600" : ""}`}>
              Rs {totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Uncollected from customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payables</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalPayables > 0 ? "text-destructive" : ""}`}>
              Rs {totalPayables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Owed to suppliers</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI cards — row 2 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">At cost price</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${openPOs > 0 ? "text-blue-600" : ""}`}>{openPOs}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/purchases" className="hover:underline">Awaiting delivery →</Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-amber-600" : ""}`}>
              {lowStockCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {lowStockCount > 0
                ? <Link href="/inventory/reorder" className="hover:underline text-amber-600">View reorder alerts →</Link>
                : "All stock levels healthy"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${pendingExpenses > 0 ? "text-amber-600" : ""}`}>
              {pendingExpenses}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingExpenses > 0
                ? <Link href="/expenses" className="hover:underline">Awaiting approval →</Link>
                : "All expenses reviewed"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue vs Purchases — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={serialisedChart} />
        </CardContent>
      </Card>

      {/* Recent activity */}
      <RecentActivity
        recentSales={recentSalesOrders.map((so) => ({
          id:           so.id,
          orderNumber:  so.orderNumber,
          customerName: so.customer.name,
          totalAmount:  Number(so.totalAmount),
          status:       so.status,
          orderDate:    so.orderDate.toISOString(),
        }))}
        recentPurchases={recentPurchaseOrders.map((po) => ({
          id:           po.id,
          orderNumber:  po.orderNumber,
          supplierName: po.supplier.name,
          totalAmount:  Number(po.totalAmount),
          status:       po.status,
          orderDate:    po.orderDate.toISOString(),
        }))}
      />
    </div>
  );
}
