import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Trophy, AlertTriangle, ArrowRight } from "lucide-react";
import { differenceInMinutes, formatDistanceToNow, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { getCategory, isEffectiveContact, isCallAttempt } from "@/lib/eventUtils";
import { useQueryClient } from "@tanstack/react-query";
import SellerAvatarEditor from "./SellerAvatarEditor";

function buildSparkline(events) {
  const hourly = {};
  for (let h = 7; h <= 20; h++) hourly[h] = { h, v: 0 };
  events.forEach((e) => {
    const h = getHours(new Date(e.created_date));
    if (hourly[h]) hourly[h].v++;
  });
  return Object.values(hourly);
}

export default function SellerCard({ seller, onClick, avatarUrl, sellerConfig, onConfigUpdated }) {
  const { name, events } = seller;
  const displayName = sellerConfig?.display_name || name;
  const sorted = [...events].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastEvent = sorted[0];
  const lastDate = lastEvent ? new Date(lastEvent.created_date) : null;
  const minsAgo = lastDate ? differenceInMinutes(new Date(), lastDate) : null;

  const isActive = minsAgo !== null && minsAgo < 15;
  const isIdle = minsAgo !== null && minsAgo >= 60;

  const calls = events.filter((e) => getCategory(e.event_type) === "call").length;
  const whas = events.filter((e) => getCategory(e.event_type) === "whatsapp").length;
  const wins = events.filter((e) => e.event_type === "lead.won").length;
  const losses = events.filter((e) => e.event_type === "lead.lost").length;
  const effective = events.filter(isEffectiveContact).length;
  // Taxa de contato = ligações atendidas / total de ligações
  const contactRate = calls > 0 ? Math.round((effective / calls) * 100) : 0;

  const sparkData = buildSparkline(events);

  const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const borderColor = isActive ? "border-success/40" : isIdle ? "border-destructive/40" : "";
  const bgColor = isActive ? "" : isIdle ? "bg-destructive/5" : "";

  return (
    <Card className={`p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all duration-200 ${borderColor} ${bgColor}`} onClick={onClick}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <SellerAvatarEditor
            sellerKey={name}
            displayName={sellerConfig?.display_name}
            avatarUrl={sellerConfig?.avatar_url || avatarUrl}
            onUpdated={onConfigUpdated}
            size="md"
          />
          <div className="min-w-0 -ml-2">
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-success animate-pulse" : isIdle ? "bg-destructive" : "bg-muted-foreground/50"}`} />
              <p className="text-xs text-muted-foreground truncate">
                {isActive ? "Ativo agora" : lastDate ? `Há ${formatDistanceToNow(lastDate, { locale: ptBR })}` : "Sem atividade"}
              </p>
            </div>
          </div>
        </div>
        {isIdle && <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { icon: Phone, value: calls, label: "3C" },
          { icon: MessageCircle, value: whas, label: "WA" },
          { icon: Trophy, value: wins, label: "Ganhos" },
          { label: "Contato", value: `${contactRate}%`, plain: true },
        ].map(({ icon: Icon, value, label, plain }) => (
          <div key={label} className="text-center bg-muted/50 rounded-lg py-2">
            {Icon && !plain ? <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" /> : null}
            <p className="text-sm font-bold leading-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      {events.length > 0 && (
        <div className="h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-1 flex-wrap">
          {wins > 0 && <Badge className="bg-success/10 text-success border-0 text-xs">{wins} ganhos</Badge>}
          {losses > 0 && <Badge className="bg-destructive/10 text-destructive border-0 text-xs">{losses} perdidos</Badge>}
          {isIdle && <Badge className="bg-destructive/10 text-destructive border-0 text-xs">+60min parado</Badge>}
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-primary h-6 px-2 shrink-0">
          Ver perfil <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </Card>
  );
}