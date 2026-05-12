import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, ShoppingCart, Users, Clock, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend, Cell,
} from "recharts";

const COLOR_A = "#4F8F63";
const COLOR_B = "#3AAFCA";

function buildSellerStats(sellerName, allSales, allLeads) {
  const key = sellerName.trim().toLowerCase();
  const sales = allSales.filter((r) => r.seller_name?.trim().toLowerCase() === key && r.type !== "exit");
  const leadEntries = allLeads.filter((r) => r.seller_name?.trim().toLowerCase() === key);

  const totalSales = sales.length;
  const totalLeads = leadEntries.reduce((s, r) => s + (r.lead_count || 0), 0);
  const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0);
  const conversionRate = totalLeads > 0 ? parseFloat(((totalSales / totalLeads) * 100).toFixed(1)) : 0;

  // Avg days between consecutive sales (proxy for closing rhythm)
  const sortedDates = sales.map((r) => r.date).filter(Boolean).sort();
  let avgDays = null;
  if (sortedDates.length >= 2) {
    const first = parseISO(sortedDates[0]);
    const last = parseISO(sortedDates[sortedDates.length - 1]);
    const span = differenceInDays(last, first);
    avgDays = span > 0 ? parseFloat((span / (sortedDates.length - 1)).toFixed(1)) : 0;
  }

  // Sales by month
  const byMonth = {};
  sales.forEach((r) => {
    if (!r.date) return;
    const m = r.date.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + 1;
  });

  return { totalSales, totalLeads, totalRevenue, conversionRate, avgDays, byMonth };
}

function MetricRow({ label, valA, valB, icon: Icon, higherIsBetter = true, format: fmt }) {
  const fmtVal = (v) => (fmt ? fmt(v) : v);
  const numA = typeof valA === "number" ? valA : parseFloat(valA) || 0;
  const numB = typeof valB === "number" ? valB : parseFloat(valB) || 0;
  const aWins = higherIsBetter ? numA > numB : numA < numB;
  const bWins = higherIsBetter ? numB > numA : numB < numA;
  const tie = numA === numB;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 text-right">
        <span
          className="text-lg font-bold"
          style={{ color: aWins ? COLOR_A : tie ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
        >
          {fmtVal(valA)}
        </span>
        {aWins && <span className="ml-1.5 text-xs font-bold" style={{ color: COLOR_A }}>✓</span>}
      </div>
      <div className="flex flex-col items-center gap-1 w-36 shrink-0">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
      </div>
      <div className="flex-1 text-left">
        {bWins && <span className="mr-1.5 text-xs font-bold" style={{ color: COLOR_B }}>✓</span>}
        <span
          className="text-lg font-bold"
          style={{ color: bWins ? COLOR_B : tie ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
        >
          {fmtVal(valB)}
        </span>
      </div>
    </div>
  );
}

export default function SellerComparison() {
  const params = new URLSearchParams(window.location.search);
  const sellerA = decodeURIComponent(params.get("a") || "");
  const sellerB = decodeURIComponent(params.get("b") || "");

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["sale_records"],
    queryFn: () => base44.entities.SaleRecord.list("-date", 2000),
  });

  const { data: allLeads = [] } = useQuery({
    queryKey: ["lead_daily_counts"],
    queryFn: () => base44.entities.LeadDailyCount.list("-date", 500),
  });

  const statsA = useMemo(() => buildSellerStats(sellerA, allSales, allLeads), [sellerA, allSales, allLeads]);
  const statsB = useMemo(() => buildSellerStats(sellerB, allSales, allLeads), [sellerB, allSales, allLeads]);

  // Merge months for monthly chart
  const monthlyChart = useMemo(() => {
    const allMonths = new Set([...Object.keys(statsA.byMonth), ...Object.keys(statsB.byMonth)]);
    return Array.from(allMonths).sort().map((m) => ({
      label: format(parseISO(m + "-01"), "MMM/yy", { locale: ptBR }),
      [sellerA]: statsA.byMonth[m] || 0,
      [sellerB]: statsB.byMonth[m] || 0,
    }));
  }, [statsA, statsB, sellerA, sellerB]);

  // Radar data
  const maxSales = Math.max(statsA.totalSales, statsB.totalSales, 1);
  const maxLeads = Math.max(statsA.totalLeads, statsB.totalLeads, 1);
  const maxRev = Math.max(statsA.totalRevenue, statsB.totalRevenue, 1);
  const radarData = [
    { metric: "Vendas", A: Math.round((statsA.totalSales / maxSales) * 100), B: Math.round((statsB.totalSales / maxSales) * 100) },
    { metric: "Leads", A: Math.round((statsA.totalLeads / maxLeads) * 100), B: Math.round((statsB.totalLeads / maxLeads) * 100) },
    { metric: "Conversão", A: statsA.conversionRate, B: statsB.conversionRate },
    { metric: "Receita", A: Math.round((statsA.totalRevenue / maxRev) * 100), B: Math.round((statsB.totalRevenue / maxRev) * 100) },
    { metric: "Ritmo", A: statsA.avgDays ? Math.max(0, 100 - statsA.avgDays * 5) : 0, B: statsB.avgDays ? Math.max(0, 100 - statsB.avgDays * 5) : 0 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link to="/leaderboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Leaderboard
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Comparação de Vendedores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Histórico completo de dados</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: COLOR_A }} />
            <span className="text-sm font-semibold">{sellerA}</span>
          </div>
          <span className="text-muted-foreground text-sm">vs</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: COLOR_B }} />
            <span className="text-sm font-semibold">{sellerB}</span>
          </div>
        </div>
      </div>

      {/* Avatar row */}
      <div className="grid grid-cols-2 gap-4">
        {[{ name: sellerA, color: COLOR_A, stats: statsA }, { name: sellerB, color: COLOR_B, stats: statsB }].map(({ name, color, stats }) => (
          <div key={name} className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}88)`, boxShadow: `0 0 20px ${color}33` }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg">{name}</p>
              <p className="text-xs text-muted-foreground">{stats.totalSales} vendas · {stats.totalLeads} leads</p>
            </div>
          </div>
        ))}
      </div>

      {/* Head to head metrics */}
      <Card className="p-5 space-y-1">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-warning" /> Métricas frente a frente
        </h3>

        {/* Column headers */}
        <div className="flex items-center gap-4 pb-2 border-b border-border">
          <div className="flex-1 text-right">
            <span className="text-sm font-bold" style={{ color: COLOR_A }}>{sellerA}</span>
          </div>
          <div className="w-36 shrink-0" />
          <div className="flex-1 text-left">
            <span className="text-sm font-bold" style={{ color: COLOR_B }}>{sellerB}</span>
          </div>
        </div>

        <MetricRow
          label="Total de Vendas"
          icon={ShoppingCart}
          valA={statsA.totalSales}
          valB={statsB.totalSales}
          higherIsBetter
        />
        <MetricRow
          label="Total de Leads"
          icon={Users}
          valA={statsA.totalLeads}
          valB={statsB.totalLeads}
          higherIsBetter
        />
        <MetricRow
          label="Taxa de Conversão"
          icon={TrendingUp}
          valA={statsA.conversionRate}
          valB={statsB.conversionRate}
          higherIsBetter
          format={(v) => `${v}%`}
        />
        <MetricRow
          label="Receita Total"
          icon={TrendingUp}
          valA={statsA.totalRevenue}
          valB={statsB.totalRevenue}
          higherIsBetter
          format={(v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
        />
        <MetricRow
          label={<>Ritmo de Fechamento<br /><span className="text-[10px]">(dias entre vendas — menor é melhor)</span></>}
          icon={Clock}
          valA={statsA.avgDays ?? "—"}
          valB={statsB.avgDays ?? "—"}
          higherIsBetter={false}
          format={(v) => v === "—" ? "—" : `${v}d`}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Radar */}
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-sm">Radar de Desempenho</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <PolarGrid stroke="hsl(142 11% 18%)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Radar name={sellerA} dataKey="A" stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.2} />
              <Radar name={sellerB} dataKey="B" stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.2} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{value}</span>}
              />
              <Tooltip
                contentStyle={{ background: "hsl(150 14% 9%)", border: "1px solid hsl(142 11% 18%)", borderRadius: 8, fontSize: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly volume */}
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-sm">Vendas por Mês</h3>
          {monthlyChart.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(142 11% 18%)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(150 14% 9%)", border: "1px solid hsl(142 11% 18%)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey={sellerA} fill={COLOR_A} radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                <Bar dataKey={sellerB} fill={COLOR_B} radius={[3, 3, 0, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}