import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { ERPPageHeader } from "@/components/ui/erp-page-header";
import { SalesmanLedger } from "./_components/salesman-ledger";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const salesman = await prisma.salesman.findUnique({ where: { id }, select: { name: true } });
  return { title: salesman ? `${salesman.name} — Ledger` : "Salesman Ledger" };
}

export default async function SalesmanLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("sales");
  const { id } = await params;

  const salesman = await prisma.salesman.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, name: true, commissionPct: true, openingBalance: true },
  });
  if (!salesman) notFound();

  const orders = await prisma.salesOrder.findMany({
    where: { customerId: id, deletedAt: null, status: { notIn: ["CANCELLED", "LOST"] } },
    orderBy: { orderDate: "desc" },
    include: {
      returns:  { select: { totalAmount: true, returnType: true } },
      payments: { select: { amount: true } },
    },
  });

  const rows = orders.map((o) => {
    const totalTaken      = Number(o.totalAmount);
    const freshReturned   = o.returns.filter(r => r.returnType === "FRESH").reduce((s, r) => s + Number(r.totalAmount), 0);
    const wasteReturned   = o.returns.filter(r => r.returnType === "WASTE").reduce((s, r) => s + Number(r.totalAmount), 0);
    const netAmount       = totalTaken - freshReturned - wasteReturned;
    const commissionPct   = Number(o.commissionPct);
    const commissionAmount = Number(o.commissionAmount);
    const factoryAmount   = Number(o.factoryAmount);
    const collected       = o.payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance         = factoryAmount - collected;
    return {
      id:              o.id,
      orderNumber:     o.orderNumber,
      orderDate:       o.orderDate.toISOString(),
      status:          o.status,
      totalTaken,
      freshReturned,
      wasteReturned,
      netAmount,
      commissionPct,
      commissionAmount,
      factoryAmount,
      collected,
      balance,
    };
  });

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title={salesman.name}
        subtitle={`Salesman ledger · ${Number(salesman.commissionPct)}% commission`}
        backHref="/sales/salesmen"
      />

      <SalesmanLedger
        customerName={salesman.name}
        commissionPct={Number(salesman.commissionPct)}
        openingBalance={Number(salesman.openingBalance)}
        rows={rows}
      />
    </div>
  );
}
