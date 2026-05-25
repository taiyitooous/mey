import React from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { buildHourlyData } from "@/lib/eventUtils";

const GRID = "rgba(255,255,255,0.04)";
const AXIS_STYLE = { fontSize: 11, fill: "hsl(138 5% 50%)", fontFamily: "var(--font-inter)" };

const SERIES = [
  { key: "calls",         name: "3C tentativas",    color: "#3AAFCA", opacity: 0.45 },
  { key: "callsAnswered", name: "3C atendida",       color: "#3AAFCA", opacity: 1 },
  { key: "whatsapp",      name: "WhatsApp",          color: "#4F8F63", opacity: 0.75 },
  { key: "stage",         name: "Etapa",             color: "#9B79D4", opacity: 0.6 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "rgba(18,24,21,0.97)", minWidth: 170 }}>
      <div className="px-4 py-2 border-b border-white/5">
        <p className="text-xs font-semibold text-foreground/90">{label}</p>
      </div>
      <div className="px-4 py-2.5 space-y-1.5">
        {payload.map((p) => (
          p.value > 0 && (
            <div key={p.dataKey} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
              <span className="text-xs text-muted-foreground flex-1">{p.name}</span>
              <span className="text-xs font-bold text-foreground">{p.value}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default function TeamActivityChart({ events }) {
  const data = buildHourlyData(events).filter(
    (d) => d.calls + d.whatsapp + d.stage + d.ganhos > 0
  );

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 py-12 text-center text-sm text-muted-foreground"
        style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}>
        Sem atividade no período para exibir
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Atividade por hora
          </p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color, opacity: s.opacity }} />
              <span className="text-[11px] text-muted-foreground">{s.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded-full" style={{ background: "#E8B84B" }} />
            <span className="text-[11px] text-muted-foreground">Ganhos</span>
          </div>
        </div>
      </div>

      <div className="px-3 pb-4">
        <defs>
          <linearGradient id="gradCalls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3AAFCA" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3AAFCA" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="gradAnswered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3AAFCA" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#3AAFCA" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="gradWA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F8F63" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#4F8F63" stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="gradStage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9B79D4" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#9B79D4" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={GRID} />
            <XAxis dataKey="hour" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
            <Bar yAxisId="left" dataKey="calls"         name="3C tentativas" stackId="a" fill="url(#gradCalls)"   radius={[0,0,0,0]} maxBarSize={36} />
            <Bar yAxisId="left" dataKey="callsAnswered" name="3C atendida"   stackId="a" fill="url(#gradAnswered)" radius={[0,0,0,0]} maxBarSize={36} />
            <Bar yAxisId="left" dataKey="whatsapp"      name="WhatsApp"      stackId="a" fill="url(#gradWA)"       radius={[0,0,0,0]} maxBarSize={36} />
            <Bar yAxisId="left" dataKey="stage"         name="Etapa"         stackId="a" fill="url(#gradStage)"    radius={[4,4,0,0]} maxBarSize={36} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ganhos"
              name="Ganhos"
              stroke="#E8B84B"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#E8B84B", stroke: "#121815", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#E8B84B", stroke: "#121815", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}