import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { StockLevelTable } from "./_components/stock-level-table";
import { StockSummaryCards } from "../_components/stock-summary-cards";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

export const metadata = { title: "Stock Levels" };

function getStatus(currentStock: number, reorderLevel: number): "ok" | "low" | "out" {
  if (currentStock <= 0) return "out";
  if (currentStock <= reorderLevel) return "low";
  return "ok";
}

export default async function StockLevelsPage() {
  await requirePermission("inventory");

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: { category: true, unit: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const items = products.map((p) => {
    const currentStock = Number(p.currentStock);
    const reorderLevel = Number(p.reorderLevel);
    const costPrice = Number(p.costPrice);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      currentStock,
      reorderLevel,
      costPrice,
      stockValue: currentStock * costPrice,
      status: getStatus(currentStock, reorderLevel),
      category: { name: p.category.name },
      unit: { name: p.unit.name },
    };
  });

  const totalValue = items.reduce((sum, i) => sum + i.stockValue, 0);
  const lowStockCount = items.filter((i) => i.status === "low").length;
  const outOfStockCount = items.filter((i) => i.status === "out").length;

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
            <h1 className="text-2xl font-semibold">Stock Levels</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-9">
            Real-time stock positions across all {items.length} products
          </p>
        </div>
        <Link
          href="/inventory/adjustments"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Adjustments
        </Link>
      </div>

      {/* Summary cards */}
      <StockSummaryCards
        totalProducts={items.length}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        totalValue={totalValue}
      />

      {/* Table */}
      <StockLevelTable items={items} totalValue={totalValue} />
    </div>
  );
}
