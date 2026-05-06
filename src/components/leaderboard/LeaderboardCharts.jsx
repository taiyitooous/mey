import React from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Line, ComposedChart,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-0.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{typeof p.value === "number" && p.name?.includes("%") ? `${p.value}%` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const CHART_COLORS = {
  primary: "hsl(142 29% 43%)",
  muted: "hsl(142 11% 28%)",
  chart2: "hsl(43 52% 54%)",
  chart3: "hsl(186 19% 54%)",
  chart4: "hsl(25 37% 53%)",
  destructive: "hsl(0 35% 54%)",
};

const shortName = (name) => name.split(" ")[0];

// ── SALES CHARTS ─────────────────────────────────────────────────────────────
function SalesCharts({ data }) {
  const barData = data.map((d) => ({
    name: shortName(d.name),
    Leads: d.leads,
    Vendas: d.wins,
  }));

  const convData = data.map((d) => ({
    name: shortName(d.name),
    "Conversão %": parseFloat(d.conversion),
    Vendas: d.wins,
  })).sort((a, b) => b["Conversão %"] - a["Conversão %"]);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Gráficos comparativos — Vendas
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Leads × Vendas */}
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-4">Leads × Vendas por colaborador</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Leads" fill={CHART_COLORS.muted} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Vendas" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 2. Conversão % ranking */}
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-4">Taxa de Conversão % por colaborador</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={convData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                yAxisId="pct"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} hide />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="cnt" dataKey="Vendas" fill={CHART_COLORS.muted} radius={[3, 3, 0, 0]} opacity={0.6} />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="Conversão %"
                stroke={CHART_COLORS.chart2}
                strokeWidth={2.5}
                dot={{ r: 4, fill: CHART_COLORS.chart2, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ── COLLECTION CHARTS ─────────────────────────────────────────────────────────
function CollectionCharts({ data }) {
  const chartData = data.map((d) => ({
    name: shortName(d.name),
    Pedidos: d.orders,
    Tentativas: d.attempts,
    Pagamentos: d.payments,
    Promessas: d.promises,
    "Taxa Pgto. %": parseFloat(d.paymentRate),
  }));

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Gráficos comparativos — Cobrança
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-4">Carteira × Pagamentos por cobrador</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Pedidos" fill={CHART_COLORS.muted} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Pagamentos" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 bg-card border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-4">Tentativas × Promessas + Taxa Pgto. %</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="cnt" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="cnt" dataKey="Tentativas" fill={CHART_COLORS.chart3} radius={[3, 3, 0, 0]} />
              <Bar yAxisId="cnt" dataKey="Promessas" fill={CHART_COLORS.chart2} radius={[3, 3, 0, 0]} />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="Taxa Pgto. %"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                dot={{ r: 4, fill: CHART_COLORS.primary, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

export default function LeaderboardCharts({ data, type }) {
  if (data.length === 0) return null;
  if (type === "sales") return <SalesCharts data={data} />;
  if (type === "collection") return <CollectionCharts data={data} />;
  return null;
}