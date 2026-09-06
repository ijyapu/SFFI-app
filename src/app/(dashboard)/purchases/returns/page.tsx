import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { ERPPageHeader } from "@/components/ui/erp-page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { getSupplierReturns } from "./actions";
import { ReturnTable } from "./_components/return-table";

export const metadata = { title: "Purchase Returns" };

export default async function PurchaseReturnsPage() {
  await requirePermission("purchases");

  const returns = await getSupplierReturns();
  const totalReturned = returns.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="Purchase Returns"
        subtitle={`${returns.length} return${returns.length !== 1 ? "s" : ""} · Rs ${totalReturned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`}
        backHref="/purchases"
        action={
          <Link href="/purchases/returns/new" className={cn(buttonVariants({}))}>
            <Plus className="h-4 w-4" />
            Add Return
          </Link>
        }
      />

      <ReturnTable returns={returns} />
    </div>
  );
}
