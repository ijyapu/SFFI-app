/**
 * Stock Movement Engine
 *
 * This is the ONLY place in the codebase that mutates Product.currentStock.
 * All stock changes — purchases, sales, adjustments, returns — must call
 * applyStockMovement(). Direct updates to Product.currentStock are forbidden.
 *
 * Usage within an existing transaction:
 *   await prisma.$transaction(async (tx) => {
 *     await applyStockMovement({ ...params }, tx);
 *     await tx.salesOrder.update(...);
 *   });
 *
 * Usage standalone:
 *   await applyStockMovement({ ...params });
 */

import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type StockMovementParams = {
  productId: string;
  type: StockMovementType;
  quantity: number; // always positive
  unitCost?: number;
  notes?: string; // required for ADJUSTMENT_IN / ADJUSTMENT_OUT
  referenceId?: string;
  referenceType?: string;
  isAdminOverride?: boolean;
  createdBy: string;
};

const DECREASE_TYPES: StockMovementType[] = [
  StockMovementType.SALE,
  StockMovementType.ADJUSTMENT_OUT,
  StockMovementType.RETURN_OUT,
];

const ADJUSTMENT_TYPES: StockMovementType[] = [
  StockMovementType.ADJUSTMENT_IN,
  StockMovementType.ADJUSTMENT_OUT,
];

/**
 * Apply a stock movement and update Product.currentStock atomically.
 * Pass a Prisma transaction client to run within an existing transaction.
 */
export async function applyStockMovement(
  params: StockMovementParams,
  txClient?: TxClient
) {
  // Validate adjustment notes
  if (ADJUSTMENT_TYPES.includes(params.type) && !params.notes?.trim()) {
    throw new Error("Notes are required for stock adjustments");
  }

  if (params.quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const run = async (db: TxClient) => {
    const product = await db.product.findUnique({
      where: { id: params.productId },
      select: { id: true, name: true, currentStock: true },
    });

    if (!product) throw new Error("Product not found");

    const before = new Prisma.Decimal(product.currentStock);
    const qty = new Prisma.Decimal(params.quantity);
    const isDecrease = DECREASE_TYPES.includes(params.type);
    const after = isDecrease ? before.minus(qty) : before.plus(qty);

    // Enforce no-negative-stock rule
    if (after.lessThan(0)) {
      if (!params.isAdminOverride) {
        throw new Error(
          `Insufficient stock for "${product.name}". ` +
            `Available: ${before.toFixed(3)}, Requested: ${qty.toFixed(3)}`
        );
      }
      // Admin override: log it but allow it
    }

    const movement = await db.stockMovement.create({
      data: {
        productId: params.productId,
        type: params.type,
        quantity: qty,
        quantityBefore: before,
        quantityAfter: after,
        unitCost: params.unitCost != null ? new Prisma.Decimal(params.unitCost) : null,
        notes: params.notes ?? null,
        referenceId: params.referenceId ?? null,
        referenceType: params.referenceType ?? null,
        isAdminOverride: params.isAdminOverride ?? false,
        createdBy: params.createdBy,
      },
    });

    await db.product.update({
      where: { id: params.productId },
      data: { currentStock: after },
    });

    return movement;
  };

  // If a transaction client was provided, run inside it
  if (txClient) return run(txClient);

  // Otherwise wrap in its own transaction
  return prisma.$transaction((tx) => run(tx as TxClient));
}

/**
 * Apply movements for multiple products in a single transaction.
 * Used when confirming a purchase order or sales order (multiple line items).
 */
export async function applyBulkStockMovements(
  movements: StockMovementParams[]
) {
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const params of movements) {
      // Sequential within the transaction to avoid race conditions
      results.push(await applyStockMovement(params, tx as TxClient));
    }
    return results;
  });
}
