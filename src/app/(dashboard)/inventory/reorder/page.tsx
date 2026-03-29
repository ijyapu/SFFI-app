import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { ReorderTable } from "./_components/reorder-table";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Reorder Alerts — Shanti Special Food Industry ERP" };

export default async function ReorderPage() {
  await requirePermission("inventory");

  const allProducts = await prisma.product.findMany({
    where: { deletedAt: null },
    include: { category: true, unit: true },
    orderBy: [{ name: "asc" }],
  });

  const reorderItems = allProducts
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      currentStock: Number(p.currentStock),
      reorderLevel: Number(p.reorderLevel),
      shortfall: Math.max(0, Number(p.reorderLevel) - Number(p.currentStock)),
      suggestedQty: Math.max(0, Number(p.reorderLevel) * 2 - Number(p.currentStock)),
      status: (Number(p.currentStock) <= 0 ? "out" : "low") as "out" | "low",
      category: { name: p.category.name },
      unit: { name: p.unit.name },
    }))
    .filter((p) => p.currentStock <= p.reorderLevel && p.reorderLevel > 0)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "out" ? -1 : 1;
      return b.shortfall - a.shortfall;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/inventory"
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-semibold">Reorder Alerts</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-9">
            {reorderItems.length === 0
              ? "All stock levels are healthy"
              : `${reorderItems.length} product${reorderItems.length !== 1 ? "s" : ""} need restocking`}
          </p>
        </div>
      </div>

      <ReorderTable items={reorderItems} />
    </div>
  );
}
