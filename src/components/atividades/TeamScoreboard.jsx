import React from "react";
import { Card } from "@/components/ui/card";
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
  const s = STATUS[status] || STATUS.bom;
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${s}`}>
          {status === "bom" ? "Bom" : status === "atencao" ? "Atenção" : "Ruim"}
        </span>
        {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
      </div>
      <div>
        <div className="text-4xl font-bold leading-none">{value}</div>
        <div className="text-sm font-semibold mt-1.5">{label}</div>
        {meta && <div className="text-xs text-muted-foreground mt-0.5">{meta}</div>}
      </div>
    </Card>
  );
}

export default function TeamScoreboard({ events }) {
  const dedupedCalls = deduplicateCallEvents(events);
  const total = events.length;
  const sellers = new Set(events.filter((e) => e.user_name && e.user_name !== "Sistema").map((e) => e.user_name)).size;
  const calls = dedupedCalls.length;
  const callsAnswered = dedupedCalls.filter((e) => isEffectiveContact(e)).length;
  const contactRate = calls > 0 ? Math.round((callsAnswered / calls) * 100) : 0;

  // Vendedores com pelo menos 1 ligação 3C
  const sellersWith3C = new Set(dedupedCalls.map((e) => e.user_name?.toLowerCase().trim()));
  
  // WhatsApp: apenas de vendedores que fizeram ligações 3C
  const whatsappEvents = events.filter((e) => {
    if (getCategory(e.event_type) !== "whatsapp") return false;
    const userName = e.user_name?.toLowerCase().trim();
    return sellersWith3C.has(userName);
  });
  const whatsappAnswered = whatsappEvents.filter((e) => isEffectiveContact(e)).length;
  const whatsappTotal = whatsappEvents.length;
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