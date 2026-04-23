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
      select: {
        id: true, name: true, openingBalance: true, commissionPct: true,
        salesOrders: {
          where: { deletedAt: null, status: { not: "CANCELLED" } },
          select: {
            factoryAmount: true,
            payments: { select: { amount: true } },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { unit: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const salesmen = rawSalesmen.map((c) => {
    const outstanding = Number(c.openingBalance) + c.salesOrders.reduce((acc, o) => {
      const collected = o.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return acc + Number(o.factoryAmount) - collected;
    }, 0);
    return {
      id:            c.id,
      name:          c.name,
      commissionPct: Number(c.commissionPct),
      outstanding,
    };
  });

  const serialisedProducts = products.map((p) => ({
    id:           p.id,
    name:         p.name,
    sku:          p.sku,
    sellingPrice: Number(p.sellingPrice),
    currentStock: Number(p.currentStock),
    unit:         { name: p.unit.name },
  }));

  return (
    <div className="space-y-4 pb-10">
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
            Confirming will deduct stock immediately.
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
        <div className="max-w-4xl">
          <SoForm salesmen={salesmen} products={serialisedProducts} />
        </div>
      )}
    </div>
  );
}
