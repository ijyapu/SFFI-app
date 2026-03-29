import { prisma } from "@/lib/prisma";
import { SettingsCrudTable } from "../_components/settings-crud-table";
import { createCategory, renameCategory, deleteCategory } from "./actions";

export const metadata = { title: "Categories — Settings — Shanti Special Food Industry ERP" };

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
  });

  const items = categories.map((c) => ({
    id:         c.id,
    name:       c.name,
    usageCount: c._count.products,
  }));

  return (
    <div className="max-w-lg">
      <SettingsCrudTable
        title="Product Categories"
        description="Group products by category for reporting and filtering."
        items={items}
        onCreate={createCategory}
        onRename={renameCategory}
        onDelete={deleteCategory}
        unit="category"
      />
    </div>
  );
}
