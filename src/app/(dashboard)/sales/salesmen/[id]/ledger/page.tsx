import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
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
      returns:  { select: { totalAmount: true } },
      payments: { select: { amount: true } },
    },
  });

  const rows = orders.map((o) => {
    const totalTaken      = Number(o.totalAmount);
    const wasteReturned   = o.returns.reduce((s, r) => s + Number(r.totalAmount), 0);
    const netAmount       = totalTaken - wasteReturned;
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
      <div className="flex items-center gap-2">
        <Link
          href="/sales/salesmen"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{salesman.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Salesman ledger · {Number(salesman.commissionPct)}% commission
          </p>
        </div>
      </div>

      <SalesmanLedger
        customerName={salesman.name}
        commissionPct={Number(salesman.commissionPct)}
        openingBalance={Number(salesman.openingBalance)}
        rows={rows}
      />
    </div>
  );
}
