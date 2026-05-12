import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, ShoppingCart, Users, Clock, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

function KPICard({ icon: Icon, label, value, sub, color = "#4F8F63" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function SellerProfile() {
  const params = new URLSearchParams(window.location.search);
  const sellerName = decodeURIComponent(params.get("seller") || "");

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["sale_records"],
    queryFn: () => base44.entities.SaleRecord.list("-date", 2000),
  });

  const { data: allLeads = [] } = useQuery({
    queryKey: ["lead_daily_counts"],
    queryFn: () => base44.entities.LeadDailyCount.list("-date", 500),
  });

  // Filter records for this seller (case-insensitive)
  const sellerKey = sellerName.trim().toLowerCase();

  const sales = useMemo(
    () => allSales.filter((r) => r.seller_name?.trim().toLowerCase() === sellerKey && r.type !== "exit"),
    [allSales, sellerKey]
  );

  const leadEntries = useMemo(
    () => allLeads.filter((r) => r.seller_name?.trim().toLowerCase() === sellerKey),
    [allLeads, sellerKey]
  );

  // KPIs
  const totalSales = sales.length;
  const totalLeads = useMemo(() => leadEntries.reduce((s, r) => s + (r.lead_count || 0), 0), [leadEntries]);
  const totalRevenue = useMemo(() => sales.reduce((s, r) => s + (r.total || 0), 0), [sales]);
  const conversionRate = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : "—";

  // Avg time to close: days between first lead entry date and sale date (same date range approximation)
  // We use the spread of sale dates as proxy
  const avgDaysToClose = useMemo(() => {
    if (sales.length < 2) return null;
    const dates = sales.map((r) => r.date).filter(Boolean).sort();
    if (dates.length < 2) return null;
    const first = parseISO(dates[0]);
    const last = parseISO(dates[dates.length - 1]);
    const span = differenceInDays(last, first);
    return span > 0 ? (span / (sales.length - 1)).toFixed(1) : null;
  }, [sales]);

  // Sales by month for area chart
  const salesByMonth = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      if (!r.date) return;
      const month = r.date.slice(0, 7); // yyyy-MM
      if (!map[month]) map[month] = { month, vendas: 0, receita: 0 };
      map[month].vendas++;
      map[month].receita += r.total || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({
      ...m,
      label: format(parseISO(m.month + "-01"), "MMM/yy", { locale: ptBR }),
    }));
  }, [sales]);

  // Leads by month for bar chart
  const leadsByMonth = useMemo(() => {
    const map = {};
    leadEntries.forEach((r) => {
      if (!r.date) return;
      const month = r.date.slice(0, 7);
      if (!map[month]) map[month] = { month, leads: 0 };
      map[month].leads += r.lead_count || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({
      ...m,
      label: format(parseISO(m.month + "-01"), "MMM/yy", { locale: ptBR }),
    }));
  }, [leadEntries]);

  // Recent sales table
  const recentSales = useMemo(() => [...sales].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 20), [sales]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/leaderboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Leaderboard
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #4F8F63, #2F5D3A)", boxShadow: "0 0 24px #4F8F6344" }}
        >
          {sellerName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{sellerName}</h1>
          <p className="text-sm text-muted-foreground">Perfil do Vendedor</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={ShoppingCart} label="Total de Vendas" value={totalSales} sub="Histórico completo" />
        <KPICard icon={Users} label="Total de Leads" value={totalLeads} color="#3AAFCA" sub="Leads recebidos" />
        <KPICard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={conversionRate !== "—" ? `${conversionRate}%` : "—"}
          color={parseFloat(conversionRate) >= 7 ? "#4F8F63" : parseFloat(conversionRate) >= 4 ? "#E8B84B" : "#B85C5C"}
          sub="Leads → Vendas"
        />
        <KPICard
          icon={Clock}
          label="Tempo Médio p/ Fechar"
          value={avgDaysToClose ? `${avgDaysToClose}d` : "—"}
          color="#9B79D4"
          sub="Entre vendas consecutivas"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Vendas por mês */}
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" /> Vendas por mês
          </h3>
          {salesByMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={salesByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F8F63" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F8F63" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(142 11% 18%)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(150 14% 9%)", border: "1px solid hsl(142 11% 18%)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [v, "Vendas"]}
                />
                <Area type="monotone" dataKey="vendas" stroke="#4F8F63" fill="url(#salesGrad)" strokeWidth={2} dot={{ r: 3, fill: "#4F8F63" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Leads por mês */}
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3AAFCA]" /> Leads por mês
          </h3>
          {leadsByMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leadsByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(142 11% 18%)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(150 14% 9%)", border: "1px solid hsl(142 11% 18%)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [v, "Leads"]}
                />
                <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
                  {leadsByMonth.map((_, i) => <Cell key={i} fill="#3AAFCA" fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Histórico de vendas */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Histórico de Vendas (últimas 20)
        </h3>
        {recentSales.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma venda registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-2 pr-4">Data</th>
                  <th className="text-left py-2 pr-4">Cliente</th>
                  <th className="text-right py-2 pr-4">Total</th>
                  <th className="text-right py-2">Pago</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {sale.date ? format(parseISO(sale.date), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{sale.customer_name || "—"}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-primary">
                      {sale.total ? `R$ ${sale.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <Badge variant={sale.payment_done ? "default" : "secondary"} className="text-xs">
                        {sale.payment_done ? "Pago" : "Pendente"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}