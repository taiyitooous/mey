import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Trophy, Users, TrendingUp, Target, DollarSign, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-0.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill || p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function KPICard({ icon: Icon, label, value, sub, color = "text-primary" }) {
  return (
    <Card className="p-4 bg-card border-border flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </Card>
  );
}

function TeamCard({ team, stats, sellers, expanded, onToggle }) {
  const color = team.color || "#4F8F63";
  const topSellers = [...sellers].sort((a, b) => b.wins - a.wins).slice(0, 5);

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Team Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={onToggle}
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: color }}>
            {team.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-foreground">{team.name}</h3>
            <p className="text-xs text-muted-foreground">Líder: {team.leader_name} • {sellers.length} vendedor{sellers.length !== 1 ? "es" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 mr-4">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{stats.leads}</p>
            <p className="text-[10px] text-muted-foreground">Leads</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{stats.wins}</p>
            <p className="text-[10px] text-muted-foreground">Vendas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color }}>{stats.conversion}%</p>
            <p className="text-[10px] text-muted-foreground">Conversão</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-lg font-bold text-foreground">R$ {stats.revenue.toLocaleString("pt-BR")}</p>
            <p className="text-[10px] text-muted-foreground">Faturamento</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard icon={Users} label="Total de Leads" value={stats.leads} />
            <KPICard icon={Target} label="Agendamentos" value={stats.scheduled} />
            <KPICard icon={Trophy} label="Vendas" value={stats.wins} />
            <KPICard icon={TrendingUp} label="Conversão" value={`${stats.conversion}%`} />
            <KPICard icon={DollarSign} label="Faturamento" value={`R$ ${stats.revenue.toLocaleString("pt-BR")}`} />
            <KPICard icon={DollarSign} label="Ticket Médio" value={stats.wins > 0 ? `R$ ${(stats.revenue / stats.wins).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"} />
            <KPICard icon={BarChart2} label="Taxa de Agend." value={stats.leads > 0 ? `${((stats.scheduled / stats.leads) * 100).toFixed(1)}%` : "0%"} />
          </div>

          {/* Ranking interno */}
          {topSellers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ranking interno</p>
              <div className="space-y-1.5">
                {topSellers.map((s, idx) => (
                  <div key={s.name} className="flex items-center gap-3 bg-muted/10 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold w-5 text-muted-foreground">{idx + 1}º</span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: color }}>
                      {s.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.leads} leads</span>
                    <span className="text-xs font-semibold text-foreground w-16 text-right">{s.wins} vendas</span>
                    <span className="text-xs font-bold w-12 text-right" style={{ color }}>{s.conversion}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function TeamView({ filteredSaleRecords, filteredLeadCounts }) {
  const [expandedTeam, setExpandedTeam] = useState(null);

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => base44.entities.Team.list("name", 50),
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers"],
    queryFn: () => base44.entities.Seller.list("name", 200),
  });

  // Build per-seller stats from filtered records
  const sellerStats = useMemo(() => {
    const map = {};
    const key = (name) => name?.trim().toLowerCase() || "";
    const displayNames = {};

    const ensure = (name) => {
      const k = key(name);
      if (!map[k]) {
        map[k] = { leads: 0, wins: 0, revenue: 0, scheduled: 0 };
        displayNames[k] = name.trim();
      }
    };

    filteredSaleRecords.forEach((r) => {
      if (!r.seller_name || r.type === "exit") return;
      ensure(r.seller_name);
      map[key(r.seller_name)].wins++;
      map[key(r.seller_name)].revenue += r.total || 0;
    });

    filteredLeadCounts.forEach((r) => {
      if (!r.seller_name) return;
      ensure(r.seller_name);
      map[key(r.seller_name)].leads += r.lead_count || 0;
    });

    return Object.entries(map).map(([k, s]) => ({
      key: k,
      name: displayNames[k],
      ...s,
      conversion: s.leads > 0 ? ((s.wins / s.leads) * 100).toFixed(1) : "0.0",
    }));
  }, [filteredSaleRecords, filteredLeadCounts]);

  // Match seller stats to registered sellers by name
  const matchSeller = (sellerName) => {
    const k = sellerName?.trim().toLowerCase() || "";
    return sellerStats.find((s) => s.key === k) || { leads: 0, wins: 0, revenue: 0, scheduled: 0, conversion: "0.0" };
  };

  // Build team stats
  const teamData = useMemo(() => {
    return teams.map((team) => {
      const teamSellers = sellers.filter((s) => s.team_id === team.id);
      const sellersWithStats = teamSellers.map((s) => ({ ...s, ...matchSeller(s.name) }));

      const totals = sellersWithStats.reduce((acc, s) => ({
        leads: acc.leads + (s.leads || 0),
        wins: acc.wins + (s.wins || 0),
        revenue: acc.revenue + (s.revenue || 0),
        scheduled: acc.scheduled + (s.scheduled || 0),
      }), { leads: 0, wins: 0, revenue: 0, scheduled: 0 });

      const conversion = totals.leads > 0 ? ((totals.wins / totals.leads) * 100).toFixed(1) : "0.0";

      return { team, sellers: sellersWithStats, stats: { ...totals, conversion } };
    });
  }, [teams, sellers, sellerStats]);

  // Comparison chart data
  const comparisonData = teamData.map(({ team, stats }) => ({
    name: team.name,
    Leads: stats.leads,
    Vendas: stats.wins,
    "Conversão %": parseFloat(stats.conversion),
    color: team.color || "#4F8F63",
  }));

  const toggleTeam = (id) => setExpandedTeam(expandedTeam === id ? null : id);

  if (teams.length === 0) {
    return (
      <Card className="p-12 bg-card border-border text-center">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-foreground font-semibold mb-1">Nenhuma equipe criada ainda</p>
        <p className="text-sm text-muted-foreground">Clique em "Equipes" para criar equipes e vincular vendedores.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Chart */}
      {comparisonData.length >= 2 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Comparativo entre equipes</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 bg-card border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-4">Leads × Vendas por equipe</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparisonData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Leads" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Vendas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4 bg-card border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-4">Taxa de Conversão % por equipe</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparisonData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Conversão %" radius={[3, 3, 0, 0]}>
                    {comparisonData.map((entry, idx) => (
                      <rect key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* Team podium ranking */}
      {teamData.length >= 2 && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ranking de equipes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...teamData].sort((a, b) => parseFloat(b.stats.conversion) - parseFloat(a.stats.conversion)).map(({ team, stats }, idx) => (
              <Card key={team.id} className="p-4 bg-card border-border" style={{ borderTop: `3px solid ${team.color || "#4F8F63"}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-black text-muted-foreground/30">{idx + 1}º</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.leader_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-base font-bold text-foreground">{stats.leads}</p>
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">{stats.wins}</p>
                    <p className="text-[10px] text-muted-foreground">Vendas</p>
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: team.color || "#4F8F63" }}>{stats.conversion}%</p>
                    <p className="text-[10px] text-muted-foreground">Conversão</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Individual team cards */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Detalhes por equipe</p>
        <div className="space-y-3">
          {teamData.map(({ team, sellers: ts, stats }) => (
            <TeamCard
              key={team.id}
              team={team}
              stats={stats}
              sellers={ts}
              expanded={expandedTeam === team.id}
              onToggle={() => toggleTeam(team.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}