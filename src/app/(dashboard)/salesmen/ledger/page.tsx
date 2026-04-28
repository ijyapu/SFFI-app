import { format } from "date-fns";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { getAllCustomers, getCustomerLedger } from "./actions";
import { getNepalFYDates, getCurrentNepalFYYear } from "@/app/(dashboard)/vendors/ledger/nepal-fy";
import { LedgerFilters } from "./_components/ledger-filters";
import { LedgerTable } from "./_components/ledger-table";
import { CommissionSummary } from "./_components/commission-summary";
import { toNepaliDateString } from "@/lib/nepali-date";
import { BookMarked } from "lucide-react";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Salesman Ledger" };

interface PageProps {
  searchParams: Promise<{ customerId?: string; from?: string; to?: string }>;
}

export default async function CustomerLedgerPage({ searchParams }: PageProps) {
  await requirePermission("sales");
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
          /* Isolate only the ledger area — hides sidebar, header, filters, KPI cards */
          body * { visibility: hidden; }
          #salesman-ledger-print, #salesman-ledger-print * { visibility: visible; }
          #salesman-ledger-print { position: absolute; top: 0; left: 0; right: 0; }

          @page { size: A4 landscape; margin: 12mm 14mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Remove all overflow clipping inside the print area */
          #salesman-ledger-print div,
          #salesman-ledger-print table { overflow: visible !important; }

          /* Ledger table sizing */
          #salesman-ledger-print table {
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 9px !important;
            border-collapse: collapse !important;
          }
          #salesman-ledger-print th,
          #salesman-ledger-print td {
            padding: 4px 5px !important;
            overflow: hidden !important;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          /* Description column — allow wrapping */
          #salesman-ledger-print th:nth-child(3),
          #salesman-ledger-print td:nth-child(3) { white-space: normal; }
          #salesman-ledger-print tr { page-break-inside: avoid; }
          /* Hide external-link icons */
          #salesman-ledger-print a svg { display: none !important; }

          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="space-y-6 pb-10">

        {/* ── Header (screen only) ── */}
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
              <p className="text-xs text-muted-foreground">
                Commission: <span className="font-mono font-bold text-amber-700">{ledgerData.salesman.commissionPct}%</span>
              </p>
            </div>
          )}
        </div>

        {/* ── Filters (screen only) ── */}
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

        {/* ── KPI cards (screen only) ── */}
        {ledgerData && (
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
                Rs {ledgerData.commissionSummary.totalInvoiced.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">{ledgerData.commissionSummary.invoiceCount} invoice{ledgerData.commissionSummary.invoiceCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Commission Deducted</p>
              <p className="text-xl font-bold tabular-nums text-amber-600">
                Rs {ledgerData.commissionSummary.totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">{ledgerData.salesman.commissionPct}% rate</p>
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
        )}

        {/* ── Printable area — only this renders on paper ── */}
        {ledgerData && (
          <div id="salesman-ledger-print">

            {/* Company header (always visible inside print area; hidden on screen via CSS parent) */}
            <div className="hidden print:block mb-4">
              <div className="flex justify-between items-start border-b-2 border-red-700 pb-3 mb-4">
                <div>
                  <p className="text-lg font-bold text-red-700">{COMPANY.name.toUpperCase()}</p>
                  <p className="text-sm text-gray-500">{COMPANY.address} · PAN: {COMPANY.pan}</p>
                  <p className="text-xs text-gray-400">Tel: {COMPANY.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold">SALESMAN LEDGER</p>
                  <p className="text-sm">{ledgerData.salesman.name}</p>
                  <p className="text-xs text-gray-500">Commission: {ledgerData.salesman.commissionPct}%</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(from), "d MMM yyyy")} – {format(new Date(to), "d MMM yyyy")}
                  </p>
                  <p className="text-xs text-gray-400">Printed: {format(today, "d MMM yyyy, HH:mm")}</p>
                </div>
              </div>
            </div>

            {/* Ledger table */}
            <LedgerTable
              entries={ledgerData.entries}
              openingBalance={ledgerData.openingBalance}
              closingBalance={ledgerData.closingBalance}
              from={from}
              to={to}
            />

            {/* Commission summary — new page */}
            <div className="print-break mt-6">
              <CommissionSummary data={ledgerData} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
