"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number | null;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  isAdminOverride: boolean;
  createdBy: string;
  createdAt: string;
  product: { name: string; sku: string; unit: { name: string } };
};

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  PURCHASE:       { label: "Purchase",    className: "bg-blue-100 text-blue-700" },
  SALE:           { label: "Sale",        className: "bg-purple-100 text-purple-700" },
  ADJUSTMENT_IN:  { label: "Adj. In",    className: "bg-green-100 text-green-700" },
  ADJUSTMENT_OUT: { label: "Adj. Out",   className: "bg-red-100 text-red-700" },
  RETURN_IN:      { label: "Return In",  className: "bg-teal-100 text-teal-700" },
  RETURN_OUT:     { label: "Return Out", className: "bg-orange-100 text-orange-700" },
};

const DECREASE_TYPES = ["SALE", "ADJUSTMENT_OUT", "RETURN_OUT"];

type Props = { movements: Movement[] };

export function MovementTable({ movements }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = movements.filter((m) => {
    const matchSearch =
      m.product.name.toLowerCase().includes(search.toLowerCase()) ||
      m.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.notes ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Search product, SKU, or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_STYLES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Before</TableHead>
              <TableHead className="text-right">After</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No movements found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((m) => {
              const isDecrease = DECREASE_TYPES.includes(m.type);
              const style = TYPE_STYLES[m.type] ?? { label: m.type, className: "" };
              return (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(m.createdAt), "dd MMM yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{m.product.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{m.product.sku}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className={style.className}>
                        {style.label}
                      </Badge>
                      {m.isAdminOverride && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                          override
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={isDecrease ? "text-red-600" : "text-green-600"}>
                      {isDecrease ? "−" : "+"}
                      {Number(m.quantity).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {m.product.unit.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {Number(m.quantityBefore).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {Number(m.quantityAfter).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                    {m.referenceType && (
                      <span className="text-xs font-mono mr-1">[{m.referenceType}]</span>
                    )}
                    {m.notes ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {movements.length} movements
      </p>
    </div>
  );
}
