"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType, Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { cascadeClosedDailyLogs } from "@/lib/daily-log-cascade";

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

export type DailyLogStatus = "OPEN" | "CLOSED" | "REOPENED" | "AUTO_ADJUSTED";

export type DailyLogRow = {
  id: string;
  logDate: string;        // YYYY-MM-DD
  status: DailyLogStatus;
  notes: string | null;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
  openingOutdated: boolean; // true when ≥1 product's openingQty doesn't match prev log's closingQty
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
  purchasedQty: number;    // computed from PurchaseLineItem, not stored
  producedQty: number;
  usedQty: number;
  soldQty: number;
  freshReturnQty: number;  // computed from FRESH SalesReturn records
  wasteReturnQty: number;  // computed from WASTE SalesReturn records (informational, not deducted)
  wasteQty: number;
  damagedQty: number;
  closingQty: number;
  actualQty: number | null;
  varianceQty: number | null;
  notes: string | null;
  // opening + purchased + produced + freshReturn - used - sold - waste - damaged - closing
  // Should be 0; non-zero means the stored closing is stale vs live figures
  formulaDelta: number;
  // true when this product's openingQty doesn't match the previous log's closingQty
  openingOutdated: boolean;
};

export async function getDailyLog(dateStr: string): Promise<DailyLogRow | null> {
  await requireDailyLogAccess();
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

  // For OPEN / REOPENED logs, compare each item's openingQty against the previous
  // finalized log's closingQty so we can warn the admin if they are out of sync.
  let prevClosingCheck = new Map<string, number>();
  if (log.status === "OPEN" || log.status === "REOPENED") {
    const prevFinalized = await prisma.dailyLog.findFirst({
      where: {
        logDate: { lt: logDate },
        status:  { in: ["CLOSED", "AUTO_ADJUSTED"] },
      },
      orderBy: { logDate: "desc" },
      include: { items: { select: { productId: true, closingQty: true } } },
    });
    if (prevFinalized) {
      prevClosingCheck = new Map(
        prevFinalized.items.map((i) => [i.productId, Number(i.closingQty)])
      );
    }
  }

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

  // Always compute soldQty and freshReturnQty live from sales orders by orderDate.
  // This ensures backdated entries and edits are reflected in both open and closed logs.
  const [soldSums, freshReturnSums] = await Promise.all([
    prisma.salesOrderItem.groupBy({
      by: ["productId"],
      where: {
        salesOrder: {
          status:    { in: ["CONFIRMED", "PARTIALLY_PAID", "PAID"] },
          deletedAt: null,
          orderDate: { gte: logDate, lt: nextDay },
        },
      },
      _sum: { quantity: true },
    }),
    prisma.salesReturnItem.groupBy({
      by: ["productId"],
      where: {
        salesReturn: {
          returnType: "FRESH",
          salesOrder: { deletedAt: null, orderDate: { gte: logDate, lt: nextDay } },
        },
      },
      _sum: { quantity: true },
    }),
  ]);
  const confirmedSoldMap = new Map(
    soldSums.map((s) => [s.productId, Number(s._sum.quantity ?? 0)])
  );
  const freshReturnMap = new Map(
    freshReturnSums.map((s) => [s.productId, Number(s._sum.quantity ?? 0)])
  );

  // Always compute wasteReturnQty from WASTE sales returns (read-only, informational)
  const wasteReturnSums = await prisma.salesReturnItem.groupBy({
    by: ["productId"],
    where: {
      salesReturn: {
        returnType: "WASTE",
        salesOrder: { deletedAt: null, orderDate: { gte: logDate, lt: nextDay } },
      },
    },
    _sum: { quantity: true },
  });
  const wasteReturnMap = new Map(
    wasteReturnSums.map((s) => [s.productId, Number(s._sum.quantity ?? 0)])
  );

  const items: DailyLogItemRow[] = log.items.map((item) => {
    const opening      = Number(item.openingQty);
    const purchased    = purchaseMap.get(item.productId) ?? 0;
    const produced     = Number(item.producedQty);
    const used         = Number(item.usedQty);
    const sold         = confirmedSoldMap.get(item.productId) ?? Number(item.soldQty);
    const freshReturn  = freshReturnMap.get(item.productId) ?? Number(item.freshReturnQty);
    const wasteReturn  = wasteReturnMap.get(item.productId) ?? 0;
    const waste        = Number(item.wasteQty);
    const damaged      = Number(item.damagedQty);
    const closing      = Number(item.closingQty);

    // Positive delta = formula says closing should be higher than stored (data was added after close)
    // Negative delta = formula says closing should be lower (data was removed after close)
    const formulaDelta = (opening + purchased + produced + freshReturn - used - sold - waste - damaged) - closing;

    const prevClosing     = prevClosingCheck.get(item.productId);
    const openingOutdated = prevClosing !== undefined && Math.abs(prevClosing - opening) > 0.001;

    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSku: item.product.sku,
      categoryId: item.product.categoryId,
      categoryName: item.product.category.name,
      unitName: item.product.unit.name,
      openingQty: opening,
      purchasedQty: purchased,
      producedQty: produced,
      usedQty: used,
      soldQty: sold,
      freshReturnQty: freshReturn,
      wasteReturnQty: wasteReturn,
      wasteQty: waste,
      damagedQty: damaged,
      closingQty: closing,
      actualQty: item.actualQty != null ? Number(item.actualQty) : null,
      varianceQty: item.varianceQty != null ? Number(item.varianceQty) : null,
      notes: item.notes,
      formulaDelta: Math.round(formulaDelta * 1000) / 1000,
      openingOutdated,
    };
  });

  const openingOutdated = items.some((i) => i.openingOutdated);

  return {
    id: log.id,
    logDate: dateStr,
    status: log.status as DailyLogStatus,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    closedAt: log.closedAt?.toISOString() ?? null,
    closedBy: log.closedBy,
    openingOutdated,
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

  // Find the most recent log before this date to check its status.
  const mostRecentPrior = await prisma.dailyLog.findFirst({
    where: { logDate: { lt: logDate } },
    orderBy: { logDate: "desc" },
    select: { status: true, logDate: true },
  });

  // OPEN = data is still being entered; block until it is closed.
  if (mostRecentPrior?.status === "OPEN") {
    const d = mostRecentPrior.logDate.toISOString().slice(0, 10);
    throw new Error(
      `Daily log for ${d} is still open — close it first. Opening quantities for the new day come from that day's closing figures.`
    );
  }

  // REOPENED = admin is re-editing; its closing figures may still change.
  // Skip it and use the most recent CLOSED / AUTO_ADJUSTED log's closing instead.
  // (When the REOPENED log is eventually re-closed, cascade will propagate its
  //  corrected closing to any already-closed future logs. OPEN future logs will
  //  show an "opening may be outdated" warning until recreated.)
  const prevLog = await prisma.dailyLog.findFirst({
    where: { logDate: { lt: logDate }, status: { in: ["CLOSED", "AUTO_ADJUSTED"] } },
    orderBy: { logDate: "desc" },
    include: { items: { select: { productId: true, closingQty: true } } },
  });

  // prevLog is CLOSED / AUTO_ADJUSTED (or null = first ever log): use its closing quantities.
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

  // Backfill soldQty and freshReturnQty from any activity recorded before the log was opened
  const nextDay = new Date(logDate.getTime() + 24 * 60 * 60 * 1000);
  const [soldItems, freshReturnItems] = await Promise.all([
    prisma.salesOrderItem.findMany({
      where: {
        salesOrder: {
          status:    { in: ["CONFIRMED", "PARTIALLY_PAID", "PAID"] },
          deletedAt: null,
          orderDate: { gte: logDate, lt: nextDay },
        },
      },
      select: { productId: true, quantity: true },
    }),
    prisma.salesReturnItem.findMany({
      where: {
        salesReturn: {
          returnType: "FRESH",
          salesOrder: { deletedAt: null, orderDate: { gte: logDate, lt: nextDay } },
        },
      },
      select: { productId: true, quantity: true },
    }),
  ]);
  const soldByProduct = new Map<string, number>();
  for (const si of soldItems) {
    soldByProduct.set(si.productId, (soldByProduct.get(si.productId) ?? 0) + Number(si.quantity));
  }
  const freshByProduct = new Map<string, number>();
  for (const ri of freshReturnItems) {
    freshByProduct.set(ri.productId, (freshByProduct.get(ri.productId) ?? 0) + Number(ri.quantity));
  }
  for (const [productId, qty] of soldByProduct) {
    await prisma.dailyLogItem.updateMany({
      where: { dailyLogId: log.id, productId },
      data:  { soldQty: qty },
    });
  }
  for (const [productId, qty] of freshByProduct) {
    await prisma.dailyLogItem.updateMany({
      where: { dailyLogId: log.id, productId },
      data:  { freshReturnQty: qty },
    });
  }

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
  freshReturnQty: number;
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

  const item = await prisma.dailyLogItem.findUnique({
    where: { id: itemId },
    select: { dailyLog: { select: { status: true } } },
  });
  if (!item) throw new Error("Item not found");

  // CLOSED and AUTO_ADJUSTED logs are locked; OPEN and REOPENED allow edits
  const { status } = item.dailyLog;
  if (status === "CLOSED") throw new Error("Log is closed");
  if (status === "AUTO_ADJUSTED") throw new Error("Log was auto-adjusted. Reopen it before editing.");

  await prisma.dailyLogItem.update({
    where: { id: itemId },
    data: {
      producedQty:    values.producedQty,
      usedQty:        values.usedQty,
      soldQty:        values.soldQty,
      freshReturnQty: values.freshReturnQty,
      wasteQty:       values.wasteQty,
      damagedQty:     values.damagedQty,
      actualQty:      values.actualQty,
      notes:          values.notes,
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
  if (log.status === "AUTO_ADJUSTED") {
    throw new Error("Log was auto-adjusted. Reopen it before closing again to avoid duplicate stock movements.");
  }

  // Determine purchased quantities on this day
  const logDate = log.logDate;
  const nextDay = new Date(logDate.getTime() + 24 * 60 * 60 * 1000);
  const dateLabel = logDate.toISOString().slice(0, 10);

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

  const productIds = log.items.map((i) => i.productId);
  const ref = { referenceId: log.id, referenceType: "DailyLog" };

  type PendingMovement = {
    productId: string;
    type: StockMovementType;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    notes: string;
  };

  // ── All reads and all writes happen inside ONE RepeatableRead transaction ──
  // Moving the stock snapshot inside the transaction prevents a race condition
  // where a concurrent SALE between snapshot and commit would corrupt stock values.
  const pendingMovements: PendingMovement[] = [];
  const itemUpdates: Array<{
    id: string;
    closingQty: number;
    soldQty: number;
    freshReturnQty: number;
    actualQty: number | null;
    varianceQty: number | null;
  }> = [];

  await prisma.$transaction(
    async (tx) => {
      // Read stock snapshot INSIDE the transaction with RepeatableRead isolation.
      // No concurrent SALE can sneak between this read and the writes below.
      const stockSnapshot = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, currentStock: true },
      });
      const stockMap = new Map(stockSnapshot.map((p) => [p.id, Number(p.currentStock)]));

      // Sync soldQty and freshReturnQty live so closing qty matches what was shown to the user
      const [confirmedSoldSums, confirmedFreshSums] = await Promise.all([
        tx.salesOrderItem.groupBy({
          by: ["productId"],
          where: {
            salesOrder: {
              status:    { in: ["CONFIRMED", "PARTIALLY_PAID", "PAID"] },
              deletedAt: null,
              orderDate: { gte: logDate, lt: nextDay },
            },
          },
          _sum: { quantity: true },
        }),
        tx.salesReturnItem.groupBy({
          by: ["productId"],
          where: {
            salesReturn: {
              returnType: "FRESH",
              salesOrder: { deletedAt: null, orderDate: { gte: logDate, lt: nextDay } },
            },
          },
          _sum: { quantity: true },
        }),
      ]);
      const confirmedSoldMap  = new Map(confirmedSoldSums.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]));
      const confirmedFreshMap = new Map(confirmedFreshSums.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]));

      for (const item of log.items) {
        const opening    = Number(item.openingQty);
        const purchased  = purchaseMap.get(item.productId) ?? 0;
        const produced   = Number(item.producedQty);
        const used       = Number(item.usedQty);
        // Use confirmed sales qty; fall back to stored soldQty if user manually overrode it higher
        const confirmedSold  = confirmedSoldMap.get(item.productId) ?? 0;
        const storedSold     = Number(item.soldQty);
        const sold           = storedSold > confirmedSold ? storedSold : confirmedSold;
        const storedFresh    = Number(item.freshReturnQty);
        const confirmedFresh = confirmedFreshMap.get(item.productId) ?? 0;
        const freshReturn    = storedFresh > confirmedFresh ? storedFresh : confirmedFresh;
        const waste          = Number(item.wasteQty);
        const damaged        = Number(item.damagedQty);

        const closing  = opening + purchased + produced + freshReturn - used - sold - waste - damaged;
        const actual   = item.actualQty != null ? Number(item.actualQty) : null;
        const variance = actual != null ? actual - closing : null;

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
        // soldQty comes from confirmed SALE movements — skipping DAILY_OUT for sold prevents double-deduction
        addMovement(StockMovementType.DAILY_OUT, waste,    "waste");
        addMovement(StockMovementType.DAILY_OUT, damaged,  "damaged");

        itemUpdates.push({ id: item.id, closingQty: closing, soldQty: sold, freshReturnQty: freshReturn, actualQty: actual, varianceQty: variance });
      }

      // Batch-create all stock movements
      if (pendingMovements.length > 0) {
        await tx.stockMovement.createMany({
          data: pendingMovements.map((m) => ({
            productId:       m.productId,
            type:            m.type,
            quantity:        m.quantity,
            quantityBefore:  m.quantityBefore,
            quantityAfter:   m.quantityAfter,
            notes:           m.notes,
            referenceId:     ref.referenceId,
            referenceType:   ref.referenceType,
            isAdminOverride: true,
            createdBy:       userId,
          })),
        });
      }

      // Update each product's currentStock
      for (const [productId, newStock] of stockMap.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: { currentStock: newStock },
        });
      }

      // Update daily log items (store the live soldQty/freshReturnQty used for closing)
      for (const upd of itemUpdates) {
        await tx.dailyLogItem.update({
          where: { id: upd.id },
          data: {
            soldQty:        upd.soldQty,
            freshReturnQty: upd.freshReturnQty,
            closingQty:     upd.closingQty,
            actualQty:      upd.actualQty,
            varianceQty:    upd.varianceQty,
          },
        });
      }

      // Mark log as closed
      await tx.dailyLog.update({
        where: { id: log.id },
        data: { status: "CLOSED", closedBy: userId, closedAt: new Date() },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 30000,
    }
  );

  await writeAuditLog({
    userId,
    action:     "DAILY_LOG_CLOSE",
    entityType: "DailyLog",
    entityId:   logId,
    after: {
      date:      dateLabel,
      itemCount: log.items.length,
    },
  });

  // Propagate this log's closing quantities to any already-closed future logs
  // (handles the case where a REOPENED log was re-edited then re-closed).
  await cascadeClosedDailyLogs({ fromDate: nextDay, triggerUserId: userId });

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
  if (log.status !== "CLOSED" && log.status !== "AUTO_ADJUSTED") {
    throw new Error("Only CLOSED or AUTO_ADJUSTED logs can be reopened");
  }

  const dateLabel = log.logDate.toISOString().slice(0, 10);

  // Load the movements that this log created so we can reverse them
  const movements = await prisma.stockMovement.findMany({
    where: {
      referenceId:   logId,
      referenceType: "DailyLog",
      type: { in: [StockMovementType.DAILY_IN, StockMovementType.DAILY_OUT] },
    },
    select: { productId: true, type: true, quantity: true },
  });

  const productIds = [...new Set(movements.map((m) => m.productId))];

  type PendingMovement = {
    productId: string;
    type: StockMovementType;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    notes: string;
  };

  await prisma.$transaction(
    async (tx) => {
      // Read stock snapshot INSIDE the transaction with RepeatableRead isolation
      const stockSnapshot = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, currentStock: true },
      });
      const stockMap = new Map(stockSnapshot.map((p) => [p.id, Number(p.currentStock)]));

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
          productId:     mv.productId,
          type:          reverseType,
          quantity:      qty,
          quantityBefore: before,
          quantityAfter:  after,
          notes: `Reopen: reversal of daily log ${dateLabel}`,
        });
      }

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

      for (const [productId, newStock] of stockMap.entries()) {
        await tx.product.update({
          where: { id: productId },
          data:  { currentStock: newStock },
        });
      }

      // Reset derived fields; preserve manually-entered data (producedQty, usedQty, wasteQty, etc.)
      await tx.dailyLogItem.updateMany({
        where: { dailyLogId: logId },
        data: {
          soldQty:        0,
          freshReturnQty: 0,
          closingQty:     0,
          actualQty:      null,
          varianceQty:    null,
        },
      });

      // Re-populate soldQty and freshReturnQty from confirmed sales orders
      const nextDay = new Date(log.logDate.getTime() + 24 * 60 * 60 * 1000);
      const [soldItems, freshReturnItems] = await Promise.all([
        tx.salesOrderItem.findMany({
          where: {
            salesOrder: {
              status:    { in: ["CONFIRMED", "PARTIALLY_PAID", "PAID"] },
              deletedAt: null,
              orderDate: { gte: log.logDate, lt: nextDay },
            },
          },
          select: { productId: true, quantity: true },
        }),
        tx.salesReturnItem.findMany({
          where: {
            salesReturn: {
              returnType: "FRESH",
              salesOrder: { deletedAt: null, orderDate: { gte: log.logDate, lt: nextDay } },
            },
          },
          select: { productId: true, quantity: true },
        }),
      ]);
      const soldByProduct  = new Map<string, number>();
      for (const si of soldItems) {
        soldByProduct.set(si.productId, (soldByProduct.get(si.productId) ?? 0) + Number(si.quantity));
      }
      const freshByProduct = new Map<string, number>();
      for (const ri of freshReturnItems) {
        freshByProduct.set(ri.productId, (freshByProduct.get(ri.productId) ?? 0) + Number(ri.quantity));
      }
      for (const [productId, qty] of soldByProduct) {
        await tx.dailyLogItem.updateMany({
          where: { dailyLogId: logId, productId },
          data:  { soldQty: qty },
        });
      }
      for (const [productId, qty] of freshByProduct) {
        await tx.dailyLogItem.updateMany({
          where: { dailyLogId: logId, productId },
          data:  { freshReturnQty: qty },
        });
      }

      // Set status to REOPENED (not OPEN) so history shows it was touched
      await tx.dailyLog.update({
        where: { id: logId },
        data: {
          status:          "REOPENED",
          autoAdjustedAt:  null,
          autoAdjustedBy:  null,
          // preserve closedBy/closedAt for audit trail
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 30000,
    }
  );

  await writeAuditLog({
    userId,
    action:     "DAILY_LOG_REOPEN",
    entityType: "DailyLog",
    entityId:   logId,
    after: { date: dateLabel, reopenedBy: userId },
  });

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
  status: DailyLogStatus;
  createdBy: string;
  closedBy: string | null;
  closedAt: string | null;
  autoAdjustedAt: string | null;
  productCount: number;
  activeCount: number;
  varianceCount: number;
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
      status: log.status as DailyLogStatus,
      createdBy: log.createdBy,
      closedBy: log.closedBy,
      closedAt: log.closedAt?.toISOString() ?? null,
      autoAdjustedAt: log.autoAdjustedAt?.toISOString() ?? null,
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
