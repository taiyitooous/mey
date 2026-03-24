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
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate flex-1 group-hover:text-primary transition-colors">
              {lead.name || "Sem nome"}
            </h4>
            <div className="flex gap-1">
              {lead.isFromDataCrazy && <Badge className="bg-blue-500/10 text-blue-600 border-0 text-xs shrink-0">DataCrazy</Badge>}
              {lead.status === "won" && <Badge className="bg-success/10 text-success border-0 text-xs shrink-0">Ganho</Badge>}
              {lead.status === "lost" && <Badge className="bg-destructive/10 text-destructive border-0 text-xs shrink-0">Perdido</Badge>}
            </div>
          </div>
          {lead.dataCrazyEventCount > 0 && (
            <p className="text-xs text-blue-600 font-medium">{lead.dataCrazyEventCount} evento(s) DataCrazy</p>
          )}
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