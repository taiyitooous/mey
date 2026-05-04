import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, Clock, TrendingUp, Users, ArrowRight, RefreshCw,
  CheckCircle2, AlertCircle, Timer, BarChart2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  format, subDays, startOfDay, startOfWeek, eachDayOfInterval,
  eachWeekOfInterval, isToday, isThisMonth, differenceInDays, parseISO
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ---- helpers ----
const fmt = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtK = (v) => v >= 1000 ? `R$${Math.round(v / 1000)}k` : `R$${v}`;

// Cores temáticas
const COLORS = {
  informado: "#4F8F63",
  validacao: "#C8A94D",
  oficial: "#6E9FA3",
  pendente: "#B85C5C",
};

function KpiCard({ label, value, sub, icon: Icon, color = "primary", badge }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    blue: "bg-blue-500/10 text-blue-400",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-sm text-primary font-semibold truncate">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {badge && <p className="text-xs text-muted-foreground mt-2">{badge}</p>}
    </Card>
  );
}

function TopList({ items, label }) {
  const max = items[0]?.count || 1;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground truncate flex-1 pr-2">{item.name}</span>
            <span className="text-muted-foreground font-semibold shrink-0">{item.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" && p.value > 100 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function DashSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-20 w-full" /></Card>)}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [chartMode, setChartMode] = useState("dia"); // dia | hora
  const [monthTab, setMonthTab] = useState("current"); // current | prev1 | prev2

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders_dash"],
    queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events_payments"],
    queryFn: () => base44.entities.Event.filter({ entity_type: "order" }, "-created_date", 500),
  });

  const paidOrders = useMemo(() => orders.filter(o => o.payment_status === "paid"), [orders]);
  const pendingOrders = useMemo(() => orders.filter(o => o.logistics_status === "delivered" && o.payment_status !== "paid"), [orders]);

  // --- KPIs de Status ---
  // Para simular os status "informado / validação / oficial / pendente" do screenshot,
  // mapeamos os statuses reais de cobrança e pagamento:
  const totalInformado = useMemo(() =>
    orders.filter(o => ["attempting", "promise", "agreement"].includes(o.collection_status) || o.payment_status === "paid").length,
    [orders]
  );
  const emValidacao = useMemo(() =>
    orders.filter(o => o.collection_status === "promise" || o.collection_status === "agreement").length,
    [orders]
  );
  const pagoOficial = useMemo(() => paidOrders.length, [paidOrders]);
  const pendentes = useMemo(() => pendingOrders.length, [pendingOrders]);

  const totalRevInformado = useMemo(() =>
    orders.filter(o => ["attempting","promise","agreement"].includes(o.collection_status) || o.payment_status === "paid")
      .reduce((s, o) => s + (o.amount || 0), 0),
    [orders]
  );
  const totalRevValidacao = useMemo(() =>
    orders.filter(o => o.collection_status === "promise" || o.collection_status === "agreement")
      .reduce((s, o) => s + (o.amount || 0), 0),
    [orders]
  );
  const totalRevOficial = useMemo(() => paidOrders.reduce((s, o) => s + (o.amount || 0), 0), [paidOrders]);

  // Ticket médio
  const ticketMedio = pagoOficial > 0 ? totalRevOficial / pagoOficial : 0;

  // Tempo médio de validação (dias entre created e paid)
  const tempoMedioValid = useMemo(() => {
    const valid = paidOrders.filter(o => o.created_date && o.paid_at);
    if (!valid.length) return 0;
    const avg = valid.reduce((s, o) => s + differenceInDays(new Date(o.paid_at), new Date(o.created_date)), 0) / valid.length;
    return Math.round(avg * 10) / 10;
  }, [paidOrders]);

  // Taxa de conversão (informado → oficial)
  const taxaConversao = totalInformado > 0 ? Math.round((pagoOficial / totalInformado) * 100 * 10) / 10 : 0;

  // Vendedores ativos (unique seller_name nos pedidos)
  const vendedoresAtivos = useMemo(() => {
    const names = new Set(orders.map(o => o.customer_name).filter(Boolean));
    // Usar eventos para pegar user_name dos cobradores
    return new Set(events.map(e => e.user_name).filter(Boolean)).size;
  }, [orders, events]);

  // --- Gráfico Pagamentos por Dia / Hora ---
  const chartData = useMemo(() => {
    const today = new Date();
    if (chartMode === "dia") {
      const days = eachDayOfInterval({ start: subDays(today, 13), end: today });
      return days.map(d => {
        const label = format(d, "dd/MM", { locale: ptBR });
        const count = paidOrders.filter(o => o.paid_at && format(new Date(o.paid_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd")).length;
        return { label, count };
      });
    } else {
      return Array.from({ length: 24 }, (_, h) => {
        const count = paidOrders.filter(o => {
          if (!o.paid_at || !isToday(new Date(o.paid_at))) return false;
          return new Date(o.paid_at).getHours() === h;
        }).length;
        return { label: `${h}h`, count };
      });
    }
  }, [paidOrders, chartMode]);

  // --- Distribuição por Status (donut) ---
  const statusDist = useMemo(() => {
    const total = totalInformado + emValidacao + pagoOficial;
    if (!total) return [];
    return [
      { name: "Pago Informado", value: totalInformado, color: COLORS.informado },
      { name: "Em Validação", value: emValidacao, color: COLORS.validacao },
      { name: "Pago Oficial", value: pagoOficial, color: COLORS.oficial },
    ].filter(d => d.value > 0);
  }, [totalInformado, emValidacao, pagoOficial]);

  // --- Evolução do Faturamento (14 dias) ---
  const faturamentoData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 7), end: today });
    return days.map(d => {
      const label = format(d, "dd/MM", { locale: ptBR });
      const value = paidOrders
        .filter(o => o.paid_at && format(new Date(o.paid_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"))
        .reduce((s, o) => s + (o.amount || 0), 0);
      return { label, value };
    });
  }, [paidOrders]);

  // --- Top Cobradores (por eventos de cobrança) ---
  const topCobradores = useMemo(() => {
    const map = {};
    events.filter(e => e.event_type?.startsWith("collection.")).forEach(e => {
      const name = e.user_name || "—";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }, [events]);

  // --- Top Vendedores (por pedidos pagos com seller) ---
  const topVendedores = useMemo(() => {
    const map = {};
    paidOrders.forEach(o => {
      // usa customer_name como proxy, ou trocar por seller_name se existir
      const name = o.seller_name || o.customer_name?.split(" ")[0] || "—";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }, [paidOrders]);

  // --- Faturamento por Semana (8 semanas) ---
  const weekData = useMemo(() => {
    const today = new Date();
    const weeks = eachWeekOfInterval({ start: subDays(today, 55), end: today }, { weekStartsOn: 0 });
    return weeks.map(w => {
      const label = format(w, "dd/MM", { locale: ptBR });
      const value = paidOrders
        .filter(o => {
          if (!o.paid_at) return false;
          const d = new Date(o.paid_at);
          const weekEnd = new Date(w); weekEnd.setDate(weekEnd.getDate() + 7);
          return d >= w && d < weekEnd;
        })
        .reduce((s, o) => s + (o.amount || 0), 0);
      return { label, value };
    });
  }, [paidOrders]);

  // --- Comparativo Mês a Mês ---
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = [
      { key: "prev2", label: format(new Date(now.getFullYear(), now.getMonth() - 2, 1), "MMM/yy", { locale: ptBR }) },
      { key: "prev1", label: format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "MMM/yy", { locale: ptBR }) },
      { key: "current", label: format(now, "MMM/yy", { locale: ptBR }) },
    ];
    return months.map(m => {
      const target = m.key === "current" ? now.getMonth() :
                     m.key === "prev1" ? (now.getMonth() - 1 + 12) % 12 :
                     (now.getMonth() - 2 + 12) % 12;
      const yearAdj = m.key === "current" ? now.getFullYear() :
                      m.key === "prev1" ? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) :
                      (now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear());
      const os = paidOrders.filter(o => {
        if (!o.paid_at) return false;
        const d = new Date(o.paid_at);
        return d.getMonth() === target && d.getFullYear() === yearAdj;
      });
      const inadimplentes = orders.filter(o => {
        if (!o.delivered_at) return false;
        const d = new Date(o.delivered_at);
        return d.getMonth() === target && d.getFullYear() === yearAdj && o.payment_status !== "paid";
      });
      return {
        ...m,
        total: os.reduce((s, o) => s + (o.amount || 0), 0),
        count: os.length,
        inadimplencia: inadimplentes.length,
      };
    });
  }, [paidOrders, orders]);

  const activeMth = monthlyData.find(m => m.key === monthTab) || monthlyData[2];

  // Dados para barras comparativas mês
  const monthCompData = useMemo(() => {
    const now = new Date();
    const month = activeMth.key === "current" ? now.getMonth() :
                  activeMth.key === "prev1" ? (now.getMonth() - 1 + 12) % 12 :
                  (now.getMonth() - 2 + 12) % 12;
    const yearAdj = activeMth.key === "current" ? now.getFullYear() :
                    activeMth.key === "prev1" ? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) :
                    (now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear());
    const daysInMonth = new Date(yearAdj, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(yearAdj, month, i + 1);
      const label = format(d, "dd/MM", { locale: ptBR });
      const value = paidOrders
        .filter(o => o.paid_at && format(new Date(o.paid_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"))
        .reduce((s, o) => s + (o.amount || 0), 0);
      return { label, value };
    });
  }, [paidOrders, activeMth]);

  if (isLoading) return <DashSkeleton />;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral de cobranças e faturamento</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Informado"
          value={totalInformado}
          sub={fmt(totalRevInformado)}
          icon={DollarSign}
          color="primary"
        />
        <KpiCard
          label="Em Validação"
          value={emValidacao}
          sub={fmt(totalRevValidacao)}
          icon={Timer}
          color="warning"
        />
        <KpiCard
          label="Pago Oficial"
          value={pagoOficial}
          sub={fmt(totalRevOficial)}
          icon={CheckCircle2}
          color="success"
        />
        <KpiCard
          label="Pendentes"
          value={pendentes}
          badge="Aguardando validação"
          icon={AlertCircle}
          color="danger"
        />
      </div>

      {/* KPIs Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ticket Médio"
          value={fmt(ticketMedio)}
          icon={TrendingUp}
          color="blue"
        />
        <KpiCard
          label="Tempo Médio Valid."
          value={`${tempoMedioValid} dias`}
          icon={Clock}
          color="warning"
        />
        <KpiCard
          label="Taxa de Conversão"
          value={`${taxaConversao}%`}
          badge="Informado → Oficial"
          icon={ArrowRight}
          color="primary"
        />
        <KpiCard
          label="Vendedores Ativos"
          value={vendedoresAtivos}
          icon={Users}
          color="blue"
        />
      </div>

      {/* Linha do tempo de pagamentos */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Pagamentos por {chartMode === "dia" ? "Dia" : "Horário"}</h2>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={chartMode === "dia" ? "default" : "outline"}
              className="h-7 px-3 text-xs"
              onClick={() => setChartMode("dia")}
            >Por Dia</Button>
            <Button
              size="sm"
              variant={chartMode === "hora" ? "default" : "outline"}
              className="h-7 px-3 text-xs"
              onClick={() => setChartMode("hora")}
            >Por Horário</Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F8F63" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4F8F63" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" name="Pagamentos" stroke="#4F8F63" strokeWidth={2} fill="url(#greenGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Distribuição + Faturamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distribuição por Status */}
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Distribuição por Status</h2>
          {statusDist.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={2}>
                    {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusDist.map((d, i) => {
                  const total = statusDist.reduce((s, x) => s + x.value, 0);
                  const pct = Math.round((d.value / total) * 100);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{d.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Evolução do Faturamento */}
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Evolução do Faturamento</h2>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={faturamentoData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Faturamento" fill="#4F8F63" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Cobradores + Top Vendedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm">Top Cobradores</h2>
          {topCobradores.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
          ) : <TopList items={topCobradores} />}
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm">Top Vendedores</h2>
          {topVendedores.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
          ) : <TopList items={topVendedores} />}
        </Card>
      </div>

      {/* Faturamento Validado por Semana */}
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold text-sm">Faturamento Validado por Semana</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Faturamento" fill="#4F8F63" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Comparativo Mês a Mês */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-sm">Comparativo Mês a Mês</h2>
            <p className="text-xs text-muted-foreground">Faturamento, inadimplência e validações por operador</p>
          </div>
          <div className="flex gap-1">
            {monthlyData.map(m => (
              <Button
                key={m.key}
                size="sm"
                variant={monthTab === m.key ? "default" : "outline"}
                className="h-7 px-3 text-xs capitalize"
                onClick={() => setMonthTab(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Resumo do mês selecionado */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <p className="text-lg font-bold text-primary">{fmt(activeMth.total)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Pedidos Pagos</p>
            <p className="text-lg font-bold">{activeMth.count}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Inadimplentes</p>
            <p className="text-lg font-bold text-destructive">{activeMth.inadimplencia}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthCompData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.floor(monthCompData.length / 8)} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Faturamento" fill="#4F8F63" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}