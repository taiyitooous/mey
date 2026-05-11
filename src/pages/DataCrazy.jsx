import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Database, Copy, Check, RefreshCw, Search, Users, TrendingUp } from "lucide-react";
import DCStatsPanel from "@/components/datacrazy/DCStatsPanel";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

const DATACRAZY_WEBHOOK_URL = `${appParams.appBaseUrl || 'https://api.base44.com'}/api/apps/${appParams.appId}/functions/dataCrazyWebhook`;

function CopyableUrl({ url }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
      <code className="text-xs text-foreground flex-1 break-all font-mono">{url}</code>
      <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function DataCrazy() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads_datacrazy"],
    queryFn: () => base44.entities.Lead.filter({ source: "datacrazy" }, "-created_date", 200),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events_datacrazy"],
    queryFn: () => base44.entities.Event.filter({ source: "datacrazy" }, "-created_date", 50),
  });

  // Real-time subscriptions para atualizar quando webhook receber dados
  useEffect(() => {
    const unsubscribeLead = base44.entities.Lead.subscribe((event) => {
      if (event.data?.source === "datacrazy") {
        queryClient.invalidateQueries({ queryKey: ["leads_datacrazy"] });
      }
    });

    const unsubscribeEvent = base44.entities.Event.subscribe((event) => {
      if (event.data?.source === "datacrazy") {
        queryClient.invalidateQueries({ queryKey: ["events_datacrazy"] });
      }
    });

    return () => {
      unsubscribeLead();
      unsubscribeEvent();
    };
  }, [queryClient]);

  const filtered = leads.filter((l) =>
    !search ||
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search) ||
    l.source_campaign?.toLowerCase().includes(search.toLowerCase())
  );

  const recentEvents = events.slice(0, 10);

  // --- Stats ---
  const todayLeads = useMemo(() =>
    leads.filter((l) => l.created_date && isToday(new Date(l.created_date))).length,
    [leads]
  );

  const stageData = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    leads.forEach((l) => { const s = l.stage || 1; if (counts[s] !== undefined) counts[s]++; });
    return [
      { name: "Etapa 1", value: counts[1], color: "#4F8F63" },
      { name: "Etapa 2", value: counts[2], color: "#6FA77A" },
      { name: "Etapa 3", value: counts[3], color: "#C8A94D" },
      { name: "Etapa 4", value: counts[4], color: "#6E9FA3" },
      { name: "Final",   value: counts[5], color: "#A7B0A9" },
    ].filter((d) => d.value > 0);
  }, [leads]);

  const sellerData = useMemo(() => {
    const map = {};
    leads.forEach((l) => {
      const name = l.seller_name?.trim() || "Sem vendedor";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leads]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DataCrazy CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">Integração de leads e webhooks do CRM DataCrazy</p>
        </div>
        <Badge className="bg-success/10 text-success border-0 text-sm px-3 py-1">● Webhook Ativo</Badge>
      </div>

      {/* KPI + Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Leads hoje</p>
            <p className="text-3xl font-bold">{todayLeads}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total de leads</p>
            <p className="text-3xl font-bold">{leads.length}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vendedores ativos</p>
            <p className="text-3xl font-bold">{sellerData.filter(s => s.name !== "Sem vendedor").length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Funil por etapa */}
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Leads por Etapa</h2>
          {stageData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stageData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(150 14% 9%)", border: "1px solid hsl(142 11% 18%)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "hsl(142 11% 18%)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stageData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Leads por vendedor */}
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Leads por Vendedor</h2>
          {sellerData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sellerData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ background: "hsl(150 14% 9%)", border: "1px solid hsl(142 11% 18%)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "hsl(142 11% 18%)" }}
                />
                <Bar dataKey="value" fill="#4F8F63" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Stats ao vivo via API */}
      <DCStatsPanel />

      {/* Webhook Config */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold">Configuração do Webhook</h2>
            <p className="text-xs text-muted-foreground">Configure esta URL no DataCrazy para receber leads automaticamente</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URL do Webhook</p>
          <CopyableUrl url={DATACRAZY_WEBHOOK_URL} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground text-sm">🔗 Como configurar:</p>
            <p>1. Acesse o DataCrazy CRM → <strong>Integrações</strong> → <strong>Webhooks</strong></p>
            <p>2. Adicione um novo webhook com a URL acima</p>
            <p>3. Selecione o evento <strong>Lead Criado</strong></p>
            <p>4. Salve — leads novos chegam automaticamente</p>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground text-sm">📋 O que é sincronizado:</p>
            <p>• Lead criado → aparece no Funil (Etapa 1)</p>
            <p>• Lead atualizado → nome, telefone e campanha</p>
            <p>• Evento <code className="bg-muted px-1 rounded">lead.created</code> registrado na Timeline</p>
            <p>• Vendedor vinculado automaticamente pelo campo <code className="bg-muted px-1 rounded">attendant</code></p>
          </div>
        </div>
      </Card>

      {/* Últimos eventos recebidos */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Últimos Eventos Recebidos</h2>
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["events_datacrazy"] })}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
          </Button>
        </div>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento recebido ainda</p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="font-mono text-xs text-muted-foreground w-32 shrink-0">
                  {ev.created_date && format(new Date(ev.created_date), "dd/MM HH:mm", { locale: ptBR })}
                </span>
                <Badge variant="outline" className="text-xs shrink-0">{ev.event_type}</Badge>
                <span className="text-muted-foreground truncate flex-1">{ev.user_name || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Leads recebidos */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold">Leads Recebidos via DataCrazy</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{leads.length} leads importados</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar lead..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-48 text-sm"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["leads_datacrazy"] })}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {search ? "Nenhum lead encontrado" : "Nenhum lead recebido via DataCrazy ainda"}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 min-w-0">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-mono">{lead.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Campanha</p>
                    <p className="text-sm truncate">{lead.source_campaign || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendedor</p>
                    <p className="text-sm truncate">{lead.seller_name || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {lead.stage === 5 ? "Final" : `Etapa ${lead.stage || 1}`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {lead.created_date && format(new Date(lead.created_date), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}