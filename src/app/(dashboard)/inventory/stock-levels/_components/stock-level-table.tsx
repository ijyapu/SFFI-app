"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, XCircle, CheckCircle } from "lucide-react";

type StockItem = {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  costPrice: number;
  stockValue: number;
  status: "ok" | "low" | "out";
  category: { name: string };
  unit: { name: string };
};

type Props = {
  items: StockItem[];
  totalValue: number;
};

const STATUS_CONFIG = {
  ok:  { label: "OK",          icon: CheckCircle,  className: "text-green-600",  badge: "bg-green-100 text-green-700" },
  low: { label: "Low Stock",   icon: AlertTriangle, className: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  out: { label: "Out of Stock", icon: XCircle,      className: "text-destructive", badge: "bg-red-100 text-red-700" },
};

export function StockLevelTable({ items, totalValue }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"stock" | "value" | "name">("stock");

  const categories = [...new Set(items.map((i) => i.category.name))].sort();

  const filtered = items
    .filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      const matchCat = categoryFilter === "all" || item.category.name === categoryFilter;
      return matchSearch && matchStatus && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === "stock") return a.currentStock - b.currentStock;
      if (sortBy === "value") return b.stockValue - a.stockValue;
      return a.name.localeCompare(b.name);
    });

  const filteredValue = filtered.reduce((sum, i) => sum + i.stockValue, 0);

  function StockBar({ item }: { item: StockItem }) {
    if (item.reorderLevel === 0) return null;
    const pct = Math.min((item.currentStock / (item.reorderLevel * 2)) * 100, 100);
    const color =
      item.status === "out" ? "bg-destructive" :
      item.status === "low" ? "bg-amber-400" : "bg-green-500";
    return (
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search product or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stock">Sort: Stock ↑</SelectItem>
            <SelectItem value="value">Sort: Value ↓</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Reorder At</TableHead>
              <TableHead className="text-right">Stock Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No products match your filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((item) => {
              const cfg = STATUS_CONFIG[item.status];
              const StatusIcon = cfg.icon;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{item.sku}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.category.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`font-medium ${item.status !== "ok" ? cfg.className : ""}`}>
                      {item.currentStock.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      <span className="text-xs text-muted-foreground ml-1">{item.unit.name}</span>
                    </div>
                    <StockBar item={item} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.reorderLevel > 0
                      ? `${item.reorderLevel.toLocaleString()} ${item.unit.name}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.stockValue > 0
                      ? `Rs ${item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${cfg.className}`} />
                      <Badge variant="secondary" className={cfg.badge}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer totals */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {filtered.length} of {items.length} products
        </span>
        <div className="flex items-center gap-6 text-muted-foreground">
          <span>
            Showing value:{" "}
            <span className="font-medium text-foreground">
              Rs {filteredValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
          <span>
            Total inventory:{" "}
            <span className="font-medium text-foreground">
              Rs {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
