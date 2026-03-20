import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import LeadCard from "@/components/vendas/LeadCard";
import LeadDetailDialog from "@/components/vendas/LeadDetailDialog";
import NewLeadDialog from "@/components/vendas/NewLeadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const STAGES = [
  { value: 1, label: "Etapa 1" },
  { value: 2, label: "Etapa 2" },
  { value: 3, label: "Etapa 3" },
  { value: 4, label: "Etapa 4" },
  { value: 5, label: "Final" },
];

export default function Vendas() {
  const [selectedLead, setSelectedLead] = useState(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const openLeads = leads.filter((l) => l.status === "open");
  const filtered = search
    ? openLeads.filter(
        (l) =>
          l.name?.toLowerCase().includes(search.toLowerCase()) ||
          l.phone?.includes(search) ||
          l.seller_name?.toLowerCase().includes(search.toLowerCase())
      )
    : openLeads;

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
                      <LeadCard key={lead.id} lead={lead} onClick={setSelectedLead} />
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

      {/* Dialogs */}
      <LeadDetailDialog
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
      <NewLeadDialog open={showNewLead} onClose={() => setShowNewLead(false)} />
    </div>
  );
}