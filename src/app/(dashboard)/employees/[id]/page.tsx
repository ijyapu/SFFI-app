import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft, Building2, Phone, Mail, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { EmployeeDetail } from "./_components/employee-detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emp = await prisma.employee.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  return {
    title: emp ? `${emp.firstName} ${emp.lastName} — Shanti Special Food Industry ERP` : "Employee — Shanti Special Food Industry ERP",
  };
}

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  await requirePermission("employees");
  const { id } = await params;
  const { month: rawMonth, year: rawYear } = await searchParams;

  const now           = new Date();
  const selectedMonth = rawMonth ? parseInt(rawMonth, 10) : now.getMonth() + 1;
  const selectedYear  = rawYear  ? parseInt(rawYear,  10) : now.getFullYear();

  const employee = await prisma.employee.findUnique({
    where: { id, deletedAt: null },
    include: { department: true },
  });
  if (!employee) notFound();

  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
  const monthEnd   = endOfMonth(new Date(selectedYear, selectedMonth - 1));

  const withdrawals = await prisma.salaryWithdrawal.findMany({
    where: {
      employeeId: id,
      takenAt: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { takenAt: "desc" },
  });

  const totalWithdrawn = withdrawals.reduce((s, w) => s + Number(w.amount), 0);

  const serialisedWithdrawals = withdrawals.map((w) => ({
    id:          w.id,
    amount:      Number(w.amount),
    takenAt:     w.takenAt.toISOString(),
    filedBy:     w.filedBy,
    givenBy:     w.givenBy,
    paymentMode: w.paymentMode as "CASH" | "ONLINE",
    notes:       w.notes,
    photoUrl:    w.photoUrl,
  }));

  // Build prev/next month links
  const prevMonth = selectedMonth === 1
    ? { month: 12, year: selectedYear - 1 }
    : { month: selectedMonth - 1, year: selectedYear };
  const nextMonth = selectedMonth === 12
    ? { month: 1, year: selectedYear + 1 }
    : { month: selectedMonth + 1, year: selectedYear };

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/employees" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {employee.employeeNo} · {employee.position}
          </p>
        </div>
      </div>

      {/* Employee info strip */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground rounded-lg border border-border bg-muted/20 px-4 py-3">
        <span className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          {employee.department.name}
        </span>
        {employee.phone && (
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            {employee.phone}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          {employee.email}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Joined {format(employee.startDate, "d MMM yyyy")}
        </span>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <Link
          href={`/employees/${id}?month=${prevMonth.month}&year=${prevMonth.year}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← {MONTHS[prevMonth.month - 1]} {prevMonth.year}
        </Link>
        <span className="font-semibold text-sm px-2">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </span>
        <Link
          href={`/employees/${id}?month=${nextMonth.month}&year=${nextMonth.year}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {MONTHS[nextMonth.month - 1]} {nextMonth.year} →
        </Link>
      </div>

      <EmployeeDetail
        employeeId={id}
        employeeName={`${employee.firstName} ${employee.lastName}`}
        monthlySalary={Number(employee.basicSalary)}
        withdrawals={serialisedWithdrawals}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        totalWithdrawn={totalWithdrawn}
        allTimeWithdrawals={[]}
      />
    </div>
  );
}
