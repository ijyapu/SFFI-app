import { Suspense } from "react";
import { requirePermission, getCurrentRole } from "@/lib/auth";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ExpenseTable } from "./_components/expense-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFilter } from "@/components/ui/date-filter";
import { Receipt, CheckCircle, Clock, XCircle } from "lucide-react";

export const metadata = { title: "Expenses" };

type Props = { searchParams: Promise<{ from?: string; to?: string }> };

export default async function ExpensesPage({ searchParams }: Props) {
  await requirePermission("expenses");

  const { from: rawFrom, to: rawTo } = await searchParams;
  const { userId } = await auth();
  const role = await getCurrentRole();
  // Approvers: anyone except employee-only role
  const userCanApprove = role !== null && ["superadmin", "admin", "manager", "accountant"].includes(role);

  const dateWhere = rawFrom || rawTo ? {
    ...(rawFrom ? { gte: new Date(rawFrom + "T00:00:00.000Z") } : {}),
    ...(rawTo   ? { lte: new Date(rawTo   + "T23:59:59.999Z") } : {}),
  } : undefined;

  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      where: { deletedAt: null, ...(dateWhere ? { date: dateWhere } : {}) },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.expenseCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);

  // Summary stats
  const totalAmount    = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const approvedAmount = expenses
    .filter((e) => e.status === "APPROVED")
    .reduce((s, e) => s + Number(e.amount), 0);
  const pendingCount   = expenses.filter((e) => e.status === "SUBMITTED").length;
  const rejectedCount  = expenses.filter((e) => e.status === "REJECTED").length;

  // Resolve submitter names from Clerk
  const submitterIds = [...new Set(expenses.map((e) => e.submittedBy))];
  let submitterNameMap = new Map<string, string>();
  if (submitterIds.length > 0) {
    const clerk = await clerkClient();
    const { data: clerkUsers } = await clerk.users.getUserList({ userId: submitterIds, limit: 100 });
    submitterNameMap = new Map(clerkUsers.map((u) => [
      u.id,
      [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.emailAddresses[0]?.emailAddress || "Unknown",
    ]));
  }

  const serialised = expenses.map((e) => ({
    id:              e.id,
    categoryId:      e.categoryId,
    categoryName:    e.category.name,
    description:     e.description,
    amount:          Number(e.amount),
    date:            e.date.toISOString(),
    status:          e.status,
    notes:           e.notes,
    submittedBy:     e.submittedBy,
    submittedByName: submitterNameMap.get(e.submittedBy) ?? "Unknown",
    attachmentUrl:   e.attachmentUrl ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

      <Suspense>
        <DateFilter from={rawFrom} to={rawTo} />
      </Suspense>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submitted</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              Rs {approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Confirmed spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-amber-600" : ""}`}>
              {pendingCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount > 0 ? "Awaiting approval" : "All reviewed"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${rejectedCount > 0 ? "text-destructive" : ""}`}>
              {rejectedCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Declined expenses</p>
          </CardContent>
        </Card>
      </div>

      <ExpenseTable
        expenses={serialised}
        categories={categories}
        currentUserId={userId ?? ""}
        canApprove={userCanApprove}
      />
    </div>
  );
}
