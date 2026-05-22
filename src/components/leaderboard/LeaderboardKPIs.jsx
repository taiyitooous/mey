import React from "react";
import { Users, TrendingUp, Target, ShoppingBag } from "lucide-react";

function KPICard({ icon: Icon, label, value, accentColor, index }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 border flex items-center gap-4"
      style={{
        background: `linear-gradient(135deg, ${accentColor}14 0%, ${accentColor}05 100%)`,
        borderColor: `${accentColor}25`,
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        style={{ background: `${accentColor}22` }}
      />
      {/* Thin top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }}
      />

      <div
        className="relative z-10 w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40` }}
      >
        <Icon className="w-5 h-5" style={{ color: accentColor }} />
      </div>

      <div className="relative z-10 min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-extrabold text-foreground mt-0.5 leading-none tabular-nums">{value}</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard icon={Users}       label="Vendedores ativos"   value={data.length}                          accentColor="#4F8F63" />
        <KPICard icon={ShoppingBag} label="Total de vendas"     value={totalWins.toLocaleString("pt-BR")}   accentColor="#4F8F63" />
        <KPICard icon={Target}      label="Total de leads"      value={totalLeads.toLocaleString("pt-BR")}  accentColor="#3AAFCA" />
        <KPICard icon={TrendingUp}  label="Conversão do time"   value={`${teamConversion}%`}                accentColor="#E8B84B" />
      </div>
    );
  }

  return null;
}