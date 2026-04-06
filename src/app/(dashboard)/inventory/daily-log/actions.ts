"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/stock";
import { StockMovementType } from "@prisma/client";

async function requireDailyLogAccess() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthenticated");
  const role = user.publicMetadata?.role as string | undefined;
  if (!role || !["admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return { userId: user.id, role };
}

/** Parse a YYYY-MM-DD string into a UTC midnight Date (avoids timezone drift) */
function parseDateParam(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

/** Returns today's date as YYYY-MM-DD in local time */
export async function getTodayString(): Promise<string> {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────

export type DailyLogRow = {
  id: string;
  logDate: string;        // YYYY-MM-DD
  status: "OPEN" | "CLOSED";
  notes: string | null;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
  items: DailyLogItemRow[];
};

export type DailyLogItemRow = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  categoryId: string;
  categoryName: string;
  unitName: string;
  openingQty: number;
  purchasedQty: number;   // computed from PurchaseLineItem, not stored
  producedQty: number;
  usedQty: number;
  soldQty: number;
  wasteQty: number;
  damagedQty: number;
  closingQty: number;
  actualQty: number | null;
  varianceQty: number | null;
  notes: string | null;
};

export async function getDailyLog(dateStr: string): Promise<DailyLogRow | null> {
  const logDate = parseDateParam(dateStr);
  const nextDay = new Date(logDate.getTime() + 24 * 60 * 60 * 1000);

  const log = await prisma.dailyLog.findUnique({
    where: { logDate },
    include: {
      items: {
        include: {
          product: {
            include: { category: true, unit: true },
          },
        },
        orderBy: [
          { product: { category: { name: "asc" } } },
          { product: { name: "asc" } },
        ],
      },
    },
  });

  if (!log) return null;

  // Get purchases that landed on this date for each product
  const purchaseSums = await prisma.purchaseLineItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      purchase: {
        deletedAt: null,
        date: { gte: logDate, lt: nextDay },
      },
    },
    _sum: { quantity: true },
  });

  const purchaseMap = new Map(
    purchaseSums
      .filter((s) => s.productId != null)
      .map((s) => [s.productId!, Number(s._sum.quantity ?? 0)])
  );

  const items: DailyLogItemRow[] = log.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSku: item.product.sku,
    categoryId: item.product.categoryId,
    categoryName: item.product.category.name,
    unitName: item.product.unit.name,
    openingQty: Number(item.openingQty),
    purchasedQty: purchaseMap.get(item.productId) ?? 0,
    producedQty: Number(item.producedQty),
    usedQty: Number(item.usedQty),
    soldQty: Number(item.soldQty),
    wasteQty: Number(item.wasteQty),
    damagedQty: Number(item.damagedQty),
    closingQty: Number(item.closingQty),
    actualQty: item.actualQty != null ? Number(item.actualQty) : null,
    varianceQty: item.varianceQty != null ? Number(item.varianceQty) : null,
    notes: item.notes,
  }));

  return {
    id: log.id,
    logDate: dateStr,
    status: log.status,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    closedAt: log.closedAt?.toISOString() ?? null,
    closedBy: log.closedBy,
    items,
  };
}

// ─────────────────────────────────────────────
// START DAY
// ─────────────────────────────────────────────

export async function startDailyLog(dateStr: string): Promise<{ id: string }> {
  const { userId } = await requireDailyLogAccess();
  const logDate = parseDateParam(dateStr);

  // Prevent duplicate
  const existing = await prisma.dailyLog.findUnique({ where: { logDate } });
  if (existing) throw new Error("A log already exists for this date");

  // Snapshot current stock for all active products
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, currentStock: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });

  const log = await prisma.dailyLog.create({
    data: {
      logDate,
      status: "OPEN",
      createdBy: userId,
      items: {
        create: products.map((p) => ({
          productId: p.id,
          openingQty: p.currentStock,
        })),
      },
    },
  });

  revalidatePath("/inventory/daily-log");
  return { id: log.id };
}

// ─────────────────────────────────────────────
// UPDATE ITEM (auto-save on blur)
// ─────────────────────────────────────────────

export type UpdateItemValues = {
  producedQty: number;
  usedQty: number;
  soldQty: number;
  wasteQty: number;
  damagedQty: number;
  actualQty: number | null;
  notes: string | null;
};

export async function updateDailyLogItem(
  itemId: string,
  values: UpdateItemValues
): Promise<void> {
  await requireDailyLogAccess();

  // Ensure log is still open
  const item = await prisma.dailyLogItem.findUnique({
    where: { id: itemId },
    select: { dailyLog: { select: { status: true } } },
  });
  if (!item) throw new Error("Item not found");
  if (item.dailyLog.status === "CLOSED") throw new Error("Log is closed");

  await prisma.dailyLogItem.update({
    where: { id: itemId },
    data: {
      producedQty: values.producedQty,
      usedQty: values.usedQty,
      soldQty: values.soldQty,
      wasteQty: values.wasteQty,
      damagedQty: values.damagedQty,
      actualQty: values.actualQty,
      notes: values.notes,
    },
  });
  // No revalidatePath here — client manages its own state for speed
}

// ─────────────────────────────────────────────
// CLOSE DAY
// ─────────────────────────────────────────────

export async function closeDailyLog(logId: string): Promise<void> {
  const { userId } = await requireDailyLogAccess();

  const log = await prisma.dailyLog.findUnique({
    where: { id: logId },
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });

  if (!log) throw new Error("Log not found");
  if (log.status === "CLOSED") throw new Error("Log is already closed");

  // Determine purchased quantities on this day
  const logDate = log.logDate;
  const nextDay = new Date(logDate.getTime() + 24 * 60 * 60 * 1000);

  const purchaseSums = await prisma.purchaseLineItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      purchase: {
        deletedAt: null,
        date: { gte: logDate, lt: nextDay },
      },
    },
    _sum: { quantity: true },
  });
  const purchaseMap = new Map(
    purchaseSums
      .filter((s) => s.productId != null)
      .map((s) => [s.productId!, Number(s._sum.quantity ?? 0)])
  );

  await prisma.$transaction(async (tx) => {
    for (const item of log.items) {
      const opening = Number(item.openingQty);
      const purchased = purchaseMap.get(item.productId) ?? 0;
      const produced = Number(item.producedQty);
      const used = Number(item.usedQty);
      const sold = Number(item.soldQty);
      const waste = Number(item.wasteQty);
      const damaged = Number(item.damagedQty);

      const closing = opening + purchased + produced - used - sold - waste - damaged;
      const actual = item.actualQty != null ? Number(item.actualQty) : null;
      const variance = actual != null ? actual - closing : null;

      // Apply stock movements (purchases already applied — never re-apply here)
      // isAdminOverride: true because the daily log is trusted staff input;
      // negative closing is a discrepancy to investigate, not a hard blocker.
      const ref = { referenceId: log.id, referenceType: "DailyLog", isAdminOverride: true as const };
      const dateLabel = logDate.toISOString().slice(0, 10);
      const txClient = tx as Parameters<typeof applyStockMovement>[1];

      // Apply DAILY_IN first so produced stock is available before deductions
      if (produced > 0) {
        await applyStockMovement(
          { productId: item.productId, type: StockMovementType.DAILY_IN,  quantity: produced, notes: `Daily log ${dateLabel} — produced`, createdBy: userId, ...ref },
          txClient
        );
      }

      // Then apply all DAILY_OUT movements
      if (used > 0) {
        await applyStockMovement(
          { productId: item.productId, type: StockMovementType.DAILY_OUT, quantity: used,     notes: `Daily log ${dateLabel} — used`,     createdBy: userId, ...ref },
          txClient
        );
      }
      if (sold > 0) {
        await applyStockMovement(
          { productId: item.productId, type: StockMovementType.DAILY_OUT, quantity: sold,     notes: `Daily log ${dateLabel} — sold`,     createdBy: userId, ...ref },
          txClient
        );
      }
      if (waste > 0) {
        await applyStockMovement(
          { productId: item.productId, type: StockMovementType.DAILY_OUT, quantity: waste,    notes: `Daily log ${dateLabel} — waste`,    createdBy: userId, ...ref },
          txClient
        );
      }
      if (damaged > 0) {
        await applyStockMovement(
          { productId: item.productId, type: StockMovementType.DAILY_OUT, quantity: damaged,  notes: `Daily log ${dateLabel} — damaged`,  createdBy: userId, ...ref },
          txClient
        );
      }

      // Store final calculated values on the item
      await tx.dailyLogItem.update({
        where: { id: item.id },
        data: {
          closingQty: closing,
          actualQty: actual,
          varianceQty: variance,
        },
      });
    }

    // Mark log as closed
    await tx.dailyLog.update({
      where: { id: log.id },
      data: {
        status: "CLOSED",
        closedBy: userId,
        closedAt: new Date(),
      },
    });
  });

  revalidatePath("/inventory/daily-log");
  revalidatePath("/inventory/daily-log/history");
  revalidatePath("/inventory");
  revalidatePath("/inventory/stock-levels");
}

// ─────────────────────────────────────────────
// REOPEN DAY (admin only)
// ─────────────────────────────────────────────

export async function reopenDailyLog(logId: string): Promise<void> {
  const { userId, role } = await requireDailyLogAccess();
  if (role !== "admin") throw new Error("Only admins can reopen a closed log");

  const log = await prisma.dailyLog.findUnique({
    where: { id: logId },
    select: { status: true, logDate: true },
  });
  if (!log) throw new Error("Log not found");
  if (log.status !== "CLOSED") throw new Error("Log is not closed");

  // Reverse all DAILY_IN / DAILY_OUT movements that reference this log
  const movements = await prisma.stockMovement.findMany({
    where: {
      referenceId: logId,
      referenceType: "DailyLog",
      type: { in: [StockMovementType.DAILY_IN, StockMovementType.DAILY_OUT] },
    },
    select: { id: true, productId: true, type: true, quantity: true },
  });

  await prisma.$transaction(async (tx) => {
    const txClient = tx as Parameters<typeof applyStockMovement>[1];

    for (const mv of movements) {
      // Reverse: DAILY_IN → DAILY_OUT, DAILY_OUT → DAILY_IN
      const reverseType =
        mv.type === StockMovementType.DAILY_IN
          ? StockMovementType.DAILY_OUT
          : StockMovementType.DAILY_IN;

      await applyStockMovement(
        {
          productId: mv.productId,
          type: reverseType,
          quantity: Number(mv.quantity),
          notes: `Reopen: reversal of daily log ${log.logDate.toISOString().slice(0, 10)}`,
          createdBy: userId,
          referenceId: logId,
          referenceType: "DailyLog",
          isAdminOverride: true,
        },
        txClient
      );
    }

    // Reset all item activity fields so staff can re-enter
    await tx.dailyLogItem.updateMany({
      where: { dailyLogId: logId },
      data: {
        producedQty: 0,
        usedQty: 0,
        soldQty: 0,
        wasteQty: 0,
        damagedQty: 0,
        closingQty: 0,
        actualQty: null,
        varianceQty: null,
        notes: null,
      },
    });

    // Unlock log
    await tx.dailyLog.update({
      where: { id: logId },
      data: { status: "OPEN", closedBy: null, closedAt: null },
    });
  });

  revalidatePath("/inventory/daily-log");
  revalidatePath("/inventory/daily-log/history");
  revalidatePath("/inventory");
  revalidatePath("/inventory/stock-levels");
}

// ─────────────────────────────────────────────
// HISTORY LIST
// ─────────────────────────────────────────────

export type DailyLogSummary = {
  id: string;
  logDate: string;
  status: "OPEN" | "CLOSED";
  createdBy: string;
  closedBy: string | null;
  closedAt: string | null;
  productCount: number;
  activeCount: number;       // rows with any activity
  varianceCount: number;     // rows with a non-zero variance
  totalProduced: number;
  totalUsed: number;
  totalSold: number;
  totalWaste: number;
};

export async function getDailyLogHistory(limitDays = 30): Promise<DailyLogSummary[]> {
  await requireDailyLogAccess();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - limitDays);

  const logs = await prisma.dailyLog.findMany({
    where: { logDate: { gte: since } },
    orderBy: { logDate: "desc" },
    include: {
      items: {
        select: {
          producedQty: true,
          usedQty: true,
          soldQty: true,
          wasteQty: true,
          damagedQty: true,
          varianceQty: true,
        },
      },
    },
  });

  return logs.map((log) => {
    const activeCount = log.items.filter(
      (i) =>
        Number(i.producedQty) + Number(i.usedQty) + Number(i.soldQty) +
        Number(i.wasteQty) + Number(i.damagedQty) > 0
    ).length;

    const varianceCount = log.items.filter(
      (i) => i.varianceQty != null && Math.abs(Number(i.varianceQty)) > 0.001
    ).length;

    return {
      id: log.id,
      logDate: log.logDate.toISOString().slice(0, 10),
      status: log.status,
      createdBy: log.createdBy,
      closedBy: log.closedBy,
      closedAt: log.closedAt?.toISOString() ?? null,
      productCount: log.items.length,
      activeCount,
      varianceCount,
      totalProduced: log.items.reduce((s, i) => s + Number(i.producedQty), 0),
      totalUsed: log.items.reduce((s, i) => s + Number(i.usedQty), 0),
      totalSold: log.items.reduce((s, i) => s + Number(i.soldQty), 0),
      totalWaste: log.items.reduce((s, i) => s + Number(i.wasteQty) + Number(i.damagedQty), 0),
    };
  });
}
