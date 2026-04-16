import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";
import { AgingTable, type AgingRow } from "../_components/aging-table";

export const metadata = { title: "Receivables Aging — Reports" };

function ageBucket(days: number, dueDate: string | null): AgingRow["bucket"] {
  if (!dueDate || days <= 0) return "current";
  if (days <= 30)  return "1-30";
  if (days <= 60)  return "31-60";
  if (days <= 90)  return "61-90";
  return "91+";
}

export default async function ReceivablesPage() {
  const now = new Date();

  const orders = await prisma.salesOrder.findMany({
    where: {
      deletedAt: null,
      status: { in: ["CONFIRMED", "PARTIALLY_PAID"] },
    },
    include: { salesman: true },
    orderBy: { orderDate: "asc" },
  });

  const rows: AgingRow[] = orders
    .map((o) => {
      const outstanding = Number(o.totalAmount) - Number(o.amountPaid);
      if (outstanding <= 0) return null;

      const dueDate  = o.dueDate?.toISOString() ?? null;
      const ageDays  = dueDate ? Math.max(0, differenceInDays(now, new Date(dueDate))) : 0;
      const bucket   = ageBucket(ageDays, dueDate);

      return {
        id:          o.id,
        orderNumber: o.orderNumber,
        partyName:   o.salesman.name,
        orderDate:   o.orderDate.toISOString(),
        dueDate,
        totalAmount: Number(o.totalAmount),
        amountPaid:  Number(o.amountPaid),
        outstanding,
        ageDays,
        bucket,
      } satisfies AgingRow;
    })
    .filter((r): r is AgingRow => r !== null);

  return (
    <AgingTable
      rows={rows}
      partyLabel="Salesman"
      orderLabel="Sales Order"
      linkBase="/sales"
    />
  );
}
