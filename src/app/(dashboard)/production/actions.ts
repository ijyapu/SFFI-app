"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/stock";
import { StockMovementType, Prisma } from "@prisma/client";
import { nepalDateAsUtcMidnight } from "@/lib/nepali-date";

async function requireProductionAccess() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (!role || !["superadmin", "admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

// ─────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────

export type ProductionEntryRow = {
  entryId: string | null; // null until the first save for this date+product
  productId: string;
  productName: string;
  productSku: string;
  categoryId: string;
  categoryName: string;
  unitName: string;
  currentStock: number;
  producedQty: number;
  usedQty: number;
  wasteQty: number;
  damagedQty: number;
  notes: string | null;
};

export async function getProductionEntries(dateStr: string): Promise<ProductionEntryRow[]> {
  await requireProductionAccess();
  const date = nepalDateAsUtcMidnight(dateStr);

  const [products, entries] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: { category: { select: { id: true, name: true } }, unit: { select: { name: true } } },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.productionEntry.findMany({ where: { date, deletedAt: null } }),
  ]);

  const entryMap = new Map(entries.map((e) => [e.productId, e]));

  return products.map((p) => {
    const e = entryMap.get(p.id);
    return {
      entryId: e?.id ?? null,
      productId: p.id,
      productName: p.name,
      productSku: p.sku,
      categoryId: p.category.id,
      categoryName: p.category.name,
      unitName: p.unit.name,
      currentStock: Number(p.currentStock),
      producedQty: Number(e?.producedQty ?? 0),
      usedQty: Number(e?.usedQty ?? 0),
      wasteQty: Number(e?.wasteQty ?? 0),
      damagedQty: Number(e?.damagedQty ?? 0),
      notes: e?.notes ?? null,
    };
  });
}

// ─────────────────────────────────────────────
// SAVE (upsert — applies only the delta as a stock movement)
// ─────────────────────────────────────────────

export type ProductionEntryValues = {
  producedQty: number;
  usedQty: number;
  wasteQty: number;
  damagedQty: number;
  notes: string | null;
};

export async function upsertProductionEntry(
  dateStr: string,
  productId: string,
  values: ProductionEntryValues
): Promise<void> {
  try {
    await upsertProductionEntryInner(dateStr, productId, values);
  } catch (e) {
    console.error("[production] upsertProductionEntry failed", { dateStr, productId, error: e });
    throw new Error(e instanceof Error ? e.message : "Failed to save — please try again.");
  }
}

async function upsertProductionEntryInner(
  dateStr: string,
  productId: string,
  values: ProductionEntryValues
): Promise<void> {
  const userId = await requireProductionAccess();
  const date = nepalDateAsUtcMidnight(dateStr);

  const existing = await prisma.productionEntry.findUnique({
    where: { date_productId: { date, productId } },
    include: { product: { select: { name: true } } },
  });

  const old = {
    produced: Number(existing?.producedQty ?? 0),
    used: Number(existing?.usedQty ?? 0),
    waste: Number(existing?.wasteQty ?? 0),
    damaged: Number(existing?.damagedQty ?? 0),
  };
  const delta = {
    produced: values.producedQty - old.produced,
    used: values.usedQty - old.used,
    waste: values.wasteQty - old.waste,
    damaged: values.damagedQty - old.damaged,
  };

  await prisma.$transaction(
    async (tx) => {
      // Produced adds stock: a higher number needs more added (DAILY_IN); a lower
      // number means some of what was added must come back out (DAILY_OUT).
      if (delta.produced > 0.0005) {
        await applyStockMovement(
          { productId, type: StockMovementType.DAILY_IN, quantity: delta.produced, notes: `Production ${dateStr} — produced +${delta.produced.toFixed(3)}`, referenceId: existing?.id, referenceType: "Production", createdBy: userId },
          tx as Parameters<typeof applyStockMovement>[1]
        );
      } else if (delta.produced < -0.0005) {
        await applyStockMovement(
          { productId, type: StockMovementType.DAILY_OUT, quantity: -delta.produced, notes: `Production ${dateStr} — produced ${delta.produced.toFixed(3)}`, referenceId: existing?.id, referenceType: "Production", createdBy: userId },
          tx as Parameters<typeof applyStockMovement>[1]
        );
      }

      // Used/waste/damaged subtract stock: a higher number needs more removed
      // (DAILY_OUT); a lower number means some of what was removed comes back (DAILY_IN).
      for (const [field, label] of [["used", "used"], ["waste", "waste"], ["damaged", "damaged"]] as const) {
        const d = delta[field];
        if (d > 0.0005) {
          await applyStockMovement(
            { productId, type: StockMovementType.DAILY_OUT, quantity: d, notes: `Production ${dateStr} — ${label} +${d.toFixed(3)}`, referenceId: existing?.id, referenceType: "Production", createdBy: userId },
            tx as Parameters<typeof applyStockMovement>[1]
          );
        } else if (d < -0.0005) {
          await applyStockMovement(
            { productId, type: StockMovementType.DAILY_IN, quantity: -d, notes: `Production ${dateStr} — ${label} ${d.toFixed(3)}`, referenceId: existing?.id, referenceType: "Production", createdBy: userId },
            tx as Parameters<typeof applyStockMovement>[1]
          );
        }
      }

      await tx.productionEntry.upsert({
        where: { date_productId: { date, productId } },
        create: {
          date, productId, createdBy: userId,
          producedQty: values.producedQty, usedQty: values.usedQty,
          wasteQty: values.wasteQty, damagedQty: values.damagedQty,
          notes: values.notes,
        },
        update: {
          producedQty: values.producedQty, usedQty: values.usedQty,
          wasteQty: values.wasteQty, damagedQty: values.damagedQty,
          notes: values.notes,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 }
  );

  // Not revalidating "/production" itself: the table already reflects the
  // saved value locally the moment the save succeeds, and re-rendering the
  // currently-mounted page as part of this same action response was causing
  // a downstream render failure to surface as if the save itself had failed
  // -- even though the transaction above had already committed cleanly.
  revalidatePath("/inventory");
  revalidatePath("/inventory/stock-levels");
}
