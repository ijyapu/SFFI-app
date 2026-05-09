import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { StockChart } from "./_components/stock-chart";
import { ProductMovementHistory } from "./_components/product-movement-history";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  return { title: product ? `${product.name}` : "Product" };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("inventory");
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: { category: true, unit: true },
  });

  if (!product) notFound();

  const movements = await prisma.stockMovement.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const currentStock = Number(product.currentStock);
  const reorderLevel = Number(product.reorderLevel);
  const costPrice = Number(product.costPrice);
  const sellingPrice = Number(product.sellingPrice);

  const status =
    currentStock <= 0 ? "out" :
    currentStock <= reorderLevel ? "low" : "ok";

  // Build chart data: replay movements in chronological order to get stock over time
  const chronological = [...movements].reverse();
  type ChartPoint = { date: string; stock: number };
  const chartData: ChartPoint[] = [];
  for (const m of chronological) {
    chartData.push({
      date: m.createdAt.toISOString(),
      stock: Number(m.quantityAfter),
    });
  }

  const serialisedMovements = movements.map((m) => ({
    id: m.id,
    type: m.type,
    quantity: Number(m.quantity),
    stockBefore: Number(m.quantityBefore),
    stockAfter: Number(m.quantityAfter),
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    referenceType: m.referenceType,
    referenceId: m.referenceId,
  }));

  const statusConfig = {
    ok:  { label: "In Stock",     className: "bg-emerald-100 text-emerald-700" },
    low: { label: "Low Stock",    className: "bg-amber-100 text-amber-700" },
    out: { label: "Out of Stock", className: "bg-red-100 text-red-700" },
  };
  const cfg = statusConfig[status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/inventory"
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <Badge variant="secondary" className={cfg.className}>{cfg.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm ml-9 font-mono">{product.sku}</p>
        </div>
        <Link
          href="/inventory/adjustments"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Adjust Stock
        </Link>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground font-medium mb-1">Current Stock</div>
          <div className={`text-2xl font-bold tabular-nums ${status !== "ok" ? (status === "out" ? "text-destructive" : "text-amber-600") : ""}`}>
            {currentStock.toLocaleString(undefined, { maximumFractionDigits: 3 })}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{product.unit.name}</div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground font-medium mb-1">Reorder Level</div>
          <div className="text-2xl font-bold tabular-nums">
            {reorderLevel > 0 ? reorderLevel.toLocaleString() : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {reorderLevel > 0 ? product.unit.name : "Not set"}
          </div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground font-medium mb-1">Cost Price</div>
          <div className="text-2xl font-bold tabular-nums">
            Rs {costPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Stock value: Rs {(currentStock * costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground font-medium mb-1">Selling Price</div>
          <div className="text-2xl font-bold tabular-nums">
            {sellingPrice > 0
              ? `Rs ${sellingPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{product.category.name}</div>
        </div>
      </div>

      {/* Stock chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-sm font-semibold">Stock Over Time</p>
          </div>
          <div className="px-4 py-4">
            <StockChart data={chartData} unit={product.unit.name} />
          </div>
        </div>
      )}

      {/* Movement history */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-semibold">Movement History</p>
        </div>
        <div className="px-4 py-4">
          <ProductMovementHistory movements={serialisedMovements} unit={product.unit.name} />
        </div>
      </div>
    </div>
  );
}
