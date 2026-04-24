"use client";

import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── Types (exported so page.tsx can build the data) ───────────────────────

export type MonthlyTrendPoint  = { month: string; revenue: number; purchases: number; expenses: number };
export type ProductSoldItem    = { name: string; qty: number; revenue: number };
export type SalesmanItem       = { name: string; revenue: number; orders: number };
export type ExpenseCatItem     = { name: string; amount: number };
export type ReturnTypeItem     = { type: string; amount: number; count: number };
export type TopPurchasedItem   = { name: string; qty: number; cost: number };

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtRs(n: number): string {
  if (n >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000)   return `Rs ${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)     return `Rs ${(n / 1_000).toFixed(0)}k`;
  return `Rs ${n.toFixed(0)}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000)   return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}`;
}

function trunc(s: string, n = 20): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const COLORS = {
  revenue:   "#10B981",
  purchases: "#3B82F6",
  expenses:  "#F59E0B",
  profit:    "#059669",
  fresh:     "#14B8A6",
  waste:     "#F97316",
  bar1:      "#6366F1",
  bar2:      "#EC4899",
};

// ─── Monthly Trend ─────────────────────────────────────────────────────────

export function TrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={COLORS.revenue}   stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.revenue}   stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="gPur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={COLORS.purchases} stopOpacity={0.2}  />
            <stop offset="95%" stopColor={COLORS.purchases} stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={COLORS.expenses}  stopOpacity={0.2}  />
            <stop offset="95%" stopColor={COLORS.expenses}  stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmtRs} tick={{ fontSize: 11 }} width={56} />
        <Tooltip
          formatter={(v, name) => [
            `Rs ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            String(name).charAt(0).toUpperCase() + String(name).slice(1),
          ]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="revenue"   name="Revenue"   stroke={COLORS.revenue}   fill="url(#gRev)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="purchases" name="Purchases" stroke={COLORS.purchases} fill="url(#gPur)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="expenses"  name="Expenses"  stroke={COLORS.expenses}  fill="url(#gExp)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Horizontal Bar (generic) ───────────────────────────────────────────────

function HBar({
  data,
  dataKey,
  color,
  tickFormatter,
  tooltipFormatter,
  emptyText,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  color: string;
  tickFormatter: (v: number) => string;
  tooltipFormatter: (v: unknown) => [string, string];
  emptyText?: string;
}) {
  if (!data.length) return <EmptyChart text={emptyText} />;
  const height = Math.max(data.length * 42 + 20, 180);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => trunc(v)}
        />
        <Tooltip formatter={tooltipFormatter} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Top Products Sold ──────────────────────────────────────────────────────

export function TopProductsSoldChart({ data }: { data: ProductSoldItem[] }) {
  return (
    <HBar
      data={data}
      dataKey="qty"
      color={COLORS.revenue}
      tickFormatter={fmtNum}
      tooltipFormatter={(v) => [fmtNum(Number(v)), "Qty Sold"]}
      emptyText="No confirmed sales this year"
    />
  );
}

// ─── Top Purchased Products ─────────────────────────────────────────────────

export function TopPurchasedChart({ data }: { data: TopPurchasedItem[] }) {
  return (
    <HBar
      data={data}
      dataKey="qty"
      color={COLORS.purchases}
      tickFormatter={fmtNum}
      tooltipFormatter={(v) => [fmtNum(Number(v)), "Qty Received"]}
      emptyText="No received purchases this year"
    />
  );
}

// ─── Top Salesmen ───────────────────────────────────────────────────────────

export function TopSalesmenChart({ data }: { data: SalesmanItem[] }) {
  if (!data.length) return <EmptyChart text="No confirmed sales this year" />;
  const height = Math.max(data.length * 42 + 20, 180);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tickFormatter={fmtRs} tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => trunc(v)}
        />
        <Tooltip
          formatter={(v, _name, props) => {
            const num = Number(v);
            const orders = (props.payload as SalesmanItem | undefined)?.orders ?? 0;
            const avg = orders > 0 ? num / orders : 0;
            return [
              `${fmtRs(num)} · ${orders} order${orders !== 1 ? "s" : ""} · avg ${fmtRs(avg)}`,
              "Revenue",
            ];
          }}
        />
        <Bar dataKey="revenue" fill={COLORS.bar1} radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Expenses by Category ───────────────────────────────────────────────────

export function ExpensesByCategoryChart({ data }: { data: ExpenseCatItem[] }) {
  return (
    <HBar
      data={data}
      dataKey="amount"
      color={COLORS.expenses}
      tickFormatter={fmtRs}
      tooltipFormatter={(v) => [`Rs ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, "Amount"]}
      emptyText="No expenses this year"
    />
  );
}

// ─── Returns by Type ───────────────────────────────────────────────────────

const PIE_COLORS: Record<string, string> = {
  FRESH: COLORS.fresh,
  WASTE: COLORS.waste,
};

export function ReturnsByTypeChart({ data }: { data: ReturnTypeItem[] }) {
  if (!data.length) return <EmptyChart text="No returns this year" />;
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="type"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={48}
          paddingAngle={3}
          label={(props) => {
            const entry = props.payload as ReturnTypeItem | undefined;
            if (!entry) return "";
            return `${entry.type === "FRESH" ? "Fresh" : "Waste"} ${total > 0 ? ((entry.amount / total) * 100).toFixed(0) : 0}%`;
          }}
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.type} fill={PIE_COLORS[entry.type] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, name) => [
            `Rs ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
            name === "FRESH" ? "Fresh Return" : "Waste Return",
          ]}
        />
        <Legend
          formatter={(v) => (v === "FRESH" ? "Fresh" : "Waste")}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyChart({ text = "No data available" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
