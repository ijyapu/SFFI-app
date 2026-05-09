import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ERPSection } from "@/components/ui/erp-section";
import { TrendingUp, TrendingDown, Package, BarChart2 } from "lucide-react";
import { formatAmount } from "@/lib/format";
import { CostingDatePicker } from "./_components/costing-date-picker";
import { ProductMarginTable, type ProductCostRow } from "./_components/product-margin-table";

export const metadata = { title: "Costing" };

export default async function CostingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermission("costing");

  const { from: rawFrom, to: rawTo } = await searchParams;
  const now   = new Date();
  const from  = rawFrom ? parseISO(rawFrom) : startOfMonth(now);
  const to    = rawTo   ? parseISO(rawTo)   : endOfMonth(now);
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr   = format(to,   "yyyy-MM-dd");

  // Parallel queries
  const [products, salesItems] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { category: true, unit: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.salesOrderItem.findMany({
      where: {
        salesOrder: {
          deletedAt: null,
          status: { not: "CANCELLED" },
          orderDate: { gte: from, lte: to },
        },
      },
      select: {
        productId:  true,
        quantity:   true,
        unitPrice:  true,
        totalPrice: true,
      },
    }),
  ]);

  // Aggregate sales by product
  const salesMap = new Map<string, { qty: number; revenue: number }>();
  for (const item of salesItems) {
    const existing = salesMap.get(item.productId) ?? { qty: 0, revenue: 0 };
    salesMap.set(item.productId, {
      qty:     existing.qty     + Number(item.quantity),
      revenue: existing.revenue + Number(item.totalPrice),
    });
  }

  // Build per-product rows
  const rows: ProductCostRow[] = products.map((p) => {
    const cp = Number(p.costPrice);
    const sp = Number(p.sellingPrice);
    const staticMargin = sp > 0 ? ((sp - cp) / sp) * 100 : null;

    const sales = salesMap.get(p.id) ?? { qty: 0, revenue: 0 };
    const estimatedCogs = sales.qty * cp;
    const grossProfit   = sales.revenue - estimatedCogs;
    const actualMargin  = sales.revenue > 0 ? (grossProfit / sales.revenue) * 100 : null;

    return {
      id:            p.id,
      name:          p.name,
      sku:           p.sku,
      category:      p.category.name,
      unit:          p.unit.name,
      costPrice:     cp,
      sellingPrice:  sp,
      staticMargin,
      qtySold:       sales.qty,
      revenue:       sales.revenue,
      estimatedCogs,
      grossProfit,
      actualMargin,
    };
  });

  // Totals (products with sales only)
  const soldRows      = rows.filter((r) => r.qtySold > 0);
  const totalRevenue  = soldRows.reduce((s, r) => s + r.revenue,       0);
  const totalCogs     = soldRows.reduce((s, r) => s + r.estimatedCogs, 0);
  const totalGP       = totalRevenue - totalCogs;
  const overallMargin = totalRevenue > 0 ? (totalGP / totalRevenue) * 100 : null;
  const activeProducts = soldRows.length;

  // Top 5 by gross profit
  const top5    = [...soldRows].sort((a, b) => b.grossProfit   - a.grossProfit).slice(0, 5);
  // Bottom 5 by actual margin (only products with sales and positive revenue)
  const bottom5 = [...soldRows].sort((a, b) => (a.actualMargin ?? 0) - (b.actualMargin ?? 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Costing & Margins</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(from, "d MMM yyyy")} — {format(to, "d MMM yyyy")}
          </p>
        </div>
      </div>

      {/* Date picker */}
      <Suspense>
        <CostingDatePicker from={fromStr} to={toStr} />
      </Suspense>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">Revenue</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{formatAmount(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Non-cancelled orders</p>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">Est. COGS</p>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{formatAmount(totalCogs)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Units sold × cost price</p>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">Gross Profit</p>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`text-2xl font-bold mt-1 ${totalGP < 0 ? "text-destructive" : "text-emerald-600"}`}>
            {formatAmount(totalGP)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {overallMargin !== null ? `${overallMargin.toFixed(1)}% margin` : "No sales in period"}
          </p>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">Active Products</p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{activeProducts}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            of {rows.length} products sold in period
          </p>
        </div>
      </div>

      {/* Top / Bottom performers */}
      {soldRows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Top earners */}
          <ERPSection header={
            <span className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Top 5 by Gross Profit
            </span>
          }>
            <div className="px-4 py-3 space-y-3">
              {top5.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.category}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-emerald-600">{formatAmount(r.grossProfit)}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.actualMargin !== null ? `${r.actualMargin.toFixed(1)}% margin` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ERPSection>

          {/* Lowest margins */}
          <ERPSection header={
            <span className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Lowest 5 by Actual Margin
            </span>
          }>
            <div className="px-4 py-3 space-y-3">
              {bottom5.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.category}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-semibold ${(r.actualMargin ?? 0) < 0 ? "text-destructive" : "text-amber-600"}`}>
                      {r.actualMargin !== null ? `${r.actualMargin.toFixed(1)}%` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatAmount(r.grossProfit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ERPSection>
        </div>
      )}

      {/* Full product table */}
      <ProductMarginTable rows={rows} />
    </div>
  );
}
