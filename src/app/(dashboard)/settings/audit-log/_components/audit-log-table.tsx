"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SortButton } from "@/components/ui/sort-icon";
import { useSortable, compareValues } from "@/hooks/use-sortable";

export interface AuditEntry {
  id: string;
  userId: string;
  userLabel: string; // email or userId
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

interface Props {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const ACTION_COLORS: Record<string, string> = {
  FINALIZE_PAYROLL:      "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  CONFIRM_SALES_ORDER:   "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  CONFIRM_PURCHASE_ORDER:"bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  APPROVE_EXPENSE:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  REJECT_EXPENSE:        "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

function DiffViewer({ before, after }: { before: unknown; after: unknown }) {
  if (!before && !after) return <p className="text-xs text-muted-foreground">No snapshot recorded.</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {before !== undefined && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Before</p>
          <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40">
            {JSON.stringify(before, null, 2)}
          </pre>
        </div>
      )}
      {after !== undefined && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">After</p>
          <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40">
            {JSON.stringify(after, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function AuditLogTable({ entries, total, page, pageSize }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { sortKey, sortDir, toggle } = useSortable("createdAt");

  const sorted = useMemo(() => {
    if (!sortKey) return entries;
    return [...entries].sort((a, b) => {
      const aVals: Record<string, string> = { createdAt: a.createdAt, userLabel: a.userLabel, action: a.action, entityType: a.entityType };
      const bVals: Record<string, string> = { createdAt: b.createdAt, userLabel: b.userLabel, action: b.action, entityType: b.entityType };
      return compareValues(aVals[sortKey], bVals[sortKey], sortDir);
    });
  }, [entries, sortKey, sortDir]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Audit Log</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {total} total entries — page {page} of {Math.max(1, totalPages)}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              {(() => { const sp = { sortKey, sortDir, toggle }; return (
              <tr>
                <th className="w-8" />
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"><SortButton col="createdAt"  label="When"   {...sp} /></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"><SortButton col="userLabel"  label="User"   {...sp} /></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"><SortButton col="action"     label="Action" {...sp} /></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"><SortButton col="entityType" label="Entity" {...sp} /></th>
              </tr>
              ); })()}
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No audit log entries yet.
                  </td>
                </tr>
              )}
              {sorted.map((entry) => {
                const isExpanded = expanded.has(entry.id);
                const hasDiff    = !!(entry.before || entry.after);
                return (
                  <>
                    <tr
                      key={entry.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="pl-3 py-3">
                        {hasDiff && (
                          <button
                            onClick={() => toggle(entry.id)}
                            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                            }
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {format(new Date(entry.createdAt), "d MMM yyyy, HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-xs truncate max-w-[180px]" title={entry.userId}>
                        {entry.userLabel}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {entry.entityType}
                        {entry.entityId && (
                          <span className="ml-1 font-mono opacity-60">{entry.entityId.slice(0, 8)}…</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && hasDiff && (
                      <tr key={`${entry.id}-detail`} className="border-b border-border bg-muted/10">
                        <td />
                        <td colSpan={4} className="px-4 py-3">
                          <DiffViewer before={entry.before} after={entry.after} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`/settings/audit-log?page=${page - 1}`}
                  className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted"
                >
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/settings/audit-log?page=${page + 1}`}
                  className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
