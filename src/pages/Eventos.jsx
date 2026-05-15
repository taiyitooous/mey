import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ScrollText, CheckCircle2, Truck } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatSP(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_COLORS = {
  lead: "bg-primary/10 text-primary",
  order: "bg-warning/10 text-warning",
  collection: "bg-accent text-accent-foreground",
  payment: "bg-success/10 text-success",
  payout: "bg-muted text-muted-foreground",
};

export default function Eventos() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-created_date", 500),
  });

  // KPIs: pagamentos confirmados recebidos da Skale e do 123Log
  const paymentKpis = useMemo(() => {
    let skale = 0, log123 = 0;
    for (const ev of events) {
      try {
        const p = JSON.parse(ev.payload || "{}");
        // Skale: evento com status=delivered e payment_status=Pago (ou Paid)
        if (ev.event_type === "skale.raw_payload") {
          const ps = (p.skaletracking?.status_pagamento || p.transaction?.payment_status || "").toLowerCase();
          if (ps.includes("pago") || ps.includes("paid")) skale++;
        }
        // 123Log: evento com status=delivered
        if (ev.event_type === "123log.tracking") {
          const status = (p.delivery?.last_event?.description || p.delivery?.status || "").toLowerCase();
          if (status.includes("entregue") || status.includes("delivered")) log123++;
        }
      } catch {}
    }
    return { skale, log123 };
  }, [events]);

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      e.entity_id?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.entity_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
          <p className="text-sm text-muted-foreground mt-1">Log de auditoria</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar evento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="order">Order</SelectItem>
              <SelectItem value="collection">Cobrança</SelectItem>
              <SelectItem value="payment">Pagamento</SelectItem>
              <SelectItem value="payout">Payout</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs de pagamentos recebidos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">Pagos confirmados · Skale</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{isLoading ? "—" : paymentKpis.skale}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent-foreground/10">
            <Truck className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">Entregues confirmados · 123Log</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{isLoading ? "—" : paymentKpis.log123}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => {
            let parsedPayload = null;
            if (event.payload) {
              try { parsedPayload = JSON.parse(event.payload); } catch {}
            }
            return (
              <Card key={event.id} className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg mt-0.5">
                      <ScrollText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold font-mono">{event.event_type}</span>
                        <Badge className={`${TYPE_COLORS[event.entity_type] || "bg-muted text-muted-foreground"} border-0 text-xs`}>
                          {event.entity_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>ID: {event.entity_id}</span>
                        {event.user_name && <span>• {event.user_name}</span>}
                        {event.created_by && <span>• {event.created_by}</span>}
                      </div>
                      {parsedPayload && Object.keys(parsedPayload).length > 0 && (
                        <pre className="text-xs text-muted-foreground bg-muted p-2 rounded mt-1 overflow-x-auto max-w-xl">
                          {JSON.stringify(parsedPayload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatSP(event.created_date)}
                  </span>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhum evento encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}