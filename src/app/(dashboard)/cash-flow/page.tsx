import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { getCashFlow, setCashOpeningBalance } from "./actions";
import { setBankOpeningBalance } from "./bank-transfer-actions";
import { CashFlowDays } from "./_components/cash-flow-days";
import { DeferredPanel } from "./_components/deferred-panel";
import { OpeningBalanceForm } from "./_components/opening-balance-form";
import { BankTransferFormDialog } from "./_components/bank-transfer-form-dialog";
import { BankTransferList } from "./_components/bank-transfer-list";
import { DateFilter } from "@/components/ui/date-filter";
import {
  ArrowDownLeft, ArrowUpRight, TrendingUp, Banknote, Info, Wallet, Landmark,
} from "lucide-react";

export const metadata = { title: "Cash Flow" };

function getTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
}

function getMonthStart(todayStr: string): string {
  return todayStr.slice(0, 8) + "01";
}

function fmtRs(n: number): string {
  return "Rs " + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Props = { searchParams: Promise<{ from?: string; to?: string }> };

export default async function CashFlowPage({ searchParams }: Props) {
  const role = await requirePermission("cashFlow");

  const params   = await searchParams;
  const todayStr = getTodayStr();

  const validDate = (s?: string) =>
    s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;

  const from = validDate(params.from) ?? getMonthStart(todayStr);
  const to   = validDate(params.to)   ?? todayStr;

  const data = await getCashFlow(from, to);
  const canEdit = role === "admin" || role === "superadmin";
  const net = data.totalIn - data.totalOut;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Cash Flow</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tracks actual cash movements — when money physically enters or leaves.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <OpeningBalanceForm
            label="Cash opening balance"
            current={data.cashOpeningBalance}
            canEdit={canEdit}
            onSave={setCashOpeningBalance}
          />
          <OpeningBalanceForm
            label="Bank opening balance"
            current={data.bankOpeningBalance}
            canEdit={canEdit}
            onSave={setBankOpeningBalance}
          />
        </div>
      </div>

      {/* Date filter */}
      <Suspense>
        <DateFilter from={from} to={to} />
      </Suspense>

      {/* Summary cards — uniform style, color only on values */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Banknote className="h-3.5 w-3.5 shrink-0" />
            <span>Opening Balance</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">{fmtRs(data.periodOpeningBalance)}</div>
          <div className="text-xs text-muted-foreground mt-1">start of period</div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-green-600" />
            <span>Total Inflows</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-green-700">{fmtRs(data.totalIn)}</div>
          <div className="text-xs text-muted-foreground mt-1">cash received</div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-red-600" />
            <span>Total Outflows</span>
          </div>
          <div className="text-2xl font-bold tabular-nums text-red-700">{fmtRs(data.totalOut)}</div>
          <div className="text-xs text-muted-foreground mt-1">cash paid out</div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>Closing Balance</span>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${net >= 0 ? "text-green-700" : "text-red-700"}`}>
            {fmtRs(data.periodClosingBalance)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {net >= 0 ? `+${fmtRs(net)} net` : `−${fmtRs(Math.abs(net))} net`}
          </div>
        </div>
      </div>

      {/* Cash-in-Hand vs Bank Balance — where the money physically sits, as of the end date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span>Cash in Hand</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">{fmtRs(data.cashBalance)}</div>
          <div className="text-xs text-muted-foreground mt-1">physical cash on hand, as of {to}</div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Landmark className="h-3.5 w-3.5 shrink-0" />
            <span>Bank Balance</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">{fmtRs(data.bankBalance)}</div>
          <div className="text-xs text-muted-foreground mt-1">in bank + digital rails, as of {to}</div>
        </div>
      </div>

      {/* Info callout — quiet, icon-led, no colored box */}
      <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Inflows include sales receipts and cash received. Outflows include supplier and vendor payments, approved expenses, payroll disbursements, and salary advances.{" "}
          <span className="text-xs">Click any active row to expand individual transactions.</span>
        </p>
      </div>

      {/* Daily table */}
      {data.days.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
          <Banknote className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">No days in selected range.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <CashFlowDays days={data.days} todayStr={todayStr} />
        </div>
      )}

      {/* Deferred obligations */}
      <DeferredPanel items={data.deferred} />

      {/* Bank Transfers — moving cash between the two pools above */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Bank Transfers</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Record when cash is deposited into or withdrawn from the bank.
            </p>
          </div>
          <BankTransferFormDialog mode="create" />
        </div>
        <BankTransferList transfers={data.bankTransfers} />
      </section>
    </div>
  );
}
