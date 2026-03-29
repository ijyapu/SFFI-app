import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { PoDetail } from "./_components/po-detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { orderNumber: true },
  });
  return {
    title: po ? `${po.orderNumber} — Shanti Special Food Industry ERP` : "Purchase Order — Shanti Special Food Industry ERP",
  };
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("purchases");
  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id, deletedAt: null },
    include: {
      supplier: true,
      items: {
        include: { product: { include: { unit: true } } },
        orderBy: { product: { name: "asc" } },
      },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  if (!po) notFound();

  const serialised = {
    id:           po.id,
    orderNumber:  po.orderNumber,
    status:       po.status,
    supplierName: po.supplier.name,
    orderDate:    po.orderDate.toISOString(),
    expectedDate: po.expectedDate?.toISOString() ?? null,
    notes:        po.notes,
    subtotal:     Number(po.subtotal),
    totalAmount:  Number(po.totalAmount),
    amountPaid:   Number(po.amountPaid),
    items: po.items.map((i) => ({
      id:          i.id,
      productId:   i.productId,
      productName: i.product.name,
      unitName:    i.product.unit.name,
      quantity:    Number(i.quantity),
      receivedQty: Number(i.receivedQty),
      unitCost:    Number(i.unitCost),
      totalCost:   Number(i.totalCost),
    })),
    payments: po.payments.map((p) => ({
      id:        p.id,
      amount:    Number(p.amount),
      method:    p.method,
      reference: p.reference,
      notes:     p.notes,
      paidAt:    p.paidAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/purchases"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{po.orderNumber}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{po.supplier.name}</p>
        </div>
      </div>

      <PoDetail {...serialised} />
    </div>
  );
}
