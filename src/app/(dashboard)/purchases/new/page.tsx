import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { PurchaseForm } from "./_components/po-form";

export const metadata = { title: "New Purchase" };

export default async function NewPurchasePage() {
  await requirePermission("purchases");

  const [suppliers, products, categories, units] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/purchases" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">New Purchase</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Log a supplier invoice and update inventory</p>
        </div>
      </div>

      <PurchaseForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, contactName: s.contactName, phone: s.phone }))}
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, costPrice: Number(p.costPrice), unit: p.unit.name }))}
        categories={categories}
        units={units}
      />
    </div>
  );
}
