import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, Clock, TrendingUp, Users, ArrowUpRight, RefreshCw,
  CheckCircle2, AlertCircle, Timer, Minus
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  format, subDays, eachDayOfInterval, eachWeekOfInterval, isToday, differenceInDays,
} from "date-fns";
import ProjectionCalculator from "@/components/dashboard/ProjectionCalculator";
import SkaleSalesPanel from "@/components/dashboard/SkaleSalesPanel";
import { ptBR } from "date-fns/locale";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  oficial:   "#4F8F63",
  validacao: "#C8A94D",
  informado: "#6E9FA3",
  pendente:  "#B97A56",
  reprovado: "#B85C5C",
  neutro:    "#6F7A72",
};

const CARD_BASE  = "rounded-2xl border bg-[#121815] border-[#2A342D] shadow-sm";
const LABEL_SM   = "text-[11px] font-medium tracking-widest uppercase text-[#6F7A72]";
const VALUE_XL   = "text-4xl font-bold text-[#F3F6F2] leading-none mt-2";
const VALUE_LG   = "text-2xl font-bold text-[#F3F6F2] leading-none";
const SUB_TEXT   = "text-sm font-semibold mt-1.5";
const TICK_STYLE = { fontSize: 10, fill: "#6F7A72" };
const GRID_LINE  = "#2A342D";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt    = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtK   = (v) => v >= 1000 ? `R$${Math.round(v / 1000)}k` : `R$${v}`;
const fmtShort = (v) => {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000)      return `R$${Math.round(v / 1000)}k`;
  return `R$${v}`;
};

// ─── Tooltip premium ──────────────────────────────────────────────────────────
const PremiumTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#17211B",
      border: "1px solid #2A342D",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      minWidth: 130,
    }}>
      <p style={{ color: "#A7B0A9", fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#F3F6F2", fontSize: 13, fontWeight: 700 }}>
          {typeof p.value === "number" && p.value > 200 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor, icon: Icon, iconColor, badge, accent }) {
  return (
    <div className={`${CARD_BASE} p-6 flex flex-col justify-between min-h-[130px] relative overflow-hidden group`}>
      {/* subtle accent line top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-70"
        style={{ background: accent || C.oficial }}
      />
      <div className="flex items-start justify-between">
        <p className={LABEL_SM}>{label}</p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${iconColor || C.oficial}18` }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor || C.oficial }} />
        </div>
      </div>
      <div>
        <p className={VALUE_XL}>{value}</p>
        {sub && (
          <p className={SUB_TEXT} style={{ color: subColor || C.oficial }}>{sub}</p>
        )}
        {badge && (
          <p className="text-xs mt-1.5" style={{ color: C.neutro }}>{badge}</p>
        )}
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, right }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-base font-semibold text-[#F3F6F2]">{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: C.neutro }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// ─── Toggle button group ──────────────────────────────────────────────────────
function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "#0B0F0D", border: "1px solid #2A342D" }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
          style={value === o.value
            ? { background: C.oficial, color: "#F3F6F2" }
            : { color: C.neutro }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Top list (ranking) ───────────────────────────────────────────────────────
function TopList({ items }) {
  const max = items[0]?.count || 1;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <span
                className="text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ background: i === 0 ? `${C.oficial}25` : "#2A342D", color: i === 0 ? C.oficial : C.neutro }}
              >
                {i + 1}
              </span>
              <span className="text-sm text-[#F3F6F2] truncate">{item.name}</span>
            </div>
            <span className="text-sm font-bold shrink-0 ml-2" style={{ color: C.oficial }}>{item.count}</span>
          </div>
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "#2A342D" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: i === 0 ? C.oficial : `${C.oficial}60`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DashSkeleton() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className={`${CARD_BASE} p-6 h-[130px]`}>
            <Skeleton className="h-3 w-24 mb-4" style={{ background: "#2A342D" }} />
            <Skeleton className="h-8 w-16" style={{ background: "#2A342D" }} />
          </div>
        ))}
      </div>
      <div className={`${CARD_BASE} p-6 h-64`}>
        <Skeleton className="h-full w-full" style={{ background: "#2A342D" }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [chartMode, setChartMode] = useState("dia");
  const [monthTab, setMonthTab] = useState("current");

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["orders_dash"],
    queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events_payments"],
    queryFn: () => base44.entities.Event.filter({ entity_type: "order" }, "-created_date", 500),
  });

  const paidOrders    = useMemo(() => orders.filter(o => o.payment_status === "paid"), [orders]);
  const pendingOrders = useMemo(() => orders.filter(o => o.logistics_status === "delivered" && o.payment_status !== "paid"), [orders]);

  // KPIs
  const totalInformado = useMemo(() =>
    orders.filter(o => ["attempting","promise","agreement"].includes(o.collection_status) || o.payment_status === "paid").length,
    [orders]);
  const emValidacao    = useMemo(() =>
    orders.filter(o => o.collection_status === "promise" || o.collection_status === "agreement").length,
    [orders]);
  const pagoOficial    = paidOrders.length;
  const pendentes      = pendingOrders.length;

  const totalRevInformado = useMemo(() =>
    orders.filter(o => ["attempting","promise","agreement"].includes(o.collection_status) || o.payment_status === "paid")
      .reduce((s, o) => s + (o.amount || 0), 0), [orders]);
  const totalRevValidacao = useMemo(() =>
    orders.filter(o => o.collection_status === "promise" || o.collection_status === "agreement")
      .reduce((s, o) => s + (o.amount || 0), 0), [orders]);
  const totalRevOficial   = useMemo(() => paidOrders.reduce((s, o) => s + (o.amount || 0), 0), [paidOrders]);

  const ticketMedio       = pagoOficial > 0 ? totalRevOficial / pagoOficial : 0;
  const taxaConversao     = totalInformado > 0 ? Math.round((pagoOficial / totalInformado) * 100 * 10) / 10 : 0;

  const tempoMedioValid = useMemo(() => {
    const valid = paidOrders.filter(o => o.created_date && o.paid_at);
    if (!valid.length) return 0;
    const avg = valid.reduce((s, o) => s + differenceInDays(new Date(o.paid_at), new Date(o.created_date)), 0) / valid.length;
    return Math.round(avg * 10) / 10;
  }, [paidOrders]);

  const vendedoresAtivos = useMemo(() =>
    new Set(events.map(e => e.user_name).filter(Boolean)).size,
    [events]);

  // Gráfico área — pagamentos por dia/hora
  const chartData = useMemo(() => {
    const today = new Date();
    if (chartMode === "dia") {
      const days = eachDayOfInterval({ start: subDays(today, 13), end: today });
      return days.map(d => ({
        label: format(d, "dd/MM", { locale: ptBR }),
        count: paidOrders.filter(o => o.paid_at && format(new Date(o.paid_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd")).length,
      }));
    }
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${h}h`,
      count: paidOrders.filter(o => o.paid_at && isToday(new Date(o.paid_at)) && new Date(o.paid_at).getHours() === h).length,
    }));
  }, [paidOrders, chartMode]);

  // Donut status
  const statusDist = useMemo(() => [
    { name: "Pago Informado", value: totalInformado, color: C.informado },
    { name: "Em Validação",   value: emValidacao,    color: C.validacao },
    { name: "Pago Oficial",   value: pagoOficial,    color: C.oficial   },
  ].filter(d => d.value > 0), [totalInformado, emValidacao, pagoOficial]);

  const statusTotal = statusDist.reduce((s, d) => s + d.value, 0);

  // Barras faturamento 8 dias
  const faturamentoData = useMemo(() => {
    const today = new Date();
    return eachDayOfInterval({ start: subDays(today, 7), end: today }).map(d => ({
      label: format(d, "dd/MM", { locale: ptBR }),
      value: paidOrders.filter(o => o.paid_at && format(new Date(o.paid_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"))
        .reduce((s, o) => s + (o.amount || 0), 0),
    }));
  }, [paidOrders]);

  // Top cobradores / vendedores
  const topCobradores = useMemo(() => {
    const map = {};
    events.filter(e => e.event_type?.startsWith("collection.")).forEach(e => {
      const n = e.user_name || "—"; map[n] = (map[n] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0,5);
  }, [events]);

  const topVendedores = useMemo(() => {
    const map = {};
    paidOrders.forEach(o => {
      const n = o.seller_name || o.customer_name?.split(" ")[0] || "—";
      map[n] = (map[n] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0,5);
  }, [paidOrders]);

  // Faturamento semanal
  const weekData = useMemo(() => {
    const today = new Date();
    return eachWeekOfInterval({ start: subDays(today, 55), end: today }, { weekStartsOn: 0 }).map(w => {
      const weekEnd = new Date(w); weekEnd.setDate(weekEnd.getDate() + 7);
      return {
        label: format(w, "dd/MM", { locale: ptBR }),
        value: paidOrders.filter(o => { if (!o.paid_at) return false; const d = new Date(o.paid_at); return d >= w && d < weekEnd; })
          .reduce((s, o) => s + (o.amount || 0), 0),
      };
    });
  }, [paidOrders]);

  // Comparativo mensal
  const monthlyData = useMemo(() => {
    const now = new Date();
    return [
      { key: "prev2",   label: format(new Date(now.getFullYear(), now.getMonth() - 2, 1), "MMM/yy", { locale: ptBR }) },
      { key: "prev1",   label: format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "MMM/yy", { locale: ptBR }) },
      { key: "current", label: format(now, "MMM/yy", { locale: ptBR }) },
    ].map(m => {
      const offset = m.key === "current" ? 0 : m.key === "prev1" ? -1 : -2;
      const tgt  = (now.getMonth() + offset + 12) % 12;
      const yr   = now.getFullYear() + (now.getMonth() + offset < 0 ? -1 : 0);
      const os   = paidOrders.filter(o => { if (!o.paid_at) return false; const d = new Date(o.paid_at); return d.getMonth() === tgt && d.getFullYear() === yr; });
      const inac = orders.filter(o => { if (!o.delivered_at) return false; const d = new Date(o.delivered_at); return d.getMonth() === tgt && d.getFullYear() === yr && o.payment_status !== "paid"; });
      return { ...m, total: os.reduce((s,o) => s+(o.amount||0),0), count: os.length, inadimplencia: inac.length };
    });
  }, [paidOrders, orders]);

  const activeMth   = monthlyData.find(m => m.key === monthTab) || monthlyData[2];

  const monthCompData = useMemo(() => {
    const now    = new Date();
    const offset = activeMth.key === "current" ? 0 : activeMth.key === "prev1" ? -1 : -2;
    const month  = (now.getMonth() + offset + 12) % 12;
    const yr     = now.getFullYear() + (now.getMonth() + offset < 0 ? -1 : 0);
    const days   = new Date(yr, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(yr, month, i + 1);
      return {
        label: format(d, "dd/MM", { locale: ptBR }),
        value: paidOrders.filter(o => o.paid_at && format(new Date(o.paid_at),"yyyy-MM-dd") === format(d,"yyyy-MM-dd"))
          .reduce((s,o) => s+(o.amount||0), 0),
      };
    });
  }, [paidOrders, activeMth]);

  if (isLoading) return <DashSkeleton />;

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F3F6F2] tracking-tight">Painel de Pagamentos</h1>
          <p className="text-sm mt-1" style={{ color: C.neutro }}>Visão consolidada de cobranças e faturamento</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border"
          style={{ background: "#17211B", borderColor: "#2A342D", color: C.neutro }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} style={{ color: C.oficial }} />
          Atualizar
        </button>
      </div>

      {/* ── KPIs Row 1 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard label="Total Informado" value={totalInformado} sub={fmt(totalRevInformado)} icon={DollarSign} iconColor={C.informado} accent={C.informado} />
        <KpiCard label="Em Validação"    value={emValidacao}    sub={fmt(totalRevValidacao)} icon={Timer}       iconColor={C.validacao} accent={C.validacao} subColor={C.validacao} />
        <KpiCard label="Pago Oficial"    value={pagoOficial}    sub={fmt(totalRevOficial)}   icon={CheckCircle2} iconColor={C.oficial}  accent={C.oficial} />
        <KpiCard label="Pendentes"       value={pendentes}      badge="Aguardando validação" icon={AlertCircle} iconColor={C.pendente}  accent={C.pendente} />
      </div>

      {/* ── KPIs Row 2 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard label="Ticket Médio"       value={fmtShort(ticketMedio)}    icon={TrendingUp}   iconColor={C.informado} accent={C.informado} />
        <KpiCard label="Tempo Médio Valid." value={`${tempoMedioValid}d`}    icon={Clock}        iconColor={C.validacao} accent={C.validacao} />
        <KpiCard label="Taxa de Conversão" value={`${taxaConversao}%`}      badge="Informado → Oficial" icon={ArrowUpRight} iconColor={C.oficial} accent={C.oficial} />
        <KpiCard label="Cobradores Ativos" value={vendedoresAtivos}          icon={Users}        iconColor={C.neutro}    accent={C.neutro} />
      </div>

      {/* ── Area chart — pagamentos por dia ──────────────────────── */}
      <div className={`${CARD_BASE} p-7`}>
        <SectionHeader
          title={`Pagamentos por ${chartMode === "dia" ? "Dia" : "Horário"}`}
          sub="Confirmações de pagamento ao longo do tempo"
          right={
            <ToggleGroup
              options={[{ label: "Por Dia", value: "dia" }, { label: "Por Horário", value: "hora" }]}
              value={chartMode}
              onChange={setChartMode}
            />
          }
        />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={C.oficial} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.oficial} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<PremiumTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              name="Pagamentos"
              stroke={C.oficial}
              strokeWidth={2}
              fill="url(#areaGrad)"
              dot={false}
              activeDot={{ r: 4, fill: C.oficial, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Donut + Barras faturamento ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Distribuição por status */}
        <div className={`${CARD_BASE} p-7`}>
          <SectionHeader title="Distribuição por Status" />
          {statusDist.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: C.neutro }}>Sem dados disponíveis</p>
          ) : (
            <div className="flex items-center gap-8">
              <div className="relative shrink-0">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={statusDist} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                      {statusDist.map((d, i) => <Cell key={i} fill={d.color} strokeWidth={0} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-[#F3F6F2]">{statusTotal}</span>
                  <span className="text-[10px]" style={{ color: C.neutro }}>total</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {statusDist.map((d, i) => {
                  const pct = Math.round((d.value / statusTotal) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-xs text-[#A7B0A9]">{d.name}</span>
                        </div>
                        <span className="text-xs font-bold text-[#F3F6F2]">{d.value} <span className="text-[#6F7A72] font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-[3px] rounded-full" style={{ background: "#2A342D" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Evolução faturamento */}
        <div className={`${CARD_BASE} p-7`}>
          <SectionHeader title="Evolução do Faturamento" sub="Últimos 8 dias" />
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={faturamentoData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barCategoryGap="35%">
              <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip content={<PremiumTooltip />} cursor={{ fill: "#2A342D", radius: 4 }} />
              <Bar dataKey="value" name="Faturamento" fill={C.oficial} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Top cobradores + vendedores ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className={`${CARD_BASE} p-7`}>
          <SectionHeader title="Top Cobradores" sub="Por volume de ações de cobrança" />
          {topCobradores.length === 0
            ? <p className="text-sm text-center py-6" style={{ color: C.neutro }}>Sem dados</p>
            : <TopList items={topCobradores} />}
        </div>

        <div className={`${CARD_BASE} p-7`}>
          <SectionHeader title="Top Vendedores" sub="Por pedidos pagos confirmados" />
          {topVendedores.length === 0
            ? <p className="text-sm text-center py-6" style={{ color: C.neutro }}>Sem dados</p>
            : <TopList items={topVendedores} />}
        </div>
      </div>

      {/* ── Faturamento semanal ───────────────────────────────────── */}
      <div className={`${CARD_BASE} p-7`}>
        <SectionHeader title="Faturamento Validado por Semana" sub="8 semanas anteriores" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barCategoryGap="40%">
            <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtK} />
            <Tooltip content={<PremiumTooltip />} cursor={{ fill: "#2A342D", radius: 4 }} />
            <Bar dataKey="value" name="Faturamento" radius={[6, 6, 0, 0]}>
              {weekData.map((_, i) => (
                <Cell key={i} fill={i === weekData.length - 1 ? C.oficial : `${C.oficial}70`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Vendas Skale ─────────────────────────────────────────── */}
      <SkaleSalesPanel />

      {/* ── Calculadora de Projeção ──────────────────────────────── */}
      <ProjectionCalculator />

      {/* ── Comparativo mês a mês ─────────────────────────────────── */}
      <div className={`${CARD_BASE} p-7`}>
        <SectionHeader
          title="Comparativo Mês a Mês"
          sub="Faturamento, inadimplência e validações"
          right={
            <ToggleGroup
              options={monthlyData.map(m => ({ label: m.label, value: m.key }))}
              value={monthTab}
              onChange={setMonthTab}
            />
          }
        />

        {/* Resumo 3 blocos */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Faturamento",   value: fmt(activeMth.total),      color: C.oficial  },
            { label: "Pedidos Pagos", value: activeMth.count,           color: "#F3F6F2"  },
            { label: "Inadimplentes", value: activeMth.inadimplencia,   color: C.reprovado },
          ].map((b, i) => (
            <div key={i} className="rounded-xl p-4 text-center" style={{ background: "#0B0F0D", border: "1px solid #2A342D" }}>
              <p className="text-[11px] uppercase tracking-widest mb-2" style={{ color: C.neutro }}>{b.label}</p>
              <p className={VALUE_LG} style={{ color: b.color }}>{b.value}</p>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthCompData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barCategoryGap="40%">
            <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} interval={Math.floor(monthCompData.length / 8)} />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={fmtK} />
            <Tooltip content={<PremiumTooltip />} cursor={{ fill: "#2A342D", radius: 4 }} />
            <Bar dataKey="value" name="Faturamento" fill={C.oficial} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}