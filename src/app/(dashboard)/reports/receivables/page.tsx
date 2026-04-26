import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";
import { requirePermission } from "@/lib/auth";
import { AgingTable, type AgingRow } from "../_components/aging-table";

export const metadata = { title: "Receivables Aging — Reports" };

function ageBucket(days: number): AgingRow["bucket"] {
  if (days <= 7)  return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "91+";
}

export default async function ReceivablesPage() {
  await requirePermission("reports");
  const now = new Date();

  const orders = await prisma.salesOrder.findMany({
    where: {
      deletedAt: null,
      status: { in: ["CONFIRMED", "PARTIALLY_PAID"] },
    },
    include: { salesman: true },
    orderBy: { orderDate: "asc" },
  });

  const rows: AgingRow[] = orders.flatMap((o) => {
    const outstanding = Number(o.factoryAmount) - Number(o.amountPaid);
    if (outstanding <= 0) return [];

    const ageDays = Math.max(0, differenceInDays(now, o.orderDate));

    return [{
      id:          o.id,
      orderNumber: o.orderNumber,
      partyName:   o.salesman.name,
      orderDate:   o.orderDate.toISOString(),
      dueDate:     null,
      totalAmount: Number(o.factoryAmount),
      amountPaid:  Number(o.amountPaid),
      outstanding,
      ageDays,
      bucket:      ageBucket(ageDays),
    }];
  });

  return (
    <AgingTable
      rows={rows}
      partyLabel="Salesman"
      orderLabel="Sales Order"
      linkBase="/sales"
    />
  );
}
