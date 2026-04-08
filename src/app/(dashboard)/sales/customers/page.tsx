import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { CustomerTable } from "./_components/customer-table";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  await requirePermission("sales");

  const raw = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { salesOrders: true } } },
  });

  const customers = raw.map((c) => ({
    ...c,
    openingBalance: Number(c.openingBalance),
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
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {customers.length} active customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <CustomerTable customers={customers} />
    </div>
  );
}
