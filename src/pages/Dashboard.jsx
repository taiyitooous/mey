import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, Phone, DollarSign, TrendingUp, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function DashSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="p-5"><Skeleton className="h-16 w-full" /></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5"><Skeleton className="h-48 w-full" /></Card>
        <Card className="p-5"><Skeleton className="h-48 w-full" /></Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  if (loadingLeads || loadingOrders) return <DashSkeleton />;

  const openLeads = leads.filter((l) => l.status === "open").length;
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const lostLeads = leads.filter((l) => l.status === "lost").length;
  const totalLeads = leads.length;

  const deliveredOrders = orders.filter((o) => o.logistics_status === "delivered");
  const inTransitOrders = orders.filter((o) => o.logistics_status === "in_transit").length;
  const failedOrders = orders.filter((o) => o.logistics_status === "failed").length;
  const paidOrders = orders.filter((o) => o.payment_status === "paid").length;
  const pendingPayments = deliveredOrders.filter((o) => o.payment_status === "pending").length;

  const totalRevenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  // Stage distribution
  const stageCounts = [1, 2, 3, 4, 5].map(
    (s) => leads.filter((l) => l.stage === s && l.status === "open").length
  );

  // Logistics distribution
  const logisticsStatuses = ["created", "shipped", "in_transit", "delivered", "failed", "pickup_waiting"];
  const logisticsLabels = ["Criado", "Enviado", "Em Trânsito", "Entregue", "Falha", "Aguard. Retirada"];
  const logisticsCounts = logisticsStatuses.map(
    (s) => orders.filter((o) => o.logistics_status === s).length
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema MEY</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Leads" value={totalLeads} icon={Users} color="primary" trend={`${openLeads} abertos`} />
        <StatCard label="Leads Ganhos" value={wonLeads} icon={TrendingUp} color="success" trend={totalLeads > 0 ? `${((wonLeads / totalLeads) * 100).toFixed(0)}% conversão` : "0%"} />
        <StatCard label="Pedidos em Trânsito" value={inTransitOrders} icon={Truck} color="warning" />
        <StatCard label="Receita Recebida" value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} color="success" trend={`${paidOrders} pedidos pagos`} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leads Perdidos" value={lostLeads} icon={AlertTriangle} color="destructive" />
        <StatCard label="Entregues" value={deliveredOrders.length} icon={CheckCircle2} color="success" />
        <StatCard label="Falhas de Entrega" value={failedOrders} icon={Package} color="destructive" />
        <StatCard label="Pgtos Pendentes" value={pendingPayments} icon={Phone} color="warning" trend="Após entrega" />
      </div>

      {/* Funnel + Logistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Funil de Vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Etapa 1", "Etapa 2", "Etapa 3", "Etapa 4", "Final"].map((label, i) => {
              const max = Math.max(...stageCounts, 1);
              const pct = (stageCounts[i] / max) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                  <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-primary/20 rounded-lg transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-sm font-semibold text-foreground">
                      {stageCounts[i]}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Logistics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Status Logístico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {logisticsLabels.map((label, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Badge variant="secondary" className="font-bold">
                    {logisticsCounts[i]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}