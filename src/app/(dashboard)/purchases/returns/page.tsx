import { requirePermission } from "@/lib/auth";
import { ERPPageHeader } from "@/components/ui/erp-page-header";
import { getSupplierReturns, getPurchaseInvoicesForReturn } from "./actions";
import { prisma } from "@/lib/prisma";
import { ReturnTable } from "./_components/return-table";
import { AddReturnDialog } from "./_components/add-return-dialog";

export const metadata = { title: "Purchase Returns" };

export default async function PurchaseReturnsPage() {
  await requirePermission("purchases");

  const [returns, invoices, suppliers] = await Promise.all([
    getSupplierReturns(),
    getPurchaseInvoicesForReturn(),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalReturned = returns.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="Purchase Returns"
        subtitle={`${returns.length} return${returns.length !== 1 ? "s" : ""} · Rs ${totalReturned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`}
        backHref="/purchases"
        action={<AddReturnDialog invoices={invoices} suppliers={suppliers} />}
      />

      <ReturnTable returns={returns} />
    </div>
  );
}
