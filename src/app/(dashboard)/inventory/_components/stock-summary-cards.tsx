import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

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
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Products
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{totalProducts}</p>
          <p className="text-xs text-muted-foreground mt-1">Active SKUs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Low Stock
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-amber-600" : ""}`}>
            {lowStockCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {lowStockCount > 0 ? "Need restocking" : "All levels OK"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Out of Stock
          </CardTitle>
          <XCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${outOfStockCount > 0 ? "text-destructive" : ""}`}>
            {outOfStockCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {outOfStockCount > 0 ? "Zero stock" : "None"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Inventory Value
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            Rs {totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">At cost price</p>
        </CardContent>
      </Card>
    </div>
  );
}
