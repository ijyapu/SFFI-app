import { format } from "date-fns";
import { TrendingDown, Percent } from "lucide-react";
import type { CustomerLedgerData } from "../actions";
import { Separator } from "@/components/ui/separator";

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CommissionSummary({ data }: { data: CustomerLedgerData }) {
  const { salesman, commissionSummary: cs, from, to } = data;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Commission Summary</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {format(new Date(from), "d MMM yyyy")} – {format(new Date(to), "d MMM yyyy")}
        </span>
      </div>

      {/* Salesman commission rate */}
      <div className="flex items-center gap-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/10 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Percent className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">{salesman.name}</p>
          <p className="text-xs text-muted-foreground">
            Current commission rate:{" "}
            <span className="font-mono font-bold text-amber-700">{salesman.commissionPct}%</span>
            {" "}— rate is set on the salesman profile and applied per order at dispatch
          </p>
        </div>
      </div>

      {/* Overall totals */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground tabular-nums">Amount (Rs)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-4 py-2.5">Total Invoiced ({cs.invoiceCount} invoice{cs.invoiceCount !== 1 ? "s" : ""})</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{fmt(cs.totalInvoiced)}</td>
            </tr>
            {cs.totalWaste > 0.001 && (
              <tr className="text-orange-700 dark:text-orange-400">
                <td className="px-4 py-2.5 flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Waste Deducted
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">({fmt(cs.totalWaste)})</td>
              </tr>
            )}
            <tr className="bg-muted/20">
              <td className="px-4 py-2.5 font-medium">Net Invoiced (after waste)</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                {fmt(cs.totalInvoiced - cs.totalWaste)}
              </td>
            </tr>
            <tr className="text-amber-700 dark:text-amber-400">
              <td className="px-4 py-2.5">Commission Deducted</td>
              <td className="px-4 py-2.5 text-right tabular-nums">({fmt(cs.totalCommission)})</td>
            </tr>
            <tr className="font-semibold bg-muted/20">
              <td className="px-4 py-2.5">Total Factory Amount</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{fmt(cs.totalFactoryAmount)}</td>
            </tr>
            <tr className="text-emerald-700 dark:text-emerald-400">
              <td className="px-4 py-2.5">Payments Received</td>
              <td className="px-4 py-2.5 text-right tabular-nums">({fmt(cs.totalReceived)})</td>
            </tr>
            <tr className={`font-bold text-base border-t-2 ${data.closingBalance > 0.005 ? "text-blue-700 bg-blue-50/50" : "text-emerald-700 bg-emerald-50/50"}`}>
              <td className="px-4 py-3">Outstanding Balance</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmt(data.closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Per-invoice breakdown */}
      {cs.invoiceBreakdown.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Per-Invoice Breakdown
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Invoice</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Invoiced (Rs)</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Waste (Rs)</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Net (Rs)</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Comm %</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Commission (Rs)</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Factory (Rs)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cs.invoiceBreakdown.map((row) => (
                  <tr key={row.orderId} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono">
                      <a
                        href={`/sales/${row.orderId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {row.orderNumber}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(row.invoiceAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-orange-600">
                      {row.wasteDeducted > 0.001 ? `(${fmt(row.wasteDeducted)})` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(row.netAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700 font-mono">
                      {row.commissionPct}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                      ({fmt(row.commissionAmount)})
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(row.factoryAmount)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-muted/30 font-semibold border-t-2">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(cs.totalInvoiced)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-orange-600">
                    {cs.totalWaste > 0.001 ? `(${fmt(cs.totalWaste)})` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(cs.totalInvoiced - cs.totalWaste)}</td>
                  <td className="px-3 py-2 text-right" />
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700">({fmt(cs.totalCommission)})</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(cs.totalFactoryAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
