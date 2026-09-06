import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ERPPageHeader } from "@/components/ui/erp-page-header";
import { getPurchaseInvoicesForReturn } from "../actions";
import { ReturnForm } from "../_components/return-form";

export const metadata = { title: "Add Purchase Return" };

export default async function NewSupplierReturnPage() {
  await requirePermission("purchases");

  const [invoices, suppliers] = await Promise.all([
    getPurchaseInvoicesForReturn(),
    prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="Add Purchase Return"
        subtitle="Record goods sent back to a supplier against a specific invoice"
        backHref="/purchases/returns"
      />
      <ReturnForm mode="add" invoices={invoices} suppliers={suppliers} />
    </div>
  );
}
