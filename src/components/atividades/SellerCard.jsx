import React, { useMemo, useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Trophy, AlertTriangle, ArrowRight, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInMinutes, formatDistanceToNow, getHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { getCategory, isEffectiveContact, isCallAttempt, isWavoipCallAttempt, isWavoipCallAnswered, getCallQualification } from "@/lib/eventUtils";
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



export default function SellerCard({ seller, onClick, avatarUrl, sellerConfig, onConfigUpdated, selectedChannel }) {
  const { name, email, events } = seller;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [config, setConfig] = useState(sellerConfig);
  const queryClient = useQueryClient();
  const normalizedSellerKey = name ? name.split(" ")[0].toLowerCase().trim() : email?.toLowerCase().trim() || "sistema";
  const displayName = config?.display_name || name;
  
  // Auto-create config se não existir
  React.useEffect(() => {
    if (!config && name) {
      const createConfig = async () => {
        const newConfig = await base44.entities.SellerConfig.create({
          seller_key: normalizedSellerKey
        });
        setConfig(newConfig);
      };
      createConfig();
    }
  }, [config, name, normalizedSellerKey]);
  const sorted = [...events].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastEvent = sorted[0];
  const lastDate = lastEvent ? new Date(lastEvent.created_date) : null;
  const minsAgo = lastDate ? differenceInMinutes(new Date(), lastDate) : null;

  const isActive = minsAgo !== null && minsAgo < 15;
  const isIdle = minsAgo !== null && minsAgo >= 60;

  const calls = events.filter(isCallAttempt).length;
  const wins = events.filter((e) => e.event_type === "lead.won").length;
  const losses = events.filter((e) => e.event_type === "lead.lost").length;
  const effective = events.filter((e) => isCallAttempt(e) && isEffectiveContact(e)).length;
  const contactRate = calls > 0 ? Math.round(effective / calls * 100) : 0;
  
  // Qualificações das ligações 3C
  const qualifications = {};
  events.filter(isCallAttempt).forEach((e) => {
    const q = getCallQualification(e);
    if (q) {
      qualifications[q] = (qualifications[q] || 0) + 1;
    }
  });

  // WhatsApp Wavoip: deduplicar por call_id igual ao Scoreboard
  const wavoipRaw = events.filter((e) => e.source === "whatsapp" && isWavoipCallAttempt(e));
  const wavoipByCallId = {};
  wavoipRaw.forEach((e) => {
    try {
      const p = e.payload ? JSON.parse(e.payload) : {};
      const cid = p.call_id || e.entity_id;
      const priority = (ev) => (ev.event_type === "whatsapp_call_received" || ev.event_type === "whatsapp_call_answered") ? 3 : (ev.event_type === "whatsapp_call_missed" || ev.event_type === "whatsapp_call_ended") ? 2 : 1;
      const prev = wavoipByCallId[cid];
      if (!prev || priority(e) > priority(prev)) wavoipByCallId[cid] = e;
    } catch {
      wavoipByCallId[e.entity_id] = e;
    }
  });
  const dedupedWavoip = Object.values(wavoipByCallId);
  const whatsappCalls = dedupedWavoip.length;
  const whatsappAnswered = dedupedWavoip.filter((e) => e.event_type === "whatsapp_call_received").length;

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
    events.filter((e) => e.source === "3c").forEach((e) => {
      if (e.payload) {
        try {
          const payload = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
          const speakingTime = payload?.speaking_time;
          if (typeof speakingTime === "number") {
            totalSeconds += speakingTime;
          } else if (typeof speakingTime === "string") {
            const parts = speakingTime.split(":").map(Number);
            totalSeconds += (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
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

  const handleDelete = async () => {
    if (!config?.id) {
      console.log("Sem ID do seller config:", config);
      return;
    }
    try {
      console.log("Deletando seller config ID:", config.id);
      await base44.entities.SellerConfig.delete(config.id);
      queryClient.invalidateQueries({ queryKey: ["seller_configs"] });
      setConfig(null);
      setShowDeleteConfirm(false);
      console.log("Deletado com sucesso!");
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  // Não renderizar se config foi deletado
  if (config === null && sellerConfig !== null) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 flex flex-col gap-3 cursor-pointer border transition-all duration-200 group hover:shadow-lg ${borderColor} ${bgColor}`}
      style={{ background: "linear-gradient(135deg, hsl(150 14% 9%), hsl(150 17% 6%))" }}
      onClick={onClick}
    >
      {/* Accent line top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Header with avatar */}
      <div className="flex items-start justify-between gap-3 relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="shrink-0 relative">
            <SellerAvatarEditor
              sellerKey={normalizedSellerKey}
              displayName={config?.display_name}
              avatarUrl={config?.avatar_url || avatarUrl}
              onUpdated={onConfigUpdated}
              size="sm" />
            {isActive && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border border-card" />}
          </div>
          
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground/70 truncate">{calls} 3C{whatsappCalls > 0 ? ` · ${whatsappCalls} WA` : ""}</p>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Phone, value: calls, label: "3C" },
          { icon: MessageCircle, value: whatsappCalls, label: "WA" },
          { label: "Atend.", value: `${whatsappAnswered}/${whatsappCalls}`, plain: true },
          { label: "Taxa", value: `${contactRate}%`, plain: true }
        ].map(({ icon: Icon, value, label, plain }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {Icon && !plain && <Icon className="w-3.5 h-3.5 text-primary/60" />}
            <p className="text-xs font-extrabold text-foreground leading-tight tabular-nums">{value}</p>
            <p className="text-[10px] text-muted-foreground/60">{label}</p>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      {events.length > 0 && (
        <div className="h-8 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
              <Line type="monotone" dataKey="v" stroke="#4F8F63" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Qualificações */}
      {Object.keys(qualifications).length > 0 && (
        <div className="text-xs space-y-0.5 pt-2 border-t border-white/5">
          {Object.entries(qualifications).slice(0, 2).map(([q, count]) => (
            <div key={q} className="flex justify-between px-1">
              <span className="text-muted-foreground/70 capitalize">{q}:</span>
              <span className="font-semibold text-foreground/80">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1 flex-wrap">
          {wins > 0 && <Badge className="bg-success/15 text-success border-0 text-[10px] px-1.5 py-0.5">{wins} ganhos</Badge>}
          {minsAgo !== null && (
            <Badge className={`border-0 text-[10px] px-1.5 py-0.5 ${isActive ? "bg-success/15 text-success" : "bg-muted/40 text-muted-foreground/60"}`}>
              {isActive ? "ativo" : minsAgo >= 60 ? "ocioso" : "online"}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary h-5 px-1.5"
          onClick={(e) => { e.stopPropagation(); onClick?.({...seller, ...config}); }}
        >
          Ver <ArrowRight className="w-3 h-3 ml-0.5" />
        </Button>
      </div>
    </div>
  );

}