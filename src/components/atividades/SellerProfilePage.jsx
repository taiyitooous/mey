import React, { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, CartesianGrid, FunnelChart, Funnel, LabelList,
} from "recharts";
import {
  Phone, MessageCircle, Trophy, XCircle, ArrowRight, Clock, DollarSign,
  X, Zap, Target, Users, Trash2,
} from "lucide-react";
import { format, getHours, differenceInMinutes, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCategory, isEffectiveContact, isCallAttempt, EVENT_LABELS, buildHourlyData } from "@/lib/eventUtils";

const EVENT_ICONS = {
  call: Phone,
  whatsapp: MessageCircle,
  won: Trophy,
  lost: XCircle,
  stage: ArrowRight,
  payment: DollarSign,
  other: Clock,
};

const CAT_COLORS = {
  call: "hsl(217 91% 60%)",
  whatsapp: "hsl(142 71% 45%)",
  stage: "hsl(var(--primary))",
  won: "hsl(var(--success))",
  lost: "hsl(var(--destructive))",
  other: "hsl(var(--muted-foreground))",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs space-y-1 min-w-[150px]">
      <p className="font-bold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-semibold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function SellerProfilePage({ seller, onClose, avatarUrl, sellerConfig }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: sellerLeads = [] } = useQuery({
    queryKey: ["leads_seller", seller?.name],
    queryFn: () => base44.entities.Lead.list(),
    enabled: !!seller?.name,
  });

  if (!seller) return null;

  const events = [...seller.events].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastDate = events[0] ? new Date(events[0].created_date) : null;
  const minsAgo = lastDate ? differenceInMinutes(new Date(), lastDate) : null;
  const isActive = minsAgo !== null && minsAgo < 15;
  const isIdle = minsAgo !== null && minsAgo >= 60;

  // KPIs
  const calls = events.filter(isCallAttempt).length;
  const callsAnswered = events.filter((e) => isCallAttempt(e) && isEffectiveContact(e)).length;
  const whas = events.filter((e) => getCategory(e.event_type) === "whatsapp").length;
  const stages = events.filter((e) => getCategory(e.event_type) === "stage").length;
  const wins = events.filter((e) => e.event_type === "lead.won").length;
  const losses = events.filter((e) => e.event_type === "lead.lost").length;
  const effective = events.filter(isEffectiveContact).length;
  const closed = wins + losses;
  const closeRate = closed > 0 ? Math.round((wins / closed) * 100) : 0;
  // Taxa de contato = ligações atendidas / total de ligações
  const contactRate = calls > 0 ? Math.round((callsAnswered / calls) * 100) : 0;
  const uniqueLeads = new Set(events.map((e) => e.entity_id)).size;

  // Hourly chart
  const hourlyData = buildHourlyData(events).filter(
    (d) => d.calls + d.whatsapp + d.stage + d.ganhos > 0
  );

  // Conversion funnel data
  const funnelData = [
    { name: "Ligações feitas", value: calls, fill: "hsl(217 91% 60% / 0.7)" },
    { name: "Ligações atendidas", value: callsAnswered, fill: "hsl(217 91% 60%)" },
    { name: "WhatsApp enviados", value: whas, fill: "hsl(142 71% 45% / 0.7)" },
    { name: "Etapa 4+", value: events.filter((e) => {
      try { return e.event_type === "lead.stage_changed" && JSON.parse(e.payload || "{}").to >= 4; } catch { return false; }
    }).length, fill: "hsl(var(--primary))" },
    { name: "Ganhos", value: wins, fill: "hsl(var(--success))" },
  ];

  // Timeline filter
  const tlFilters = [
    { key: "all", label: "Todos" },
    { key: "call", label: "3C" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "stage", label: "Etapa" },
    { key: "won", label: "Ganho" },
    { key: "lost", label: "Perdido" },
  ];
  const filteredTimeline =
    timelineFilter === "all"
      ? events
      : events.filter((e) => getCategory(e.event_type) === timelineFilter);

  const displayName = sellerConfig?.display_name || seller.name;
  const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const resolvedAvatarUrl = sellerConfig?.avatar_url || avatarUrl;

  const handleDeleteProfile = async () => {
    if (!sellerConfig?.id) return;
    try {
      await base44.entities.SellerConfig.delete(sellerConfig.id);
      queryClient.invalidateQueries({ queryKey: ["seller_configs"] });
      onClose();
    } catch (err) {
      console.error("Erro ao deletar perfil:", err);
    }
  };

  const kpiCards = [
    { label: "Ligações 3C", value: calls, icon: Phone },
    { label: "WhatsApp Wavoip", value: whas, icon: MessageCircle },
    { label: "Taxa de contato", value: `${contactRate}%`, icon: Target },
    { label: "Leads únicos", value: uniqueLeads, icon: Users },
    { label: "Ganhos", value: wins, cls: "text-success", icon: Trophy },
    { label: "Perdidos", value: losses, cls: "text-destructive", icon: XCircle },
    { label: "Close Rate", value: `${closeRate}%`, cls: closeRate >= 30 ? "text-success" : closeRate >= 15 ? "text-warning" : "text-destructive" },
    { label: "Mudanças etapa", value: stages, icon: ArrowRight },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {resolvedAvatarUrl ? (
              <img src={resolvedAvatarUrl} alt={displayName} className="w-16 h-16 rounded-2xl object-cover shrink-0 border-2 border-border" />
            ) : (
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${
                isActive ? "bg-success/15 text-success" : isIdle ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}>
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {isActive && <Badge className="bg-success/10 text-success border-success/30">🟢 Ativo agora</Badge>}
                {isIdle && <Badge className="bg-destructive/10 text-destructive border-destructive/30">🔴 Sem ação há {minsAgo}min</Badge>}
                {!isActive && !isIdle && lastDate && (
                  <Badge variant="outline">Há {formatDistanceToNow(lastDate, { locale: ptBR })}</Badge>
                )}
                {contactRate >= 50 && <Badge className="bg-primary/10 text-primary border-primary/30">Alta taxa de contato</Badge>}
                {wins >= 3 && <Badge className="bg-success/10 text-success border-success/30">🏆 Top vendedor</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
           {showDeleteConfirm ? (
             <>
               <Button variant="destructive" size="sm" onClick={handleDeleteProfile}>
                 Confirma?
               </Button>
               <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                 Cancelar
               </Button>
             </>
           ) : (
             <>
               <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)}>
                 <Trash2 className="w-5 h-5" />
               </Button>
               <Button variant="ghost" size="icon" onClick={onClose}>
                 <X className="w-5 h-5" />
               </Button>
             </>
           )}
          </div>
        </div>

        <Tabs defaultValue="performance">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="performance" className="flex-1">Performance</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            <TabsTrigger value="carteira" className="flex-1">Carteira ({sellerLeads.length})</TabsTrigger>
          </TabsList>

          {/* PERFORMANCE */}
          <TabsContent value="performance" className="space-y-6">
            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpiCards.map((k) => (
                <Card key={k.label} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {k.icon && <k.icon className="w-4 h-4 text-muted-foreground" />}
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                  </div>
                  <p className={`text-3xl font-bold ${k.cls || ""}`}>{k.value}</p>
                </Card>
              ))}
            </div>

            {/* Funnel */}
            <Card className="p-5">
              <p className="text-sm font-semibold mb-4">Funil de Conversão</p>
              {funnelData[0].value > 0 ? (
                <div className="space-y-2">
                  {funnelData.map((item, i) => {
                    const pct = funnelData[0].value > 0
                      ? Math.round((item.value / funnelData[0].value) * 100)
                      : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-36 shrink-0">{item.name}</span>
                        <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden relative">
                          <div
                            className="h-full rounded-lg transition-all"
                            style={{ width: `${Math.max(pct, 4)}%`, background: item.fill }}
                          />
                          <span className="absolute inset-0 flex items-center px-3 text-xs font-bold">
                            {item.value} <span className="ml-2 font-normal text-muted-foreground">({pct}%)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados de funil no período</p>
              )}
            </Card>

            {/* Hourly chart */}
            {hourlyData.length > 0 && (
              <Card className="p-5">
                <p className="text-sm font-semibold mb-4">Atividade por hora</p>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={hourlyData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    <Bar yAxisId="left" dataKey="calls" name="3C" stackId="a" fill="hsl(217 91% 60% / 0.5)" />
                    <Bar yAxisId="left" dataKey="whatsapp" name="WhatsApp" stackId="a" fill="hsl(142 71% 45% / 0.6)" />
                    <Bar yAxisId="left" dataKey="stage" name="Etapa" stackId="a" fill="hsl(var(--primary) / 0.4)" radius={[4,4,0,0]} />
                    <Line yAxisId="right" type="monotone" dataKey="ganhos" name="Ganhos" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            )}
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="space-y-4">
            {/* Filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {tlFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTimelineFilter(f.key)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    timelineFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              {filteredTimeline.map((event) => {
                const cat = getCategory(event.event_type);
                const Icon = EVENT_ICONS[cat] || Clock;
                let payload = null;
                try { payload = event.payload ? JSON.parse(event.payload) : null; } catch {}
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${CAT_COLORS[cat]}20` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: CAT_COLORS[cat] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {EVENT_LABELS[event.event_type] || event.event_type}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0 font-mono">
                          {event.created_date && new Date(event.created_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                          {event.entity_type}/{event.entity_id?.slice(0, 8)}
                        </span>
                        {event.source && event.source !== "mey" && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{event.source}</Badge>
                        )}
                        {payload?.result && (
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                            payload.result === "answered" ? "text-success border-success/30" :
                            payload.result === "no_answer" ? "text-warning border-warning/30" : ""
                          }`}>
                            {payload.result}
                          </Badge>
                        )}
                      </div>
                      {payload?.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic truncate">"{payload.notes}"</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary shrink-0"
                      onClick={() => navigate(`/lead/${event.entity_id}`)}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
              {filteredTimeline.length === 0 && (
                <p className="text-center text-muted-foreground py-10">
                  Nenhum evento nesta categoria
                </p>
              )}
            </div>
          </TabsContent>

          {/* CARTEIRA */}
          <TabsContent value="carteira" className="space-y-2">
            {[...sellerLeads].sort((a, b) => (b.stage || 0) - (a.stage || 0)).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/lead/${lead.id}`)}
              >
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {lead.stage === 5 ? "Final" : `Etapa ${lead.stage}`}
                    </Badge>
                    {lead.value_expected && (
                      <span className="text-xs text-muted-foreground">
                        R$ {lead.value_expected.toLocaleString("pt-BR")}
                      </span>
                    )}
                    {lead.phone && <span className="text-xs text-muted-foreground">{lead.phone}</span>}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            ))}
            {sellerLeads.length === 0 && (
              <p className="text-center text-muted-foreground py-10">Nenhum lead aberto</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}