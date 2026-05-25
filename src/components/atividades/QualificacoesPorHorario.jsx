import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const QUALS = [
  { key: "atendida",     label: "Atendida",    color: "#4F8F63" },
  { key: "mudo",         label: "Mudo",         color: "#6E9FA3" },
  { key: "caixa_postal", label: "Caixa Postal", color: "#B97A56" },
  { key: "sem_resposta", label: "Sem Resposta", color: "#B85C5C" },
  { key: "ocupado",      label: "Ocupado",      color: "#C8A94D" },
  { key: "outros",       label: "Outros",       color: "#6B7280" },
];

const GRID = "rgba(255,255,255,0.04)";
const AXIS_STYLE = { fontSize: 11, fill: "hsl(138 5% 50%)", fontFamily: "var(--font-inter)" };

function classifyQual(raw) {
  if (!raw) return "outros";
  const q = raw.toLowerCase();
  if (q.includes("mudo")) return "mudo";
  if (q.includes("caixa") || q.includes("postal") || q.includes("voicemail")) return "caixa_postal";
  if (q.includes("sem resposta") || q.includes("no_answer") || q.includes("nao atend") || q === "no_answer") return "sem_resposta";
  if (q === "answered" || q.includes("atend")) return "atendida";
  if (q.includes("ocupado") || q === "busy") return "ocupado";
  return "outros";
}

function getHourSP(dateStr) {
  const iso = dateStr && !dateStr.endsWith("Z") && !dateStr.includes("+") ? dateStr + "Z" : dateStr;
  const d = new Date(iso);
  return new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getHours();
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + (p.value || 0), 0);
  return (
    <div className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "rgba(18,24,21,0.97)", minWidth: 175 }}>
      <div className="px-4 py-2 border-b border-white/5">
        <p className="text-xs font-semibold text-foreground/90">{label}</p>
      </div>
      <div className="px-4 py-2.5 space-y-1.5">
        {payload.map((p) => p.value > 0 && (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
            <span className="text-xs text-muted-foreground flex-1">{p.name}</span>
            <span className="text-xs font-bold text-foreground">{p.value}</span>
            <span className="text-[10px] text-muted-foreground/60">
              {total > 0 ? `${Math.round((p.value / total) * 100)}%` : ""}
            </span>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-white/5 flex justify-between">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-xs font-bold text-foreground">{total}</span>
      </div>
    </div>
  );
};

export default function QualificacoesPorHorario({ events = [] }) {
  const { chartData, totals, totalAll } = useMemo(() => {
    const eventsWithQual = events.filter((e) => {
      if (e.source !== "3c") return false;
      if (!e.payload) return false;
      try {
        const p = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
        return !!(p.qualification || p.result);
      } catch { return false; }
    });

    const hours = {};
    for (let h = 7; h <= 20; h++) {
      hours[h] = { hour: `${h}h` };
      QUALS.forEach((q) => { hours[h][q.key] = 0; });
    }

    const totalsByQual = {};
    QUALS.forEach((q) => { totalsByQual[q.key] = 0; });

    eventsWithQual.forEach((e) => {
      try {
        const p = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
        const rawQual = p.qualification || p.result;
        const key = classifyQual(rawQual);
        const h = getHourSP(e.created_date);
        if (h < 7 || h > 20) return;
        hours[h][key]++;
        totalsByQual[key]++;
      } catch {}
    });

    const grandTotal = Object.values(totalsByQual).reduce((a, b) => a + b, 0);
    return { chartData: Object.values(hours), totals: totalsByQual, totalAll: grandTotal };
  }, [events]);

  const peakHour = chartData.reduce((best, d) => {
    const sum = QUALS.reduce((a, q) => a + (d[q.key] || 0), 0);
    return sum > best.sum ? { hour: d.hour, sum } : best;
  }, { hour: "—", sum: -1 });

  if (totalAll === 0) return null;

  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Qualificações por Horário
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground/50 ml-3">Distribuição horária das ligações 3C</p>
        </div>

        {/* KPI badges */}
        <div className="flex flex-wrap items-center gap-2">
          {QUALS.filter((q) => totals[q.key] > 0).map((q) => (
            <div key={q.key}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px]"
              style={{ background: `${q.color}14`, border: `1px solid ${q.color}30` }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: q.color }} />
              <span className="text-muted-foreground">{q.label}</span>
              <span className="font-bold text-foreground">{totals[q.key]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] border border-primary/25 bg-primary/8">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-foreground">{totalAll}</span>
            {peakHour.sum > 0 && (
              <span className="text-muted-foreground/60">· pico {peakHour.hour}</span>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-3 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 10, left: -24, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="2 6" stroke={GRID} vertical={false} />
            <XAxis dataKey="hour" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }} />
            {QUALS.map((q, i) => (
              <Bar
                key={q.key}
                dataKey={q.key}
                name={q.label}
                stackId="a"
                fill={q.color}
                fillOpacity={0.85}
                radius={i === QUALS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={38}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {/* Inline legend */}
        <div className="flex flex-wrap items-center gap-3 px-2 mt-2">
          {QUALS.filter((q) => totals[q.key] > 0).map((q) => (
            <div key={q.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: q.color, opacity: 0.85 }} />
              <span className="text-[11px] text-muted-foreground">{q.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}