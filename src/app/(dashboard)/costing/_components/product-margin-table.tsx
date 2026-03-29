"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export interface ProductCostRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  staticMargin: number | null; // (SP - CP) / SP * 100, null if SP=0
  qtySold: number;
  revenue: number;
  estimatedCogs: number;
  grossProfit: number;
  actualMargin: number | null; // null if no sales in period
}

type SortKey = "name" | "category" | "staticMargin" | "qtySold" | "revenue" | "estimatedCogs" | "grossProfit" | "actualMargin";

interface Props {
  rows: ProductCostRow[];
}

const Rs = (n: number) =>
  "Rs " + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function MarginBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground text-sm">—</span>;
  const color =
    value >= 40 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" :
    value >= 20 ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40" :
    value >= 0  ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40" :
                  "text-destructive bg-destructive/10";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>
      {value.toFixed(1)}%
    </span>
  );
}

export function ProductMarginTable({ rows }: Props) {
  const [sortKey, setSortKey]   = useState<SortKey>("revenue");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [search,  setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.category))).sort()],
    [rows]
  );

  const sorted = useMemo(() => {
    const filtered = rows.filter(
      (r) =>
        (catFilter === "all" || r.category === catFilter) &&
        (r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.sku.toLowerCase().includes(search.toLowerCase()))
    );

    return filtered.sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case "name":         av = a.name.localeCompare(b.name); return sortDir === "asc" ? av : -av;
        case "category":     av = a.category.localeCompare(b.category); return sortDir === "asc" ? av : -av;
        case "staticMargin": av = a.staticMargin ?? -Infinity; bv = b.staticMargin ?? -Infinity; break;
        case "qtySold":      av = a.qtySold;       bv = b.qtySold;       break;
        case "revenue":      av = a.revenue;       bv = b.revenue;       break;
        case "estimatedCogs":av = a.estimatedCogs; bv = b.estimatedCogs; break;
        case "grossProfit":  av = a.grossProfit;   bv = b.grossProfit;   break;
        case "actualMargin": av = a.actualMargin ?? -Infinity; bv = b.actualMargin ?? -Infinity; break;
        default:             av = 0; bv = 0;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortDir, search, catFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3.5 w-3.5" />
      : <ArrowDown className="h-3.5 w-3.5" />;
  }

  const Th = ({ col, label, right }: { col: SortKey; label: string; right?: boolean }) => (
    <th
      className={`px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground ${right ? "text-right" : "text-left"}`}
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Product Margins</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </option>
              ))}
            </select>
            <input
              type="search"
              placeholder="Search product / SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-48"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {sorted.length} of {rows.length} products
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <Th col="name"          label="Product" />
                <Th col="category"      label="Category" />
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Cost</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Price</th>
                <Th col="staticMargin"  label="Static Margin" right />
                <Th col="qtySold"       label="Units Sold" right />
                <Th col="revenue"       label="Revenue" right />
                <Th col="estimatedCogs" label="Est. COGS" right />
                <Th col="grossProfit"   label="Gross Profit" right />
                <Th col="actualMargin"  label="Act. Margin" right />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No products match your filter.
                  </td>
                </tr>
              )}
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Rs(r.costPrice)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Rs(r.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right"><MarginBadge value={r.staticMargin} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.qtySold > 0 ? r.qtySold.toLocaleString(undefined, { maximumFractionDigits: 3 }) : <span className="text-muted-foreground">—</span>}
                    {r.qtySold > 0 && <span className="text-xs text-muted-foreground ml-1">{r.unit}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.revenue > 0 ? Rs(r.revenue) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.estimatedCogs > 0 ? Rs(r.estimatedCogs) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${r.grossProfit < 0 ? "text-destructive" : r.grossProfit > 0 ? "text-emerald-600" : ""}`}>
                    {r.qtySold > 0 ? Rs(r.grossProfit) : <span className="text-muted-foreground font-normal">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right"><MarginBadge value={r.actualMargin} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
