import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { requirePermission } from "@/lib/auth";
import { StockValuationTable, type StockCategory } from "./_components/stock-valuation-table";

export const metadata = {
  title: "Stock Valuation — Reports",
};

export default async function StockValuationPage() {
  await requirePermission("reports");
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: { category: true, unit: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const categoryMap = new Map<string, StockCategory>();

  for (const p of products) {
    const stock = Number(p.currentStock);
    const cost = Number(p.costPrice);
    const reorderLevel = Number(p.reorderLevel ?? 0);
    const value = stock * cost;

    const row = {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit.name,
      currentStock: stock,
      costPrice: cost,
      totalValue: value,
      reorderLevel,
      belowReorder: reorderLevel > 0 && stock <= reorderLevel,
    };

    const existing = categoryMap.get(p.category.name);
    if (existing) {
      existing.products.push(row);
      existing.subtotal += value;
    } else {
      categoryMap.set(p.category.name, {
        name: p.category.name,
        products: [row],
        subtotal: value,
      });
    }
  }

  const categories = Array.from(categoryMap.values());
  const grandTotal = categories.reduce((sum, category) => sum + category.subtotal, 0);

  return (
    <StockValuationTable
      categories={categories}
      grandTotal={grandTotal}
      asOf={format(new Date(), "d MMM yyyy, HH:mm")}
    />
  );
}

