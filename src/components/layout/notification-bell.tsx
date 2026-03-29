"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Package, CreditCard, FileText, Clock, X } from "lucide-react";
import type { Notification } from "@/app/api/notifications/route";

const SEVERITY_STYLES: Record<string, string> = {
  error:   "bg-destructive/10 border-destructive/20 text-destructive",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  info:    "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
};

const SEVERITY_DOT: Record<string, string> = {
  error:   "bg-destructive",
  warning: "bg-amber-500",
  info:    "bg-blue-500",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  low_stock:           Package,
  overdue_receivable:  CreditCard,
  pending_expense:     FileText,
  draft_order:         Clock,
};

export function NotificationBell() {
  const [open,          setOpen]         = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed,     setDismissed]    = useState<Set<string>>(new Set());
  const [loading,       setLoading]      = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .finally(() => setLoading(false));

    // Re-poll every 2 minutes
    const interval = setInterval(() => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => setNotifications(d.notifications ?? []));
    }, 120_000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const errorCount   = visible.filter((n) => n.severity === "error").length;
  const warningCount = visible.filter((n) => n.severity === "warning").length;
  const badgeCount   = visible.length;

  const badgeColor =
    errorCount   > 0 ? "bg-destructive" :
    warningCount > 0 ? "bg-amber-500"   :
    "bg-blue-500";

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  function dismissAll() {
    setDismissed(new Set(visible.map((n) => n.id)));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {!loading && badgeCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${badgeColor}`}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-96 max-h-[70vh] overflow-hidden rounded-lg border border-border bg-background shadow-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h3 className="font-semibold text-sm">
              Notifications
              {badgeCount > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  {badgeCount} active
                </span>
              )}
            </h3>
            {badgeCount > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss all
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}
            {!loading && visible.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">All clear — no alerts.</p>
              </div>
            )}
            {!loading && visible.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors`}
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${SEVERITY_STYLES[n.severity]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]}`}
                      />
                      <p className="text-xs font-semibold">{n.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {n.description}
                    </p>
                  </Link>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
