import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { ERPPageHeader } from "@/components/ui/erp-page-header";
import { getSupplierReturnDetail } from "../../actions";
import { ReturnForm } from "../../_components/return-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const detail = await getSupplierReturnDetail(id);
    return { title: `Return — ${detail.invoiceNo}` };
  } catch {
    return { title: "Purchase Return" };
  }
}

export default async function EditSupplierReturnPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("purchases");
  const { id } = await params;

  const existing = await getSupplierReturnDetail(id).catch(() => null);
  if (!existing) notFound();

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title={`Return — ${existing.invoiceNo}`}
        subtitle={`${existing.supplierName} · editing recomputes stock, Vendor Ledger, and the Daily Log`}
        backHref="/purchases/returns"
      />
      <ReturnForm mode="edit" existing={existing} />
    </div>
  );
}
