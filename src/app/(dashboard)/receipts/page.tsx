import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateFilter } from "@/components/ui/date-filter";
import { Banknote, TrendingDown, Calendar, BookOpen } from "lucide-react";
import { ReceiptFormDialog } from "./_components/receipt-form-dialog";
import { ReceiptTable } from "./_components/receipt-table";

export const metadata = { title: "Receipts" };

type Props = { searchParams: Promise<{ from?: string; to?: string }> };

export default async function ReceiptsPage({ searchParams }: Props) {
  await requirePermission("receipts");

  const { from: rawFrom, to: rawTo } = await searchParams;

  const dateWhere = rawFrom || rawTo ? {
    ...(rawFrom ? { gte: new Date(rawFrom + "T00:00:00.000Z") } : {}),
    ...(rawTo   ? { lte: new Date(rawTo   + "T23:59:59.999Z") } : {}),
  } : undefined;

  const receipts = await prisma.receipt.findMany({
    where:   { deletedAt: null, ...(dateWhere ? { receivedAt: dateWhere } : {}) },
    orderBy: { receivedAt: "desc" },
  });

  const serialised = receipts.map((r) => ({
    id:            r.id,
    receiptNumber: r.receiptNumber,
    receivedFrom:  r.receivedFrom,
    amount:        Number(r.amount),
    method:        r.method,
    reference:     r.reference,
    notes:         r.notes,
    photoUrl:      r.photoUrl,
    receivedAt:    r.receivedAt.toISOString(),
  }));

  const totalReceived  = serialised.reduce((sum, r) => sum + r.amount, 0);
  const thisMonthTotal = serialised
    .filter((r) => {
      const d = new Date(r.receivedAt);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, r) => sum + r.amount, 0);
  const uniqueSources = new Set(serialised.map((r) => r.receivedFrom)).size;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold">Receipts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track money borrowed or received to run the company
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/receipts/ledger"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Ledger
          </Link>
          <ReceiptFormDialog mode="create" />
        </div>
      </div>

      {/* Date filter */}
      <div className="shrink-0">
        <Suspense>
          <DateFilter from={rawFrom} to={rawTo} />
        </Suspense>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 shrink-0">
        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Received
            </CardTitle>
            <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <p className="text-2xl font-bold text-green-600">
              Rs {totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">All time</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              This Month
            </CardTitle>
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <p className="text-2xl font-bold">
              Rs {thisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Current month receipts</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sources
            </CardTitle>
            <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <p className="text-2xl font-bold">{uniqueSources}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Unique people / entities</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <ReceiptTable receipts={serialised} />
      </div>
    </div>
  );
}
