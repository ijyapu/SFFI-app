import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExpenseTable } from "./_components/expense-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, CheckCircle, Clock, XCircle } from "lucide-react";

export const metadata = { title: "Expenses — Shanti Special Food Industry ERP" };

export default async function ExpensesPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  const role = (sessionClaims?.publicMetadata?.role as string | undefined) ?? null;
  const userCanApprove = role !== null && ["admin", "manager", "accountant"].includes(role);

  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      where: { deletedAt: null },
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

  const serialised = expenses.map((e) => ({
    id:           e.id,
    categoryId:   e.categoryId,
    categoryName: e.category.name,
    description:  e.description,
    amount:       Number(e.amount),
    date:         e.date.toISOString(),
    status:       e.status,
    notes:        e.notes,
    submittedBy:   e.submittedBy,
    attachmentUrl: e.attachmentUrl ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
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
        currentUserId={userId}
        canApprove={userCanApprove}
      />
    </div>
  );
}
