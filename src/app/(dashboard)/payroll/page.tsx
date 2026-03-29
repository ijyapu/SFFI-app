import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PayrollList } from "./_components/payroll-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Lock, FileText } from "lucide-react";

export const metadata = { title: "Payroll — Shanti Special Food Industry ERP" };

export default async function PayrollPage() {
  await requirePermission("payroll");

  const runs = await prisma.payrollRun.findMany({
    include: {
      items: { select: { basicSalary: true, carryoverIn: true, deductions: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const serialised = runs.map((run) => ({
    id:            run.id,
    month:         run.month,
    year:          run.year,
    status:        run.status,
    notes:         run.notes,
    totalPayroll:  run.items.reduce((sum, i) => sum + Number(i.basicSalary) + Number(i.carryoverIn), 0),
    totalPaid:     run.items.reduce((sum, i) => sum + Number(i.deductions), 0),
    employeeCount: run.items.length,
    createdAt:     run.createdAt.toISOString(),
  }));

  const latestFinalized  = serialised.find((r) => r.status === "FINALIZED");
  const draftCount       = serialised.filter((r) => r.status === "DRAFT").length;
  const totalPaidOut     = serialised
    .filter((r) => r.status === "FINALIZED")
    .reduce((sum, r) => sum + r.totalPaid, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payroll</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {runs.length} payroll run{runs.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft Runs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${draftCount > 0 ? "text-amber-600" : ""}`}>
              {draftCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pending finalization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Finalized</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {latestFinalized
                ? `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][latestFinalized.month - 1]} ${latestFinalized.year}`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestFinalized
                ? `Rs ${latestFinalized.totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "No finalized runs"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid Out</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All finalized runs</p>
          </CardContent>
        </Card>
      </div>

      <PayrollList runs={serialised} />
    </div>
  );
}
