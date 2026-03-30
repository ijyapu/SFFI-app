import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PurchaseTable } from "./_components/purchase-table";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, DollarSign, AlertCircle, ShoppingCart } from "lucide-react";

export const metadata = { title: "Purchases — Shanti Special Food Industry ERP" };

export default async function PurchasesPage() {
  await requirePermission("purchases");

  const [purchases, suppliers] = await Promise.all([
    prisma.purchase.findMany({
      where: { deletedAt: null },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialised = purchases.map((p) => ({
    id:            p.id,
    invoiceNo:     p.invoiceNo,
    supplierId:    p.supplier.id,
    supplierName:  p.supplier.name,
    date:          p.date.toISOString(),
    paymentMethod: p.paymentMethod,
    totalCost:     Number(p.totalCost),
    amountPaid:    Number(p.amountPaid),
    outstanding:   Math.max(0, Number(p.totalCost) - Number(p.amountPaid)),
  }));

  const totalSpend       = serialised.reduce((s, p) => s + p.totalCost, 0);
  const totalPaid        = serialised.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = serialised.reduce((s, p) => s + p.outstanding, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchases</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {serialised.length} invoice{serialised.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/purchases/new" className={cn(buttonVariants({}))}>
          <Plus className="h-4 w-4" />
          New Purchase
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Rs {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Payments made</p>
          </CardContent>
        </Card>

        <Card className={totalOutstanding > 0.005 ? "border-orange-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <AlertCircle className={`h-4 w-4 ${totalOutstanding > 0.005 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalOutstanding > 0.005 ? "text-orange-600" : ""}`}>
              Rs {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalOutstanding > 0.005 ? "Credit purchases unpaid" : "All settled"}
            </p>
          </CardContent>
        </Card>
      </div>

      <PurchaseTable purchases={serialised} suppliers={suppliers} />
    </div>
  );
}
