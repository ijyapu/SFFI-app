import { format } from "date-fns";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { getAllSuppliers, getVendorLedger } from "./actions";
import { getCurrentNepalFYYear, getNepalFYDates } from "./nepal-fy";
import { LedgerFilters } from "./_components/ledger-filters";
import { LedgerTable } from "./_components/ledger-table";
import { TaxSummary } from "./_components/tax-summary";
import { RecordPaymentButton } from "./_components/record-payment-dialog";
import { toNepaliDateString } from "@/lib/nepali-date";
import { BookOpen } from "lucide-react";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Vendor Ledger" };

interface PageProps {
  searchParams: Promise<{ supplierId?: string; from?: string; to?: string }>;
}

export default async function VendorLedgerPage({ searchParams }: PageProps) {
  await requirePermission("purchases");
  const params = await searchParams;

  // Default date range: current Nepal FY
  const currentFYYear = getCurrentNepalFYYear();
  const fyDates       = getNepalFYDates(currentFYYear);
  const defaultFrom   = fyDates.from.toISOString().split("T")[0];
  const defaultTo     = fyDates.to.toISOString().split("T")[0];

  const supplierId = params.supplierId ?? "";
  const from       = params.from ?? defaultFrom;
  const to         = params.to   ?? defaultTo;

  const suppliers = await getAllSuppliers();

  let ledgerData = null;
  let error: string | null = null;

  if (supplierId) {
    try {
      const fromDate = new Date(from + "T00:00:00.000Z");
      const toDate   = new Date(to   + "T23:59:59.999Z");
      ledgerData = await getVendorLedger(supplierId, fromDate, toDate);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load ledger";
    }
  }

  const today = new Date();

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 14mm; }
          nav, aside, header, .no-print { display: none !important; }
          body { font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-before: always; }

          /* Force table to fill the page and never overflow */
          .print-table-wrapper {
            overflow: visible !important;
            width: 100% !important;
          }
          .print-table-wrapper table {
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 9px !important;
            border-collapse: collapse !important;
          }
          .print-table-wrapper th,
          .print-table-wrapper td {
            padding: 4px 5px !important;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          /* Column widths tuned for A4 landscape */
          .print-table-wrapper th:nth-child(1),
          .print-table-wrapper td:nth-child(1) { width: 13%; } /* Date */
          .print-table-wrapper th:nth-child(2),
          .print-table-wrapper td:nth-child(2) { width: 10%; } /* Reference */
          .print-table-wrapper th:nth-child(3),
          .print-table-wrapper td:nth-child(3) { width: 18%; white-space: normal; } /* Description */
          .print-table-wrapper th:nth-child(4),
          .print-table-wrapper td:nth-child(4) { width: 13%; } /* Invoice */
          .print-table-wrapper th:nth-child(5),
          .print-table-wrapper td:nth-child(5) { width: 10%; } /* VAT */
          .print-table-wrapper th:nth-child(6),
          .print-table-wrapper td:nth-child(6) { width: 10%; } /* Excise */
          .print-table-wrapper th:nth-child(7),
          .print-table-wrapper td:nth-child(7) { width: 13%; } /* Payment */
          .print-table-wrapper th:nth-child(8),
          .print-table-wrapper td:nth-child(8) { width: 13%; } /* Balance */

          /* Avoid row splitting across pages */
          .print-table-wrapper tr { page-break-inside: avoid; }

          /* Hide icon links in print */
          .print-table-wrapper a svg { display: none; }
        }
      `}</style>

      <div className="space-y-6 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 no-print">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold tracking-tight">Vendor Ledger</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Account payable ledger per vendor · {format(today, "d MMMM yyyy")} · {toNepaliDateString(today)}
            </p>
          </div>
          {ledgerData && (
            <div className="flex items-start gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold">{ledgerData.supplier.name}</p>
                {ledgerData.supplier.pan && (
                  <p className="text-xs text-muted-foreground">PAN: {ledgerData.supplier.pan}</p>
                )}
              </div>
              <RecordPaymentButton
                supplierId={supplierId}
                supplierName={ledgerData.supplier.name}
                outstandingBalance={ledgerData.closingBalance}
                outstandingInvoices={ledgerData.outstandingInvoices}
              />
            </div>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="no-print">
          <Suspense>
            <LedgerFilters
              suppliers={suppliers}
              supplierId={supplierId}
              from={from}
              to={to}
            />
          </Suspense>
        </div>

        {/* ── Empty state ── */}
        {!supplierId && (
          <div className="rounded-lg border border-dashed p-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Select a vendor to view their ledger</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Shows all invoices, payments, opening & closing balances with Nepal tax breakdown
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
            {error}
          </div>
        )}

        {ledgerData && (
          <>
            {/* Print header (only visible when printing) */}
            <div className="hidden print:block mb-4">
              <div className="flex justify-between items-start border-b-2 border-red-700 pb-3 mb-4">
                <div>
                  <p className="text-lg font-bold text-red-700">{COMPANY.name.toUpperCase()}</p>
                  <p className="text-sm text-gray-500">{COMPANY.address} · PAN: {COMPANY.pan}</p>
                  <p className="text-xs text-gray-400">Tel: {COMPANY.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold">VENDOR LEDGER</p>
                  <p className="text-sm">{ledgerData.supplier.name}</p>
                  {ledgerData.supplier.pan && <p className="text-xs text-gray-500">Supplier PAN: {ledgerData.supplier.pan}</p>}
                  <p className="text-xs text-gray-500">
                    {format(new Date(from), "d MMM yyyy")} – {format(new Date(to), "d MMM yyyy")}
                  </p>
                  <p className="text-xs text-gray-400">Printed: {format(today, "d MMM yyyy, HH:mm")}</p>
                </div>
              </div>
            </div>

            {/* ── KPI cards ── */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 no-print">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Opening Balance</p>
                <p className={`text-xl font-bold tabular-nums ${ledgerData.openingBalance > 0.005 ? "text-destructive" : "text-emerald-600"}`}>
                  Rs {ledgerData.openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{format(new Date(from), "d MMM yyyy")}</p>
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
                <p className="text-xl font-bold tabular-nums">
                  Rs {ledgerData.taxSummary.totalInvoiced.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{ledgerData.taxSummary.invoiceCount} invoice{ledgerData.taxSummary.invoiceCount !== 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</p>
                <p className="text-xl font-bold tabular-nums text-emerald-600">
                  Rs {ledgerData.taxSummary.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Payments made</p>
              </div>
              <div className={`rounded-lg border p-4 space-y-1 ${ledgerData.closingBalance > 0.005 ? "border-destructive/40 bg-destructive/5" : "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10"}`}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Closing Balance</p>
                <p className={`text-xl font-bold tabular-nums ${ledgerData.closingBalance > 0.005 ? "text-destructive" : "text-emerald-600"}`}>
                  Rs {ledgerData.closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ledgerData.closingBalance > 0.005 ? "You owe vendor" : ledgerData.closingBalance < -0.005 ? "Vendor owes you" : "Settled"}
                </p>
              </div>
            </div>

            {/* ── Ledger table ── */}
            <div className="print-table-wrapper">
              <LedgerTable
                entries={ledgerData.entries}
                openingBalance={ledgerData.openingBalance}
                closingBalance={ledgerData.closingBalance}
                from={from}
                to={to}
              />
            </div>

            {/* ── Tax Summary ── */}
            <div className="print-break">
              <TaxSummary data={ledgerData} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
