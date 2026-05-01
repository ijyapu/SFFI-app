import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { EmployeeTable } from "./_components/employee-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, DollarSign, Building2 } from "lucide-react";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  await requirePermission("employees");

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      where: { deletedAt: null },
      include: { department: true },
      orderBy: [{ department: { name: "asc" } }, { firstName: "asc" }],
    }),
    prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { employees: true } } },
    }),
  ]);

  const now = new Date();

  const activeEmployees = employees.filter(
    (e) => !e.endDate || new Date(e.endDate) > now
  );

  const totalPayroll = activeEmployees.reduce(
    (sum, e) => sum + Number(e.basicSalary), 0
  );

  const serialised = employees.map((e) => ({
    id:            e.id,
    employeeNo:    e.employeeNo,
    firstName:     e.firstName,
    lastName:      e.lastName,
    email:         e.email ?? null,
    phone:         e.phone,
    citizenshipId: e.citizenshipId ?? null,
    address:       e.address ?? null,
    departmentId:  e.departmentId,
    position:      e.position,
    basicSalary:    Number(e.basicSalary),
    openingBalance: Number(e.openingBalance),
    startDate:      e.startDate.toISOString(),
    endDate:        e.endDate?.toISOString() ?? null,
    department:    { name: e.department.name },
  }));



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Employees</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeEmployees.length} active · {employees.length} total
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeEmployees.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Currently employed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{departments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Base salaries only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Salary</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {activeEmployees.length > 0
                ? (totalPayroll / activeEmployees.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "0.00"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Per active employee</p>
          </CardContent>
        </Card>
      </div>

      <EmployeeTable employees={serialised} departments={departments} />
    </div>
  );
}
