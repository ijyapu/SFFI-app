"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

interface Props {
  from: string;
  to: string;
}

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

const PRESETS = [
  {
    label: "This Month",
    from: () => fmt(startOfMonth(new Date())),
    to:   () => fmt(endOfMonth(new Date())),
  },
  {
    label: "Last Month",
    from: () => fmt(startOfMonth(subMonths(new Date(), 1))),
    to:   () => fmt(endOfMonth(subMonths(new Date(), 1))),
  },
  {
    label: "Last 3 Months",
    from: () => fmt(startOfMonth(subMonths(new Date(), 2))),
    to:   () => fmt(endOfMonth(new Date())),
  },
  {
    label: "This Year",
    from: () => fmt(startOfYear(new Date())),
    to:   () => fmt(endOfMonth(new Date())),
  },
];

export function CostingDatePicker({ from, to }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(newFrom: string, newTo: string) {
    startTransition(() => {
      router.push(`/costing?from=${newFrom}&to=${newTo}`);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    navigate(fd.get("from") as string, fd.get("to") as string);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => {
        const pFrom = p.from();
        const pTo   = p.to();
        const active = from === pFrom && to === pTo;
        return (
          <button
            key={p.label}
            onClick={() => navigate(pFrom, pTo)}
            disabled={pending}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        );
      })}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 ml-2">
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <span className="text-muted-foreground text-sm">to</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
