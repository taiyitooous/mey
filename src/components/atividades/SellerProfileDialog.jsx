import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Phone,
  MessageCircle,
  Trophy,
  XCircle,
  ArrowRight,
  Clock,
  DollarSign,
} from "lucide-react";
import { format, getHours } from "date-fns";

const EVENT_ICONS = {
  call: Phone,
  whatsapp: MessageCircle,
  won: Trophy,
  lost: XCircle,
  stage: ArrowRight,
  payment: DollarSign,
  other: Clock,
};

const EVENT_LABELS = {
  "lead.created": "Lead criado",
  "lead.call_made": "Ligação",
  "lead.whatsapp_sent": "WhatsApp enviado",
  "lead.stage_changed": "Etapa alterada",
  "lead.won": "Lead ganho 🏆",
  "lead.lost": "Lead perdido",
  "collection.call_attempted": "Cobrança — Ligação",
  "collection.whatsapp_sent": "Cobrança — WhatsApp",
  "collection.promise_made": "Promessa de pagamento",
  "collection.agreement_made": "Acordo",
  "payment.paid": "Pagamento confirmado",
  "task.done.call": "Tarefa — Ligação ✓",
  "task.done.whatsapp": "Tarefa — WhatsApp ✓",
  "task.auto_created": "Tarefa automática criada",
};

function getCategory(eventType) {
  if (eventType?.includes("call")) return "call";
  if (eventType?.includes("whatsapp")) return "whatsapp";
  if (eventType?.includes("stage_changed")) return "stage";
  if (eventType === "lead.won") return "won";
  if (eventType === "lead.lost") return "lost";
  if (eventType === "payment.paid") return "payment";
  return "other";
}

export default function SellerProfileDialog({ seller, open, onClose }) {
  const navigate = useNavigate();

  const { data: sellerLeads = [] } = useQuery({
    queryKey: ["leads_seller", seller?.name],
    queryFn: () =>
      base44.entities.Lead.filter({ seller_name: seller.name, status: "open" }),
    enabled: open && !!seller?.name,
  });

  if (!seller) return null;

  const events = [...seller.events].sort(
    (a, b) => new Date(b.created_date) - new Date(a.created_date)
  );

  // KPIs
  const calls = events.filter((e) => getCategory(e.event_type) === "call").length;
  const whas = events.filter((e) => getCategory(e.event_type) === "whatsapp").length;
  const stages = events.filter((e) => getCategory(e.event_type) === "stage").length;
  const wins = events.filter((e) => e.event_type === "lead.won").length;
  const losses = events.filter((e) => e.event_type === "lead.lost").length;
  const payments = events.filter((e) => e.event_type === "payment.paid").length;

  // Chart data
  const hourly = {};
  for (let h = 7; h <= 20; h++) hourly[h] = { hour: `${h}h`, ações: 0, ganhos: 0 };
  events.forEach((e) => {
    const h = getHours(new Date(e.created_date));
    if (hourly[h]) {
      hourly[h].ações++;
      if (e.event_type === "lead.won") hourly[h].ganhos++;
    }
  });
  const chartData = Object.values(hourly).filter((d) => d.ações > 0);

  const sortedLeads = [...sellerLeads].sort((a, b) => (b.stage || 0) - (a.stage || 0));
  const initials = seller.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {initials}
            </div>
            {seller.name}
            <Badge variant="secondary">{events.length} ações</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="timeline">
          <TabsList className="w-full">
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            <TabsTrigger value="performance" className="flex-1">Performance</TabsTrigger>
            <TabsTrigger value="carteira" className="flex-1">Carteira ({sortedLeads.length})</TabsTrigger>
          </TabsList>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="mt-4">
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {events.map((event) => {
                const cat = getCategory(event.event_type);
                const Icon = EVENT_ICONS[cat] || Clock;
                let payload = null;
                try {
                  payload = event.payload ? JSON.parse(event.payload) : null;
                } catch {}
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {EVENT_LABELS[event.event_type] || event.event_type}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0 font-mono">
                          {event.created_date &&
                            format(new Date(event.created_date), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="font-mono text-[10px]">{event.entity_type}/{event.entity_id?.slice(0, 8)}</span>
                        {event.source && event.source !== "mey" && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {event.source}
                          </Badge>
                        )}
                      </div>
                      {payload && Object.keys(payload).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {Object.entries(payload)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum evento no período
                </p>
              )}
            </div>
          </TabsContent>

          {/* PERFORMANCE */}
          <TabsContent value="performance" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Ligações 3C", value: calls },
                { label: "WhatsApp", value: whas },
                { label: "Etapas", value: stages },
                { label: "Ganhos", value: wins, cls: "text-success" },
                { label: "Perdidos", value: losses, cls: "text-destructive" },
                { label: "Pagamentos", value: payments, cls: "text-primary" },
              ].map((k) => (
                <Card key={k.label} className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.cls || ""}`}>{k.value}</p>
                </Card>
              ))}
            </div>

            {chartData.length > 0 ? (
              <div>
                <p className="text-sm font-semibold mb-3">Ações por hora</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="ações"
                      fill="hsl(var(--primary) / 0.5)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="ganhos"
                      fill="hsl(var(--success) / 0.7)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Sem dados para o gráfico
              </p>
            )}
          </TabsContent>

          {/* CARTEIRA */}
          <TabsContent value="carteira" className="mt-4">
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {sortedLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    navigate(`/lead/${lead.id}`);
                    onClose();
                  }}
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
                      {lead.phone && (
                        <span className="text-xs text-muted-foreground">{lead.phone}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
              {sortedLeads.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum lead aberto nesse período
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}