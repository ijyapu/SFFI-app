import type { VendorLedgerData } from "../actions";
import { format } from "date-fns";
import { toNepaliMonthYear } from "@/lib/nepali-date";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { COMPANY } from "@/lib/company";

function Rs(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TaxSummary({ data }: { data: VendorLedgerData }) {
  const { taxSummary: t, supplier, from, to } = data;
  const hasPan = !!supplier.pan;
  const hasVat = t.totalVat > 0;
  const hasExcise = t.totalExcise > 0;
  const fromDate = new Date(from);
  const toDate   = new Date(to);

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="bg-muted/40 px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Nepal Tax Summary</h3>
          <span className="text-xs text-muted-foreground">
            (IRD Purchase Book — VAT Input Credit) · PAN: {COMPANY.pan}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {format(fromDate, "d MMM yyyy")} – {format(toDate, "d MMM yyyy")}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Supplier VAT info */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Supplier</p>
            <p className="font-semibold">{supplier.name}</p>
            {supplier.contactName && <p className="text-muted-foreground text-xs">{supplier.contactName}</p>}
            {supplier.address && <p className="text-muted-foreground text-xs">{supplier.address}</p>}
            <div className="flex items-center gap-1.5 mt-1">
              {hasPan ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-mono font-medium">PAN: {supplier.pan}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-amber-600">No PAN — VAT input credit may not be claimable</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-1 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Period</p>
            <p className="font-semibold">{format(fromDate, "d MMMM yyyy")} – {format(toDate, "d MMMM yyyy")}</p>
            <p className="text-xs text-muted-foreground">
              {toNepaliMonthYear(fromDate)} – {toNepaliMonthYear(toDate)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.invoiceCount} invoice{t.invoiceCount !== 1 ? "s" : ""} ·{" "}
              {t.vatInvoiceCount} with VAT
            </p>
          </div>
        </div>

        {/* Tax breakdown table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Description</th>
              <th className="pb-2 text-right text-xs font-medium text-muted-foreground">Amount (Rs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="py-2 text-sm">Gross Purchase Value (before tax)</td>
              <td className="py-2 text-right tabular-nums font-medium">Rs {Rs(t.totalPurchases)}</td>
            </tr>
            {hasVat && (
              <tr>
                <td className="py-2 text-sm text-blue-700">
                  VAT Input Tax (13%)
                  {hasPan
                    ? <span className="ml-2 text-xs text-emerald-600">✓ Claimable (supplier has PAN)</span>
                    : <span className="ml-2 text-xs text-amber-600">⚠ Verify supplier PAN for IRD claim</span>
                  }
                </td>
                <td className="py-2 text-right tabular-nums font-medium text-blue-700">Rs {Rs(t.totalVat)}</td>
              </tr>
            )}
            {hasExcise && (
              <tr>
                <td className="py-2 text-sm text-purple-700">
                  Excise Duty (5%)
                  <span className="ml-2 text-xs text-muted-foreground">Not reclaimable as input credit</span>
                </td>
                <td className="py-2 text-right tabular-nums font-medium text-purple-700">Rs {Rs(t.totalExcise)}</td>
              </tr>
            )}
            <tr className="border-t-2 font-semibold">
              <td className="py-2">Total Invoice Value (inc. taxes)</td>
              <td className="py-2 text-right tabular-nums">Rs {Rs(t.totalInvoiced)}</td>
            </tr>
            <tr>
              <td className="py-2 text-emerald-700">Total Payments Made</td>
              <td className="py-2 text-right tabular-nums text-emerald-700">Rs {Rs(t.totalPaid)}</td>
            </tr>
            <tr className={`border-t font-bold ${data.closingBalance > 0.005 ? "text-destructive" : data.closingBalance < -0.005 ? "text-emerald-700" : ""}`}>
              <td className="py-2">
                Net Payable Balance (Closing)
                <div className="text-xs font-normal text-muted-foreground mt-0.5">
                  {data.closingBalance > 0.005
                    ? "Amount still owed to vendor"
                    : data.closingBalance < -0.005
                    ? "Vendor owes you (overpaid)"
                    : "Account settled — no outstanding balance"}
                </div>
              </td>
              <td className="py-2 text-right tabular-nums text-lg">Rs {Rs(data.closingBalance)}</td>
            </tr>
          </tbody>
        </table>

        {/* IRD Notes */}
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 space-y-1.5 text-xs text-blue-800 dark:text-blue-300">
          <p className="font-semibold text-sm">IRD Compliance Notes (Nepal)</p>
          <ul className="space-y-1 list-disc list-inside text-xs">
            <li>VAT-registered businesses must file monthly VAT returns within <strong>25 days</strong> of month end (per VAT Act 2052).</li>
            <li>Input VAT credit requires supplier PAN and a valid VAT invoice (Bill No, Date, Supplier PAN, Amount, VAT Amount).</li>
            <li>Excise duty paid on purchases <strong>cannot</strong> be claimed as input VAT credit.</li>
            <li>Maintain Purchase Book (Kharid Bahi) showing all purchases — this ledger serves that purpose.</li>
            <li>Nepal Fiscal Year: <strong>Shrawan 1 – Ashadh 31</strong> (BS). Annual return due within 3 months of FY end.</li>
            <li>All invoices above <strong>Rs 10,000</strong> must be backed by a VAT bill from a registered supplier.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
