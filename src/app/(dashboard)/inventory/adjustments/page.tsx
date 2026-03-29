import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { getCurrentRole } from "@/lib/auth";
import { AdjustmentForm } from "./_components/adjustment-form";
import { MovementTable } from "./_components/movement-table";

export const metadata = { title: "Stock Adjustments — Shanti Special Food Industry ERP" };

export default async function AdjustmentsPage() {
  await requirePermission("inventory");
  const role = await getCurrentRole();

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { unit: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.stockMovement.findMany({
      include: { product: { include: { unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const serialisedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    currentStock: Number(p.currentStock),
    unit: p.unit,
  }));

  const serialisedMovements = movements.map((m) => ({
    id: m.id,
    type: m.type,
    quantity: Number(m.quantity),
    quantityBefore: Number(m.quantityBefore),
    quantityAfter: Number(m.quantityAfter),
    unitCost: m.unitCost ? Number(m.unitCost) : null,
    notes: m.notes,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    isAdminOverride: m.isAdminOverride,
    createdBy: m.createdBy,
    createdAt: m.createdAt.toISOString(),
    product: {
      name: m.product.name,
      sku: m.product.sku,
      unit: { name: m.product.unit.name },
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Stock Adjustments</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manually adjust stock levels. All changes are logged and require a reason.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form — left column */}
        <div className="lg:col-span-1">
          <AdjustmentForm
            products={serialisedProducts}
            isAdmin={role === "admin"}
          />
        </div>

        {/* Movement history — right columns */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-medium mb-3">Movement History</h2>
          <MovementTable movements={serialisedMovements} />
        </div>
      </div>
    </div>
  );
}
