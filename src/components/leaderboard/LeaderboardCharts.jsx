import React from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Line, ComposedChart, Cell,
} from "recharts";

const PERSON_COLORS = [
  "#4F8F63", "#3AAFCA", "#E8B84B", "#B85C5C", "#9B79D4", "#E87D4B", "#4B8FCA",
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#17211B] border border-[#2A342D] rounded-xl p-3 text-xs shadow-2xl min-w-[160px]">
      <p className="font-bold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground flex-1">{p.name}:</span>
          <span className="font-bold text-foreground">
            {typeof p.value === "number" && p.name?.includes("%") ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const shortName = (name) => name.split(" ")[0];

const AXIS_STYLE = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID_COLOR = "hsl(142 11% 16%)";

function ChartCard({ title, children }) {
  return (
    <div
      className="rounded-2xl border border-[#2A342D] p-5"
      style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">{title}</p>
      {children}
    </div>
  );
}

// ── SALES CHARTS ─────────────────────────────────────────────────────────────
function SalesCharts({ data }) {
  const barData = data.map((d, i) => ({
    name: shortName(d.name),
    Leads: d.leads,
    Vendas: d.wins,
    color: PERSON_COLORS[i % PERSON_COLORS.length],
  }));

  const convData = data
    .map((d, i) => ({
      name: shortName(d.name),
      "Conversão %": parseFloat(d.conversion),
      Vendas: d.wins,
      color: PERSON_COLORS[i % PERSON_COLORS.length],
    }))
    .sort((a, b) => b["Conversão %"] - a["Conversão %"]);

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
        Gráficos Comparativos — Vendas
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Leads × Vendas */}
        <ChartCard title="Leads × Vendas por colaborador">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(142 11% 18% / 0.5)" }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="Leads" radius={[4, 4, 0, 0]} maxBarSize={28} fill="#3AAFCA" opacity={0.5} />
              <Bar dataKey="Vendas" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Conversão % ranking */}
        <ChartCard title="Taxa de Conversão % por colaborador">
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={convData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="pct"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis yAxisId="cnt" orientation="right" hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(142 11% 18% / 0.5)" }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Bar yAxisId="cnt" dataKey="Vendas" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.45}>
                {convData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="Conversão %"
                stroke="#E8B84B"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "#E8B84B", stroke: "#17211B", strokeWidth: 2 }}
                activeDot={{ r: 7, fill: "#E8B84B" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ── COLLECTION CHARTS ─────────────────────────────────────────────────────────
function CollectionCharts({ data }) {
  const chartData = data.map((d, i) => ({
    name: shortName(d.name),
    Pedidos: d.orders,
    Tentativas: d.attempts,
    Pagamentos: d.payments,
    Promessas: d.promises,
    "Taxa Pgto. %": parseFloat(d.paymentRate),
    color: PERSON_COLORS[i % PERSON_COLORS.length],
  }));

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
        Gráficos Comparativos — Cobrança
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Carteira × Pagamentos por cobrador">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(142 11% 18% / 0.5)" }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Bar dataKey="Pedidos" radius={[4, 4, 0, 0]} maxBarSize={28} fill="#3AAFCA" opacity={0.5} />
              <Bar dataKey="Pagamentos" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tentativas × Promessas + Taxa Pgto. %">
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis yAxisId="cnt" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(142 11% 18% / 0.5)" }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Bar yAxisId="cnt" dataKey="Tentativas" fill="#3AAFCA" radius={[4, 4, 0, 0]} maxBarSize={24} opacity={0.7} />
              <Bar yAxisId="cnt" dataKey="Promessas" fill="#E8B84B" radius={[4, 4, 0, 0]} maxBarSize={24} opacity={0.9} />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="Taxa Pgto. %"
                stroke="#4F8F63"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "#4F8F63", stroke: "#17211B", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
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