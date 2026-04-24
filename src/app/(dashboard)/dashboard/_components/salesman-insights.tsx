import { Medal, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SalesmanItem = {
  name: string;
  amount: number;
};

type Props = {
  topBySales: SalesmanItem[];
  topByReturns: SalesmanItem[];
  monthLabel: string;
};

function fmtAmount(n: number): string {
  if (n >= 100_000) return `Rs ${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `Rs ${(n / 1_000).toFixed(1)}k`;
  return `Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function SalesmanRankList({
  items,
  barColor,
  emptyText,
}: {
  items: SalesmanItem[];
  barColor: string;
  emptyText: string;
}) {
  const max = items[0]?.amount ?? 1;
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">{emptyText}</p>
    );
  }
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={`${item.name}-${i}`} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-muted-foreground/40 w-4 shrink-0 tabular-nums">
                {i + 1}
              </span>
              <span className="text-sm font-medium truncate">{item.name}</span>
            </span>
            <span className="text-xs tabular-nums shrink-0 font-semibold text-muted-foreground">
              {fmtAmount(item.amount)}
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${Math.max((item.amount / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SalesmanInsights({ topBySales, topByReturns, monthLabel }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Top salesmen by sales */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Top Salesmen — {monthLabel}
            </CardTitle>
            <Medal className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-[11px] text-muted-foreground/60">By confirmed sales amount</p>
        </CardHeader>
        <CardContent>
          <SalesmanRankList
            items={topBySales}
            barColor="bg-amber-400"
            emptyText="No confirmed sales this month"
          />
        </CardContent>
      </Card>

      {/* Top salesmen by returns */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Most Returns — {monthLabel}
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-[11px] text-muted-foreground/60">By total return amount</p>
        </CardHeader>
        <CardContent>
          <SalesmanRankList
            items={topByReturns}
            barColor="bg-orange-400"
            emptyText="No returns this month"
          />
        </CardContent>
      </Card>
    </div>
  );
}
