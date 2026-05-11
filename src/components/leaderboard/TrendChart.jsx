import React, { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AXIS_STYLE = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID_COLOR = "hsl(142 11% 16%)";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#17211B] border border-[#2A342D] rounded-xl p-3 text-xs shadow-2xl min-w-[150px]">
      <p className="font-bold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground flex-1">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
      {payload.length === 2 && payload[0].value > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between">
          <span className="text-muted-foreground">Conversão:</span>
          <span className="font-bold text-[#E8B84B]">
            {((payload[1].value / payload[0].value) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default function TrendChart({ saleRecords, leadCounts }) {
  const chartData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i);
      const dateStr = date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      return { dateStr, label: format(date, "dd/MM", { locale: ptBR }) };
    });

    return days.map(({ dateStr, label }) => {
      const leads = leadCounts
        .filter((r) => r.date === dateStr)
        .reduce((sum, r) => sum + (r.lead_count || 0), 0);

      const vendas = saleRecords.filter(
        (r) => r.date === dateStr && r.type !== "exit"
      ).length;

      return { label, dateStr, Leads: leads, Vendas: vendas };
    });
  }, [saleRecords, leadCounts]);

  // Summary stats
  const totalLeads = chartData.reduce((s, d) => s + d.Leads, 0);
  const totalVendas = chartData.reduce((s, d) => s + d.Vendas, 0);
  const avgConversion = totalLeads > 0 ? ((totalVendas / totalLeads) * 100).toFixed(1) : "0.0";

  // Growth: compare last 15 vs first 15 days
  const first15 = chartData.slice(0, 15).reduce((s, d) => s + d.Vendas, 0);
  const last15 = chartData.slice(15).reduce((s, d) => s + d.Vendas, 0);
  const growthPct = first15 > 0 ? (((last15 - first15) / first15) * 100).toFixed(1) : null;

  return (
    <div
      className="rounded-2xl border border-[#2A342D] p-5 space-y-4"
      style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Tendência — Últimos 30 dias
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">Evolução de leads e vendas ao longo do tempo</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{totalLeads.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{totalVendas}</p>
            <p className="text-xs text-muted-foreground">Vendas</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[#E8B84B]">{avgConversion}%</p>
            <p className="text-xs text-muted-foreground">Conversão</p>
          </div>
          {growthPct !== null && (
            <div className="text-right">
              <p className={`text-lg font-bold ${parseFloat(growthPct) >= 0 ? "text-green-400" : "text-destructive"}`}>
                {parseFloat(growthPct) >= 0 ? "+" : ""}{growthPct}%
              </p>
              <p className="text-xs text-muted-foreground">Crescimento</p>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            yAxisId="leads"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="vendas"
            orientation="right"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" iconSize={8} />
          <Line
            yAxisId="leads"
            type="monotone"
            dataKey="Leads"
            stroke="#3AAFCA"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "#3AAFCA", stroke: "#17211B", strokeWidth: 2 }}
          />
          <Line
            yAxisId="vendas"
            type="monotone"
            dataKey="Vendas"
            stroke="#4F8F63"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#4F8F63", stroke: "#17211B", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}