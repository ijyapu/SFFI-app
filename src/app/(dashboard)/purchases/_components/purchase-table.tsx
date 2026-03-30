"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Building2, Pencil } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { deletePurchase } from "../actions";

type Purchase = {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  paymentMethod: string;
  totalCost: number;
  amountPaid: number;
  outstanding: number;
};

type Supplier = { id: string; name: string };

type SortKey = "invoiceNo" | "supplierName" | "date" | "amountPaid" | "outstanding";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="ml-1 h-3 w-3 text-muted-foreground/50 inline" />;
  return sortDir === "asc"
    ? <ChevronUp className="ml-1 h-3 w-3 inline" />
    : <ChevronDown className="ml-1 h-3 w-3 inline" />;
}

export function PurchaseTable({
  purchases,
  suppliers,
}: {
  purchases: Purchase[];
  suppliers: Supplier[];
}) {
  const [search,           setSearch]           = useState("");
  const [activeSupplier,   setActiveSupplier]   = useState<string | null>(null);
  const [sortKey,          setSortKey]          = useState<SortKey>("date");
  const [sortDir,          setSortDir]          = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  // Per-supplier stats for sidebar
  const supplierStats = useMemo(() =>
    suppliers.map((s) => {
      const rows = purchases.filter((p) => p.supplierId === s.id);
      return {
        ...s,
        count:       rows.length,
        outstanding: rows.reduce((sum, p) => sum + p.outstanding, 0),
      };
    }).filter((s) => s.count > 0),
  [purchases, suppliers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = purchases.filter((p) => {
      const matchSupplier = !activeSupplier || p.supplierId === activeSupplier;
      const matchSearch   = !q || p.invoiceNo.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q);
      return matchSupplier && matchSearch;
    });
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if      (sortKey === "invoiceNo")    cmp = a.invoiceNo.localeCompare(b.invoiceNo);
      else if (sortKey === "supplierName") cmp = a.supplierName.localeCompare(b.supplierName);
      else if (sortKey === "date")         cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortKey === "amountPaid")   cmp = a.amountPaid - b.amountPaid;
      else if (sortKey === "outstanding")  cmp = a.outstanding - b.outstanding;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [purchases, search, activeSupplier, sortKey, sortDir]);

  async function handleDelete(id: string, invoiceNo: string) {
    try {
      await deletePurchase(id);
      toast.success(`${invoiceNo} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete purchase");
    }
  }

  function SortableHead({ col, label, className }: { col: SortKey; label: string; className?: string }) {
    return (
      <TableHead className={`cursor-pointer select-none whitespace-nowrap ${className ?? ""}`} onClick={() => toggleSort(col)}>
        {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </TableHead>
    );
  }

  return (
    <div className="flex gap-4 items-start">
      {/* ── Supplier Sidebar ── */}
      {supplierStats.length > 0 && (
        <div className="hidden md:flex w-44 shrink-0 flex-col gap-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 pb-1">Suppliers</p>
          <button
            onClick={() => setActiveSupplier(null)}
            className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
              !activeSupplier ? "bg-accent font-medium" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <span>All</span>
            <span className="text-xs">{purchases.length}</span>
          </button>
          {supplierStats.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSupplier(activeSupplier === s.id ? null : s.id)}
              className={`flex flex-col w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                activeSupplier === s.id ? "bg-accent font-medium" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{s.name}</span>
              </div>
              <div className="flex justify-between text-xs mt-0.5 pl-4.5">
                <span>{s.count} invoice{s.count !== 1 ? "s" : ""}</span>
                {s.outstanding > 0.005 && (
                  <span className="text-orange-500 font-medium">
                    Rs {s.outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Main Table ── */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by invoice no. or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          {activeSupplier && (
            <button
              onClick={() => setActiveSupplier(null)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead col="invoiceNo"    label="Invoice No." />
                <SortableHead col="supplierName" label="Supplier" />
                <SortableHead col="date"         label="Date" />
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Total (Rs)</TableHead>
                <SortableHead col="amountPaid"   label="Paid (Rs)"         className="text-right" />
                <SortableHead col="outstanding"  label="Outstanding (Rs)"  className="text-right" />
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {search || activeSupplier ? "No purchases match your filters." : "No purchases recorded yet."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-medium">{p.invoiceNo}</TableCell>
                  <TableCell className="max-w-35 truncate">{p.supplierName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(p.date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={p.paymentMethod === "CASH"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"}
                    >
                      {p.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {p.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.outstanding > 0.005 ? (
                      <span className="text-orange-600 font-medium">
                        {p.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-green-600 text-sm">Paid</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                    <Link href={`/purchases/${p.id}/edit`}>
                      <Button variant="ghost" size="icon-sm">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {p.invoiceNo}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this purchase record. Inventory will NOT be reversed automatically.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(p.id, p.invoiceNo)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} of {purchases.length} purchase{purchases.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
