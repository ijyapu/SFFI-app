"use client";

import { useState, useMemo } from "react";
import { ChevronRight, Minus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";
import { toNepaliDateString } from "@/lib/nepali-date";
import type { CustomerLedgerEntry } from "../actions";

type DayGroup = {
  dateStr:        string;
  entries:        CustomerLedgerEntry[];
  invoiced:       number;
  returned:       number;
  commission:     number;
  collected:      number;
  netChange:      number;
  openingBalance: number;
  closingBalance: number;
};

const TYPE_BADGE: Record<string, string> = {
  INVOICE:    "bg-slate-100 text-slate-700",
  RETURN:     "bg-amber-100 text-amber-700",
  COMMISSION: "bg-amber-100 text-amber-700",
  PAYMENT:    "bg-emerald-100 text-emerald-700",
};

const TYPE_LABEL: Record<string, string> = {
  INVOICE:    "Invoice",
  RETURN:     "Return",
  COMMISSION: "Commission",
  PAYMENT:    "Payment",
};

const METHOD_LABELS: Record<string, string> = {
  CASH:          "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHECK:         "Cheque",
  ESEWA:         "eSewa",
  KHALTI:        "Khalti",
  IME_PAY:       "IME Pay",
  FONEPAY:       "fonePay",
  OTHER:         "Other",
};

function EntryRow({ entry }: { entry: CustomerLedgerEntry }) {
  const isInvoice = entry.type === "INVOICE";
  const amount    = isInvoice ? entry.invoiceAmount : entry.paymentAmount;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors duration-100">
      <td className="px-3 py-2 w-28">
        <span className={cn(
          "inline-block rounded px-1.5 py-0.5 text-[11px] font-medium",
          TYPE_BADGE[entry.type] ?? "bg-muted text-muted-foreground",
        )}>
          {TYPE_LABEL[entry.type] ?? entry.type}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-xs">
        {entry.salesOrderId ? (
          <a
            href={`/sales/${entry.salesOrderId}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {entry.reference}
          </a>
        ) : entry.reference}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground max-w-52 truncate">
        {entry.type === "PAYMENT" && entry.paymentMethod
          ? `${METHOD_LABELS[entry.paymentMethod] ?? entry.paymentMethod}${entry.description ? ` · ${entry.description}` : ""}`
          : entry.description}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-sm font-medium">
        <span className={cn(
          isInvoice              ? "text-slate-700 dark:text-slate-300" :
          entry.type === "PAYMENT" ? "text-emerald-700"                  :
                                     "text-amber-600"
        )}>
          {isInvoice ? "+" : "−"}{formatAmount(amount)}
        </span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-xs font-semibold">
        <span className={entry.balance > 0.005 ? "text-amber-700" : "text-emerald-700"}>
          {formatAmount(entry.balance)}
        </span>
      </td>
    </tr>
  );
}

function DayRow({ day }: { day: DayGroup }) {
  const [expanded, setExpanded] = useState(false);
  const dateObj     = new Date(day.dateStr + "T12:00:00");
  const displayDate = format(dateObj, "EEE, d MMM yyyy");
  const nepaliDate  = toNepaliDateString(dateObj);

  return (
    <div className="border-b last:border-0">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-3 text-left transition-colors duration-100",
          "hover:bg-muted/30 cursor-pointer",
          expanded && "bg-muted/20",
        )}
      >
        {/* Chevron */}
        <span className="w-4 shrink-0 text-muted-foreground">
          <ChevronRight className={cn(
            "h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none",
            expanded && "rotate-90",
          )} />
        </span>

        {/* Date */}
        <span className="flex-1 min-w-36">
          <span className="text-sm font-medium">{displayDate}</span>
          <span className="block text-[11px] text-muted-foreground/70 tabular-nums">{nepaliDate}</span>
        </span>

        {/* Opening balance */}
        <span className="hidden sm:block w-28 text-right tabular-nums text-xs text-muted-foreground">
          {formatAmount(day.openingBalance)}
        </span>

        {/* Invoiced */}
        <span className="hidden md:block w-24 text-right tabular-nums text-xs">
          {day.invoiced > 0
            ? <span className="text-slate-700 dark:text-slate-300">{formatAmount(day.invoiced)}</span>
            : <span className="text-muted-foreground/40">—</span>}
        </span>

        {/* Returns */}
        <span className="hidden md:block w-24 text-right tabular-nums text-xs">
          {day.returned > 0
            ? <span className="text-amber-600">− {formatAmount(day.returned)}</span>
            : <span className="text-muted-foreground/40">—</span>}
        </span>

        {/* Commission */}
        <span className="hidden md:block w-24 text-right tabular-nums text-xs">
          {day.commission > 0
            ? <span className="text-amber-600">− {formatAmount(day.commission)}</span>
            : <span className="text-muted-foreground/40">—</span>}
        </span>

        {/* Collected */}
        <span className="hidden md:block w-24 text-right tabular-nums text-xs">
          {day.collected > 0
            ? <span className="text-emerald-700">− {formatAmount(day.collected)}</span>
            : <span className="text-muted-foreground/40">—</span>}
        </span>

        {/* Net Δ */}
        <span className={cn(
          "hidden sm:block w-20 text-right tabular-nums text-xs font-medium",
          day.netChange > 0.005  ? "text-slate-700 dark:text-slate-300" :
          day.netChange < -0.005 ? "text-emerald-700"                   :
                                   "text-muted-foreground",
        )}>
          {day.netChange > 0.005
            ? `+${formatAmount(day.netChange)}`
            : day.netChange < -0.005
            ? `− ${formatAmount(Math.abs(day.netChange))}`
            : "—"}
        </span>

        {/* Closing balance */}
        <span className={cn(
          "w-28 text-right tabular-nums text-sm font-semibold",
          day.closingBalance > 0.005 ? "text-amber-700" : "text-emerald-700",
        )}>
          {formatAmount(Math.abs(day.closingBalance))}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-8 pb-4 bg-muted/10 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground w-28">Type</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Reference</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                {day.entries.map((e) => <EntryRow key={e.id} entry={e} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  entries:        CustomerLedgerEntry[];
  openingBalance: number;
  closingBalance: number;
};

export function DayLedgerTable({ entries, openingBalance, closingBalance }: Props) {
  const dayGroups = useMemo<DayGroup[]>(() => {
    // Group by salesOrderDate (the dispatch date) so payments/returns made later
    // still appear under the day the goods were originally sent out.
    const map = new Map<string, CustomerLedgerEntry[]>();
    for (const e of entries) {
      const key    = e.salesOrderDate.slice(0, 10);
      const bucket = map.get(key) ?? [];
      bucket.push(e);
      map.set(key, bucket);
    }

    // Sort groups chronologically by sale date, then recompute running balances
    // in that order so the balance column stays meaningful.
    const sortedKeys = [...map.keys()].sort();
    let running = openingBalance;
    const groups: DayGroup[] = [];

    for (const dateStr of sortedKeys) {
      const dayEntries = map.get(dateStr)!;
      const invoiced   = dayEntries.filter(e => e.type === "INVOICE").reduce((s, e) => s + e.invoiceAmount, 0);
      const returned   = dayEntries.filter(e => e.type === "RETURN").reduce((s, e) => s + e.paymentAmount, 0);
      const commission = dayEntries.filter(e => e.type === "COMMISSION").reduce((s, e) => s + e.paymentAmount, 0);
      const collected  = dayEntries.filter(e => e.type === "PAYMENT").reduce((s, e) => s + e.paymentAmount, 0);
      const netChange  = invoiced - returned - commission - collected;
      const open       = running;
      running         += netChange;

      groups.push({ dateStr, entries: dayEntries, invoiced, returned, commission, collected, netChange, openingBalance: open, closingBalance: running });
    }

    return groups.reverse(); // newest first for display
  }, [entries, openingBalance]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No transactions in this period.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">

      {/* Opening balance banner */}
      {openingBalance !== 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10 text-xs">
          <span className="text-muted-foreground italic">Opening balance brought forward</span>
          <span className={cn("font-semibold tabular-nums", openingBalance > 0.005 ? "text-amber-600" : "text-emerald-700")}>
            {formatAmount(openingBalance)}
          </span>
        </div>
      )}

      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        <span className="w-4 shrink-0" />
        <span className="flex-1 min-w-36">Date</span>
        <span className="hidden sm:block w-28 text-right">Opening</span>
        <span className="hidden md:block w-24 text-right">Invoiced</span>
        <span className="hidden md:block w-24 text-right text-amber-600">Returns</span>
        <span className="hidden md:block w-24 text-right text-amber-600">Commission</span>
        <span className="hidden md:block w-24 text-right text-emerald-700">Collected</span>
        <span className="hidden sm:block w-20 text-right">Net Δ</span>
        <span className="w-28 text-right font-semibold text-foreground">Balance</span>
      </div>

      {/* Day rows */}
      {dayGroups.map((day) => <DayRow key={day.dateStr} day={day} />)}

      {/* Closing balance footer */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3 border-t-2 text-sm",
        closingBalance > 0.005
          ? "bg-amber-50/40 dark:bg-amber-950/10"
          : "bg-emerald-50/40 dark:bg-emerald-950/10",
      )}>
        <span className="w-4 shrink-0" />
        <span className="flex-1 text-xs text-muted-foreground">
          Closing Balance · {entries.length} transaction{entries.length !== 1 ? "s" : ""}
        </span>
        <span className="hidden sm:block w-28" />
        <span className="hidden md:block w-24" />
        <span className="hidden md:block w-24" />
        <span className="hidden md:block w-24" />
        <span className="hidden md:block w-24" />
        <span className="hidden sm:block w-20" />
        <span className={cn(
          "w-28 text-right tabular-nums font-bold",
          closingBalance > 0.005 ? "text-amber-700" : "text-emerald-700",
        )}>
          {formatAmount(Math.abs(closingBalance))}
        </span>
      </div>

    </div>
  );
}
