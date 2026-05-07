import React from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { differenceInMinutes } from "date-fns";

export default function AlertsBox({ leads, orders }) {
  const now = new Date();
  const alerts = [];

  // Stage 4 no contact 30+ min
  const stage4Stale = leads.filter((l) => {
    if (l.status !== "open" || l.stage !== 4) return false;
    const ref = l.last_contact_at || l.last_stage_change_at || l.updated_date;
    return ref && differenceInMinutes(now, new Date(ref)) > 30;
  });
  if (stage4Stale.length > 0) {
    alerts.push({ type: "danger", text: `${stage4Stale.length} lead(s) na Etapa 4 há +30min sem contato` });
  }

  // Delivered without collection attempt 15+ min
  const deliveredNoPay = orders.filter((o) => {
    if (o.logistics_status !== "delivered" || o.payment_status !== "pending") return false;
    const ref = o.delivered_at || o.updated_date;
    return ref && differenceInMinutes(now, new Date(ref)) > 15;
  });
  if (deliveredNoPay.length > 0) {
    alerts.push({ type: "danger", text: `${deliveredNoPay.length} pedido(s) entregue(s) sem cobrança há +15min` });
  }

  // Failed deliveries unresolved
  const failed = orders.filter((o) => o.logistics_status === "failed");
  if (failed.length > 0) {
    alerts.push({ type: "warning", text: `${failed.length} falha(s) de entrega aguardando resolução` });
  }

  // Pickup waiting
  const pickupWaiting = orders.filter((o) => o.logistics_status === "pickup_waiting");
  if (pickupWaiting.length >= 3) {
    alerts.push({ type: "warning", text: `${pickupWaiting.length} pedido(s) aguardando retirada` });
  }

  // Many open critical leads
  const stage4Open = leads.filter((l) => l.status === "open" && (l.stage === 4 || l.stage === 5));
  if (stage4Open.length >= 5) {
    alerts.push({ type: "warning", text: `${stage4Open.length} leads no funil final (Etapa 4/5) — prioridade alta` });
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-4 border-success/30">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="w-4 h-4" />
          <p className="text-sm font-medium">Tudo em ordem — sem alertas ativos</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-destructive/30">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <p className="text-sm font-semibold">{alerts.length} alerta{alerts.length > 1 ? "s" : ""} ativo{alerts.length > 1 ? "s" : ""}</p>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert, i) => (
          <div key={i} className={`flex items-start gap-2 text-sm ${
            alert.type === "danger" ? "text-destructive" : "text-warning"
          }`}>
            <span className="shrink-0">{alert.type === "danger" ? "🚨" : "⚠️"}</span>
            <span>{alert.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}