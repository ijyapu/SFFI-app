import { prisma } from "@/lib/prisma";
import { SettingsCrudTable } from "../_components/settings-crud-table";
import { createUnit, renameUnit, deleteUnit } from "./actions";

export const metadata = { title: "Units — Settings" };

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
  });

  const items = units.map((u) => ({
    id:         u.id,
    name:       u.name,
    usageCount: u._count.products,
  }));

  return (
    <div className="max-w-lg">
      <SettingsCrudTable
        title="Units of Measure"
        description="Define units used on products — e.g. kg, pcs, litre, box."
        items={items}
        onCreate={createUnit}
        onRename={renameUnit}
        onDelete={deleteUnit}
        unit="unit"
      />
    </div>
  );
}
