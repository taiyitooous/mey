import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LabelList,
} from "recharts";

const QUALS = [
  { key: "atendida",     label: "Atendida",       color: "#4F8F63" },
  { key: "mudo",         label: "Mudo",            color: "#6E9FA3" },
  { key: "caixa_postal", label: "Caixa Postal",    color: "#B97A56" },
  { key: "sem_resposta", label: "Sem Resposta",    color: "#B85C5C" },
  { key: "ocupado",      label: "Ocupado",         color: "#C8A94D" },
  { key: "outros",       label: "Outros",          color: "#8A8A8A" },
];

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
    <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-2xl min-w-[160px]">
      <p className="font-bold text-foreground mb-2">{label}</p>
      {payload.map((p) => p.value > 0 && (
        <div key={p.dataKey} className="flex items-center gap-2 mt-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.fill }} />
          <span className="text-muted-foreground flex-1">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
          <span className="text-muted-foreground">({total > 0 ? Math.round((p.value / total) * 100) : 0}%)</span>
        </div>
      ))}
      <div className="border-t border-border mt-2 pt-2 flex justify-between">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-bold text-foreground">{total}</span>
      </div>
    </div>
  );
};

export default function QualificacoesPorHorario({ events = [] }) {
  const { chartData, totals, totalAll } = useMemo(() => {
    // Apenas eventos de cobrança da 3C com qualificação no payload
    const collectionEvents = events.filter((e) => {
      if (e.source !== "3c") return false;
      const et = e.event_type || "";
      return et.startsWith("collection.") || et === "call-history-was-created" || et.startsWith("call.");
    });

    // Mas filtra só quem tem payload de cobrança (collection_status ou usamos todos os 3c que têm qualification)
    // Estratégia: qualquer evento 3c que tenha qualification no payload
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

    return {
      chartData: Object.values(hours),
      totals: totalsByQual,
      totalAll: grandTotal,
    };
  }, [events]);

  const peakHour = chartData.reduce((best, d) => {
    const sum = QUALS.reduce((a, q) => a + (d[q.key] || 0), 0);
    return sum > best.sum ? { hour: d.hour, sum } : best;
  }, { hour: "—", sum: -1 });

  return (
    <Card className="p-5 bg-card border-border">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Qualificações por Horário — Cobrança (3C)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distribuição horária de todas as qualificações de ligações da 3C
          </p>
        </div>
      </div>

      {/* KPIs totais por qualificação */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUALS.map((q) => (
          totals[q.key] > 0 && (
            <div
              key={q.key}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/10 text-xs"
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: q.color }} />
              <span className="text-muted-foreground">{q.label}:</span>
              <span className="font-bold text-foreground">{totals[q.key]}</span>
              <span className="text-muted-foreground">
                ({totalAll > 0 ? Math.round((totals[q.key] / totalAll) * 100) : 0}%)
              </span>
            </div>
          )
        ))}
        {totalAll > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-xs ml-auto">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold text-foreground">{totalAll}</span>
            {peakHour.sum > 0 && (
              <span className="text-muted-foreground ml-2">· pico: <span className="font-bold text-foreground">{peakHour.hour}</span></span>
            )}
          </div>
        )}
      </div>

      {totalAll === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          Nenhuma qualificação de cobrança encontrada no período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.1)" }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => QUALS.find((q) => q.key === value)?.label || value}
            />
            {QUALS.map((q) => (
              <Bar
                key={q.key}
                dataKey={q.key}
                name={q.label}
                stackId="a"
                fill={q.color}
                radius={q.key === QUALS[QUALS.length - 1].key ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}