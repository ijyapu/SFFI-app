"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AgingRow {
  id: string;
  orderNumber: string;
  partyName: string;   // customer or supplier
  orderDate: string;
  dueDate: string | null;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  ageDays: number;
  bucket: "current" | "1-30" | "31-60" | "61-90" | "91+";
}

interface Props {
  rows: AgingRow[];
  partyLabel: string; // "Customer" | "Supplier"
  orderLabel: string; // "Sales Order" | "Purchase Order"
  linkBase: string;   // "/sales" | "/purchases"
}

const BUCKETS = ["current", "1-30", "31-60", "61-90", "91+"] as const;

const BUCKET_LABEL: Record<string, string> = {
  current: "Current (not yet due)",
  "1-30":  "1–30 days overdue",
  "31-60": "31–60 days overdue",
  "61-90": "61–90 days overdue",
  "91+":   "91+ days overdue",
};

const BUCKET_COLOR: Record<string, string> = {
  current: "",
  "1-30":  "text-amber-600",
  "31-60": "text-orange-600",
  "61-90": "text-red-600",
  "91+":   "text-destructive font-semibold",
};

const Rs = (n: number) =>
  "Rs " + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function AgingTable({ rows, partyLabel, orderLabel, linkBase }: Props) {
  const [filterBucket, setFilterBucket] = useState<string>("all");

  const totals = BUCKETS.reduce(
    (acc, b) => {
      acc[b] = rows.filter((r) => r.bucket === b).reduce((s, r) => s + r.outstanding, 0);
      return acc;
    },
    {} as Record<string, number>
  );
  const grandTotal = rows.reduce((s, r) => s + r.outstanding, 0);

  const visible = filterBucket === "all"
    ? rows
    : rows.filter((r) => r.bucket === filterBucket);

  return (
    <div className="space-y-4">
      {/* Summary bands */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {BUCKETS.map((b) => (
          <button
            key={b}
            onClick={() => setFilterBucket(filterBucket === b ? "all" : b)}
            className={`rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
              filterBucket === b ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <p className={`text-lg font-bold tabular-nums ${BUCKET_COLOR[b]}`}>{Rs(totals[b])}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{BUCKET_LABEL[b]}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>
              {filterBucket === "all" ? "All outstanding" : BUCKET_LABEL[filterBucket]}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({visible.length} order{visible.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
            <span className="text-sm font-semibold">{Rs(grandTotal)} total</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{orderLabel}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{partyLabel}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Due</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Outstanding</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Age</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No outstanding balances.
                    </td>
                  </tr>
                )}
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <a
                        href={`${linkBase}/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.orderNumber}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.partyName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell whitespace-nowrap">
                      {format(new Date(row.orderDate), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell whitespace-nowrap">
                      {row.dueDate
                        ? <span className={row.bucket !== "current" ? "text-destructive" : ""}>
                            {format(new Date(row.dueDate), "d MMM yyyy")}
                          </span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{Rs(row.totalAmount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{Rs(row.amountPaid)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${BUCKET_COLOR[row.bucket]}`}>
                      {Rs(row.outstanding)}
                    </td>
                    <td className={`px-4 py-3 text-right text-xs ${BUCKET_COLOR[row.bucket]}`}>
                      {row.ageDays === 0 ? "today" : `${row.ageDays}d`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
