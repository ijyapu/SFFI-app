import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { SettingsCrudTable } from "../_components/settings-crud-table";
import {
  createExpenseCategory,
  renameExpenseCategory,
  deleteExpenseCategory,
} from "./actions";

export const metadata = { title: "Expense Categories — Settings" };

export default async function ExpenseCategoriesPage() {
  await requirePermission("settings");
  const cats = await prisma.expenseCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { expenses: { where: { deletedAt: null } } } } },
  });

  const items = cats.map((c) => ({
    id:         c.id,
    name:       c.name,
    usageCount: c._count.expenses,
  }));

  return (
    <div className="max-w-lg">
      <SettingsCrudTable
        title="Expense Categories"
        description="Classify expenses for reporting — e.g. Utilities, Maintenance, Marketing."
        items={items}
        onCreate={createExpenseCategory}
        onRename={renameExpenseCategory}
        onDelete={deleteExpenseCategory}
        unit="category"
        usageLabel="expense"
      />
    </div>
  );
}
