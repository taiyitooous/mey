import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import HealthCard from "@/components/dashboard/HealthCard";
import AlertsBox from "@/components/dashboard/AlertsBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Truck, Phone, DollarSign, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { differenceInMinutes } from "date-fns";

function DashSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="p-5"><Skeleton className="h-24 w-full" /></Card>
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="p-5"><Skeleton className="h-36 w-full" /></Card>
        ))}
      </div>
    </div>
  );
}

function getStatus(value, goodThreshold, badThreshold, higherIsBetter = true) {
  if (higherIsBetter) {
    if (value >= goodThreshold) return "bom";
    if (value >= badThreshold) return "atencao";
    return "ruim";
  } else {
    if (value <= goodThreshold) return "bom";
    if (value <= badThreshold) return "atencao";
    return "ruim";
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  if (loadingLeads || loadingOrders) return <DashSkeleton />;

  const now = new Date();

  // ---------- LEADS ----------
  const openLeads = leads.filter((l) => l.status === "open");
  const wonLeads = leads.filter((l) => l.status === "won");
  const lostLeads = leads.filter((l) => l.status === "lost");
  const closedLeads = wonLeads.length + lostLeads.length;
  const closeRate = closedLeads > 0 ? Math.round((wonLeads.length / closedLeads) * 100) : 0;

  const stage4 = openLeads.filter((l) => l.stage === 4 || l.stage === 5);
  const stage4Stale = stage4.filter((l) => {
    const ref = l.last_contact_at || l.last_stage_change_at || l.updated_date;
    return ref && differenceInMinutes(now, new Date(ref)) > 30;
  });

  // ---------- ORDERS ----------
  const deliveredOrders = orders.filter((o) => o.logistics_status === "delivered");
  const inTransitOrders = orders.filter((o) => o.logistics_status === "in_transit");
  const failedOrders = orders.filter((o) => o.logistics_status === "failed");
  const pendingPayments = deliveredOrders.filter((o) => o.payment_status !== "paid");
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  // ---------- HEALTH SCORE ----------
  const convScore = closeRate;
  const collectionScore =
    deliveredOrders.length > 0
      ? Math.round((paidOrders.length / deliveredOrders.length) * 100)
      : 100;
  const alertPenalty = stage4Stale.length * 5 + failedOrders.length * 3;
  const healthScore = Math.max(0, Math.min(100, Math.round((convScore + collectionScore) / 2 - alertPenalty)));

  // Stage distribution
  const stageCounts = [1, 2, 3, 4, 5].map(
    (s) => leads.filter((l) => l.stage === s && l.status === "open").length
  );

  // Logistics distribution
  const logisticsMap = [
    { status: "created", label: "Criado" },
    { status: "shipped", label: "Enviado" },
    { status: "in_transit", label: "Em Trânsito" },
    { status: "delivered", label: "Entregue" },
    { status: "failed", label: "Falha" },
    { status: "pickup_waiting", label: "Aguard. Retirada" },
  ];

  return (
    <div className="space-y-6">
      {/* Row 1 — Health cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthCard
          value={healthScore}
          label="Health Score"
          meta="meta: ≥ 70"
          status={getStatus(healthScore, 70, 45)}
          icon={TrendingUp}
        />
        <HealthCard
          value={`${closeRate}%`}
          label="Close Rate"
          meta={`${wonLeads.length} ganhos / ${closedLeads} fechados`}
          status={getStatus(closeRate, 30, 15)}
          icon={Users}
          onAction={() => navigate("/vendas")}
        />
        <HealthCard
          value={stage4Stale.length}
          label="Etapa 4 — críticos"
          meta="+30min sem contato"
          status={getStatus(stage4Stale.length, 0, 2, false)}
          icon={AlertTriangle}
          onAction={() => navigate("/vendas")}
          actionLabel="Ver fila"
        />
        <HealthCard
          value={pendingPayments.length}
          label="Pgtos Pendentes"
          meta="Entregues sem cobrança"
          status={getStatus(pendingPayments.length, 0, 3, false)}
          icon={DollarSign}
          onAction={() => navigate("/cobranca")}
          actionLabel="Ver fila"
        />
      </div>

      {/* Row 2 — Alerts */}
      <AlertsBox leads={leads} orders={orders} />

      {/* Row 3 — Area blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendas */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Vendas
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2" onClick={() => navigate("/vendas")}>
              Ver fila →
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Abertos", value: openLeads.length, cls: "" },
                { label: "Ganhos", value: wonLeads.length, cls: "text-success" },
                { label: "Perdidos", value: lostLeads.length, cls: "text-destructive" },
              ].map((k) => (
                <div key={k.label} className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className={`text-xl font-bold ${k.cls}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
            {/* Mini funnel */}
            <div className="space-y-1.5">
              {["E1", "E2", "E3", "E4", "Final"].map((label, i) => {
                const max = Math.max(...stageCounts, 1);
                const pct = (stageCounts[i] / max) * 100;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-8 shrink-0">{label}</span>
                    <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden relative">
                      <div className="h-full bg-primary/30 transition-all" style={{ width: `${pct}%` }} />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold">{stageCounts[i]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Logística */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Logística
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2" onClick={() => navigate("/logistica")}>
              Ver fila →
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Trânsito", value: inTransitOrders.length, cls: "text-warning" },
                { label: "Entregues", value: deliveredOrders.length, cls: "text-success" },
                { label: "Falhas", value: failedOrders.length, cls: failedOrders.length > 0 ? "text-destructive" : "" },
              ].map((k) => (
                <div key={k.label} className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className={`text-xl font-bold ${k.cls}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              {logisticsMap.map(({ status, label }) => {
                const count = orders.filter((o) => o.logistics_status === status).length;
                if (!count) return null;
                return (
                  <div key={status} className="flex items-center justify-between text-sm py-0.5">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <Badge variant="secondary" className="font-bold text-xs">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cobrança */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" /> Cobrança
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2" onClick={() => navigate("/cobranca")}>
              Ver fila →
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Pendentes", value: pendingPayments.length, cls: pendingPayments.length > 0 ? "text-warning" : "" },
                { label: "Pagos", value: paidOrders.length, cls: "text-success" },
              ].map((k) => (
                <div key={k.label} className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className={`text-xl font-bold ${k.cls}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Receita recebida</p>
              <p className="text-xl font-bold text-success mt-0.5">
                R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            {pendingPayments.length > 0 && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {pendingPayments.length} entregue(s) aguardando cobrança
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}