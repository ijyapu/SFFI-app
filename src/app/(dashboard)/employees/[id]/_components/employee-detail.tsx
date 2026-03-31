"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WithdrawalForm } from "./withdrawal-form";
import { deleteWithdrawal } from "../../actions";

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

const Rs = (n: number) =>
  "Rs " + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Rs(monthlySalary)}</p>
            <p className="text-xs text-muted-foreground mt-1">Fixed monthly amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deducted — {MONTHS[selectedMonth - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalWithdrawn > monthlySalary ? "text-destructive" : "text-amber-600"}`}>
              {Rs(totalWithdrawn)}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${remaining < 0 ? "text-destructive" : "text-emerald-600"}`}>
              {Rs(remaining)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {remaining < 0 ? "Over-deducted this month" : "Still available this month"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deductions table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deductions — {MONTHS[selectedMonth - 1]} {selectedYear}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {withdrawals.length} deduction{withdrawals.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button onClick={() => setFormOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              Record Deduction
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {withdrawals.length === 0 ? (
            <div className="px-4 py-10 text-center text-muted-foreground text-sm">
              No deductions recorded for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
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
                    <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(parseISO(w.takenAt), "d MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap">
                        {Rs(w.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          w.paymentMode === "ONLINE"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
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
                      {Rs(totalWithdrawn)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
          <img
            src={lightbox}
            alt="Proof"
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
