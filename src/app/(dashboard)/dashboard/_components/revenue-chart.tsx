"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

type DataPoint = {
  month: string;
  revenue: number;
  purchases: number;
};

export function RevenueChart({ data }: { data: DataPoint[] }) {
  if (data.every((d) => d.revenue === 0 && d.purchases === 0)) {
    return (
      <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
        No transaction data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          className="text-muted-foreground"
          width={40}
        />
        <Tooltip
          formatter={(value) => [
            `Rs ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ]}
          contentStyle={{ fontSize: 12, borderRadius: "6px" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue"   name="Revenue"   fill="hsl(var(--primary))"      radius={[3, 3, 0, 0]} />
        <Bar dataKey="purchases" name="Purchases" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} opacity={0.6} />
      </BarChart>
    </ResponsiveContainer>
  );
}
