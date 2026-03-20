import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";

const EVENT_LABELS = {
  "lead.created": "Lead criado",
  "lead.stage_changed": "Etapa alterada",
  "lead.won": "Lead ganho 🏆",
  "lead.lost": "Lead perdido",
  "lead.call_made": "Ligação registrada",
  "lead.whatsapp_sent": "WhatsApp enviado",
  "order.created": "Pedido criado",
  "order.delivered": "Pedido entregue",
  "order.failed": "Falha na entrega",
  "payment.paid": "Pagamento confirmado",
  "collection.call_attempted": "Cobrança — Ligação",
  "collection.whatsapp_sent": "Cobrança — WhatsApp",
  "collection.promise_made": "Promessa de pagamento",
  "collection.agreement_made": "Acordo realizado",
  "task.done.call": "Ligação concluída ✓",
  "task.done.whatsapp": "WhatsApp concluído ✓",
  "task.done.follow_up": "Follow-up concluído ✓",
};

export default function EventsTimeline({ events }) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_date) - new Date(a.created_date)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ScrollText className="w-4 h-4" /> Histórico de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sorted.map((event) => {
            let payload = null;
            try {
              payload = event.payload ? JSON.parse(event.payload) : null;
            } catch {}
            return (
              <div key={event.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {EVENT_LABELS[event.event_type] || event.event_type}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {event.created_date &&
                        format(new Date(event.created_date), "dd/MM HH:mm")}
                    </span>
                  </div>
                  {(event.user_name || event.created_by) && (
                    <p className="text-xs text-muted-foreground">
                      {event.user_name || event.created_by}
                    </p>
                  )}
                  {payload && Object.keys(payload).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Object.entries(payload)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum evento registrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}