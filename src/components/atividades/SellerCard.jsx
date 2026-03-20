import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, ArrowRight, Trophy, AlertTriangle } from "lucide-react";
import { differenceInMinutes, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function getCategory(eventType) {
  if (eventType?.includes("call")) return "call";
  if (eventType?.includes("whatsapp")) return "whatsapp";
  if (eventType?.includes("stage_changed")) return "stage";
  if (eventType === "lead.won") return "won";
  if (eventType === "lead.lost") return "lost";
  if (eventType === "payment.paid") return "payment";
  return "other";
}

export default function SellerCard({ seller, onClick }) {
  const { name, events } = seller;

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_date) - new Date(a.created_date)
  );
  const lastEvent = sortedEvents[0];
  const lastDate = lastEvent ? new Date(lastEvent.created_date) : null;
  const minsAgo = lastDate ? differenceInMinutes(new Date(), lastDate) : null;

  const isActive = minsAgo !== null && minsAgo < 15;
  const isIdle = minsAgo !== null && minsAgo >= 60;

  const calls = events.filter((e) => getCategory(e.event_type) === "call").length;
  const whas = events.filter((e) => getCategory(e.event_type) === "whatsapp").length;
  const stages = events.filter((e) => getCategory(e.event_type) === "stage").length;
  const wins = events.filter((e) => e.event_type === "lead.won").length;
  const losses = events.filter((e) => e.event_type === "lead.lost").length;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const score = calls * 1 + whas * 1 + stages * 1 + wins * 5;

  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
        isIdle
          ? "border-destructive/40 bg-destructive/5"
          : isActive
          ? "border-success/40"
          : ""
      }`}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                isActive
                  ? "bg-success/20 text-success"
                  : isIdle
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isActive
                      ? "bg-success animate-pulse"
                      : isIdle
                      ? "bg-destructive"
                      : "bg-muted-foreground"
                  }`}
                />
                <p className="text-xs text-muted-foreground">
                  {isActive
                    ? "Ativo agora"
                    : lastDate
                    ? `Há ${formatDistanceToNow(lastDate, { locale: ptBR })}`
                    : "Sem atividade"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isIdle && <AlertTriangle className="w-4 h-4 text-destructive" />}
            <span className="text-xs text-muted-foreground font-mono">#{score}pts</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { icon: Phone, value: calls, label: "3C" },
            { icon: MessageCircle, value: whas, label: "WA" },
            { icon: ArrowRight, value: stages, label: "Etapas" },
            { icon: Trophy, value: wins, label: "Ganhos" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center py-1.5 bg-muted/50 rounded-lg">
              <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
              <p className="text-sm font-bold leading-tight">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-xs">{events.length} ações</Badge>
          {wins > 0 && (
            <Badge className="bg-success/10 text-success border-0 text-xs">{wins} ganhos</Badge>
          )}
          {losses > 0 && (
            <Badge className="bg-destructive/10 text-destructive border-0 text-xs">{losses} perdidos</Badge>
          )}
          {isIdle && (
            <Badge className="bg-destructive/10 text-destructive border-0 text-xs">+60min parado</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}