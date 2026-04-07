import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { SupplierTable } from "./_components/supplier-table";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Vendors — Shanti Special Food Industry ERP" };

export default async function SuppliersPage() {
  await requirePermission("purchases");

  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, contactName: true, email: true,
      phone: true, address: true, pan: true, openingBalance: true,
      _count: { select: { purchases: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/purchases"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Vendors</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {suppliers.length} active vendor{suppliers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <SupplierTable suppliers={suppliers.map(s => ({ ...s, openingBalance: Number(s.openingBalance) }))} />
    </div>
  );
}
