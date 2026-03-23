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
import { Search, ScrollText } from "lucide-react";
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
    queryFn: () => base44.entities.Event.list("-created_date", 200),
  });

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
                    {event.created_date && format(new Date(event.created_date), "dd/MM HH:mm")}
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