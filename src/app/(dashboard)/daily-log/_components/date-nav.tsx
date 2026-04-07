"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { dateStr: string; todayStr: string };

function offsetDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function DateNav({ dateStr, todayStr }: Props) {
  const router = useRouter();
  const isToday = dateStr === todayStr;

  function go(days: number) {
    const next = offsetDate(dateStr, days);
    router.push(`/daily-log?date=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon-sm" onClick={() => go(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <input
        type="date"
        value={dateStr}
        max={todayStr}
        onChange={(e) => {
          if (e.target.value) router.push(`/daily-log?date=${e.target.value}`);
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm tabular-nums cursor-pointer"
      />

      <Button variant="ghost" size="icon-sm" onClick={() => go(1)} disabled={isToday}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isToday && (
        <Button variant="outline" size="sm" onClick={() => router.push("/daily-log")}>
          Today
        </Button>
      )}
    </div>
  );
}
