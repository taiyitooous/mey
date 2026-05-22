import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Line, ComposedChart, Cell, Area, AreaChart,
} from "recharts";

const PALETTE = ["#4F8F63", "#3AAFCA", "#E8B84B", "#B85C5C", "#9B79D4", "#E87D4B", "#4B8FCA"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "rgba(18,24,21,0.97)", minWidth: 160 }}>
      <div className="px-4 py-2.5 border-b border-white/5">
        <p className="text-xs font-semibold text-foreground/90">{label}</p>
      </div>
      <div className="px-4 py-2.5 space-y-1.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
            <span className="text-xs text-muted-foreground flex-1">{p.name}</span>
            <span className="text-xs font-bold text-foreground">
              {p.name?.includes("%") ? `${p.value}%` : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const shortName = (name) => name.split(" ")[0];
const AXIS_STYLE = { fontSize: 11, fill: "hsl(138 5% 50%)", fontFamily: "var(--font-inter)" };
const GRID = "rgba(255,255,255,0.04)";

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}>
      <div className="px-5 pt-5 pb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground/50 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-3 pb-4 pt-2">{children}</div>
    </div>
  );
}

// ── SALES CHARTS ──────────────────────────────────────────────────────────────
function SalesCharts({ data }) {
  const barData = data.map((d, i) => ({
    name: shortName(d.name),
    Leads: d.leads,
    Vendas: d.wins,
    color: PALETTE[i % PALETTE.length],
  }));

  const convData = data
    .map((d, i) => ({
      name: shortName(d.name),
      "Conversão %": parseFloat(d.conversion),
      Vendas: d.wins,
      color: PALETTE[i % PALETTE.length],
    }))
    .sort((a, b) => b["Conversão %"] - a["Conversão %"]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-primary" />
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Comparativo de Vendas
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Leads × Vendas */}
        <ChartCard title="Leads × Vendas" subtitle="Por colaborador">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={4} barCategoryGap="30%">
              <defs>
                <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3AAFCA" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#3AAFCA" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
              <Bar dataKey="Leads" radius={[6, 6, 0, 0]} maxBarSize={26} fill="url(#gradLeads)" />
              <Bar dataKey="Vendas" radius={[6, 6, 0, 0]} maxBarSize={26}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 px-2 mt-1">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(58,175,202,0.5)" }} /><span className="text-[11px] text-muted-foreground">Leads</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /><span className="text-[11px] text-muted-foreground">Vendas</span></div>
          </div>
        </ChartCard>

        {/* 2. Taxa de Conversão */}
        <ChartCard title="Taxa de Conversão %" subtitle="Ordenado por performance">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={convData} margin={{ top: 8, right: 32, left: -10, bottom: 0 }} barCategoryGap="30%">
              <defs>
                {convData.map((d, i) => (
                  <linearGradient key={i} id={`gc${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={d.color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={d.color} stopOpacity={0.2} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis yAxisId="pct" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId="cnt" orientation="right" hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
              <Bar yAxisId="cnt" dataKey="Vendas" radius={[6, 6, 0, 0]} maxBarSize={26} opacity={0.5}>
                {convData.map((entry, i) => (
                  <Cell key={i} fill={`url(#gc${i})`} />
                ))}
              </Bar>
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="Conversão %"
                stroke="#E8B84B"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#E8B84B", stroke: "#121815", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#E8B84B", stroke: "#121815", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 px-2 mt-1">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary opacity-50" /><span className="text-[11px] text-muted-foreground">Vendas</span></div>
            <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 rounded-full" style={{ background: "#E8B84B" }} /><span className="text-[11px] text-muted-foreground">Conversão %</span></div>
          </div>
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
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-primary" />
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Comparativo de Cobrança
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Carteira × Pagamentos" subtitle="Por cobrador">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap="30%">
              <defs>
                <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3AAFCA" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3AAFCA" stopOpacity={0.15} />
                </linearGradient>
                {chartData.map((d, i) => (
                  <linearGradient key={i} id={`gp${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={d.color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={d.color} stopOpacity={0.4} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
              <Bar dataKey="Pedidos" radius={[6, 6, 0, 0]} maxBarSize={26} fill="url(#gradPedidos)" />
              <Bar dataKey="Pagamentos" radius={[6, 6, 0, 0]} maxBarSize={26}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={`url(#gp${i})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 px-2 mt-1">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(58,175,202,0.45)" }} /><span className="text-[11px] text-muted-foreground">Pedidos</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /><span className="text-[11px] text-muted-foreground">Pagamentos</span></div>
          </div>
        </ChartCard>

        <ChartCard title="Tentativas × Promessas" subtitle="Com taxa de pagamento">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 36, left: -20, bottom: 0 }} barCategoryGap="30%">
              <defs>
                <linearGradient id="gradTent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3AAFCA" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#3AAFCA" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="gradProm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8B84B" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#E8B84B" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis yAxisId="cnt" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis yAxisId="pct" orientation="right" tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
              <Bar yAxisId="cnt" dataKey="Tentativas" fill="url(#gradTent)" radius={[6, 6, 0, 0]} maxBarSize={24} />
              <Bar yAxisId="cnt" dataKey="Promessas" fill="url(#gradProm)" radius={[6, 6, 0, 0]} maxBarSize={24} />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="Taxa Pgto. %"
                stroke="#4F8F63"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#4F8F63", stroke: "#121815", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#4F8F63", stroke: "#121815", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 px-2 mt-1">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(58,175,202,0.6)" }} /><span className="text-[11px] text-muted-foreground">Tentativas</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(232,184,75,0.7)" }} /><span className="text-[11px] text-muted-foreground">Promessas</span></div>
            <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 rounded-full bg-primary" /><span className="text-[11px] text-muted-foreground">Taxa Pgto. %</span></div>
          </div>
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