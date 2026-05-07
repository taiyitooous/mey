import React from "react";
import { Users, TrendingUp, Target, Trophy } from "lucide-react";
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

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KPICard icon={Users} label="Vendedores ativos" value={data.length} />
        <KPICard icon={Target} label="Total de leads" value={totalLeads} />
        <KPICard icon={TrendingUp} label="Conversão do time" value={`${teamConversion}%`} color="text-primary" />
      </div>
    );
  }

  return null;
}