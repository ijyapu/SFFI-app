"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { applyStockMovement } from "@/lib/stock";
import { adjustmentSchema, type AdjustmentFormValues } from "@/lib/validators/stock";
import { prisma } from "@/lib/prisma";

async function requireStockAccess() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  const role = sessionClaims?.publicMetadata?.role as string | undefined;
  if (!role || !["admin", "manager", "accountant"].includes(role)) {
    throw new Error("Unauthorized");
  }
  return { userId, role };
}

export async function createAdjustment(values: AdjustmentFormValues) {
  const { userId, role } = await requireStockAccess();
  const data = adjustmentSchema.parse(values);

  // Only admin can force negative stock
  if (data.isAdminOverride && role !== "admin") {
    throw new Error("Only admins can override the negative stock restriction");
  }

  await applyStockMovement({
    productId: data.productId,
    type: data.type,
    quantity: data.quantity,
    notes: data.notes,
    isAdminOverride: data.isAdminOverride,
    createdBy: userId,
  });

  // Write audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: data.type,
      entityType: "StockMovement",
      after: { productId: data.productId, quantity: data.quantity, notes: data.notes },
    },
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/adjustments");
}
