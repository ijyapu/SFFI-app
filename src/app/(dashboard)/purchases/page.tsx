import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PurchaseTable } from "./_components/purchase-table";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ShoppingCart } from "lucide-react";

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
    id:           p.id,
    invoiceNo:    p.invoiceNo,
    supplierId:   p.supplier.id,
    supplierName: p.supplier.name,
    date:         p.date.toISOString(),
    totalCost:    Number(p.totalCost),
  }));

  const totalSpend = serialised.reduce((s, p) => s + p.totalCost, 0);

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

      <Card className="max-w-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            Rs {totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">All invoice totals · payments tracked in Vendor Ledger</p>
        </CardContent>
      </Card>

      <PurchaseTable purchases={serialised} suppliers={suppliers} />
    </div>
  );
}
