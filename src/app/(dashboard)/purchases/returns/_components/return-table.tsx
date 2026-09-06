"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateDisplay } from "@/components/ui/date-display";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Printer } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyRow,
} from "@/components/ui/table";
import type { SupplierReturnRow } from "../actions";

function Rs(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReturnTable({ returns }: { returns: SupplierReturnRow[] }) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return returns;
    return returns.filter((r) =>
      r.returnNumber.toLowerCase().includes(q) ||
      r.invoiceNo.toLowerCase().includes(q) ||
      r.supplierName.toLowerCase().includes(q)
    );
  }, [returns, search]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by return no., invoice no., or vendor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Return No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead numeric>Items</TableHead>
              <TableHead numeric>Amount (Rs)</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableEmptyRow colSpan={8} message={search ? "No returns match your search." : "No purchase returns recorded yet."} />
            )}
            {filtered.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => router.push(`/purchases/returns/${r.id}/edit`)}
              >
                <TableCell className="font-mono font-medium">{r.returnNumber}</TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  <DateDisplay date={r.returnDate} />
                </TableCell>
                <TableCell className="max-w-40 truncate">{r.supplierName}</TableCell>
                <TableCell className="font-mono">
                  <Link
                    href={`/purchases/${r.purchaseId}/print`}
                    target="_blank"
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.invoiceNo}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-48 truncate">
                  {r.reason || "—"}
                </TableCell>
                <TableCell numeric>{r.itemCount}</TableCell>
                <TableCell numeric className="font-medium text-orange-600">{Rs(r.totalAmount)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`/purchases/returns/${r.id}/print`} target="_blank" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm" title="Print return note">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link href={`/purchases/returns/${r.id}/edit`} onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm" title="Open / edit this return">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {returns.length} return{returns.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
