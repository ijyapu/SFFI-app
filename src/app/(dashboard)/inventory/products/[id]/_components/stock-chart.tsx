"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

type DataPoint = {
  date: string;
  stock: number;
};

export function StockChart({ data, unit }: { data: DataPoint[]; unit: string }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No movement history to display.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => {
            try { return format(new Date(v), "dd MMM"); } catch { return v; }
          }}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => v.toLocaleString()}
          className="text-muted-foreground"
          width={50}
        />
        <Tooltip
          formatter={(value) => [
            `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit}`,
            "Stock",
          ]}
          labelFormatter={(label) => {
            try { return format(new Date(label), "dd MMM yyyy"); } catch { return label; }
          }}
          contentStyle={{
            fontSize: 12,
            borderRadius: "6px",
          }}
        />
        <Area
          type="monotone"
          dataKey="stock"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#stockGradient)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
