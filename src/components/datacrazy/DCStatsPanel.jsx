import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Layers, ChevronDown, ChevronRight, Info } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = [
  "#4F8F63", "#3AAFCA", "#E8B84B", "#B85C5C", "#9B79D4",
  "#E87D4B", "#4B8FCA", "#6FA77A", "#C8A94D", "#6E9FA3",
];

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value?.toLocaleString() ?? "—"}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PipelineSection({ pipelineName, stages }) {
  const [open, setOpen] = useState(true);
  const total = stages.reduce((s, r) => s + r.count, 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-semibold text-sm">{pipelineName}</span>
          <Badge variant="secondary" className="text-xs">{total} negócios em andamento</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{stages.length} etapas</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-2">
          {stages.map((stage) => {
            const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
            return (
              <div key={stage.stageId} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: stage.stageColor || "#4F8F63" }}
                />
                <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
                  {stage.stageName}
                </span>
                <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: stage.stageColor || "#4F8F63" }}
                  />
                </div>
                <span className="text-sm font-bold w-8 text-right">{stage.count}</span>
                <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DCStatsPanel() {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["dc_stats"],
    queryFn: async () => {
      const res = await base44.functions.invoke("dataCrazyStats", {});
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 min cache (a função demora ~50s)
  });

  const pipelineGroups = useMemo(() => {
    if (!data?.byStage) return [];
    const map = {};
    data.byStage.forEach((stage) => {
      if (!map[stage.pipelineId]) {
        map[stage.pipelineId] = { pipelineName: stage.pipelineName, stages: [] };
      }
      map[stage.pipelineId].stages.push(stage);
    });
    return Object.values(map).filter((g) => g.stages.some((s) => s.count > 0));
  }, [data]);

  const sellerChart = useMemo(() => {
    if (!data?.bySeller) return [];
    return data.bySeller
      .filter((s) => s.count > 0)
      .slice(0, 10)
      .map((s, i) => ({
        name: s.name.split(" ")[0],
        fullName: s.name,
        Leads: s.count,
        color: COLORS[i % COLORS.length],
      }));
  }, [data]);

  const totalBusinesses = useMemo(() => {
    if (!data?.byStage) return 0;
    return data.byStage.reduce((s, r) => s + r.count, 0);
  }, [data]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-lg">Funil & Atendentes — DataCrazy</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Dados consultados diretamente via API do DataCrazy</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Carregando (~50s)..." : "Atualizar"}
        </Button>
      </div>

      {/* Aviso sobre limitações da API */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border px-4 py-3 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          A API do DataCrazy não suporta filtro por data nos endpoints de leads. Os dados exibidos são o estado atual do CRM (histórico completo). Negócios no funil refletem apenas os que estão <strong className="text-foreground">em andamento</strong>.
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao buscar dados: {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Layers} label="Total de leads (histórico)" value={data.totalLeads} sub="Todos os leads cadastrados" />
            <StatCard icon={Layers} label="Negócios em andamento" value={totalBusinesses} sub="Apenas os ativos no funil" />
            <StatCard icon={Users} label="Atendentes com leads" value={data.bySeller?.filter((s) => s.count > 0).length} />
          </div>

          {/* Gráfico por atendente */}
          {sellerChart.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="font-semibold text-sm">Leads por atendente (top 10, histórico)</h3>
              <ResponsiveContainer width="100%" height={Math.max(180, sellerChart.length * 32)}>
                <BarChart data={sellerChart} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip
                    formatter={(v, _, props) => [v, props?.payload?.fullName || "Leads"]}
                    contentStyle={{ background: "hsl(150 14% 9%)", border: "1px solid hsl(142 11% 18%)", borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: "hsl(142 11% 18%)" }}
                  />
                  <Bar dataKey="Leads" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}>
                    {sellerChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Funil por etapa */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Negócios em andamento por etapa do funil</h3>
            {pipelineGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum negócio ativo encontrado</p>
            ) : (
              pipelineGroups.map((group) => (
                <PipelineSection
                  key={group.pipelineName}
                  pipelineName={group.pipelineName}
                  stages={group.stages}
                />
              ))
            )}
          </div>

          {/* Tabela de atendentes */}
          {data.bySeller?.some((s) => s.count > 0) && (
            <Card className="p-5 space-y-3">
              <h3 className="font-semibold text-sm">Todos os atendentes (histórico de leads)</h3>
              <div className="space-y-1.5">
                {data.bySeller.filter((s) => s.count > 0).map((seller, i) => (
                  <div key={seller.attendantId} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                    <span className="flex-1 text-sm truncate">{seller.name}</span>
                    <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${data.bySeller.filter(s => s.count > 0)[0]?.count > 0 ? (seller.count / data.bySeller.filter(s => s.count > 0)[0].count) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold w-14 text-right">{seller.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}