"use client";

import { useState } from "react";

export type SortDir = "asc" | "desc";

/**
 * Manages sort key + direction state.
 * Each table is responsible for its own useMemo sort using the returned values.
 */
export function useSortable(defaultKey: string | null = null, defaultDir: SortDir = "asc") {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  function toggle(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return { sortKey, sortDir, toggle };
}

/** Generic sort comparator — handles strings, numbers, and null/undefined. */
export function compareValues(
  av: string | number | null | undefined,
  bv: string | number | null | undefined,
  dir: SortDir
): number {
  if (av == null && bv == null) return 0;
  if (av == null) return dir === "asc" ? 1 : -1;
  if (bv == null) return dir === "asc" ? -1 : 1;

  const cmp =
    typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });

  return dir === "asc" ? cmp : -cmp;
}
