import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, MessageCircle, Handshake, DollarSign, Clock } from "lucide-react";
import OrderStatusBadge from "@/components/logistica/OrderStatusBadge";
import { differenceInDays, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const QUEUES = [
  { key: "today", label: "Entregue Hoje" },
  { key: "0-1", label: "0–1 dia" },
  { key: "1-3", label: "1–3 dias" },
  { key: "3-6", label: "3–6 dias" },
  { key: "6-9", label: "6–9 dias" },
  { key: "9+", label: "9+ dias" },
  { key: "pickup_waiting", label: "Aguard. Retirada" },
  { key: "failed", label: "Falha Entrega" },
];

function categorizeOrder(order) {
  if (order.logistics_status === "pickup_waiting") return "pickup_waiting";
  if (order.logistics_status === "failed") return "failed";
  if (order.logistics_status !== "delivered") return null;
  if (order.payment_status === "paid") return null;

  const days = order.delivered_at
    ? differenceInDays(new Date(), new Date(order.delivered_at))
    : 0;

  if (days === 0) return "today";
  if (days <= 1) return "0-1";
  if (days <= 3) return "1-3";
  if (days <= 6) return "3-6";
  if (days <= 9) return "6-9";
  return "9+";
}

function ActionDialog({ order, open, onClose }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [callResult, setCallResult] = useState("answered");
  const [promiseDate, setPromiseDate] = useState("");

  if (!order) return null;

  const logAction = async (eventType, payload = {}) => {
    await base44.entities.Event.create({
      entity_type: "order",
      entity_id: order.id,
      event_type: eventType,
      payload: JSON.stringify(payload),
    });
    await base44.entities.Order.update(order.id, {
      last_collection_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const handle3C = async () => {
    setSaving(true);
    await logAction("collection.call_attempted", { result: callResult });
    await base44.entities.Order.update(order.id, { collection_status: "attempting" });
    setSaving(false);
    onClose();
  };

  const handleWhatsApp = async () => {
    setSaving(true);
    await logAction("collection.whatsapp_sent", {});
    setSaving(false);
    onClose();
  };

  const handlePromise = async () => {
    if (!promiseDate) return;
    setSaving(true);
    await logAction("collection.promise_made", { next_action_at: promiseDate });
    await base44.entities.Order.update(order.id, {
      collection_status: "promise",
      next_action_at: new Date(promiseDate).toISOString(),
    });
    setSaving(false);
    onClose();
  };

  const handleAgreement = async () => {
    setSaving(true);
    await logAction("collection.agreement_made", {});
    await base44.entities.Order.update(order.id, { collection_status: "agreement" });
    setSaving(false);
    onClose();
  };

  const handlePaid = async () => {
    setSaving(true);
    await logAction("payment.paid", {});
    await base44.entities.Order.update(order.id, {
      payment_status: "paid",
      collection_status: "paid",
      paid_at: new Date().toISOString(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Cobrança — {order.order_id}
            <OrderStatusBadge status={order.logistics_status} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <p>{order.customer_name} {order.customer_phone && `• ${order.customer_phone}`}</p>
            {order.amount && <p className="font-semibold text-foreground">R$ {order.amount.toLocaleString("pt-BR")}</p>}
          </div>

          <div className="border-t pt-3 space-y-3">
            {/* 3C */}
            <div className="flex items-center gap-2">
              <Select value={callResult} onValueChange={setCallResult}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="answered">Atendeu</SelectItem>
                  <SelectItem value="no_answer">Não atendeu</SelectItem>
                  <SelectItem value="voicemail">Caixa postal</SelectItem>
                  <SelectItem value="invalid">Inválido</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handle3C} disabled={saving} className="gap-1">
                <Phone className="w-3.5 h-3.5" /> 3C
              </Button>
            </div>

            {/* WhatsApp */}
            <Button size="sm" variant="outline" onClick={handleWhatsApp} disabled={saving} className="w-full gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Enviado
            </Button>

            {/* Promise */}
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={handlePromise} disabled={saving || !promiseDate} className="gap-1">
                <Clock className="w-3.5 h-3.5" /> Promessa
              </Button>
            </div>

            {/* Agreement */}
            <Button size="sm" variant="outline" onClick={handleAgreement} disabled={saving} className="w-full gap-1">
              <Handshake className="w-3.5 h-3.5" /> Acordo
            </Button>

            {/* Paid */}
            <Button size="sm" onClick={handlePaid} disabled={saving} className="w-full bg-success hover:bg-success/90 text-success-foreground gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Marcar como Pago
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Cobranca() {
  const [activeQueue, setActiveQueue] = useState("today");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const categorized = {};
  QUEUES.forEach((q) => (categorized[q.key] = []));
  orders.forEach((o) => {
    const cat = categorizeOrder(o);
    if (cat && categorized[cat]) categorized[cat].push(o);
  });

  const currentOrders = categorized[activeQueue] || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cobrança</h1>
        <p className="text-sm text-muted-foreground mt-1">Fila de cobrança por aging</p>
      </div>

      {/* Queue tabs */}
      <Tabs value={activeQueue} onValueChange={setActiveQueue}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          {QUEUES.map((q) => (
            <TabsTrigger
              key={q.key}
              value={q.key}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium"
            >
              {q.label}
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                {(categorized[q.key] || []).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {currentOrders.map((order) => {
            const aging = order.delivered_at
              ? differenceInDays(new Date(), new Date(order.delivered_at))
              : 0;
            return (
              <Card
                key={order.id}
                className="p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{order.order_id}</span>
                        <OrderStatusBadge status={order.logistics_status} />
                        {order.collection_status !== "none" && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {order.collection_status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {order.customer_name && <span>{order.customer_name}</span>}
                        {order.customer_phone && <span>{order.customer_phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {order.amount && (
                      <span className="font-semibold">R$ {order.amount.toLocaleString("pt-BR")}</span>
                    )}
                    <Badge
                      className={`text-xs ${
                        aging >= 6
                          ? "bg-destructive/10 text-destructive"
                          : aging >= 3
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      } border-0`}
                    >
                      {aging}d
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
          {currentOrders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum pedido nesta fila
            </div>
          )}
        </div>
      )}

      <ActionDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}