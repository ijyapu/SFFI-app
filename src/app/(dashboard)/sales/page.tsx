import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { SoTable } from "./_components/so-table";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, TrendingUp, AlertCircle } from "lucide-react";

export const metadata = { title: "Sales" };

export default async function SalesPage() {
  await requirePermission("sales");

  const [orders, salesmen] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { deletedAt: null },
      include: { salesman: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salesman.findMany({
      where: { deletedAt: null },
      select: { openingBalance: true },
    }),
  ]);

  const serialised = orders.map((o) => ({
    id:            o.id,
    orderNumber:   o.orderNumber,
    status:        o.status,
    salesmanId:    o.customerId,
    customerName:  o.salesman.name,
    orderDate:     o.orderDate.toISOString(),
    totalAmount:   Number(o.totalAmount),
    factoryAmount: Number(o.factoryAmount),
    amountPaid:    Number(o.amountPaid),
  }));

  const totalCommission  = orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "DRAFT" && o.status !== "LOST")
    .reduce((sum, o) => sum + Number(o.commissionAmount), 0);
  const totalRevenue     = serialised
    .filter((o) => o.status !== "CANCELLED" && o.status !== "DRAFT" && o.status !== "LOST")
    .reduce((sum, o) => sum + o.factoryAmount, 0);
  const openingBalanceTotal = salesmen.reduce((sum, s) => sum + Number(s.openingBalance), 0);
  const totalOutstanding =
    openingBalanceTotal +
    serialised
      .filter((o) => o.status !== "CANCELLED" && o.status !== "DRAFT" && o.status !== "LOST")
      .reduce((sum, o) => sum + (o.factoryAmount - o.amountPaid), 0);
  const totalCollected   = serialised.reduce((sum, o) => sum + o.amountPaid, 0);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold">Sales</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{serialised.length} orders total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/salesmen" className={cn(buttonVariants({ variant: "outline" }))}>
            <Users className="h-4 w-4" />
            Salesmen
          </Link>
          <Link href="/sales/new" className={cn(buttonVariants({}))}>
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 shrink-0">
        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commission Given</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <p className="text-2xl font-bold text-amber-600">
              Rs {totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total paid to salesmen</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Factory Revenue</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <p className="text-2xl font-bold">
              Rs {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">After commission deductions</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collected</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <p className="text-2xl font-bold text-green-600">
              Rs {totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Payments received</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-destructive" : "text-green-600"}`}>
              Rs {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Incl. opening balances</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-h-0">
        <SoTable orders={serialised} />
      </div>
    </div>
  );
}
