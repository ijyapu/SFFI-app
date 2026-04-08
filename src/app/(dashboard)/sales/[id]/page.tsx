import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { SoDetail } from "./_components/so-detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    select: { orderNumber: true },
  });
  return {
    title: so ? `${so.orderNumber}` : "Sales Order",
  };
}

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("sales");
  const { id } = await params;

  const so = await prisma.salesOrder.findUnique({
    where: { id, deletedAt: null },
    include: {
      customer: true,
      items: {
        include: { product: { include: { unit: true } } },
        orderBy: { product: { name: "asc" } },
      },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  if (!so) notFound();

  const serialised = {
    id:           so.id,
    orderNumber:  so.orderNumber,
    status:       so.status,
    customerName: so.customer.name,
    orderDate:    so.orderDate.toISOString(),
    dueDate:      so.dueDate?.toISOString() ?? null,
    notes:        so.notes,
    subtotal:     Number(so.subtotal),
    totalAmount:  Number(so.totalAmount),
    amountPaid:   Number(so.amountPaid),
    items: so.items.map((i) => ({
      id:          i.id,
      productId:   i.productId,
      productName: i.product.name,
      unitName:    i.product.unit.name,
      quantity:    Number(i.quantity),
      unitPrice:   Number(i.unitPrice),
      totalPrice:  Number(i.totalPrice),
    })),
    payments: so.payments.map((p) => ({
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
          href="/sales"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{so.orderNumber}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{so.customer.name}</p>
        </div>
      </div>

      <SoDetail {...serialised} />
    </div>
  );
}
