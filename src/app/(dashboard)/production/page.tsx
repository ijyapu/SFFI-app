import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { ArrowLeft, Info } from "lucide-react";
import { getProductionEntries } from "./actions";
import { ProductionTable } from "./_components/production-table";
import { DateNav } from "./_components/date-nav";

export const metadata = { title: "Production" };

function getTodayStr(): string {
  // Nepal is UTC+5:45; derive the local date explicitly so a UTC server shows the correct day
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function ProductionPage({ searchParams }: Props) {
  await requirePermission("inventory");

  const { date: dateParam } = await searchParams;
  const todayStr = getTodayStr();
  const dateStr = dateParam ?? todayStr;

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : todayStr;

  const items = await getProductionEntries(validDate);

  const dateLabel = formatDate(validDate);
  const isToday = validDate === todayStr;
  const prevDay = shiftDate(validDate, -1);
  const nextDay = shiftDate(validDate, +1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/inventory"
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-semibold">Production</h1>
          </div>

          <DateNav
            validDate={validDate}
            prevDay={prevDay}
            nextDay={nextDay}
            dateLabel={dateLabel}
            isToday={isToday}
            todayStr={todayStr}
          />
        </div>
      </div>

      <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Enter produced, used, waste, and damaged quantities — each save updates Inventory
          immediately, for any date, no lock-in step required.
        </p>
      </div>

      <ProductionTable key={validDate} date={validDate} items={items} />
    </div>
  );
}
