import React from "react";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  created: { label: "Criado", class: "bg-muted text-muted-foreground" },
  shipped: { label: "Enviado", class: "bg-primary/10 text-primary" },
  in_transit: { label: "Em Trânsito", class: "bg-warning/10 text-warning" },
  delivered: { label: "Entregue", class: "bg-success/10 text-success" },
  failed: { label: "Falha", class: "bg-destructive/10 text-destructive" },
  pickup_waiting: { label: "Aguard. Retirada", class: "bg-warning/10 text-warning" },
};

export default function OrderStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.created;
  return (
    <Badge className={`${config.class} border-0 text-xs font-medium`}>
      {config.label}
    </Badge>
  );
}