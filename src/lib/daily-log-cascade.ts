/**
 * Cascading recalculation for closed daily logs.
 *
 * When a backdated sale, return, or purchase is created/edited/cancelled after
 * one or more days have been closed, call this to recompute the paper record
 * (soldQty, freshReturnQty, closingQty, openingQty chain) for every affected
 * closed log from `fromDate` forward.
 *
 * Stock movements are NOT touched here — SALE / RETURN_IN movements were
 * already applied correctly at the time of the transaction. This only fixes
 * the summary columns stored in DailyLog / DailyLogItem so history reports
 * stay accurate.
 */

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function cascadeClosedDailyLogs({
  fromDate,
  triggerUserId,
}: {
  fromDate: Date;
  triggerUserId: string;
}): Promise<void> {
  try {
    // Normalize fromDate to midnight UTC (daily logs are stored as @db.Date)
    const startDate = new Date(Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate(),
    ));

    // Fetch all closed/auto-adjusted logs from startDate onward, ordered chronologically.
    // We also include REOPENED because a reopened log that was re-closed might have
    // stale cascade data from before it was reopened.
    const affectedLogs = await prisma.dailyLog.findMany({
      where: {
        logDate: { gte: startDate },
        status: { in: ["CLOSED", "AUTO_ADJUSTED"] },
      },
      orderBy: { logDate: "asc" },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            openingQty: true,
            producedQty: true,
            usedQty: true,
            soldQty: true,
            freshReturnQty: true,
            wasteQty: true,
            damagedQty: true,
            closingQty: true,
          },
        },
      },
    });

    if (affectedLogs.length === 0) return;

    // For each log, recompute soldQty and freshReturnQty from live sales data,
    // then recompute closingQty using the formula.
    // After each log, cascade its closing qty as the opening qty for the next day.

    // openingOverrides: productId → qty to use as openingQty for the NEXT log
    const openingOverrides = new Map<string, number>();

    for (const log of affectedLogs) {
      const logDate = log.logDate;
      const nextDay = new Date(logDate.getTime() + 24 * 60 * 60 * 1000);

      // Recompute sold qty from confirmed sales orders for this date
      const [soldSums, freshReturnSums, purchaseSums] = await Promise.all([
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
        prisma.purchaseLineItem.groupBy({
          by: ["productId"],
          where: {
            productId: { not: null },
            purchase: {
              deletedAt: null,
              date: { gte: logDate, lt: nextDay },
            },
          },
          _sum: { quantity: true },
        }),
      ]);

      const soldMap = new Map(soldSums.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]));
      const freshMap = new Map(freshReturnSums.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]));
      const purchaseMap = new Map(
        purchaseSums
          .filter((s) => s.productId != null)
          .map((s) => [s.productId!, Number(s._sum.quantity ?? 0)])
      );

      const itemUpdates: Array<{
        id: string;
        productId: string;
        openingQty: number;
        soldQty: number;
        freshReturnQty: number;
        closingQty: number;
      }> = [];

      for (const item of log.items) {
        const opening      = openingOverrides.has(item.productId)
          ? openingOverrides.get(item.productId)!
          : Number(item.openingQty);
        const purchased    = purchaseMap.get(item.productId) ?? 0;
        const produced     = Number(item.producedQty);
        const used         = Number(item.usedQty);
        const sold         = soldMap.get(item.productId) ?? Number(item.soldQty);
        const freshReturn  = freshMap.get(item.productId) ?? Number(item.freshReturnQty);
        const waste        = Number(item.wasteQty);
        const damaged      = Number(item.damagedQty);

        const closing = opening + purchased + produced + freshReturn - used - sold - waste - damaged;

        itemUpdates.push({
          id: item.id,
          productId: item.productId,
          openingQty: opening,
          soldQty: sold,
          freshReturnQty: freshReturn,
          closingQty: closing,
        });

        // This closing qty becomes the next day's opening qty
        openingOverrides.set(item.productId, closing);
      }

      const snapshotBefore = {
        logId:  log.id,
        status: log.status,
        items:  log.items.map((i) => ({
          productId:  i.productId,
          openingQty: Number(i.openingQty),
          soldQty:    Number(i.soldQty),
          closingQty: Number(i.closingQty),
        })),
      };

      // Apply updates inside a transaction
      await prisma.$transaction(async (tx) => {
        for (const upd of itemUpdates) {
          await tx.dailyLogItem.update({
            where: { id: upd.id },
            data: {
              openingQty:    upd.openingQty,
              soldQty:       upd.soldQty,
              freshReturnQty: upd.freshReturnQty,
              closingQty:    upd.closingQty,
            },
          });
        }

        await tx.dailyLog.update({
          where: { id: log.id },
          data: {
            status:          "AUTO_ADJUSTED",
            autoAdjustedAt:  new Date(),
            autoAdjustedBy:  triggerUserId,
          },
        });
      });

      await writeAuditLog({
        userId:     triggerUserId,
        action:     "DAILY_LOG_AUTO_ADJUST",
        entityType: "DailyLog",
        entityId:   log.id,
        before:     snapshotBefore,
        after: {
          logId:  log.id,
          status: "AUTO_ADJUSTED",
          items:  itemUpdates.map((u) => ({
            productId:  u.productId,
            openingQty: u.openingQty,
            soldQty:    u.soldQty,
            closingQty: u.closingQty,
          })),
        },
      });
    }
  } catch (err) {
    // Best-effort: never throw back to the caller
    console.warn("[cascade] Failed to cascade daily log recalculation from", fromDate.toISOString(), err);
  }
}
