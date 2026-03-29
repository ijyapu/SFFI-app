import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PoTable } from "./_components/po-table";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Truck, ClipboardList, AlertCircle } from "lucide-react";

export const metadata = { title: "Purchases — Shanti Special Food Industry ERP" };

export default async function PurchasesPage() {
  await requirePermission("purchases");

  const orders = await prisma.purchaseOrder.findMany({
    where: { deletedAt: null },
    include: {
      supplier: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialised = orders.map((o) => ({
    id:           o.id,
    orderNumber:  o.orderNumber,
    status:       o.status,
    supplierName: o.supplier.name,
    orderDate:    o.orderDate.toISOString(),
    totalAmount:  Number(o.totalAmount),
    amountPaid:   Number(o.amountPaid),
    itemCount:    o._count.items,
  }));

  const draftCount     = serialised.filter((o) => o.status === "DRAFT").length;
  const confirmedCount = serialised.filter((o) => o.status === "CONFIRMED" || o.status === "PARTIALLY_RECEIVED").length;
  const totalOutstanding = serialised.reduce(
    (sum, o) => sum + Math.max(0, o.totalAmount - o.amountPaid), 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchases</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {serialised.length} orders total
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/purchases/suppliers"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Truck className="h-4 w-4" />
            Suppliers
          </Link>
          <Link
            href="/purchases/new"
            className={cn(buttonVariants({}))}
          >
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${draftCount > 0 ? "text-amber-600" : ""}`}>
              {draftCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Delivery</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${confirmedCount > 0 ? "text-blue-600" : ""}`}>
              {confirmedCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Confirmed orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-destructive" : ""}`}>
              Rs {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Unpaid supplier invoices</p>
          </CardContent>
        </Card>
      </div>

      <PoTable orders={serialised} />
    </div>
  );
}
