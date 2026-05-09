import { Package, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { formatAmount } from "@/lib/format";

type Props = {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
};

export function StockSummaryCards({
  totalProducts,
  lowStockCount,
  outOfStockCount,
  totalValue,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-muted-foreground font-medium">Total Products</div>
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold tabular-nums">{totalProducts}</div>
        <div className="text-xs text-muted-foreground mt-0.5">Active SKUs</div>
      </div>

      <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-muted-foreground font-medium">Low Stock</div>
          <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
        </div>
        <div className={`text-2xl font-bold tabular-nums ${lowStockCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
          {lowStockCount}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {lowStockCount > 0 ? "Need restocking" : "All levels OK"}
        </div>
      </div>

      <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-muted-foreground font-medium">Out of Stock</div>
          <XCircle className={`h-4 w-4 ${outOfStockCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
        <div className={`text-2xl font-bold tabular-nums ${outOfStockCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {outOfStockCount}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {outOfStockCount > 0 ? "Zero stock" : "None"}
        </div>
      </div>

      <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-muted-foreground font-medium">Inventory Value</div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold tabular-nums">{formatAmount(totalValue)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">At cost price</div>
      </div>
    </div>
  );
}
