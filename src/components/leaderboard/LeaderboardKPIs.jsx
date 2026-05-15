import React from "react";
import { Users, TrendingUp, Target, ShoppingBag } from "lucide-react";

function KPICard({ icon: Icon, label, value, gradient, iconColor, accentColor }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex items-center gap-4 border"
      style={{
        background: gradient,
        borderColor: accentColor + "40",
        boxShadow: `0 0 24px ${accentColor}18`,
      }}
    >
      {/* background glow blob */}
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accentColor }}
      />
      <div
        className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accentColor + "22", border: `1.5px solid ${accentColor}55` }}
      >
        <Icon className="w-5 h-5" style={{ color: accentColor }} />
      </div>
      <div className="relative z-10">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-extrabold text-foreground mt-0.5 leading-none">{value}</p>
      </div>
    </div>
  );
}

export default function LeaderboardKPIs({ data, type }) {
  if (type === "sales") {
    const totalLeads = data.reduce((s, r) => s + r.leads, 0);
    const totalWins = data.reduce((s, r) => s + r.wins, 0);
    const teamConversion = totalLeads > 0 ? ((totalWins / totalLeads) * 100).toFixed(1) : "0.0";

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="Vendedores ativos"
          value={data.length}
          gradient="linear-gradient(135deg, hsl(142 29% 43% / 0.12), hsl(142 29% 43% / 0.04))"
          accentColor="#4F8F63"
        />
        <KPICard
          icon={ShoppingBag}
          label="Total de vendas"
          value={totalWins.toLocaleString("pt-BR")}
          gradient="linear-gradient(135deg, hsl(142 29% 43% / 0.12), hsl(142 29% 43% / 0.04))"
          accentColor="#4F8F63"
        />
        <KPICard
          icon={Target}
          label="Total de leads"
          value={totalLeads.toLocaleString("pt-BR")}
          gradient="linear-gradient(135deg, hsl(186 60% 50% / 0.12), hsl(186 60% 50% / 0.04))"
          accentColor="#3AAFCA"
        />
        <KPICard
          icon={TrendingUp}
          label="Conversão do time"
          value={`${teamConversion}%`}
          gradient="linear-gradient(135deg, hsl(43 80% 54% / 0.12), hsl(43 80% 54% / 0.04))"
          accentColor="#E8B84B"
        />
      </div>
    );
  }

  return null;
}