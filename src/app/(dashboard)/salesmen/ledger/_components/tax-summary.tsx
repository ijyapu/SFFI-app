import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import type { CustomerLedgerData } from "../actions";
import { COMPANY } from "@/lib/company";

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TaxSummary({ data }: { data: CustomerLedgerData }) {
  const { salesman, taxSummary, from, to } = data;
  const hasPan = !!salesman.pan;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Tax Summary — Sales Book (Bikri Bahi)</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {format(new Date(from), "d MMM yyyy")} – {format(new Date(to), "d MMM yyyy")}
        </span>
      </div>

      {/* PAN check */}
      {!hasPan && taxSummary.vatInvoiceCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Salesman PAN not recorded</p>
            <p className="text-xs mt-0.5">
              IRD requires salesman PAN for VAT-taxable sales above Rs 5,000. Update this salesman&apos;s profile.
            </p>
          </div>
        </div>
      )}

      {hasPan && taxSummary.vatInvoiceCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Salesman PAN ({salesman.pan}) recorded — eligible for VAT sales book entry.</p>
        </div>
      )}

      {/* Summary table */}
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
              <td className="px-4 py-2.5">Gross Sales (before tax)</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{fmt(taxSummary.totalSales)}</td>
            </tr>
            <tr className="bg-blue-50/30 dark:bg-blue-950/10">
              <td className="px-4 py-2.5">
                <span className="font-medium text-blue-700 dark:text-blue-400">VAT Collected @ 13%</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  Output VAT — {taxSummary.vatInvoiceCount} of {taxSummary.invoiceCount} invoices taxable
                </span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium text-blue-700 dark:text-blue-400">
                {fmt(taxSummary.totalVat)}
              </td>
            </tr>
            <tr className="font-semibold">
              <td className="px-4 py-2.5">Total Invoiced (incl. tax)</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{fmt(taxSummary.totalInvoiced)}</td>
            </tr>
            {taxSummary.totalReturns > 0 && (
              <tr className="text-orange-700 dark:text-orange-400">
                <td className="px-4 py-2.5">Sales Returns / Credit Notes</td>
                <td className="px-4 py-2.5 text-right tabular-nums">({fmt(taxSummary.totalReturns)})</td>
              </tr>
            )}
            <tr className="text-emerald-700 dark:text-emerald-400">
              <td className="px-4 py-2.5">Payments Received</td>
              <td className="px-4 py-2.5 text-right tabular-nums">({fmt(taxSummary.totalReceived)})</td>
            </tr>
            <tr className={`font-bold text-base border-t-2 ${data.closingBalance > 0.005 ? "text-blue-700 bg-blue-50/50" : "text-emerald-700 bg-emerald-50/50"}`}>
              <td className="px-4 py-3">Net Receivable (Closing Balance)</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmt(data.closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* IRD compliance notes */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nepal IRD — Sales Book (Bikri Bahi) Notes</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>VAT collected (output VAT) must be deposited with IRD by the 25th of the following month.</li>
          <li>VAT invoices must include {COMPANY.name}&apos;s PAN ({COMPANY.pan}), salesman name, and salesman PAN (if applicable).</li>
          <li>Sales returns must be supported by a credit note — keep copies for IRD audit.</li>
          <li>Net VAT payable = Output VAT (collected) − Input VAT credit (from purchases).</li>
          <li>All amounts in Nepalese Rupees (NPR). Fiscal year: Shrawan 1 to Ashadh end (B.S. calendar).</li>
        </ul>
      </div>
    </div>
  );
}
