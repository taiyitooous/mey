import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import LeadCard from "@/components/vendas/LeadCard";
import NewLeadDialog from "@/components/vendas/NewLeadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const STAGES = [
  { value: 1, label: "Etapa 1" },
  { value: 2, label: "Etapa 2" },
  { value: 3, label: "Etapa 3" },
  { value: 4, label: "Etapa 4" },
  { value: 5, label: "Final" },
];

export default function Vendas() {
  const navigate = useNavigate();
  const [showNewLead, setShowNewLead] = useState(false);
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events_vendas"],
    queryFn: () => base44.entities.Event.list("-created_date", 1000),
  });

  const isLoading = leadsLoading || eventsLoading;

  // Leads abertos + leads criados via DataCrazy
  const openLeads = useMemo(() => {
    const leads_open = leads.filter((l) => l.status === "open");
    
    // Contar leads criados via DataCrazy por evento
    const dataCrazyLeads = new Set(
      events
        .filter((e) => e.source === "datacrazy" && e.entity_type === "lead" && e.event_type === "lead.created")
        .map((e) => e.entity_id)
    );
    
    // Adicionar contagem de eventos DataCrazy aos leads
    return leads_open.map((lead) => ({
      ...lead,
      dataCrazyEventCount: events.filter(
        (e) => e.source === "datacrazy" && e.entity_id === lead.id
      ).length,
      isFromDataCrazy: dataCrazyLeads.has(lead.id),
    }));
  }, [leads, events]);

  const filtered = useMemo(() => {
    return search
      ? openLeads.filter(
          (l) =>
            l.name?.toLowerCase().includes(search.toLowerCase()) ||
            l.phone?.includes(search) ||
            l.seller_name?.toLowerCase().includes(search.toLowerCase())
        )
      : openLeads;
  }, [search, openLeads]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">Funil de leads — Kanban</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Button onClick={() => setShowNewLead(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="grid grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STAGES.map((stage) => {
            const stageLeads = filtered.filter((l) => l.stage === stage.value);
            return (
              <div key={stage.value} className="flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                    {stageLeads.length}
                  </span>
                </div>
                <ScrollArea className="flex-1 max-h-[calc(100vh-240px)]">
                  <div className="space-y-2.5 pr-1">
                    {stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onClick={(l) => navigate(`/lead/${l.id}`)} />
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum lead
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}

      <NewLeadDialog open={showNewLead} onClose={() => setShowNewLead(false)} />
    </div>
  );
}