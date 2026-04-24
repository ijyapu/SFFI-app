import { TrendingUp, RotateCcw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type InsightItem = {
  name: string;
  unit: string;
  qty: number;
};

type Props = {
  topSellers: InsightItem[];
  mostReturned: InsightItem[];
  fewestReturned: InsightItem[];
  monthLabel: string;
};

function RankList({
  items,
  barColor,
  emptyText,
  zeroLabel,
}: {
  items: InsightItem[];
  barColor: string;
  emptyText: string;
  zeroLabel?: string;
}) {
  const max = items[0]?.qty ?? 1;
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
            <span className="text-xs tabular-nums shrink-0 text-muted-foreground font-medium">
              {item.qty === 0
                ? (zeroLabel ?? "0")
                : `${item.qty.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${item.unit}`}
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: item.qty === 0 ? "2%" : `${Math.max((item.qty / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ProductInsights({ topSellers, mostReturned, fewestReturned, monthLabel }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Top Sellers */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Top Sellers — {monthLabel}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-[11px] text-muted-foreground/60">By quantity sold</p>
        </CardHeader>
        <CardContent>
          <RankList
            items={topSellers}
            barColor="bg-emerald-500"
            emptyText="No confirmed sales this month"
          />
        </CardContent>
      </Card>

      {/* Most Returned */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Most Returned — {monthLabel}
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-[11px] text-muted-foreground/60">Fresh + waste returns combined</p>
        </CardHeader>
        <CardContent>
          <RankList
            items={mostReturned}
            barColor="bg-rose-400"
            emptyText="No returns this month"
          />
        </CardContent>
      </Card>

      {/* Fewest Returns */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fewest Returns — {monthLabel}
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-sky-500" />
          </div>
          <p className="text-[11px] text-muted-foreground/60">Sold products with lowest returns</p>
        </CardHeader>
        <CardContent>
          <RankList
            items={fewestReturned}
            barColor="bg-sky-400"
            emptyText="No sales this month"
            zeroLabel="No returns"
          />
        </CardContent>
      </Card>
    </div>
  );
}
