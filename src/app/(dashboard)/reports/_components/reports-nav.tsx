"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_NAV = [
  { label: "Analytics",            href: "/reports/analytics" },
  { label: "Stock Valuation",      href: "/reports/stock-valuation" },
  { label: "Receivables Aging",    href: "/reports/receivables" },
  { label: "Payables Aging",       href: "/reports/payables" },
  { label: "Sales by Salesman",    href: "/reports/sales-by-salesman" },
];

export function ReportsNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {SUB_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border border-transparent ${
              active
                ? "bg-background text-foreground border-border border-b-background -mb-px"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
