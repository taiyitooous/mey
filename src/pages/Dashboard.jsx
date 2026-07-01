import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, DollarSign, RefreshCw, Download, Truck, CalendarCheck, Package } from "lucide-react";
import { format } from "date-fns";

const getTodayBRDateString = () => {
  const todayUTC = new Date();
  const todayBR = new Date(todayUTC.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  todayBR.setHours(0, 0, 0, 0);
  return format(todayBR, 'yyyy-MM-dd');
};
import ProjectionCalculator from "@/components/dashboard/ProjectionCalculator";
import SkaleSalesPanel from "@/components/dashboard/SkaleSalesPanel";
import ConversaoPanel from "@/components/dashboard/ConversaoPanel";
import SellerMonthSummary from "@/components/dashboard/SellerMonthSummary";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  oficial:  "#4F8F63",
  pendente: "#B97A56",
  neutro:   "#6F7A72",
};

const CARD_BASE = "rounded-2xl border bg-[#121815] border-[#2A342D] shadow-sm";
const LABEL_SM  = "text-[11px] font-medium tracking-widest uppercase text-[#6F7A72]";
const VALUE_XL  = "text-4xl font-bold text-[#F3F6F2] leading-none mt-2";
const SUB_TEXT  = "text-sm font-semibold mt-1.5";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor, icon: Icon, iconColor, accent }) {
  return (
    <div className={`${CARD_BASE} p-6 flex flex-col justify-between min-h-[140px] relative overflow-hidden`}>
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: accent || C.oficial }} />
      <div className="flex items-start justify-between">
        <p className={LABEL_SM}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${iconColor || C.oficial}18` }}>
          <Icon className="w-4 h-4" style={{ color: iconColor || C.oficial }} />
        </div>
      </div>
      <div>
        <p className={VALUE_XL}>{value}</p>
        {sub && <p className={SUB_TEXT} style={{ color: subColor || C.oficial }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DashSkeleton() {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 gap-5">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className={`${CARD_BASE} p-6 h-[140px]`}>
            <Skeleton className="h-3 w-24 mb-4" style={{ background: "#2A342D" }} />
            <Skeleton className="h-8 w-16" style={{ background: "#2A342D" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["orders_dash"],
    queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });

  const todayStr = getTodayBRDateString();

  // Apenas pedidos entregues
  const deliveredOrders = useMemo(() => orders.filter(o => o.logistics_status === "delivered"), [orders]);
  const paidOrders    = useMemo(() => deliveredOrders.filter(o => o.payment_status === "paid"), [deliveredOrders]);
  const unpaidOrders  = useMemo(() => deliveredOrders.filter(o => o.payment_status !== "paid"), [deliveredOrders]);

  const totalPaid     = paidOrders.length;
  const totalUnpaid   = unpaidOrders.length;
  const revPaid       = useMemo(() => paidOrders.reduce((s, o) => s + (o.amount || 0), 0), [paidOrders]);
  const revUnpaid     = useMemo(() => unpaidOrders.reduce((s, o) => s + (o.amount || 0), 0), [unpaidOrders]);

  // Hoje (apenas pela data real de entrega/pagamento usando timezone BR)
  const todayDelivered = useMemo(() => orders.filter(o => {
    if (o.logistics_status !== "delivered" || !o.delivered_at) return false;
    const dUTC = new Date(o.delivered_at);
    const dBR = new Date(dUTC.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return format(dBR, "yyyy-MM-dd") === todayStr;
  }), [orders, todayStr]);

  const todayPaid = useMemo(() => orders.filter(o => {
    if (o.payment_status !== "paid" || !o.paid_at) return false;
    const pUTC = new Date(o.paid_at);
    const pBR = new Date(pUTC.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return format(pBR, "yyyy-MM-dd") === todayStr;
  }), [orders, todayStr]);

  const todayRevPaid = useMemo(() => todayPaid.reduce((s, o) => s + (o.amount || 0), 0), [todayPaid]);

  const todayUnpaid = useMemo(() => todayDelivered.filter(o => o.payment_status !== "paid"), [todayDelivered]);
  const todayRevUnpaid = useMemo(() => todayUnpaid.reduce((s, o) => s + (o.amount || 0), 0), [todayUnpaid]);

  const exportCSV = (ordersList, filename) => {
    const header = "Nome,Telefone,Cidade,Estado,Valor,Status Pagamento";
    const rows = ordersList.map(o =>
      `"${o.customer_name || ""}","${o.customer_phone || ""}","${o.city || ""}","${o.state || ""}","${(o.amount || 0).toFixed(2)}","${o.payment_status || ""}"`
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <DashSkeleton />;

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F3F6F2] tracking-tight">Painel de Pagamentos</h1>
          <p className="text-sm mt-1" style={{ color: C.neutro }}>Visão consolidada de cobranças</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(unpaidOrders, "clientes_em_aberto.csv")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border"
            style={{ background: "#17211B", borderColor: "#2A342D", color: C.neutro }}
            title="Exportar clientes em aberto"
          >
            <Download className="w-3.5 h-3.5" style={{ color: C.pendente }} />
            Em Aberto
          </button>
          <button
            onClick={() => exportCSV(paidOrders, "clientes_pagos.csv")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border"
            style={{ background: "#17211B", borderColor: "#2A342D", color: C.neutro }}
            title="Exportar clientes pagos"
          >
            <Download className="w-3.5 h-3.5" style={{ color: C.oficial }} />
            Pagos
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border"
            style={{ background: "#17211B", borderColor: "#2A342D", color: C.neutro }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} style={{ color: C.oficial }} />
            Atualizar
          </button>
        </div>
      </div>

      {/* KPIs de Hoje */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.neutro }}>Hoje</p>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            label="Entregues Hoje"
            value={todayDelivered.length}
            sub={`${todayPaid.length} pagos · ${todayUnpaid.length} em aberto`}
            subColor={C.neutro}
            icon={Truck}
            iconColor="#6E9FA3"
            accent="#6E9FA3"
          />
          <KpiCard
            label="Entregues · Aguardando Pgto"
            value={todayUnpaid.length}
            sub={fmt(todayRevUnpaid)}
            subColor={C.pendente}
            icon={Clock}
            iconColor={C.pendente}
            accent={C.pendente}
          />
          <KpiCard
            label="Pagamentos Hoje"
            value={todayPaid.length}
            sub={fmt(todayRevPaid)}
            subColor={C.oficial}
            icon={CalendarCheck}
            iconColor={C.oficial}
            accent={C.oficial}
          />
        </div>
      </div>

      {/* KPIs Geral */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.neutro }}>Acumulado</p>
        <div className="grid grid-cols-2 gap-5">
        <KpiCard
          label="Total Entregues"
          value={deliveredOrders.length}
          sub={`${totalPaid} pagos · ${totalUnpaid} em aberto`}
          subColor={C.neutro}
          icon={Package}
          iconColor="#6E9FA3"
          accent="#6E9FA3"
        />
        <KpiCard
          label="Valor Total Entregue"
          value={fmt(revPaid + revUnpaid)}
          sub={`${fmt(revPaid)} recebido`}
          subColor={C.oficial}
          icon={DollarSign}
          iconColor="#6E9FA3"
          accent="#6E9FA3"
        />
        <KpiCard
          label="Entregues · Aguardando Pgto"
          value={totalUnpaid}
          sub={fmt(revUnpaid)}
          subColor={C.pendente}
          icon={Clock}
          iconColor={C.pendente}
          accent={C.pendente}
        />
        <KpiCard
          label="Valor em Aberto"
          value={fmt(revUnpaid)}
          sub={`${totalUnpaid} clientes`}
          subColor={C.pendente}
          icon={DollarSign}
          iconColor={C.pendente}
          accent={C.pendente}
        />
        <KpiCard
          label="Entregues · Já Pagaram"
          value={totalPaid}
          sub={fmt(revPaid)}
          subColor={C.oficial}
          icon={CheckCircle2}
          iconColor={C.oficial}
          accent={C.oficial}
        />
        <KpiCard
          label="Valor Recebido"
          value={fmt(revPaid)}
          sub={`${totalPaid} clientes`}
          subColor={C.oficial}
          icon={DollarSign}
          iconColor={C.oficial}
          accent={C.oficial}
        />
        </div>
      </div>

      {/* Resumo por Vendedor - Junho */}
      <SellerMonthSummary />

      {/* Conversão de Pedidos */}
      <ConversaoPanel />

      {/* Vendas Skale */}
      <SkaleSalesPanel />

      {/* Calculadora de Projeção */}
      <ProjectionCalculator />

    </div>
  );
}