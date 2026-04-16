import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { differenceInDays, subDays } from "date-fns";
import type { AppRole } from "@/types/globals";
import { hasPermission } from "@/lib/roles";

export interface Notification {
  id:          string;
  type:        "low_stock" | "overdue_receivable" | "pending_expense" | "draft_order";
  title:       string;
  description: string;
  href:        string;
  severity:    "warning" | "error" | "info";
}

export async function GET() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata?.role as AppRole) ?? null;
  if (!role) return NextResponse.json({ notifications: [] });

  const now  = new Date();
  const notifications: Notification[] = [];

  // ── Low stock ──────────────────────────────────────────────────────────────
  if (hasPermission(role, "inventory")) {
    const lowStock = await prisma.$queryRaw<
      { id: string; name: string; current_stock: string; reorder_level: string }[]
    >`
      SELECT id, name, current_stock, reorder_level
      FROM "Product"
      WHERE "deletedAt" IS NULL
        AND reorder_level > 0
        AND current_stock <= reorder_level
      ORDER BY name ASC
      LIMIT 20
    `;

    for (const p of lowStock) {
      const stock = Number(p.current_stock);
      notifications.push({
        id:          `low_stock_${p.id}`,
        type:        "low_stock",
        title:       "Low stock",
        description: `${p.name} — ${stock.toLocaleString(undefined, { maximumFractionDigits: 3 })} left (reorder at ${Number(p.reorder_level).toLocaleString(undefined, { maximumFractionDigits: 3 })})`,
        href:        `/inventory/products/${p.id}`,
        severity:    stock === 0 ? "error" : "warning",
      });
    }
  }

  // ── Overdue receivables ────────────────────────────────────────────────────
  if (hasPermission(role, "sales")) {
    const overdue = await prisma.salesOrder.findMany({
      where: {
        deletedAt: null,
        status:   { in: ["CONFIRMED", "PARTIALLY_PAID"] },
        dueDate:  { lt: now },
      },
      include: { salesman: true },
      take:    20,
      orderBy: { dueDate: "asc" },
    });

    for (const o of overdue) {
      const days = differenceInDays(now, o.dueDate!);
      notifications.push({
        id:          `overdue_so_${o.id}`,
        type:        "overdue_receivable",
        title:       "Overdue receivable",
        description: `${o.orderNumber} · ${o.salesman.name} · ${days}d overdue`,
        href:        `/sales/${o.id}`,
        severity:    days > 30 ? "error" : "warning",
      });
    }
  }

  // ── Pending expense approvals ─────────────────────────────────────────────
  if (role === "admin" || role === "manager" || role === "accountant") {
    const pendingExpenses = await prisma.expense.count({
      where: { deletedAt: null, status: "SUBMITTED" },
    });
    if (pendingExpenses > 0) {
      notifications.push({
        id:          "pending_expenses",
        type:        "pending_expense",
        title:       "Pending approvals",
        description: `${pendingExpenses} expense${pendingExpenses !== 1 ? "s" : ""} awaiting approval`,
        href:        "/expenses",
        severity:    "info",
      });
    }
  }

  // ── Stale draft orders ────────────────────────────────────────────────────
  if (hasPermission(role, "sales")) {
    const staleSales = await prisma.salesOrder.count({
      where: { deletedAt: null, status: "DRAFT", createdAt: { lt: subDays(now, 7) } },
    });
    if (staleSales > 0) {
      notifications.push({
        id:          "stale_sales_drafts",
        type:        "draft_order",
        title:       "Stale sales drafts",
        description: `${staleSales} sales order${staleSales !== 1 ? "s" : ""} in draft for 7+ days`,
        href:        "/sales",
        severity:    "info",
      });
    }
  }

  if (hasPermission(role, "purchases")) {
    const stalePOs = await prisma.purchaseOrder.count({
      where: { deletedAt: null, status: "DRAFT", createdAt: { lt: subDays(now, 7) } },
    });
    if (stalePOs > 0) {
      notifications.push({
        id:          "stale_po_drafts",
        type:        "draft_order",
        title:       "Stale purchase drafts",
        description: `${stalePOs} purchase order${stalePOs !== 1 ? "s" : ""} in draft for 7+ days`,
        href:        "/purchases",
        severity:    "info",
      });
    }
  }

  return NextResponse.json({ notifications });
}
