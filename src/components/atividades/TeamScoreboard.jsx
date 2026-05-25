import React from "react";

import { getCategory, isEffectiveContact, deduplicateCallEvents, isWavoipCallAttempt, isWavoipCallAnswered } from "@/lib/eventUtils";
import { Phone, Trophy, Smartphone } from "lucide-react";

const STATUS = {
  bom: "bg-success/10 text-success border-success/20",
  atencao: "bg-warning/10 text-warning border-warning/20",
  ruim: "bg-destructive/10 text-destructive border-destructive/20",
};

function semaphore(value, good, bad, higherIsBetter = true) {
  if (higherIsBetter) {
    if (value >= good) return "bom";
    if (value >= bad) return "atencao";
    return "ruim";
  } else {
    if (value <= good) return "bom";
    if (value <= bad) return "atencao";
    return "ruim";
  }
}

function ScoreCard({ value, label, meta, status, icon: Icon }) {
  const statusConfig = {
    bom: { bg: "#4F8F63", bg_light: "rgba(79, 143, 99, 0.12)", border: "rgba(79, 143, 99, 0.3)" },
    atencao: { bg: "#E8B84B", bg_light: "rgba(232, 184, 75, 0.12)", border: "rgba(232, 184, 75, 0.3)" },
    ruim: { bg: "#B85C5C", bg_light: "rgba(184, 92, 92, 0.12)", border: "rgba(184, 92, 92, 0.3)" },
  };
  const config = statusConfig[status] || statusConfig.bom;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 border group transition-all duration-200 hover:shadow-lg"
      style={{ background: `linear-gradient(135deg, ${config.bg_light} 0%, transparent 100%)`, borderColor: config.border }}
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${config.bg}60, transparent)` }} />

      {/* Icon + Status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${config.bg}22`, border: `1px solid ${config.bg}40` }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color: config.bg }} />
          </div>
        )}
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg whitespace-nowrap"
          style={{ background: `${config.bg}22`, color: config.bg }}
        >
          {status === "bom" ? "✓ Bom" : status === "atencao" ? "⚠ Atenção" : "✗ Ruim"}
        </span>
      </div>

      {/* Metric */}
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-foreground leading-none tabular-nums">{value}</div>
        <div className="text-xs font-semibold text-muted-foreground mt-1.5 truncate">{label}</div>
        {meta && <div className="text-[11px] text-muted-foreground/60 mt-1 truncate">{meta}</div>}
      </div>
    </div>
  );
}

export default function TeamScoreboard({ events }) {
  const dedupedCalls = deduplicateCallEvents(events.filter((e) => e.source === "3c" && ["call.ended", "call-history-was-created", "call.answered", "call.no_answer", "call.attempt", "call_answered", "call_attempted"].includes(e.event_type)));
  const total = events.length;
  const sellers = new Set(events.filter((e) => e.user_name && e.user_name !== "Sistema").map((e) => e.user_name)).size;
  const calls = dedupedCalls.length;
  const callsAnswered = dedupedCalls.filter((e) => isEffectiveContact(e)).length;
  const contactRate = calls > 0 ? Math.round((callsAnswered / calls) * 100) : 0;

  // Vendedores com pelo menos 1 ligação 3C
  const sellersWith3C = new Set(dedupedCalls.map((e) => e.user_name?.toLowerCase().trim()));
  
  // WhatsApp Wavoip: deduplicar por call_id (start + missed/answered = 1 chamada)
  const wavoipRaw = events.filter((e) => e.source === "whatsapp" && isWavoipCallAttempt(e));
  // Dedup: para cada call_id, priorizar: received > missed > started
  const wavoipByCallId = {};
  wavoipRaw.forEach((e) => {
    try {
      const p = e.payload ? JSON.parse(e.payload) : {};
      const cid = p.call_id || e.entity_id;
      const prev = wavoipByCallId[cid];
      // Prioridade: received=3, missed=2, started=1
      const priority = (ev) => (ev.event_type === "whatsapp_call_received" || ev.event_type === "whatsapp_call_answered") ? 3 : (ev.event_type === "whatsapp_call_missed" || ev.event_type === "whatsapp_call_ended") ? 2 : 1;
      if (!prev || priority(e) > priority(prev)) {
        wavoipByCallId[cid] = e;
      }
    } catch {
      wavoipByCallId[e.entity_id] = e;
    }
  });
  const dedupedWavoip = Object.values(wavoipByCallId);
  const whatsappAnswered = dedupedWavoip.filter((e) => e.event_type === "whatsapp_call_received").length;
  const whatsappTotal = dedupedWavoip.length;
  const whatsappRate = whatsappTotal > 0 ? Math.round((whatsappAnswered / whatsappTotal) * 100) : 0;

  const wins = events.filter((e) => e.event_type === "lead.won").length;
  const losses = events.filter((e) => e.event_type === "lead.lost").length;
  const closed = wins + losses;
  const closeRate = closed > 0 ? Math.round((wins / closed) * 100) : 0;

  const cards = [
    {
      value: calls,
      label: "Ligações 3C",
      meta: `${contactRate}% taxa de contato`,
      status: semaphore(contactRate, 40, 20),
      icon: Phone,
    },
    {
      value: whatsappTotal,
      label: "Ligações WhatsApp",
      meta: whatsappTotal > 0 ? `${whatsappAnswered} atendidas (${whatsappRate}%)` : "Nenhuma ligação",
      status: whatsappTotal === 0 ? "atencao" : semaphore(whatsappRate, 50, 25),
      icon: Smartphone,
    },
    {
      value: wins,
      label: "Ganhos",
      meta: `${closeRate}% close rate`,
      status: semaphore(wins, 3, 1),
      icon: Trophy,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => <ScoreCard key={c.label} {...c} />)}
    </div>
  );
}