import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Trophy, AlertTriangle, ArrowRight, Trash2 } from "lucide-react";
import { differenceInMinutes, formatDistanceToNow, getHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { getCategory, isEffectiveContact, isCallAttempt, deduplicateCallEvents } from "@/lib/eventUtils";
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



export default function SellerCard({ seller, onClick, avatarUrl, sellerConfig, onConfigUpdated, onDeleteProfile }) {
  const { name, events } = seller;
  const displayName = sellerConfig?.display_name || name;
  const sorted = [...events].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastEvent = sorted[0];
  const lastDate = lastEvent ? new Date(lastEvent.created_date) : null;
  const minsAgo = lastDate ? differenceInMinutes(new Date(), lastDate) : null;

  const isActive = minsAgo !== null && minsAgo < 15;
  const isIdle = minsAgo !== null && minsAgo >= 60;

  const dedupedCalls = deduplicateCallEvents(events);
  const calls = dedupedCalls.length;
  const whas = events.filter((e) => getCategory(e.event_type) === "whatsapp").length;
  const wins = events.filter((e) => e.event_type === "lead.won").length;
  const losses = events.filter((e) => e.event_type === "lead.lost").length;
  const effective = dedupedCalls.filter((e) => isEffectiveContact(e)).length;
  const contactRate = calls > 0 ? Math.round(effective / calls * 100) : 0;

  // Calculate status and time
  const statusInfo = useMemo(() => {
    if (!lastDate) return { status: "Offline", color: "bg-gray-400", time: "00:00:00" };

    const lastCallType = lastEvent?.payload ? JSON.parse(lastEvent.payload)?.source : null;
    let status = "Manual";
    let color = "bg-orange-500";

    if (isActive) {
      status = "Falando";
      color = "bg-green-500";
    } else if (isIdle) {
      status = "Ocioso";
      color = "bg-red-500";
    } else if (minsAgo && minsAgo < 60) {
      status = "Manual";
      color = "bg-orange-500";
    } else if (minsAgo && minsAgo >= 60) {
      status = "Offline";
      color = "bg-gray-400";
    }

    // Calculate total time (duration of all calls in HH:MM:SS)
    let totalSeconds = 0;
    events.forEach((e) => {
      if (e.payload) {
        try {
          const payload = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
          const speakingTime = payload?.speaking_time;
          if (typeof speakingTime === "string") {
            const parts = speakingTime.split(":").map(Number);
            const h = parts[0] || 0;
            const m = parts[1] || 0;
            const s = parts[2] || 0;
            totalSeconds += h * 3600 + m * 60 + s;
          }
        } catch (_) {}
      }
    });
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor(totalSeconds % 3600 / 60);
    const secs = totalSeconds % 60;
    const time = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    return { status, color, time };
  }, [lastDate, lastEvent, isActive, isIdle, minsAgo, events]);

  const sparkData = buildSparkline(events);

  const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const borderColor = isActive ? "border-success/40" : isIdle ? "border-destructive/40" : "";
  const bgColor = isActive ? "" : isIdle ? "bg-destructive/5" : "";

  return (
    <Card className={`p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all duration-200 ${borderColor} ${bgColor} border`} onClick={onClick}>
      {/* Header with status */}
      <div className="flex items-start justify-between gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <SellerAvatarEditor
            sellerKey={name}
            displayName={sellerConfig?.display_name}
            avatarUrl={sellerConfig?.avatar_url || avatarUrl}
            onUpdated={onConfigUpdated}
            size="sm" />
          
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{calls} ligações reais</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="bg-green-500 text-[10px] mx-12 font-medium rounded-full whitespace-nowrap">
            {statusInfo.status}
          </span>
          
          <Button
            variant="ghost"
            size="icon" className="text-destructive mt-2 text-sm font-medium rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground h-6 w-6 hover:bg-destructive/10"

            onClick={(e) => {
              e.stopPropagation();
              onDeleteProfile?.(name);
            }}>
            
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
        { icon: Phone, value: calls, label: "3C" },
        { icon: MessageCircle, value: whas, label: "WA" },
        { icon: Trophy, value: wins, label: "Ganhos" },
        { label: "Contato", value: `${contactRate}%`, plain: true }].
        map(({ icon: Icon, value, label, plain }) =>
        <div key={label} className="text-center bg-muted/50 rounded-lg py-2">
            {Icon && !plain ? <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" /> : null}
            <p className="text-sm font-bold leading-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        )}
      </div>

      {/* Sparkline */}
      {events.length > 0 &&
      <div className="h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      }

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
    </Card>);

}