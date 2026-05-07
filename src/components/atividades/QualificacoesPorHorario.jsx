import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LabelList,
} from "recharts";

// Qualificações conhecidas (payload.qualification)
const QUALS = [
  { key: "mudo",           label: "Mudo",                    color: "#6E9FA3" },
  { key: "caixa_postal",   label: "Caixa Postal",            color: "#B97A56" },
  { key: "sem_resposta",   label: "Sem Resposta",            color: "#B85C5C" },
  { key: "atendida",       label: "Atendida",                color: "#4F8F63" },
  { key: "ocupado",        label: "Ocupado",                 color: "#C8A94D" },
  { key: "outros",         label: "Outros",                  color: "#8A8A8A" },
];

function classifyQual(raw) {
  if (!raw) return "outros";
  const q = raw.toLowerCase();
  if (q.includes("mudo")) return "mudo";
  if (q.includes("caixa") || q.includes("postal") || q.includes("voicemail")) return "caixa_postal";
  if (q.includes("sem resposta") || q.includes("no_answer") || q.includes("nao atend")) return "sem_resposta";
  if (q === "answered" || q.includes("atend")) return "atendida";
  if (q.includes("ocupado") || q === "busy") return "ocupado";
  return "outros";
}

function getHourSP(dateStr) {
  const raw = dateStr;
  const iso = raw && !raw.endsWith("Z") && !raw.includes("+") ? raw + "Z" : raw;
  const d = new Date(iso);
  return new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getHours();
}

const CustomTooltip = ({ active, payload, label, selectedQual }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-2xl min-w-[140px]">
      <p className="font-bold text-foreground mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: payload[0]?.fill }} />
        <span className="text-muted-foreground">Qtd:</span>
        <span className="font-bold text-foreground">{d.count}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
        <span className="text-muted-foreground">% do total:</span>
        <span className="font-bold text-foreground">{d.pct}%</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
        <span className="text-muted-foreground">Total hora:</span>
        <span className="font-bold text-foreground">{d.totalHour}</span>
      </div>
    </div>
  );
};

export default function QualificacoesPorHorario({ events = [] }) {
  const [selectedQual, setSelectedQual] = useState("mudo");

  const qual = QUALS.find((q) => q.key === selectedQual) || QUALS[0];

  // Construir dados por hora
  const chartData = useMemo(() => {
    // Total de calls com qualificação por hora
    const hourTotals = {};
    const hourQual = {};
    for (let h = 7; h <= 20; h++) {
      hourTotals[h] = 0;
      hourQual[h] = 0;
    }

    events.forEach((e) => {
      if (!e.payload) return;
      try {
        const p = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
        const rawQual = p.qualification || p.result;
        if (!rawQual) return;

        const h = getHourSP(e.created_date);
        if (h < 7 || h > 20) return;

        hourTotals[h]++;
        if (classifyQual(rawQual) === selectedQual) {
          hourQual[h]++;
        }
      } catch {}
    });

    const grandTotal = Object.values(hourQual).reduce((a, b) => a + b, 0);

    return Array.from({ length: 20 - 7 + 1 }, (_, i) => i + 7).map((h) => ({
      hour: `${h}h`,
      count: hourQual[h],
      totalHour: hourTotals[h],
      pct: grandTotal > 0 ? Math.round((hourQual[h] / grandTotal) * 100) : 0,
      pctOfHour: hourTotals[h] > 0 ? Math.round((hourQual[h] / hourTotals[h]) * 100) : 0,
    }));
  }, [events, selectedQual]);

  const totalQual = chartData.reduce((a, d) => a + d.count, 0);
  const peakHour = chartData.reduce((best, d) => (d.count > best.count ? d : best), { count: -1, hour: "—" });

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Qualificações por Horário</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distribuição horária da qualificação selecionada
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUALS.map((q) => (
            <button
              key={q.key}
              onClick={() => setSelectedQual(q.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                selectedQual === q.key
                  ? "text-white border-transparent"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground"
              }`}
              style={selectedQual === q.key ? { background: q.color, borderColor: q.color } : {}}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="flex items-center gap-6 mb-4 flex-wrap">
        <div>
          <span className="text-2xl font-black text-foreground">{totalQual}</span>
          <span className="text-xs text-muted-foreground ml-2">ocorrências</span>
        </div>
        <div>
          <span className="text-sm font-bold" style={{ color: qual.color }}>{peakHour.count > 0 ? peakHour.hour : "—"}</span>
          <span className="text-xs text-muted-foreground ml-1">horário de pico</span>
        </div>
        <div>
          <span className="text-sm font-bold text-foreground">{peakHour.count > 0 ? peakHour.count : 0}</span>
          <span className="text-xs text-muted-foreground ml-1">no pico</span>
        </div>
      </div>

      {totalQual === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          Nenhuma ocorrência de "{qual.label}" no período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip selectedQual={selectedQual} />} cursor={{ fill: "hsl(var(--muted)/0.15)" }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
              <LabelList
                dataKey="count"
                position="top"
                formatter={(v) => (v > 0 ? v : "")}
                style={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--foreground))" }}
              />
              {chartData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={qual.color}
                  fillOpacity={entry.count === 0 ? 0.15 : entry.count === peakHour.count ? 1 : 0.65}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* % por hora — mini tabela */}
      {totalQual > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chartData.filter((d) => d.count > 0).map((d) => (
            <div
              key={d.hour}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border border-border bg-muted/10"
            >
              <span className="font-bold text-foreground">{d.hour}</span>
              <span className="text-muted-foreground">·</span>
              <span style={{ color: qual.color }} className="font-bold">{d.count}</span>
              <span className="text-muted-foreground">({d.pct}%)</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}