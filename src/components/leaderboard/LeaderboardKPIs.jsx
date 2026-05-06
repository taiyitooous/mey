import React from "react";
import { Users, TrendingUp, PhoneCall, Target, DollarSign, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

function KPICard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <Card className="p-4 flex items-center gap-4 bg-card border-border">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

export default function LeaderboardKPIs({ data, type }) {
  if (type === "sales") {
    const totalLeads = data.reduce((s, r) => s + r.leads, 0);
    const totalWins = data.reduce((s, r) => s + r.wins, 0);
    const teamConversion = totalLeads > 0 ? ((totalWins / totalLeads) * 100).toFixed(1) : "0.0";
    const totalCalls = data.reduce((s, r) => s + r.calls, 0);

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Membros ativos" value={data.length} />
        <KPICard icon={Target} label="Total de leads" value={totalLeads} />
        <KPICard icon={TrendingUp} label="Conversão do time" value={`${teamConversion}%`} color="text-primary" />
        <KPICard icon={PhoneCall} label="Total de ligações" value={totalCalls} />
      </div>
    );
  }

  if (type === "collection") {
    const totalOrders = data.reduce((s, r) => s + r.orders, 0);
    const totalPayments = data.reduce((s, r) => s + r.payments, 0);
    const teamRate = totalOrders > 0 ? ((totalPayments / totalOrders) * 100).toFixed(1) : "0.0";
    const totalAttempts = data.reduce((s, r) => s + r.attempts, 0);

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Membros ativos" value={data.length} />
        <KPICard icon={DollarSign} label="Pedidos trabalhados" value={totalOrders} />
        <KPICard icon={CheckCircle2} label="Taxa de pagamento" value={`${teamRate}%`} color="text-primary" />
        <KPICard icon={PhoneCall} label="Tentativas de contato" value={totalAttempts} />
      </div>
    );
  }

  return null;
}