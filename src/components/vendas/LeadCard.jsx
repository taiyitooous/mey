import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, DollarSign, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function LeadCard({ lead, onClick }) {
  const ageDays = lead.last_stage_change_at
    ? formatDistanceToNow(new Date(lead.last_stage_change_at), { locale: ptBR, addSuffix: true })
    : null;

  return (
    <Card
      className="p-3.5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
      onClick={() => onClick(lead)}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-semibold text-foreground truncate flex-1 group-hover:text-primary transition-colors">
            {lead.name || "Sem nome"}
          </h4>
          {lead.status === "won" && <Badge className="bg-success/10 text-success border-0 text-xs">Ganho</Badge>}
          {lead.status === "lost" && <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Perdido</Badge>}
        </div>

        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{lead.phone}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          {lead.value_expected ? (
            <div className="flex items-center gap-1 text-xs font-medium text-foreground">
              <DollarSign className="w-3 h-3 text-success" />
              R$ {lead.value_expected.toLocaleString("pt-BR")}
            </div>
          ) : <div />}

          {ageDays && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {ageDays}
            </div>
          )}
        </div>

        {lead.seller_name && (
          <p className="text-xs text-muted-foreground truncate">
            {lead.seller_name}
          </p>
        )}
      </div>
    </Card>
  );
}