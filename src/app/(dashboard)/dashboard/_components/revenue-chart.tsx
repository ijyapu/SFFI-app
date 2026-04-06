"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

type DataPoint = { month: string; revenue: number; purchases: number };

export function RevenueChart({ data }: { data: DataPoint[] }) {
  if (data.every((d) => d.revenue === 0 && d.purchases === 0)) {
    return (
      <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
        No transaction data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#C0392B" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#C0392B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPurchases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6B7280" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          axisLine={false}
          tickLine={false}
          width={38}
        />
        <Tooltip
          formatter={(value, name) => [
            `Rs ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            name,
          ]}
          contentStyle={{ fontSize: 12, borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: "12px" }} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#C0392B"
          strokeWidth={2}
          fill="url(#gradRevenue)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="purchases"
          name="Purchases"
          stroke="#9ca3af"
          strokeWidth={2}
          fill="url(#gradPurchases)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
