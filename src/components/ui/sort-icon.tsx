import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortDir } from "@/hooks/use-sortable";

interface Props {
  col:     string;
  sortKey: string | null;
  sortDir: SortDir;
}

export function SortIcon({ col, sortKey, sortDir }: Props) {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return sortDir === "asc"
    ? <ArrowUp   className="h-3 w-3 text-foreground" />
    : <ArrowDown className="h-3 w-3 text-foreground" />;
}

/** Reusable sortable header button */
export function SortButton({
  col, label, sortKey, sortDir, toggle, className = "",
}: Props & { label: string; toggle: (key: string) => void; className?: string }) {
  return (
    <button
      onClick={() => toggle(col)}
      className={`flex w-full items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap ${className}`}
    >
      {label}
      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </button>
  );
}
