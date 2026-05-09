import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { PayrollList } from "./_components/payroll-list";
import { DollarSign, Lock, FileText, AlertCircle } from "lucide-react";
import { formatAmount } from "@/lib/format";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  await requirePermission("payroll");

  const runs = await prisma.payrollRun.findMany({
    include: {
      items: { select: { basicSalary: true, carryoverIn: true, deductions: true, netPay: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  // Resolve Clerk user names for createdBy / updatedBy
  const userIds = [...new Set(runs.flatMap((r) => [r.createdBy, r.updatedBy].filter(Boolean) as string[]))];
  let nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const clerk = await clerkClient();
    const { data: clerkUsers } = await clerk.users.getUserList({ userId: userIds, limit: 100 });
    nameMap = new Map(clerkUsers.map((u) => [
      u.id,
      [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.emailAddresses[0]?.emailAddress || "Unknown",
    ]));
  }

  const serialised = runs.map((run) => ({
    id:            run.id,
    month:         run.month,
    year:          run.year,
    status:        run.status,
    notes:         run.notes,
    totalPayroll:   run.items.reduce((sum, i) => sum + Number(i.basicSalary) + Number(i.carryoverIn), 0),
    totalPaid:      run.items.reduce((sum, i) => sum + Number(i.deductions), 0),
    totalRemaining: run.items.reduce((sum, i) => sum + Math.max(0, Number(i.netPay)), 0),
    employeeCount: run.items.length,
    createdAt:     run.createdAt.toISOString(),
    lastEditedBy:  nameMap.get(run.updatedBy ?? "") || nameMap.get(run.createdBy) || null,
  }));

  const latestFinalized   = serialised.find((r) => r.status === "FINALIZED");
  const draftCount        = serialised.filter((r) => r.status === "DRAFT").length;
  const finalizedRuns     = serialised.filter((r) => r.status === "FINALIZED");
  const totalPaidOut      = finalizedRuns.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalCarryover    = finalizedRuns.reduce((sum, r) => sum + r.totalRemaining, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payroll</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {runs.length} payroll run{runs.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Draft Runs</span>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${draftCount > 0 ? "text-amber-600" : ""}`}>
            {draftCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Pending finalization</div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>Last Finalized</span>
          </div>
          <div className="text-2xl font-bold">
            {latestFinalized
              ? `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][latestFinalized.month - 1]} ${latestFinalized.year}`
              : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {latestFinalized
              ? formatAmount(latestFinalized.totalPayroll)
              : "No finalized runs"}
          </div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            <span>Total Paid Out</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">{formatAmount(totalPaidOut)}</div>
          <div className="text-xs text-muted-foreground mt-1">All finalized runs</div>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-md active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Still Owed</span>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${totalCarryover > 0.005 ? "text-amber-600" : ""}`}>
            {formatAmount(totalCarryover)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totalCarryover > 0.005 ? "Carries to next month" : "All caught up"}
          </div>
        </div>
      </div>

      <PayrollList runs={serialised} />
    </div>
  );
}
