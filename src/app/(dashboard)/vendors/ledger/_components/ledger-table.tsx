"use client";

import Link from "next/link";
import { format } from "date-fns";
import { toNepaliDateString } from "@/lib/nepali-date";
import type { LedgerEntry } from "../actions";
import { ExternalLink, Receipt } from "lucide-react";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHECK: "Cheque",
  ESEWA: "eSewa", KHALTI: "Khalti", IME_PAY: "IME Pay",
  FONEPAY: "FonePay", OTHER: "Other",
};

function Rs(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function LedgerTable({
  entries,
  openingBalance,
  closingBalance,
  from,
  to,
}: {
  entries: LedgerEntry[];
  openingBalance: number;
  closingBalance: number;
  from: string;
  to: string;
}) {
  const fromDate = new Date(from);
  const toDate   = new Date(to);

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">Date</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Reference</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Description</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs whitespace-nowrap">Invoice (Dr)</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs whitespace-nowrap">VAT (13%)</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs whitespace-nowrap">Excise (5%)</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs whitespace-nowrap">Payment (Cr)</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs whitespace-nowrap">Balance (Rs)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">

          {/* Opening balance row */}
          <tr className="bg-amber-50/60 dark:bg-amber-950/20 font-medium">
            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
              {format(fromDate, "dd MMM yyyy")}<br />
              <span className="text-[10px] text-muted-foreground/60">{toNepaliDateString(fromDate)}</span>
            </td>
            <td className="px-4 py-2.5 text-xs text-muted-foreground">—</td>
            <td className="px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400">Opening Balance</td>
            <td className="px-4 py-2.5 text-right text-xs">—</td>
            <td className="px-4 py-2.5 text-right text-xs">—</td>
            <td className="px-4 py-2.5 text-right text-xs">—</td>
            <td className="px-4 py-2.5 text-right text-xs">—</td>
            <td className="px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap">
              <span className={openingBalance > 0 ? "text-destructive" : openingBalance < 0 ? "text-emerald-600" : ""}>
                Rs {Rs(openingBalance)}
              </span>
            </td>
          </tr>

          {entries.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">
                No transactions in this period.
              </td>
            </tr>
          )}

          {entries.map((e) => {
            const d = new Date(e.date);
            const isInvoice = e.type === "INVOICE";
            return (
              <tr
                key={e.id}
                className={`${isInvoice ? "" : "bg-emerald-50/30 dark:bg-emerald-950/10"} hover:bg-muted/30 transition-colors`}
              >
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {format(d, "dd MMM yyyy")}<br />
                  <span className="text-[10px] text-muted-foreground/60">{toNepaliDateString(d)}</span>
                </td>
                <td className="px-4 py-2.5 text-xs font-mono">
                  <div className="flex items-center gap-1">
                    {e.reference}
                    {e.invoiceUrl && (
                      <a href={e.invoiceUrl} target="_blank" rel="noreferrer" title="View invoice">
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                    {e.purchaseId && isInvoice && (
                      <Link href={`/purchases/${e.purchaseId}/print`} target="_blank" title="Print invoice">
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                      </Link>
                    )}
                    {e.receiptUrl && (
                      <a href={e.receiptUrl} target="_blank" rel="noreferrer" title="View payment receipt">
                        <Receipt className="h-3 w-3 text-emerald-600 hover:text-emerald-700" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  <div>{e.description}</div>
                  {e.paymentMethod && (
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {METHOD_LABEL[e.paymentMethod] ?? e.paymentMethod}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                  {e.invoiceAmount > 0 ? (
                    <span className="font-medium">Rs {Rs(e.invoiceAmount)}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                  {e.vatAmount > 0 ? (
                    <span className="text-blue-600 font-medium">Rs {Rs(e.vatAmount)}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                  {e.exciseAmount > 0 ? (
                    <span className="text-purple-600 font-medium">Rs {Rs(e.exciseAmount)}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                  {e.paymentAmount > 0 ? (
                    <span className="text-emerald-600 font-medium">Rs {Rs(e.paymentAmount)}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold whitespace-nowrap">
                  <span className={e.balance > 0.005 ? "text-destructive" : e.balance < -0.005 ? "text-emerald-600" : "text-muted-foreground"}>
                    Rs {Rs(e.balance)}
                  </span>
                </td>
              </tr>
            );
          })}

          {/* Closing balance row */}
          <tr className="border-t-2 border-border bg-muted/30 font-semibold">
            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
              {format(toDate, "dd MMM yyyy")}<br />
              <span className="text-[10px] text-muted-foreground/60">{toNepaliDateString(toDate)}</span>
            </td>
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5 text-xs font-bold">Closing Balance</td>
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5 text-right tabular-nums font-bold whitespace-nowrap">
              <span className={closingBalance > 0.005 ? "text-destructive" : closingBalance < -0.005 ? "text-emerald-600" : ""}>
                Rs {Rs(closingBalance)}
              </span>
              <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
                {closingBalance > 0.005 ? "Payable to vendor" : closingBalance < -0.005 ? "Vendor owes you" : "Settled"}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
