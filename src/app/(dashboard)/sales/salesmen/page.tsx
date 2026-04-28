import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { SalesmanTable } from "./_components/salesman-table";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Salesmen" };

export default async function SalesmenPage() {
  await requirePermission("sales");

  const raw = await prisma.salesman.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          salesOrders: {
            where: {
              deletedAt: null,
              status: { notIn: ["DRAFT", "CANCELLED", "LOST"] },
            },
          },
        },
      },
    },
  });

  const salesmen = raw.map((c) => ({
    ...c,
    openingBalance: Number(c.openingBalance),
    commissionPct:  Number(c.commissionPct),
  }));

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
          <h1 className="text-2xl font-semibold">Salesmen</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {salesmen.length} active salesman{salesmen.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <SalesmanTable salesmen={salesmen} />
    </div>
  );
}
