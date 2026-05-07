import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { buildHourlyData, isCallAttempt, isEffectiveContact } from "@/lib/eventUtils";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[160px]">
      <p className="font-bold text-foreground text-sm">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-semibold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function TeamActivityChart({ events }) {
  const data = buildHourlyData(events).filter(
    (d) => d.calls + d.whatsapp + d.stage + d.ganhos > 0
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Sem atividade no período para exibir
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Atividade por hora + resultados</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            <Bar yAxisId="left" dataKey="calls" name="3C" stackId="a" fill="hsl(217 91% 60% / 0.6)" radius={[0,0,0,0]} />
            <Bar yAxisId="left" dataKey="callsAnswered" name="3C atendida" stackId="a" fill="hsl(217 91% 60% / 1)" radius={[0,0,0,0]} />
            <Bar yAxisId="left" dataKey="whatsapp" name="WhatsApp" stackId="a" fill="hsl(142 71% 45% / 0.7)" radius={[0,0,0,0]} />
            <Bar yAxisId="left" dataKey="stage" name="Etapa" stackId="a" fill="hsl(var(--primary) / 0.4)" radius={[4,4,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="ganhos" name="Ganhos" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--success))" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}