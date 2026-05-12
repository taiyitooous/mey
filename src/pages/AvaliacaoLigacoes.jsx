import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Phone, TrendingUp, Star, RefreshCw, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import CallEvaluationCard from "@/components/avaliacoes/CallEvaluationCard";
import ScoreRing from "@/components/avaliacoes/ScoreRing";

const C = {
  oficial: "#4F8F63",
  neutro: "#6F7A72",
  bg: "#121815",
  muted: "#17211B",
  border: "#2A342D",
  fg: "#F3F6F2",
  dimmed: "#A7B0A9",
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
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
  const queryClient = useQueryClient();

  const { data: evaluations = [], isFetching, refetch } = useQuery({
    queryKey: ["call_evaluations"],
    queryFn: () => base44.entities.CallEvaluation.list("-created_date", 200),
    refetchInterval: 15000, // auto-refresh a cada 15s para pegar avaliações concluídas
  });

  const doneEvals = useMemo(() => evaluations.filter(e => e.evaluation_status === "done"), [evaluations]);
  const avgScore = useMemo(() => {
    if (!doneEvals.length) return null;
    return doneEvals.reduce((s, e) => s + (e.score || 0), 0) / doneEvals.length;
  }, [doneEvals]);

  const agents = useMemo(() => {
    const names = [...new Set(evaluations.map(e => e.agent_name).filter(Boolean))].sort();
    return names;
  }, [evaluations]);

  const agentRanking = useMemo(() => {
    const map = {};
    doneEvals.forEach(e => {
      if (!map[e.agent_name]) map[e.agent_name] = { name: e.agent_name, total: 0, count: 0 };
      map[e.agent_name].total += e.score || 0;
      map[e.agent_name].count++;
    });
    return Object.values(map)
      .map(a => ({ ...a, avg: a.total / a.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [doneEvals]);

  const filtered = useMemo(() => {
    return evaluations.filter(e => {
      const matchSearch = !search || e.agent_name?.toLowerCase().includes(search.toLowerCase()) || e.contact_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || e.evaluation_status === filterStatus;
      const matchAgent = filterAgent === "all" || e.agent_name === filterAgent;
      return matchSearch && matchStatus && matchAgent;
    });
  }, [evaluations, search, filterStatus, filterAgent]);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0B0F0D" }}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.fg }}>Avaliação de Ligações IA</h1>
          <p className="text-sm mt-1" style={{ color: C.neutro }}>
            Análise automática via IA após cada ligação atendida pela 3C Plus
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
        <KpiCard label="Total Ligações" value={evaluations.length} icon={Phone} />
        <KpiCard label="Avaliadas" value={doneEvals.length} icon={Star} color={C.oficial} sub={`${evaluations.length > 0 ? Math.round((doneEvals.length / evaluations.length) * 100) : 0}% do total`} />
        <KpiCard label="Nota Média Geral" value={avgScore != null ? avgScore.toFixed(1) : "—"} icon={TrendingUp} color={avgScore >= 7 ? C.oficial : C.warn} sub="de 0 a 10" />
        <KpiCard label="Aguardando" value={evaluations.filter(e => e.evaluation_status === "pending").length} icon={Filter} color={C.warn} />
      </div>

      {/* Ranking de agentes */}
      {agentRanking.length > 0 && (
        <div className="rounded-2xl border p-6" style={{ background: C.bg, borderColor: C.border }}>
          <p className="text-sm font-semibold mb-5" style={{ color: C.fg }}>Ranking por Nota Média</p>
          <div className="flex items-end justify-around gap-4 flex-wrap">
            {agentRanking.map((agent, i) => (
              <div key={agent.name} className="flex flex-col items-center gap-2">
                <ScoreRing score={agent.avg} size={i === 0 ? 80 : 64} />
                <div className="text-center">
                  <p className="text-xs font-semibold" style={{ color: C.fg }}>{agent.name}</p>
                  <p className="text-[10px]" style={{ color: C.neutro }}>{agent.count} avaliação{agent.count !== 1 ? "ões" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Buscar por vendedor ou contato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9 text-sm"
          style={{ background: C.muted, borderColor: C.border, color: C.fg }}
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9 text-sm" style={{ background: C.muted, borderColor: C.border }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="done">Avaliados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAgent} onValueChange={setFilterAgent}>
          <SelectTrigger className="w-44 h-9 text-sm" style={{ background: C.muted, borderColor: C.border }}>
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os vendedores</SelectItem>
            {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs ml-auto" style={{ color: C.neutro }}>{filtered.length} ligação{filtered.length !== 1 ? "ões" : ""}</p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border p-12 text-center" style={{ background: C.bg, borderColor: C.border }}>
            <Phone className="w-10 h-10 mx-auto mb-3" style={{ color: C.neutro }} />
            <p className="text-sm" style={{ color: C.neutro }}>Nenhuma avaliação encontrada</p>
            <p className="text-xs mt-1" style={{ color: "#4A5550" }}>
              As avaliações são criadas automaticamente após ligações atendidas pela 3C Plus
            </p>
          </div>
        ) : (
          filtered.map(ev => <CallEvaluationCard key={ev.id} evaluation={ev} />)
        )}
      </div>
    </div>
  );
}