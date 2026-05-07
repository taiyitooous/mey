import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  MessageCircle,
  Trophy,
  XCircle,
  Clock,
  Plus,
  Package,
  User,
} from "lucide-react";
import OrderStatusBadge from "@/components/logistica/OrderStatusBadge";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import TasksSection from "@/components/leads/TasksSection";
import EventsTimeline from "@/components/leads/EventsTimeline";
import { format } from "date-fns";

const LOSS_REASONS = [
  { value: "no_interest", label: "Sem interesse" },
  { value: "no_budget", label: "Sem orçamento" },
  { value: "competitor", label: "Concorrência" },
  { value: "no_contact", label: "Sem contato" },
  { value: "invalid", label: "Inválido" },
  { value: "other", label: "Outro" },
];

const STAGES = [1, 2, 3, 4, 5];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showLossForm, setShowLossForm] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  const { data: allLeads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", id],
    queryFn: () => base44.entities.Event.filter({ entity_id: id }),
    enabled: !!id,
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => base44.entities.Task.filter({ entity_id: id, entity_type: "lead" }),
    enabled: !!id,
  });

  const lead = allLeads.find((l) => l.id === id);
  const linkedOrders = allOrders.filter((o) => o.lead_id === id);

  if (loadingLeads) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Lead não encontrado.{" "}
        <Button variant="link" onClick={() => navigate("/vendas")}>
          Voltar para Vendas
        </Button>
      </div>
    );
  }

  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: ["leads"] });
  const invalidateEvents = () => queryClient.invalidateQueries({ queryKey: ["events", id] });

  const logEvent = async (eventType, payload = {}) => {
    await base44.entities.Event.create({
      entity_type: "lead",
      entity_id: id,
      event_type: eventType,
      payload: JSON.stringify(payload),
    });
    invalidateEvents();
  };

  const handleCall = async () => {
    setSaving(true);
    await base44.entities.Lead.update(id, {
      last_contact_at: new Date().toISOString(),
    });
    await logEvent("lead.call_made", {});
    invalidateLeads();
    setSaving(false);
    setShowTaskDialog(true);
  };

  const handleWhatsApp = async () => {
    setSaving(true);
    await base44.entities.Lead.update(id, {
      last_contact_at: new Date().toISOString(),
    });
    await logEvent("lead.whatsapp_sent", {});
    invalidateLeads();
    setSaving(false);
    setShowTaskDialog(true);
  };

  const handleWon = async () => {
    setSaving(true);
    await base44.entities.Lead.update(id, { status: "won" });
    await logEvent("lead.won", {});
    invalidateLeads();
    setSaving(false);
  };

  const handleLost = async () => {
    if (!lossReason) return;
    setSaving(true);
    await base44.entities.Lead.update(id, {
      status: "lost",
      loss_reason: lossReason,
    });
    await logEvent("lead.lost", { reason: lossReason });
    invalidateLeads();
    setSaving(false);
    setShowLossForm(false);
  };

  const handleMoveStage = async (newStage) => {
    setSaving(true);
    await base44.entities.Lead.update(id, {
      stage: newStage,
      last_stage_change_at: new Date().toISOString(),
    });
    await logEvent("lead.stage_changed", { from: lead.stage, to: newStage });
    invalidateLeads();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/vendas")}
          className="gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <h1 className="text-xl font-bold text-foreground">{lead.name}</h1>
        <Badge variant="outline">Etapa {lead.stage}</Badge>
        {lead.status === "open" && (
          <Badge className="bg-primary/10 text-primary border-0">Aberto</Badge>
        )}
        {lead.status === "won" && (
          <Badge className="bg-success/10 text-success border-0">Ganho</Badge>
        )}
        {lead.status === "lost" && (
          <Badge className="bg-destructive/10 text-destructive border-0">Perdido</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Funil + Orders */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4" /> Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {lead.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="font-medium">{lead.phone}</p>
                  </div>
                )}
                {lead.value_expected && (
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Esperado</p>
                    <p className="font-medium">
                      R$ {lead.value_expected.toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}
                {lead.seller_name && (
                  <div>
                    <p className="text-xs text-muted-foreground">Vendedor</p>
                    <p className="font-medium">{lead.seller_name}</p>
                  </div>
                )}
                {lead.source_campaign && (
                  <div>
                    <p className="text-xs text-muted-foreground">Campanha</p>
                    <p className="font-medium">{lead.source_campaign}</p>
                  </div>
                )}
                {lead.last_contact_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Último Contato</p>
                    <p className="font-medium">
                      {format(new Date(lead.last_contact_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                )}
                {lead.created_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {format(new Date(lead.created_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                )}
              </div>
              {lead.notes && (
                <p className="mt-3 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {lead.notes}
                </p>
              )}
              {lead.loss_reason && (
                <p className="mt-3 text-sm text-destructive">
                  Motivo perda:{" "}
                  {LOSS_REASONS.find((r) => r.value === lead.loss_reason)?.label ||
                    lead.loss_reason}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Funil */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-1.5">
                {STAGES.map((s) => (
                  <div
                    key={s}
                    className={`flex-1 h-2.5 rounded-full transition-colors ${
                      s <= lead.stage ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {lead.last_stage_change_at
                  ? `Etapa ${lead.stage} desde ${format(
                      new Date(lead.last_stage_change_at),
                      "dd/MM HH:mm"
                    )}`
                  : `Etapa ${lead.stage}`}
              </p>
              {lead.status === "open" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {STAGES.filter((s) => s !== lead.stage).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveStage(s)}
                      disabled={saving}
                      className="gap-1 text-xs h-7"
                    >
                      <ArrowRight className="w-3 h-3" />
                      {s === 5 ? "Final" : `Etapa ${s}`}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Orders */}
          {linkedOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" /> Pedidos Vinculados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-semibold">{order.order_id}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <OrderStatusBadge status={order.logistics_status} />
                        {order.tracking_code && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {order.tracking_code}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {order.amount && (
                        <p className="text-sm font-semibold">
                          R$ {order.amount.toLocaleString("pt-BR")}
                        </p>
                      )}
                      <Badge
                        className={`text-xs border-0 mt-1 ${
                          order.payment_status === "paid"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {order.payment_status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Actions + Tasks */}
        <div className="space-y-4">
          {/* Quick Actions */}
          {lead.status === "open" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full gap-2 justify-start"
                  onClick={handleCall}
                  disabled={saving}
                >
                  <Phone className="w-4 h-4" /> Ligar (3C)
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 justify-start"
                  onClick={handleWhatsApp}
                  disabled={saving}
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Button>

                <Separator className="my-1" />

                <Button
                  className="w-full gap-2 justify-start bg-success hover:bg-success/90 text-success-foreground"
                  onClick={handleWon}
                  disabled={saving}
                >
                  <Trophy className="w-4 h-4" /> Marcar Ganho
                </Button>
                <Button
                  variant="destructive"
                  className="w-full gap-2 justify-start"
                  onClick={() => setShowLossForm(!showLossForm)}
                  disabled={saving}
                >
                  <XCircle className="w-4 h-4" /> Marcar Perdido
                </Button>

                {showLossForm && (
                  <div className="space-y-2 pt-1">
                    <Select value={lossReason} onValueChange={setLossReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Motivo da perda *" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOSS_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={handleLost}
                      disabled={!lossReason || saving}
                    >
                      Confirmar Perda
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Próximas Ações
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTaskDialog(true)}
                  className="gap-1 h-7"
                >
                  <Plus className="w-3 h-3" /> Nova
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TasksSection
                tasks={tasks}
                entityId={id}
                entityType="lead"
                onTasksChanged={refetchTasks}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Events Timeline */}
      <EventsTimeline events={events} />

      <CreateTaskDialog
        open={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        entityType="lead"
        entityId={id}
        onCreated={refetchTasks}
      />
    </div>
  );
}