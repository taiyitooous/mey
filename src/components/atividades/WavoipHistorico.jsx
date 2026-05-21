import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, Clock, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isWavoipCallAttempt } from "@/lib/eventUtils";

const STATUS_CONFIG = {
  whatsapp_call_received: {
    label: "Atendida",
    icon: PhoneIncoming,
    color: "text-success",
    badge: "bg-success/10 text-success border-success/20",
  },
  whatsapp_call_answered: {
    label: "Atendida",
    icon: PhoneIncoming,
    color: "text-success",
    badge: "bg-success/10 text-success border-success/20",
  },
  whatsapp_call_missed: {
    label: "Não atendida",
    icon: PhoneMissed,
    color: "text-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
  },
  whatsapp_call_ended: {
    label: "Encerrada",
    icon: PhoneOff,
    color: "text-muted-foreground",
    badge: "bg-muted/50 text-muted-foreground border-transparent",
  },
  whatsapp_call_started: {
    label: "Iniciada",
    icon: Phone,
    color: "text-warning",
    badge: "bg-warning/10 text-warning border-warning/20",
  },
  whatsapp_call_initiated: {
    label: "Iniciada",
    icon: Phone,
    color: "text-warning",
    badge: "bg-warning/10 text-warning border-warning/20",
  },
};

function getStatusConfig(eventType) {
  return STATUS_CONFIG[eventType] || {
    label: eventType,
    icon: Phone,
    color: "text-muted-foreground",
    badge: "bg-muted/50 text-muted-foreground border-transparent",
  };
}

function deduplicateWavoip(events) {
  const byCallId = {};
  const priority = (ev) =>
    ev.event_type === "whatsapp_call_received" || ev.event_type === "whatsapp_call_answered" ? 3
    : ev.event_type === "whatsapp_call_missed" || ev.event_type === "whatsapp_call_ended" ? 2
    : 1;

  events.forEach((e) => {
    try {
      const p = e.payload ? JSON.parse(e.payload) : {};
      const cid = p.call_id || e.entity_id;
      const prev = byCallId[cid];
      if (!prev || priority(e) > priority(prev)) {
        byCallId[cid] = { ...e, _call_id: cid, _payload: p };
      }
    } catch {
      byCallId[e.id] = { ...e, _call_id: e.entity_id, _payload: {} };
    }
  });

  return Object.values(byCallId).sort(
    (a, b) => new Date(b.created_date) - new Date(a.created_date)
  );
}

function CallRow({ call }) {
  const status = getStatusConfig(call.event_type);
  const Icon = status.icon;
  const date = new Date(call.created_date);
  const phone = call._payload?.phone || call._payload?.callee || call._payload?.caller || call.entity_id || "—";
  const duration = call._payload?.duration_seconds || call._payload?.speaking_time || null;

  const formatDuration = (secs) => {
    if (!secs) return null;
    const s = typeof secs === "string" ? parseInt(secs) : secs;
    if (isNaN(s) || s <= 0) return null;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}min ${sec}s` : `${sec}s`;
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className={`shrink-0 ${status.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{call.user_name || "—"}</span>
          <Badge className={`text-[10px] px-1.5 py-0 border ${status.badge}`}>{status.label}</Badge>
          {duration && formatDuration(duration) && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDuration(duration)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{phone}</span>
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">{format(date, "HH:mm", { locale: ptBR })}</p>
        <p className="text-[10px] text-muted-foreground">{format(date, "dd/MM", { locale: ptBR })}</p>
      </div>
    </div>
  );
}

function SellerGroup({ sellerName, calls }) {
  const answered = calls.filter(
    (c) => c.event_type === "whatsapp_call_received" || c.event_type === "whatsapp_call_answered"
  ).length;
  const missed = calls.filter(
    (c) => c.event_type === "whatsapp_call_missed"
  ).length;
  const rate = calls.length > 0 ? Math.round((answered / calls.length) * 100) : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
            {(sellerName || "?").charAt(0)}
          </div>
          <span className="font-semibold text-sm">{sellerName || "Desconhecido"}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="text-success font-medium">{answered} atend.</span>
          <span className="text-destructive font-medium">{missed} perdidas</span>
          <span>{rate}% taxa</span>
        </div>
      </div>
      <div>
        {calls.map((call) => (
          <CallRow key={call.id} call={call} />
        ))}
      </div>
    </Card>
  );
}

export default function WavoipHistorico({ events }) {
  const { callsBySeller, stats } = useMemo(() => {
    const wavoipRaw = events.filter((e) => e.source === "whatsapp" && isWavoipCallAttempt(e));
    const deduped = deduplicateWavoip(wavoipRaw);

    const answered = deduped.filter(
      (c) => c.event_type === "whatsapp_call_received" || c.event_type === "whatsapp_call_answered"
    ).length;
    const missed = deduped.filter((c) => c.event_type === "whatsapp_call_missed").length;
    const rate = deduped.length > 0 ? Math.round((answered / deduped.length) * 100) : 0;

    // Agrupar por vendedor
    const bySeller = {};
    deduped.forEach((call) => {
      const name = (call.user_name || "Desconhecido").trim();
      if (!bySeller[name]) bySeller[name] = [];
      bySeller[name].push(call);
    });

    // Ordenar vendedores por quantidade de chamadas desc
    const callsBySeller = Object.entries(bySeller)
      .sort((a, b) => b[1].length - a[1].length);

    return {
      callsBySeller,
      stats: { total: deduped.length, answered, missed, rate },
    };
  }, [events]);

  if (stats.total === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-lg">Nenhuma chamada Wavoip no período</p>
        <p className="text-sm mt-1">Ligações WhatsApp aparecerão aqui automaticamente</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de chamadas", value: stats.total, color: "text-foreground" },
          { label: "Atendidas", value: stats.answered, color: "text-success" },
          { label: "Não atendidas", value: stats.missed, color: "text-destructive" },
          { label: "Taxa de atendimento", value: `${stats.rate}%`, color: "text-warning" },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* Lista por vendedor */}
      <div className="space-y-4">
        {callsBySeller.map(([sellerName, calls]) => (
          <SellerGroup key={sellerName} sellerName={sellerName} calls={calls} />
        ))}
      </div>
    </div>
  );
}