"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ERPSection } from "@/components/ui/erp-section";
import { formatAmount } from "@/lib/format";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmptyRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LedgerRow = {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  totalTaken: number;
  freshReturned: number;
  wasteReturned: number;
  netAmount: number;
  commissionPct: number;
  commissionAmount: number;
  factoryAmount: number;
  collected: number;
  balance: number;
};

type DayGroup = {
  date: string;
  orders: LedgerRow[];
  totalTaken: number;
  freshReturned: number;
  wasteReturned: number;
  commissionAmount: number;
  factoryAmount: number;
  collected: number;
  netChange: number;
  runningBalance: number;
};

type Props = {
  customerName: string;
  commissionPct: number;
  openingBalance: number;
  rows: LedgerRow[];
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:          "Draft",
  CONFIRMED:      "Confirmed",
  PARTIALLY_PAID: "Partial",
  PAID:           "Paid",
  CANCELLED:      "Voided",
  LOST:           "Lost",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:          "bg-muted text-muted-foreground",
  CONFIRMED:      "bg-slate-100 text-slate-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID:           "bg-emerald-100 text-emerald-700",
  CANCELLED:      "bg-red-100 text-red-600",
  LOST:           "bg-amber-100 text-amber-700",
};

// Consistent grid template used for column header, day rows, and totals footer
const COL_GRID = "grid grid-cols-[minmax(160px,1fr)_repeat(7,minmax(0,96px))_28px] gap-x-3";

export function SalesmanLedger({ commissionPct, openingBalance, rows }: Props) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      totalTaken:       acc.totalTaken       + r.totalTaken,
      freshReturned:    acc.freshReturned    + r.freshReturned,
      wasteReturned:    acc.wasteReturned    + r.wasteReturned,
      commissionAmount: acc.commissionAmount + r.commissionAmount,
      factoryAmount:    acc.factoryAmount    + r.factoryAmount,
      collected:        acc.collected        + r.collected,
      balance:          acc.balance          + r.balance,
    }),
    { totalTaken: 0, freshReturned: 0, wasteReturned: 0, commissionAmount: 0, factoryAmount: 0, collected: 0, balance: 0 }
  ), [rows]);

  const totalOutstanding = openingBalance + totals.balance;

  // Build day groups sorted chronologically, then reverse for newest-first display
  const dayGroups = useMemo<DayGroup[]>(() => {
    const sorted = [...rows].sort((a, b) =>
      a.orderDate < b.orderDate ? -1 : a.orderDate > b.orderDate ? 1 : 0
    );

    const map = new Map<string, LedgerRow[]>();
    for (const row of sorted) {
      const key = row.orderDate.slice(0, 10);
      const bucket = map.get(key) ?? [];
      bucket.push(row);
      map.set(key, bucket);
    }

    let running = openingBalance;
    const groups: DayGroup[] = [];
    for (const [date, orders] of map) {
      const totalTaken       = orders.reduce((s, o) => s + o.totalTaken, 0);
      const freshReturned    = orders.reduce((s, o) => s + o.freshReturned, 0);
      const wasteReturned    = orders.reduce((s, o) => s + o.wasteReturned, 0);
      const commissionAmount = orders.reduce((s, o) => s + o.commissionAmount, 0);
      const factoryAmount    = orders.reduce((s, o) => s + o.factoryAmount, 0);
      const collected        = orders.reduce((s, o) => s + o.collected, 0);
      const netChange        = orders.reduce((s, o) => s + o.balance, 0);
      running += netChange;
      groups.push({ date, orders, totalTaken, freshReturned, wasteReturned, commissionAmount, factoryAmount, collected, netChange, runningBalance: running });
    }

    return groups.reverse();
  }, [rows, openingBalance]);

  return (
    <div className="space-y-4">

      {/* ── KPI summary cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <p className="text-xs text-muted-foreground font-medium">Total Dispatched</p>
          <p className="text-xl font-bold mt-1 tabular-nums">{formatAmount(totals.totalTaken)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} order{rows.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <p className="text-xs text-muted-foreground font-medium">Commission ({commissionPct}%)</p>
          <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums">{formatAmount(totals.commissionAmount)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">deducted from factory</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <p className="text-xs text-muted-foreground font-medium">Total Collected</p>
          <p className="text-xl font-bold text-green-700 mt-1 tabular-nums">{formatAmount(totals.collected)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">of {formatAmount(totals.factoryAmount)} owed</p>
        </div>
        <div className={cn(
          "rounded-lg border px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          totalOutstanding > 0.005 ? "border-amber-300 bg-amber-50/40" : "border-green-300 bg-green-50/40"
        )}>
          <p className="text-xs text-muted-foreground font-medium">Outstanding Balance</p>
          <p className={cn("text-xl font-bold mt-1 tabular-nums", totalOutstanding > 0.005 ? "text-amber-700" : "text-green-700")}>
            {formatAmount(Math.abs(totalOutstanding))}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalOutstanding > 0.005 ? "still owed to factory" : totalOutstanding < -0.005 ? "credit / overpaid" : "fully settled"}
          </p>
        </div>
      </div>

      {/* ── Day-grouped ledger ── */}
      <ERPSection
        header={
          <div className="flex items-center justify-between w-full">
            <span className="font-medium text-sm">Ledger</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {dayGroups.length} day{dayGroups.length !== 1 ? "s" : ""} · {rows.length} dispatch{rows.length !== 1 ? "es" : ""}
            </span>
          </div>
        }
      >
        {/* Opening balance banner */}
        {openingBalance !== 0 && (
          <div className="px-4 py-2 border-b flex items-center justify-between text-xs bg-muted/10">
            <span className="text-muted-foreground italic">Opening balance brought forward</span>
            <span className={cn("font-semibold tabular-nums", openingBalance > 0 ? "text-amber-600" : "text-green-700")}>
              {formatAmount(openingBalance)}
            </span>
          </div>
        )}

        {rows.length === 0 ? (
          <Table>
            <TableBody>
              <TableEmptyRow colSpan={9} message="No dispatch records found for this salesman." />
            </TableBody>
          </Table>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-215">

              {/* Column header */}
              <div className={cn(COL_GRID, "px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground")}>
                <span>Date</span>
                <span className="text-right">Dispatched</span>
                <span className="text-right text-amber-600">Fresh Ret.</span>
                <span className="text-right text-red-600">Waste Ret.</span>
                <span className="text-right text-amber-600">Commission</span>
                <span className="text-right text-green-700">Collected</span>
                <span className="text-right">Net Δ</span>
                <span className="text-right font-semibold text-foreground">Balance</span>
                <span />
              </div>

              {/* Day rows */}
              <div className="divide-y">
                {dayGroups.map((day) => {
                  const isExpanded = expandedDays.has(day.date);
                  const displayDate = format(new Date(day.date + "T12:00:00"), "EEE, d MMM yyyy");

                  return (
                    <div key={day.date}>
                      {/* Day summary — clickable */}
                      <button
                        type="button"
                        onClick={() => toggleDay(day.date)}
                        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors duration-100"
                      >
                        <div className={cn(COL_GRID, "items-center")}>
                          {/* Date */}
                          <div>
                            <p className="text-sm font-semibold">{displayDate}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                              {day.orders.length} dispatch{day.orders.length !== 1 ? "es" : ""}
                            </p>
                          </div>

                          {/* Dispatched */}
                          <p className="text-right text-sm tabular-nums font-medium text-slate-700 dark:text-slate-300">
                            {formatAmount(day.totalTaken)}
                          </p>

                          {/* Fresh Return */}
                          <p className={cn(
                            "text-right text-sm tabular-nums",
                            day.freshReturned > 0 ? "text-amber-600" : "text-muted-foreground/40"
                          )}>
                            {day.freshReturned > 0 ? `− ${formatAmount(day.freshReturned)}` : "—"}
                          </p>

                          {/* Waste Return */}
                          <p className={cn(
                            "text-right text-sm tabular-nums",
                            day.wasteReturned > 0 ? "text-red-600" : "text-muted-foreground/40"
                          )}>
                            {day.wasteReturned > 0 ? `− ${formatAmount(day.wasteReturned)}` : "—"}
                          </p>

                          {/* Commission */}
                          <p className="text-right text-sm tabular-nums text-amber-600">
                            {formatAmount(day.commissionAmount)}
                          </p>

                          {/* Collected */}
                          <p className={cn(
                            "text-right text-sm tabular-nums",
                            day.collected > 0 ? "text-green-700" : "text-muted-foreground/40"
                          )}>
                            {day.collected > 0 ? formatAmount(day.collected) : "—"}
                          </p>

                          {/* Net Δ */}
                          <p className={cn(
                            "text-right text-sm tabular-nums font-medium",
                            day.netChange > 0.005
                              ? "text-slate-700 dark:text-slate-300"
                              : day.netChange < -0.005
                              ? "text-green-700"
                              : "text-muted-foreground/40"
                          )}>
                            {day.netChange > 0.005
                              ? `+${formatAmount(day.netChange)}`
                              : day.netChange < -0.005
                              ? `− ${formatAmount(Math.abs(day.netChange))}`
                              : "—"}
                          </p>

                          {/* Running Balance */}
                          <p className={cn(
                            "text-right text-sm tabular-nums font-semibold",
                            day.runningBalance > 0.005 ? "text-amber-700" : "text-green-700"
                          )}>
                            {formatAmount(Math.abs(day.runningBalance))}
                          </p>

                          {/* Chevron */}
                          <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-150 justify-self-center",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </button>

                      {/* Expanded order detail */}
                      {isExpanded && (
                        <div className="border-t border-dashed bg-muted/5">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableHead className="pl-8 text-xs">Order #</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead numeric className="text-xs">Taken</TableHead>
                                <TableHead numeric className="text-xs text-amber-600">Fresh Ret.</TableHead>
                                <TableHead numeric className="text-xs text-red-600">Waste Ret.</TableHead>
                                <TableHead numeric className="text-xs text-amber-600">Commission</TableHead>
                                <TableHead numeric className="text-xs">Factory Due</TableHead>
                                <TableHead numeric className="text-xs text-green-700">Collected</TableHead>
                                <TableHead numeric className="text-xs">Order Due</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {day.orders.map((order) => (
                                <TableRow key={order.id} className="hover:bg-muted/20 text-sm">
                                  <TableCell className="pl-8">
                                    <Link
                                      href={`/sales/${order.id}`}
                                      className="font-mono text-sm text-primary hover:underline"
                                    >
                                      {order.orderNumber}
                                    </Link>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="secondary"
                                      className={cn("text-xs", STATUS_BADGE[order.status] ?? "")}
                                    >
                                      {STATUS_LABEL[order.status] ?? order.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell numeric className="tabular-nums">
                                    {formatAmount(order.totalTaken)}
                                  </TableCell>
                                  <TableCell numeric className={cn("tabular-nums", order.freshReturned > 0 ? "text-amber-600" : "text-muted-foreground")}>
                                    {order.freshReturned > 0 ? `− ${formatAmount(order.freshReturned)}` : "—"}
                                  </TableCell>
                                  <TableCell numeric className={cn("tabular-nums", order.wasteReturned > 0 ? "text-red-600" : "text-muted-foreground")}>
                                    {order.wasteReturned > 0 ? `− ${formatAmount(order.wasteReturned)}` : "—"}
                                  </TableCell>
                                  <TableCell numeric className="tabular-nums text-amber-600">
                                    {formatAmount(order.commissionAmount)}
                                  </TableCell>
                                  <TableCell numeric className="tabular-nums font-medium">
                                    {formatAmount(order.factoryAmount)}
                                  </TableCell>
                                  <TableCell numeric className={cn("tabular-nums", order.collected > 0 ? "text-green-700" : "text-muted-foreground")}>
                                    {order.collected > 0 ? formatAmount(order.collected) : "—"}
                                  </TableCell>
                                  <TableCell numeric className={cn(
                                    "tabular-nums font-medium",
                                    order.balance > 0.005
                                      ? "text-amber-600"
                                      : order.balance < -0.005
                                      ? "text-green-700"
                                      : "text-muted-foreground"
                                  )}>
                                    {order.balance > 0.005
                                      ? formatAmount(order.balance)
                                      : order.balance < -0.005
                                      ? `(${formatAmount(Math.abs(order.balance))})`
                                      : "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totals footer */}
              <div className={cn(COL_GRID, "px-4 py-3 border-t-2 bg-muted/30 text-sm font-semibold tabular-nums items-center")}>
                <span className="text-muted-foreground font-normal text-xs">
                  {rows.length} dispatch{rows.length !== 1 ? "es" : ""} · {dayGroups.length} day{dayGroups.length !== 1 ? "s" : ""}
                </span>
                <span className="text-right">{formatAmount(totals.totalTaken)}</span>
                <span className={cn("text-right", totals.freshReturned > 0 ? "text-amber-600" : "text-muted-foreground/40")}>
                  {totals.freshReturned > 0 ? `− ${formatAmount(totals.freshReturned)}` : "—"}
                </span>
                <span className={cn("text-right", totals.wasteReturned > 0 ? "text-red-600" : "text-muted-foreground/40")}>
                  {totals.wasteReturned > 0 ? `− ${formatAmount(totals.wasteReturned)}` : "—"}
                </span>
                <span className="text-right text-amber-600">{formatAmount(totals.commissionAmount)}</span>
                <span className="text-right text-green-700">{formatAmount(totals.collected)}</span>
                <span className={cn(
                  "text-right",
                  totals.balance > 0.005
                    ? "text-slate-700 dark:text-slate-300"
                    : totals.balance < -0.005
                    ? "text-green-700"
                    : "text-muted-foreground/40"
                )}>
                  {totals.balance > 0.005
                    ? `+${formatAmount(totals.balance)}`
                    : totals.balance < -0.005
                    ? `− ${formatAmount(Math.abs(totals.balance))}`
                    : "—"}
                </span>
                <span className={cn("text-right", totalOutstanding > 0.005 ? "text-amber-700" : "text-green-700")}>
                  {formatAmount(Math.abs(totalOutstanding))}
                </span>
                <span />
              </div>

            </div>
          </div>
        )}
      </ERPSection>
    </div>
  );
}
