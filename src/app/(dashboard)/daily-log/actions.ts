"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
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

  // Prevent starting a new log if any previous log is still open
  // (opening quantities would be wrong — stock movements only apply on close)
  const openLog = await prisma.dailyLog.findFirst({
    where: { status: "OPEN", logDate: { lt: logDate } },
    select: { logDate: true },
    orderBy: { logDate: "desc" },
  });
  if (openLog) {
    const d = openLog.logDate.toISOString().slice(0, 10);
    throw new Error(
      `Close the daily log for ${d} first. Opening quantities carry over from the previous closed log.`
    );
  }

  // Use previous closed log's closing quantities as opening quantities.
  // This creates an explicit, traceable chain: Day N closing → Day N+1 opening.
  // Falls back to currentStock for products not in the previous log (e.g. newly added).
  const prevLog = await prisma.dailyLog.findFirst({
    where: { status: "CLOSED", logDate: { lt: logDate } },
    orderBy: { logDate: "desc" },
    include: {
      items: { select: { productId: true, closingQty: true } },
    },
  });

  const prevClosingMap = new Map<string, number>(
    prevLog?.items.map((i) => [i.productId, Number(i.closingQty)]) ?? []
  );

  // Get all active products (for currentStock fallback on new products)
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
          openingQty: prevClosingMap.has(p.id)
            ? prevClosingMap.get(p.id)!
            : Number(p.currentStock),
        })),
      },
    },
  });

  revalidatePath("/daily-log");
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

  // Pre-load current stock for all products in this log (1 query instead of N×M)
  const productIds = log.items.map((i) => i.productId);
  const stockSnapshot = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, currentStock: true },
  });
  // Mutable in-memory stock map — updated as we process each movement
  const stockMap = new Map(stockSnapshot.map((p) => [p.id, Number(p.currentStock)]));

  const dateLabel = logDate.toISOString().slice(0, 10);
  const ref = { referenceId: log.id, referenceType: "DailyLog" };

  // Build all stock movement records and final values in-memory
  type PendingMovement = {
    productId: string;
    type: StockMovementType;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    notes: string;
  };

  const pendingMovements: PendingMovement[] = [];
  const itemUpdates: Array<{ id: string; closingQty: number; actualQty: number | null; varianceQty: number | null }> = [];

  for (const item of log.items) {
    const opening   = Number(item.openingQty);
    const purchased = purchaseMap.get(item.productId) ?? 0;
    const produced  = Number(item.producedQty);
    const used      = Number(item.usedQty);
    const sold      = Number(item.soldQty);
    const waste     = Number(item.wasteQty);
    const damaged   = Number(item.damagedQty);

    const closing  = opening + purchased + produced - used - sold - waste - damaged;
    const actual   = item.actualQty != null ? Number(item.actualQty) : null;
    const variance = actual != null ? actual - closing : null;

    // Track running stock in-memory; DAILY_IN first, then DAILY_OUT
    const pid = item.productId;
    const addMovement = (type: StockMovementType, qty: number, label: string) => {
      if (qty <= 0) return;
      const before = stockMap.get(pid) ?? 0;
      const isOut  = type === StockMovementType.DAILY_OUT;
      const after  = isOut ? before - qty : before + qty;
      stockMap.set(pid, after);
      pendingMovements.push({ productId: pid, type, quantity: qty, quantityBefore: before, quantityAfter: after, notes: `Daily log ${dateLabel} — ${label}` });
    };

    addMovement(StockMovementType.DAILY_IN,  produced, "produced");
    addMovement(StockMovementType.DAILY_OUT, used,     "used");
    addMovement(StockMovementType.DAILY_OUT, sold,     "sold");
    addMovement(StockMovementType.DAILY_OUT, waste,    "waste");
    addMovement(StockMovementType.DAILY_OUT, damaged,  "damaged");

    itemUpdates.push({ id: item.id, closingQty: closing, actualQty: actual, varianceQty: variance });
  }

  // Single transaction: batch-insert movements, update products + items + log header
  await prisma.$transaction(
    async (tx) => {
      // Batch-create all stock movements at once
      if (pendingMovements.length > 0) {
        await tx.stockMovement.createMany({
          data: pendingMovements.map((m) => ({
            productId:      m.productId,
            type:           m.type,
            quantity:       m.quantity,
            quantityBefore: m.quantityBefore,
            quantityAfter:  m.quantityAfter,
            notes:          m.notes,
            referenceId:    ref.referenceId,
            referenceType:  ref.referenceType,
            isAdminOverride: true,
            createdBy:      userId,
          })),
        });
      }

      // Update each product's currentStock (one update per product, not per movement)
      for (const [productId, newStock] of stockMap.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: newStock },
        });
      }

      // Update daily log items
      for (const upd of itemUpdates) {
        await tx.dailyLogItem.update({
          where: { id: upd.id },
          data: { closingQty: upd.closingQty, actualQty: upd.actualQty, varianceQty: upd.varianceQty },
        });
      }

      // Mark log as closed
      await tx.dailyLog.update({
        where: { id: log.id },
        data: { status: "CLOSED", closedBy: userId, closedAt: new Date() },
      });
    },
    { timeout: 30000 }  // 30s safety ceiling for large catalogs
  );

  revalidatePath("/daily-log");
  revalidatePath("/daily-log/history");
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

  const dateLabel = log.logDate.toISOString().slice(0, 10);

  // Load forward movements to reverse
  const movements = await prisma.stockMovement.findMany({
    where: {
      referenceId: logId,
      referenceType: "DailyLog",
      type: { in: [StockMovementType.DAILY_IN, StockMovementType.DAILY_OUT] },
    },
    select: { productId: true, type: true, quantity: true },
  });

  // Pre-load current stock for affected products
  const productIds = [...new Set(movements.map((m) => m.productId))];
  const stockSnapshot = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, currentStock: true },
  });
  const stockMap = new Map(stockSnapshot.map((p) => [p.id, Number(p.currentStock)]));

  // Build reversal movement records in-memory
  type PendingMovement = {
    productId: string;
    type: StockMovementType;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    notes: string;
  };
  const pendingMovements: PendingMovement[] = [];

  for (const mv of movements) {
    const reverseType =
      mv.type === StockMovementType.DAILY_IN
        ? StockMovementType.DAILY_OUT
        : StockMovementType.DAILY_IN;
    const qty    = Number(mv.quantity);
    const before = stockMap.get(mv.productId) ?? 0;
    const after  = reverseType === StockMovementType.DAILY_OUT ? before - qty : before + qty;
    stockMap.set(mv.productId, after);
    pendingMovements.push({
      productId: mv.productId,
      type:      reverseType,
      quantity:  qty,
      quantityBefore: before,
      quantityAfter:  after,
      notes: `Reopen: reversal of daily log ${dateLabel}`,
    });
  }

  await prisma.$transaction(
    async (tx) => {
      // Batch-insert all reversal movements
      if (pendingMovements.length > 0) {
        await tx.stockMovement.createMany({
          data: pendingMovements.map((m) => ({
            productId:       m.productId,
            type:            m.type,
            quantity:        m.quantity,
            quantityBefore:  m.quantityBefore,
            quantityAfter:   m.quantityAfter,
            notes:           m.notes,
            referenceId:     logId,
            referenceType:   "DailyLog",
            isAdminOverride: true,
            createdBy:       userId,
          })),
        });
      }

      // Update each product's currentStock once
      for (const [productId, newStock] of stockMap.entries()) {
        await tx.product.update({
          where: { id: productId },
          data:  { currentStock: newStock },
        });
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
    },
    { timeout: 30000 }
  );

  revalidatePath("/daily-log");
  revalidatePath("/daily-log/history");
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
