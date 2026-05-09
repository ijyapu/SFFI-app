import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { SalesmanTable } from "./_components/salesman-table";
import { ERPPageHeader } from "@/components/ui/erp-page-header";

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
      <ERPPageHeader
        title="Salesmen"
        subtitle={`${salesmen.length} active salesman${salesmen.length !== 1 ? "s" : ""}`}
        backHref="/sales"
      />

      <SalesmanTable salesmen={salesmen} />
    </div>
  );
}
