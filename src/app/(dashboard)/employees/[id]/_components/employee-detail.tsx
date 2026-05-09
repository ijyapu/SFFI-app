"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WithdrawalForm } from "./withdrawal-form";
import { deleteWithdrawal } from "../../actions";
import { formatAmount } from "@/lib/format";

export interface WithdrawalRow {
  id: string;
  amount: number;
  takenAt: string;
  filedBy: string | null;
  givenBy: string | null;
  paymentMode: string;
  notes: string | null;
  photoUrl: string | null;
}

interface Props {
  employeeId: string;
  employeeName: string;
  monthlySalary: number;
  withdrawals: WithdrawalRow[];
  selectedMonth: number;
  selectedYear: number;
  totalWithdrawn: number;
  allTimeWithdrawals: WithdrawalRow[];
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function EmployeeDetail({
  employeeId,
  employeeName,
  monthlySalary,
  withdrawals,
  selectedMonth,
  selectedYear,
  totalWithdrawn,
}: Props) {
  const [formOpen, setFormOpen]     = useState(false);
  const [lightbox, setLightbox]     = useState<string | null>(null);
  const [pending, startTransition]  = useTransition();

  const remaining = monthlySalary - totalWithdrawn;
  const pct       = monthlySalary > 0 ? Math.min(100, (totalWithdrawn / monthlySalary) * 100) : 0;

  function handleDelete(id: string) {
    if (!confirm("Delete this deduction record?")) return;
    startTransition(async () => {
      try {
        await deleteWithdrawal(id, employeeId);
        toast.success("Deduction deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground mb-2">Monthly Salary</div>
          <div className="text-2xl font-bold tabular-nums">{formatAmount(monthlySalary)}</div>
          <div className="text-xs text-muted-foreground mt-1">Fixed monthly amount</div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground mb-2">
            Deducted — {MONTHS[selectedMonth - 1]} {selectedYear}
          </div>
          <div className={`text-2xl font-bold tabular-nums ${totalWithdrawn > monthlySalary ? "text-destructive" : "text-amber-600"}`}>
            {formatAmount(totalWithdrawn)}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="text-xs text-muted-foreground mb-2">Remaining Balance</div>
          <div className={`text-2xl font-bold tabular-nums ${remaining < 0 ? "text-destructive" : "text-emerald-600"}`}>
            {formatAmount(remaining)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {remaining < 0 ? "Over-deducted this month" : "Still available this month"}
          </div>
        </div>
      </div>

      {/* Deductions table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div>
            <p className="text-sm font-semibold">Deductions — {MONTHS[selectedMonth - 1]} {selectedYear}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {withdrawals.length} deduction{withdrawals.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            Record Deduction
          </Button>
        </div>
        <div>
          {withdrawals.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground text-sm">
              No deductions recorded for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Filed by</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Given by</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Notes</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">Proof</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(parseISO(w.takenAt), "d MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap">
                        {formatAmount(w.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          w.paymentMode === "ONLINE"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {w.paymentMode === "ONLINE" ? "Online" : "Cash"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">
                        {w.filedBy ?? <span className="italic opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">
                        {w.givenBy ?? <span className="italic opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-40 truncate">
                        {w.notes ?? <span className="italic opacity-40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {w.photoUrl ? (
                          <button
                            onClick={() => setLightbox(w.photoUrl)}
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(w.id)}
                          disabled={pending}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/20">
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Month total
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-right tabular-nums font-bold">
                      {formatAmount(totalWithdrawn)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <WithdrawalForm
        employeeId={employeeId}
        employeeName={employeeName}
        monthlySalary={monthlySalary}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <Image
            src={lightbox}
            alt="Proof"
            width={1600}
            height={900}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
