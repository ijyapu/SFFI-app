"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { applyStockMovement } from "@/lib/stock";
import { StockMovementType, Prisma } from "@prisma/client";
import { getNextDocumentNumber } from "@/lib/doc-counter";
import { writeAuditLog } from "@/lib/audit";
import { syncLedgerForward } from "@/app/(dashboard)/daily-log/actions";
import {
  createSupplierReturnSchema,
  updateSupplierReturnSchema,
  type CreateSupplierReturnValues,
  type UpdateSupplierReturnValues,
} from "@/lib/validators/purchase";

async function requirePurchasesAccess() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (!role || !["superadmin", "admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return userId;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

export type SupplierReturnRow = {
  id: string;
  returnNumber: string;
  returnDate: string;
  supplierId: string;
  supplierName: string;
  purchaseId: string;
  invoiceNo: string;
  reason: string | null;
  totalAmount: number;
  itemCount: number;
};

export async function getSupplierReturns(): Promise<SupplierReturnRow[]> {
  await requirePurchasesAccess();

  const returns = await prisma.supplierReturn.findMany({
    where: { deletedAt: null },
    orderBy: { returnDate: "desc" },
    include: {
      supplier: { select: { name: true } },
      purchase: { select: { invoiceNo: true } },
      items: { select: { id: true } },
    },
  });

  return returns.map((r) => ({
    id:           r.id,
    returnNumber: r.returnNumber,
    returnDate:   r.returnDate.toISOString(),
    supplierId:   r.supplierId,
    supplierName: r.supplier.name,
    purchaseId:   r.purchaseId,
    invoiceNo:    r.purchase.invoiceNo,
    reason:       r.reason,
    totalAmount:  Number(r.totalAmount),
    itemCount:    r.items.length,
  }));
}

export type SupplierReturnDetail = {
  id: string;
  purchaseId: string;
  supplierId: string;
  invoiceNo: string;
  supplierName: string;
  returnDate: string; // YYYY-MM-DD
  reason: string | null;
  items: { productId: string; quantity: number; unitPrice: number }[];
};

export async function getSupplierReturnDetail(returnId: string): Promise<SupplierReturnDetail> {
  await requirePurchasesAccess();

  const r = await prisma.supplierReturn.findUnique({
    where: { id: returnId },
    include: {
      purchase: { select: { invoiceNo: true } },
      supplier: { select: { name: true } },
      items: { select: { productId: true, quantity: true, unitPrice: true } },
    },
  });
  if (!r || r.deletedAt) throw new Error("Return not found");

  return {
    id: r.id,
    purchaseId: r.purchaseId,
    supplierId: r.supplierId,
    invoiceNo: r.purchase.invoiceNo,
    supplierName: r.supplier.name,
    returnDate: toDateStr(r.returnDate),
    reason: r.reason,
    items: r.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
  };
}

// ─────────────────────────────────────────────
// PICKER DATA (for the Add Return form)
// ─────────────────────────────────────────────

export type PurchaseInvoiceOption = {
  id: string;
  invoiceNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
};

export async function getPurchaseInvoicesForReturn(supplierId?: string): Promise<PurchaseInvoiceOption[]> {
  await requirePurchasesAccess();
  const purchases = await prisma.purchase.findMany({
    where: { deletedAt: null, ...(supplierId ? { supplierId } : {}) },
    orderBy: { date: "desc" },
    select: { id: true, invoiceNo: true, date: true, supplierId: true, supplier: { select: { name: true } } },
    take: 500,
  });
  return purchases.map((p) => ({
    id: p.id, invoiceNo: p.invoiceNo, date: p.date.toISOString().slice(0, 10),
    supplierId: p.supplierId, supplierName: p.supplier.name,
  }));
}

export type ReturnableItem = {
  productId: string;
  productName: string;
  sku: string;
  unitName: string;
  quantityPurchased: number;
  unitPrice: number;
  alreadyReturned: number;
  maxReturnable: number;
};

export async function getPurchaseItemsForReturn(purchaseId: string, excludeReturnId?: string): Promise<ReturnableItem[]> {
  await requirePurchasesAccess();

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      items: {
        where: { productId: { not: null } },
        include: { product: { select: { name: true, sku: true, unit: { select: { name: true } } } } },
      },
    },
  });
  if (!purchase) throw new Error("Purchase not found");

  // When editing an existing return, its own quantities don't count against the cap —
  // they're being replaced, not added on top of.
  const alreadyReturnedSums = await prisma.supplierReturnItem.groupBy({
    by: ["productId"],
    where: {
      supplierReturn: {
        purchaseId, deletedAt: null,
        ...(excludeReturnId ? { id: { not: excludeReturnId } } : {}),
      },
    },
    _sum: { quantity: true },
  });
  const returnedMap = new Map(alreadyReturnedSums.map((r) => [r.productId, Number(r._sum.quantity ?? 0)]));

  // Multiple line items for the same product on one invoice are combined —
  // the return is against the invoice's total quantity for that product.
  const byProduct = new Map<string, ReturnableItem>();
  for (const item of purchase.items) {
    if (!item.productId || !item.product) continue;
    const existing = byProduct.get(item.productId);
    const qty = Number(item.quantity);
    if (existing) {
      existing.quantityPurchased += qty;
    } else {
      byProduct.set(item.productId, {
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        unitName: item.product.unit.name,
        quantityPurchased: qty,
        unitPrice: Number(item.unitPrice),
        alreadyReturned: 0,
        maxReturnable: 0,
      });
    }
  }
  for (const item of byProduct.values()) {
    item.alreadyReturned = returnedMap.get(item.productId) ?? 0;
    item.maxReturnable = Math.max(0, item.quantityPurchased - item.alreadyReturned);
  }

  return [...byProduct.values()];
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

export async function createSupplierReturn(values: CreateSupplierReturnValues): Promise<void> {
  const userId = await requirePurchasesAccess();
  const data = createSupplierReturnSchema.parse(values);

  const purchase = await prisma.purchase.findUnique({
    where: { id: data.purchaseId },
    select: { invoiceNo: true, supplierId: true },
  });
  if (!purchase) throw new Error("Purchase not found");
  if (purchase.supplierId !== data.supplierId) {
    throw new Error("That invoice does not belong to the selected vendor");
  }

  // Re-check against what's actually still returnable — a stale form shouldn't
  // be able to return more than the invoice has left.
  const returnable = await getPurchaseItemsForReturn(data.purchaseId);
  const returnableMap = new Map(returnable.map((r) => [r.productId, r]));

  const computedItems = data.items.map((item) => {
    const info = returnableMap.get(item.productId);
    if (!info) throw new Error(`"${item.productId}" was not purchased on this invoice`);
    if (item.quantity > info.maxReturnable + 0.0005) {
      throw new Error(
        `Cannot return ${item.quantity} of "${info.productName}" — only ${info.maxReturnable.toFixed(3)} left returnable on this invoice.`
      );
    }
    return { ...item, productName: info.productName, lineTotal: item.quantity * item.unitPrice };
  });
  const totalAmount = computedItems.reduce((s, i) => s + i.lineTotal, 0);
  const returnDate = new Date(data.returnDate);
  const dateLabel = toDateStr(returnDate);

  const returnId = await prisma.$transaction(async (tx) => {
    const returnNumber = await getNextDocumentNumber(`PR-${new Date().getFullYear()}-`, tx as Parameters<typeof getNextDocumentNumber>[1]);

    const created = await tx.supplierReturn.create({
      data: {
        returnNumber,
        purchaseId: data.purchaseId,
        supplierId: data.supplierId,
        returnDate,
        reason: data.reason || null,
        totalAmount,
        createdBy: userId,
        items: {
          create: computedItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
          })),
        },
      },
    });

    for (const item of computedItems) {
      await applyStockMovement(
        {
          productId: item.productId,
          type: StockMovementType.RETURN_OUT,
          quantity: item.quantity,
          unitCost: item.unitPrice,
          notes: `Returned to supplier — invoice ${purchase.invoiceNo}, return ${returnNumber}`,
          referenceId: created.id,
          referenceType: "SupplierReturn",
          createdBy: userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }

    return created.id;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 });

  await writeAuditLog({
    userId,
    action: "SUPPLIER_RETURN_CREATE",
    entityType: "SupplierReturn",
    entityId: returnId,
    after: { invoiceNo: purchase.invoiceNo, date: dateLabel, totalAmount, itemCount: computedItems.length },
  });

  // Keep the Daily Log ledger in sync if the return date's day is already closed.
  await syncLedgerForward(dateLabel, userId);

  revalidatePath("/purchases");
  revalidatePath("/purchases/returns");
  revalidatePath("/inventory");
  revalidatePath("/vendors/ledger");
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export async function updateSupplierReturn(returnId: string, values: UpdateSupplierReturnValues): Promise<void> {
  const userId = await requirePurchasesAccess();
  const data = updateSupplierReturnSchema.parse(values);

  const existing = await prisma.supplierReturn.findUnique({
    where: { id: returnId },
    include: {
      items: { select: { productId: true, quantity: true } },
      purchase: { select: { invoiceNo: true } },
    },
  });
  if (!existing || existing.deletedAt) throw new Error("Return not found");

  // Re-check against what's returnable, excluding this return's own current quantities.
  const returnable = await getPurchaseItemsForReturn(existing.purchaseId, returnId);
  const returnableMap = new Map(returnable.map((r) => [r.productId, r]));

  const computedItems = data.items.map((item) => {
    const info = returnableMap.get(item.productId);
    if (!info) throw new Error(`"${item.productId}" was not purchased on this invoice`);
    if (item.quantity > info.maxReturnable + 0.0005) {
      throw new Error(
        `Cannot return ${item.quantity} of "${info.productName}" — only ${info.maxReturnable.toFixed(3)} left returnable on this invoice.`
      );
    }
    return { ...item, lineTotal: item.quantity * item.unitPrice };
  });
  const totalAmount = computedItems.reduce((s, i) => s + i.lineTotal, 0);
  const oldDateStr = toDateStr(existing.returnDate);
  const returnDate = new Date(data.returnDate);
  const newDateStr = toDateStr(returnDate);

  await prisma.$transaction(async (tx) => {
    // Reverse every old item's quantity (adds stock back) before applying the new set.
    for (const old of existing.items) {
      await applyStockMovement(
        {
          productId: old.productId,
          type: StockMovementType.RETURN_IN,
          quantity: Number(old.quantity),
          notes: `Return ${existing.returnNumber} edited — reversing previous quantity`,
          referenceId: returnId,
          referenceType: "SupplierReturn",
          createdBy: userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }

    await tx.supplierReturnItem.deleteMany({ where: { supplierReturnId: returnId } });

    for (const item of computedItems) {
      await applyStockMovement(
        {
          productId: item.productId,
          type: StockMovementType.RETURN_OUT,
          quantity: item.quantity,
          unitCost: item.unitPrice,
          notes: `Returned to supplier — invoice ${existing.purchase.invoiceNo}, return ${existing.returnNumber} (edited)`,
          referenceId: returnId,
          referenceType: "SupplierReturn",
          createdBy: userId,
        },
        tx as Parameters<typeof applyStockMovement>[1]
      );
    }

    await tx.supplierReturn.update({
      where: { id: returnId },
      data: {
        returnDate,
        reason: data.reason || null,
        totalAmount,
        items: { create: computedItems.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal })) },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 });

  await writeAuditLog({
    userId,
    action: "SUPPLIER_RETURN_EDIT",
    entityType: "SupplierReturn",
    entityId: returnId,
    after: { invoiceNo: existing.purchase.invoiceNo, date: newDateStr, totalAmount, itemCount: computedItems.length },
  });

  // Keep the ledger in sync for both the old and new return date, if they differ.
  await syncLedgerForward(oldDateStr, userId);
  if (newDateStr !== oldDateStr) await syncLedgerForward(newDateStr, userId);

  revalidatePath("/purchases");
  revalidatePath("/purchases/returns");
  revalidatePath("/inventory");
  revalidatePath("/vendors/ledger");
}
