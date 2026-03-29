import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PoForm } from "./_components/po-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "New Purchase Order — Shanti Special Food Industry ERP" };

export default async function NewPurchaseOrderPage() {
  await requirePermission("purchases");

  const [suppliers, products] = await Promise.all([
    prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { unit: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const serialisedProducts = products.map((p) => ({
    id:        p.id,
    name:      p.name,
    sku:       p.sku,
    costPrice: Number(p.costPrice),
    unit:      { name: p.unit.name },
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link
          href="/purchases"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">New Purchase Order</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Order will be saved as a draft — confirm it when ready to receive goods.
          </p>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>No suppliers found.</p>
          <Link href="/purchases/suppliers" className="text-primary underline text-sm mt-1 inline-block">
            Add a supplier first
          </Link>
        </div>
      ) : (
        <PoForm suppliers={suppliers} products={serialisedProducts} />
      )}
    </div>
  );
}
