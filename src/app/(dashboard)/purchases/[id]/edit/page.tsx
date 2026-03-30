import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { PurchaseForm } from "../../new/_components/po-form";

export const metadata = { title: "Edit Purchase — Shanti Special Food Industry ERP" };

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("purchases");
  const { id } = await params;

  const [purchase, suppliers, products, categories, units] = await Promise.all([
    prisma.purchase.findUnique({
      where: { id, deletedAt: null },
      include: {
        items: { orderBy: { id: "asc" } },
      },
    }),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, contactName: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, sku: true, costPrice: true, unit: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!purchase) notFound();

  const initialValues = {
    invoiceNo:     purchase.invoiceNo,
    supplierId:    purchase.supplierId,
    date:          purchase.date.toISOString().split("T")[0],
    paymentMethod: purchase.paymentMethod as "CASH" | "CREDIT",
    amountPaid:    Number(purchase.amountPaid),
    notes:         purchase.notes ?? "",
    invoiceUrl:    purchase.invoiceUrl ?? "",
    items: purchase.items.map((i) => ({
      productId:   i.productId ?? "",
      productName: i.productName,
      categoryId:  i.categoryId ?? "",
      unitId:      i.unitId ?? "",
      description: i.description ?? "",
      quantity:    Number(i.quantity),
      unitPrice:   Number(i.unitPrice),
      vatPct:      Number(i.vatPct),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/purchases" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Edit Purchase</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{purchase.invoiceNo}</p>
        </div>
      </div>

      <PurchaseForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, contactName: s.contactName, phone: s.phone }))}
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, costPrice: Number(p.costPrice), unit: p.unit.name }))}
        categories={categories}
        units={units}
        purchaseId={id}
        initialValues={initialValues}
      />
    </div>
  );
}
