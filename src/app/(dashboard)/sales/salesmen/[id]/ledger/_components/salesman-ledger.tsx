"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DateDisplay } from "@/components/ui/date-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useSortable, compareValues } from "@/hooks/use-sortable";
import { SortButton } from "@/components/ui/sort-icon";

type LedgerRow = {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  totalTaken: number;
  wasteReturned: number;
  netAmount: number;
  commissionPct: number;
  commissionAmount: number;
  factoryAmount: number;
  collected: number;
  balance: number;
};

type Props = {
  customerName: string;
  commissionPct: number;
  openingBalance: number;
  rows: LedgerRow[];
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:          "bg-gray-100 text-gray-600",
  CONFIRMED:      "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID:           "bg-green-100 text-green-700",
};

export function SalesmanLedger({ commissionPct, openingBalance, rows }: Props) {
  const { sortKey, sortDir, toggle } = useSortable("orderDate");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey as keyof LedgerRow] as string | number;
      const bv = b[sortKey as keyof LedgerRow] as string | number;
      return compareValues(av, bv, sortDir);
    });
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      totalTaken:      acc.totalTaken      + r.totalTaken,
      wasteReturned:   acc.wasteReturned   + r.wasteReturned,
      netAmount:       acc.netAmount       + r.netAmount,
      commissionAmount:acc.commissionAmount + r.commissionAmount,
      factoryAmount:   acc.factoryAmount   + r.factoryAmount,
      collected:       acc.collected       + r.collected,
      balance:         acc.balance         + r.balance,
    }),
    { totalTaken: 0, wasteReturned: 0, netAmount: 0, commissionAmount: 0, factoryAmount: 0, collected: 0, balance: 0 }
  ), [rows]);

  const totalOutstanding = openingBalance + totals.balance;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Total Dispatched</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-xl font-bold">Rs {totals.totalTaken.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Commission ({commissionPct}%)</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-xl font-bold text-amber-600">Rs {totals.commissionAmount.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Factory Total</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-xl font-bold text-green-700">Rs {totals.factoryAmount.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Outstanding Balance</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-xl font-bold ${totalOutstanding > 0.001 ? "text-destructive" : "text-green-700"}`}>
              Rs {totalOutstanding.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          No dispatch records found for this salesman.
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              {(() => {
                const sp = { sortKey, sortDir, toggle };
                return (
                  <TableRow>
                    <TableHead><SortButton col="orderDate"       label="Date"        {...sp} /></TableHead>
                    <TableHead><SortButton col="orderNumber"     label="Dispatch #"  {...sp} /></TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead numeric><SortButton col="totalTaken"      label="Taken"       {...sp} className="justify-end" /></TableHead>
                    <TableHead numeric><SortButton col="wasteReturned"   label="Waste"       {...sp} className="justify-end" /></TableHead>
                    <TableHead numeric><SortButton col="netAmount"       label="Net"         {...sp} className="justify-end" /></TableHead>
                    <TableHead numeric><SortButton col="commissionAmount" label="Commission"  {...sp} className="justify-end" /></TableHead>
                    <TableHead numeric><SortButton col="factoryAmount"   label="Factory Amt" {...sp} className="justify-end" /></TableHead>
                    <TableHead numeric><SortButton col="collected"       label="Collected"   {...sp} className="justify-end" /></TableHead>
                    <TableHead numeric><SortButton col="balance"         label="Balance"     {...sp} className="justify-end" /></TableHead>
                  </TableRow>
                );
              })()}
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm whitespace-nowrap">
                    <DateDisplay date={row.orderDate} fmt="d MMM yyyy" />
                  </TableCell>
                  <TableCell>
                    <Link href={`/sales/${row.id}`} className="font-mono text-sm text-primary hover:underline">
                      {row.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${STATUS_BADGE[row.status] ?? ""}`}>
                      {row.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell numeric>{row.totalTaken.toFixed(2)}</TableCell>
                  <TableCell numeric className="text-muted-foreground">
                    {row.wasteReturned > 0 ? `− ${row.wasteReturned.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell numeric>{row.netAmount.toFixed(2)}</TableCell>
                  <TableCell numeric className="text-amber-600">{row.commissionAmount.toFixed(2)}</TableCell>
                  <TableCell numeric className="font-medium">{row.factoryAmount.toFixed(2)}</TableCell>
                  <TableCell numeric className="text-green-700">{row.collected.toFixed(2)}</TableCell>
                  <TableCell numeric className={row.balance > 0.001 ? "font-semibold text-destructive" : "text-green-700"}>
                    {row.balance.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals row */}
              <TableRow className="bg-muted/40 font-semibold border-t-2">
                <TableCell colSpan={3} className="text-sm">Total ({rows.length} dispatches)</TableCell>
                <TableCell numeric>{totals.totalTaken.toFixed(2)}</TableCell>
                <TableCell numeric className="text-muted-foreground">
                  {totals.wasteReturned > 0 ? `− ${totals.wasteReturned.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell numeric>{totals.netAmount.toFixed(2)}</TableCell>
                <TableCell numeric className="text-amber-600">{totals.commissionAmount.toFixed(2)}</TableCell>
                <TableCell numeric>{totals.factoryAmount.toFixed(2)}</TableCell>
                <TableCell numeric className="text-green-700">{totals.collected.toFixed(2)}</TableCell>
                <TableCell numeric className={totals.balance > 0.001 ? "text-destructive" : "text-green-700"}>
                  {totals.balance.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {openingBalance > 0 && (
        <p className="text-xs text-muted-foreground">
          * Opening balance of Rs {openingBalance.toFixed(2)} is included in the outstanding total.
        </p>
      )}
    </div>
  );
}
