import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Phone, TrendingUp, Star, RefreshCw, Users, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import AgentProfileCard from "@/components/avaliacoes/AgentProfileCard";

const C = {
  oficial: "#4F8F63",
  neutro: "#6F7A72",
  bg: "#121815",
  muted: "#17211B",
  border: "#2A342D",
  fg: "#F3F6F2",
  warn: "#C8A94D",
};

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-2" style={{ background: C.bg, borderColor: C.border }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: C.neutro }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color || C.oficial}18` }}>
          <Icon className="w-4 h-4" style={{ color: color || C.oficial }} />
        </div>
      </div>
      <p className="text-3xl font-bold leading-none" style={{ color: C.fg }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: C.neutro }}>{sub}</p>}
    </div>
  );
}

export default function AvaliacaoLigacoes() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: evaluations = [], isFetching, refetch } = useQuery({
    queryKey: ["call_evaluations"],
    queryFn: () => base44.entities.CallEvaluation.list("-created_date", 500),
    refetchInterval: 15000,
  });

  // Agrupar por agente
  const agentGroups = useMemo(() => {
    const map = {};
    // Ignorar registros sem tempo real de fala
    evaluations.filter(ev => (ev.total_speaking_time || ev.speaking_time || 0) > 0).forEach(ev => {
      const name = ev.agent_name || "Desconhecido";
      if (!map[name]) map[name] = [];
      map[name].push(ev);
    });
    // Ordenar agentes pela média de score (maiores primeiro)
    return Object.entries(map)
      .map(([name, evs]) => {
        const done = evs.filter(e => e.evaluation_status === "done");
        const avg = done.length > 0 ? done.reduce((s, e) => s + (e.score || 0), 0) / done.length : -1;
        return { name, evaluations: evs, avg };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [evaluations]);

  // Filter by date range
  const evaluationsByDate = useMemo(() => {
    if (!startDate && !endDate) return evaluations;
    return evaluations.filter(e => {
      const created = e.created_date ? format(new Date(e.created_date), "yyyy-MM-dd") : null;
      if (startDate && created < startDate) return false;
      if (endDate && created > endDate) return false;
      return true;
    });
  }, [evaluations, startDate, endDate]);

  const agentGroupsByDate = useMemo(() => {
    const map = {};
    evaluationsByDate.filter(ev => (ev.total_speaking_time || ev.speaking_time || 0) > 0).forEach(ev => {
      const name = ev.agent_name || "Desconhecido";
      if (!map[name]) map[name] = [];
      map[name].push(ev);
    });
    return Object.entries(map)
      .map(([name, evs]) => {
        const done = evs.filter(e => e.evaluation_status === "done");
        const avg = done.length > 0 ? done.reduce((s, e) => s + (e.score || 0), 0) / done.length : -1;
        return { name, evaluations: evs, avg };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [evaluationsByDate]);

  const filteredGroups = useMemo(() => {
    if (!search) return agentGroupsByDate;
    const q = search.toLowerCase();
    return agentGroupsByDate
      .filter(g => g.name.toLowerCase().includes(q) ||
        g.evaluations.some(e => e.contact_name?.toLowerCase().includes(q) || e.phone?.includes(q)))
      .map(g => ({
        ...g,
        evaluations: g.evaluations.filter(e =>
          g.name.toLowerCase().includes(q) ||
          e.contact_name?.toLowerCase().includes(q) ||
          e.phone?.includes(q)
        )
      }));
  }, [agentGroupsByDate, search]);

  const doneEvals = useMemo(() => evaluationsByDate.filter(e => e.evaluation_status === "done"), [evaluationsByDate]);
  const avgScore = useMemo(() => {
    if (!doneEvals.length) return null;
    return doneEvals.reduce((s, e) => s + (e.score || 0), 0) / doneEvals.length;
  }, [doneEvals]);

  const totalCalls = useMemo(() => evaluationsByDate.reduce((s, e) => s + (e.total_calls || 1), 0), [evaluationsByDate]);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0B0F0D" }}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.fg }}>Avaliação de Ligações IA</h1>
          <p className="text-sm mt-1" style={{ color: C.neutro }}>
            Perfis por vendedor/cobrador com avaliação consolidada por contato
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
          style={{ background: C.muted, borderColor: C.border, color: C.neutro }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} style={{ color: C.oficial }} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Vendedores" value={agentGroupsByDate.length} icon={Users} />
        <KpiCard label="Contatos avaliados" value={evaluationsByDate.length} icon={Phone} />
        <KpiCard label="Total Ligações" value={totalCalls} icon={Phone} color={C.neutro} />
        <KpiCard label="Nota Média Geral" value={avgScore != null ? avgScore.toFixed(1) : "—"} icon={TrendingUp} color={avgScore != null && avgScore >= 7 ? C.oficial : C.warn} sub="de 0 a 10" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex items-center gap-2 text-sm" style={{ color: C.neutro }}>
          <Calendar className="w-4 h-4" />
          <span className="font-semibold">Filtrar por período</span>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: C.neutro }}>Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm h-9"
              style={{ background: C.muted, borderColor: C.border, color: C.fg, border: `1px solid ${C.border}` }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: C.neutro }}>Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm h-9"
              style={{ background: C.muted, borderColor: C.border, color: C.fg, border: `1px solid ${C.border}` }}
            />
          </div>
          {(startDate || endDate) && (
            <div className="flex items-end">
              <button
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="px-3 py-2 rounded-lg text-xs font-semibold h-9"
                style={{ background: `${C.oficial}18`, color: C.oficial, border: `1px solid ${C.oficial}` }}
              >
                Limpar filtro
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar por vendedor, contato ou telefone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm h-9 text-sm"
        style={{ background: C.muted, borderColor: C.border, color: C.fg }}
      />

      {/* Agent profiles */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="rounded-2xl border p-12 text-center" style={{ background: C.bg, borderColor: C.border }}>
            <Phone className="w-10 h-10 mx-auto mb-3" style={{ color: C.neutro }} />
            <p className="text-sm" style={{ color: C.neutro }}>Nenhuma avaliação encontrada</p>
            <p className="text-xs mt-1" style={{ color: "#4A5550" }}>
              As avaliações são criadas automaticamente após ligações atendidas pela 3C Plus
            </p>
          </div>
        ) : (
          filteredGroups.map(g => (
            <AgentProfileCard key={g.name} agentName={g.name} evaluations={g.evaluations} />
          ))
        )}
      </div>
    </div>
  );
}