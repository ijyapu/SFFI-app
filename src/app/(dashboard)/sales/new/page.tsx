import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { SoForm } from "./_components/so-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "New Sales Order" };

export default async function NewSalesOrderPage() {
  await requirePermission("sales");

  const [rawSalesmen, products] = await Promise.all([
    prisma.salesman.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true, address: true, pan: true, openingBalance: true, commissionPct: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { unit: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const salesmen = rawSalesmen.map((c) => ({
    ...c,
    openingBalance: Number(c.openingBalance),
    commissionPct:  Number(c.commissionPct),
  }));

  const serialisedProducts = products.map((p) => ({
    id:           p.id,
    name:         p.name,
    sku:          p.sku,
    sellingPrice: Number(p.sellingPrice),
    currentStock: Number(p.currentStock),
    unit:         { name: p.unit.name },
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link
          href="/sales"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">New Sales Order</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Order saved as draft — confirming will deduct stock immediately.
          </p>
        </div>
      </div>

      {rawSalesmen.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>No salesmen found.</p>
          <Link href="/sales/salesmen" className="text-primary underline text-sm mt-1 inline-block">
            Add a salesman first
          </Link>
        </div>
      ) : (
        <SoForm salesmen={salesmen} products={serialisedProducts} />
      )}
    </div>
  );
}
