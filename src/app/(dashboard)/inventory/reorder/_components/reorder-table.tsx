"use client";

import Link from "next/link";
import { ExternalLink, Printer } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReorderItem = {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  shortfall: number;
  suggestedQty: number;
  status: "out" | "low";
  category: { name: string };
  unit: { name: string };
};

export function ReorderTable({ items }: { items: ReorderItem[] }) {
  function handlePrint() {
    window.print();
  }

  const outCount = items.filter((i) => i.status === "out").length;
  const lowCount = items.filter((i) => i.status === "low").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          {outCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
              <span className="text-muted-foreground">{outCount} out of stock</span>
            </span>
          )}
          {lowCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-muted-foreground">{lowCount} low stock</span>
            </span>
          )}
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Print Reorder List
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Reorder Level</TableHead>
              <TableHead className="text-right">Shortfall</TableHead>
              <TableHead className="text-right">Suggested Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  All stock levels are healthy — no reorders needed.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow
                key={item.id}
                className={item.status === "out" ? "bg-red-50/50 dark:bg-red-950/10" : ""}
              >
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{item.sku}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.category.name}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className={item.status === "out" ? "text-destructive font-semibold" : "text-amber-600 font-medium"}>
                    {item.currentStock.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">{item.unit.name}</span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.reorderLevel.toLocaleString()} {item.unit.name}
                </TableCell>
                <TableCell className="text-right text-destructive font-medium">
                  {item.shortfall.toLocaleString(undefined, { maximumFractionDigits: 3 })} {item.unit.name}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {item.suggestedQty.toLocaleString(undefined, { maximumFractionDigits: 3 })} {item.unit.name}
                </TableCell>
                <TableCell>
                  {item.status === "out" ? (
                    <Badge variant="secondary" className="bg-red-100 text-red-700">Out of Stock</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">Low Stock</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/inventory/products/${item.id}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block text-xs text-muted-foreground mt-4 border-t pt-2">
        Shanti Special Food Industry ERP · Reorder List · Generated {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
