import { format } from "date-fns";
import { Suspense } from "react";
import { getAllCustomers, getCustomerLedger } from "./actions";
import { getNepalFYDates, getCurrentNepalFYYear } from "@/app/(dashboard)/vendors/ledger/nepal-fy";
import { LedgerFilters } from "./_components/ledger-filters";
import { LedgerTable } from "./_components/ledger-table";
import { TaxSummary } from "./_components/tax-summary";
import { toNepaliDateString } from "@/lib/nepali-date";
import { BookMarked } from "lucide-react";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Salesman Ledger" };

interface PageProps {
  searchParams: Promise<{ customerId?: string; from?: string; to?: string }>;
}

export default async function CustomerLedgerPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const currentFYYear = getCurrentNepalFYYear();
  const fyDates       = getNepalFYDates(currentFYYear);
  const defaultFrom   = fyDates.from.toISOString().split("T")[0];
  const defaultTo     = fyDates.to.toISOString().split("T")[0];

  const customerId = params.customerId ?? "";
  const from       = params.from ?? defaultFrom;
  const to         = params.to   ?? defaultTo;

  const salesmen = await getAllCustomers();

  let ledgerData = null;
  let error: string | null = null;

  if (customerId) {
    try {
      const fromDate = new Date(from + "T00:00:00.000Z");
      const toDate   = new Date(to   + "T23:59:59.999Z");
      ledgerData = await getCustomerLedger(customerId, fromDate, toDate);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load ledger";
    }
  }

  const today = new Date();

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 14mm; }
          nav, aside, header, .no-print { display: none !important; }
          body { font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-before: always; }

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
          .print-table-wrapper th:nth-child(1),
          .print-table-wrapper td:nth-child(1) { width: 13%; }
          .print-table-wrapper th:nth-child(2),
          .print-table-wrapper td:nth-child(2) { width: 10%; }
          .print-table-wrapper th:nth-child(3),
          .print-table-wrapper td:nth-child(3) { width: 18%; white-space: normal; }
          .print-table-wrapper th:nth-child(4),
          .print-table-wrapper td:nth-child(4) { width: 13%; }
          .print-table-wrapper th:nth-child(5),
          .print-table-wrapper td:nth-child(5) { width: 10%; }
          .print-table-wrapper th:nth-child(6),
          .print-table-wrapper td:nth-child(6) { width: 10%; }
          .print-table-wrapper th:nth-child(7),
          .print-table-wrapper td:nth-child(7) { width: 13%; }
          .print-table-wrapper th:nth-child(8),
          .print-table-wrapper td:nth-child(8) { width: 13%; }
          .print-table-wrapper tr { page-break-inside: avoid; }
          .print-table-wrapper a svg { display: none; }
        }
      `}</style>

      <div className="space-y-6 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 no-print">
          <div>
            <div className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold tracking-tight">Salesman Ledger</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Accounts receivable ledger per salesman · {format(today, "d MMMM yyyy")} · {toNepaliDateString(today)}
            </p>
          </div>
          {ledgerData && (
            <div className="text-right">
              <p className="text-sm font-semibold">{ledgerData.salesman.name}</p>
              {ledgerData.salesman.pan && (
                <p className="text-xs text-muted-foreground">PAN: {ledgerData.salesman.pan}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="no-print">
          <Suspense>
            <LedgerFilters
              salesmen={salesmen}
              customerId={customerId}
              from={from}
              to={to}
            />
          </Suspense>
        </div>

        {/* ── Empty state ── */}
        {!customerId && (
          <div className="rounded-lg border border-dashed p-16 text-center">
            <BookMarked className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Select a salesman to view their ledger</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Shows all sales invoices, payments received, returns, opening & closing balances
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
            {/* Print header */}
            <div className="hidden print:block mb-4">
              <div className="flex justify-between items-start border-b-2 border-red-700 pb-3 mb-4">
                <div>
                  <p className="text-lg font-bold text-red-700">{COMPANY.name.toUpperCase()}</p>
                  <p className="text-sm text-gray-500">{COMPANY.address} · PAN: {COMPANY.pan}</p>
                  <p className="text-xs text-gray-400">Tel: {COMPANY.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold">CUSTOMER LEDGER</p>
                  <p className="text-sm">{ledgerData.salesman.name}</p>
                  {ledgerData.salesman.pan && <p className="text-xs text-gray-500">Salesman PAN: {ledgerData.salesman.pan}</p>}
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
                <p className={`text-xl font-bold tabular-nums ${ledgerData.openingBalance > 0.005 ? "text-blue-600" : "text-emerald-600"}`}>
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
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Received</p>
                <p className="text-xl font-bold tabular-nums text-emerald-600">
                  Rs {ledgerData.taxSummary.totalReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Payments collected</p>
              </div>
              <div className={`rounded-lg border p-4 space-y-1 ${ledgerData.closingBalance > 0.005 ? "border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/10" : "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10"}`}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Closing Balance</p>
                <p className={`text-xl font-bold tabular-nums ${ledgerData.closingBalance > 0.005 ? "text-blue-600" : "text-emerald-600"}`}>
                  Rs {ledgerData.closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ledgerData.closingBalance > 0.005 ? "Salesman owes you" : ledgerData.closingBalance < -0.005 ? "You owe salesman" : "Settled"}
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
