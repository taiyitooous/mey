import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import TeamScoreboard from "@/components/atividades/TeamScoreboard";
import TeamActivityChart from "@/components/atividades/TeamActivityChart";
import SellerCard from "@/components/atividades/SellerCard";
import SellerProfilePage from "@/components/atividades/SellerProfilePage";
import {
  startOfDay, startOfYesterday, endOfYesterday,
  startOfWeek, subDays,
} from "date-fns";
import { getCategory } from "@/lib/eventUtils";

const TIME_RANGES = [
  { key: "hoje", label: "Hoje", getStart: () => startOfDay(new Date()) },
  { key: "ontem", label: "Ontem", getStart: () => startOfYesterday(), getEnd: () => endOfYesterday() },
  { key: "7d", label: "7 dias", getStart: () => startOfDay(subDays(new Date(), 6)) },
  { key: "30d", label: "30 dias", getStart: () => startOfDay(subDays(new Date(), 29)) },
];

const CHANNELS = [
  { key: "all", label: "Todos" },
  { key: "call", label: "3C" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "stage", label: "Etapa" },
  { key: "won", label: "Ganho" },
  { key: "lost", label: "Perdido" },
  { key: "collection", label: "Cobrança" },
];

const RESULT_EVENTS = [
  "lead.won", "lead.lost", "payment.paid",
  "collection.promise_made", "collection.agreement_made",
  "call_answered", "whatsapp_replied",
];

export default function Atividades() {
  const [timeRange, setTimeRange] = useState("hoje");
  const [channelFilter, setChannelFilter] = useState("all");
  const [onlyWithResult, setOnlyWithResult] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const queryClient = useQueryClient();

  const range = TIME_RANGES.find((r) => r.key === timeRange) || TIME_RANGES[0];
  const startDate = range.getStart();
  const endDate = range.getEnd ? range.getEnd() : new Date();

  const { data: events = [] } = useQuery({
    queryKey: ["events_all", timeRange],
    queryFn: () => base44.entities.Event.filter(
      { created_date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() } },
      "-created_date",
      2000
    ),
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Real-time subscription para refetch imediato
  useEffect(() => {
    const unsubscribe = base44.entities.Event.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["events_all", timeRange] });
    });

    return unsubscribe;
  }, [queryClient, timeRange]);

  const { data: users = [] } = useQuery({
    queryKey: ["users_all"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: sellerConfigs = [], refetch: refetchConfigs } = useQuery({
    queryKey: ["seller_configs"],
    queryFn: () => base44.entities.SellerConfig.list(),
  });

  const userAvatarMap = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (u.avatar_url) {
        if (u.full_name) map[u.full_name] = u.avatar_url;
        if (u.email) map[u.email] = u.avatar_url;
      }
    });
    return map;
  }, [users]);

  const sellerConfigMap = useMemo(() => {
    const map = {};
    sellerConfigs.forEach((c) => { map[c.seller_key] = c; });
    return map;
  }, [sellerConfigs]);

  const timeFiltered = events;

  const channelFiltered = useMemo(
    () => channelFilter === "all"
      ? timeFiltered
      : timeFiltered.filter((e) => getCategory(e.event_type) === channelFilter),
    [timeFiltered, channelFilter]
  );

  const filtered = useMemo(
    () => onlyWithResult
      ? channelFiltered.filter((e) => RESULT_EVENTS.includes(e.event_type))
      : channelFiltered,
    [channelFiltered, onlyWithResult]
  );

  const sellers = useMemo(() => {
    const map = {};
    // Always group by time-filtered events for seller cards
    timeFiltered.forEach((event) => {
      const key = event.user_name || event.created_by || "Sistema";
      if (!map[key]) map[key] = { name: key, events: [] };
      map[key].events.push(event);
    });
    return Object.values(map).sort((a, b) => b.events.length - a.events.length);
  }, [timeFiltered]);

  // If a seller profile is open, show full-page view
  if (selectedSeller) {
    return (
      <SellerProfilePage
        seller={selectedSeller}
        avatarUrl={userAvatarMap[selectedSeller?.name]}
        sellerConfig={sellerConfigMap[selectedSeller?.name]}
        onClose={() => setSelectedSeller(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Check-in & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance do time em tempo real</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                timeRange === r.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              onClick={() => setChannelFilter(c.key)}
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                channelFilter === c.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOnlyWithResult(!onlyWithResult)}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors shrink-0 ${
            onlyWithResult
              ? "bg-success/10 text-success border-success/30"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          ✓ Somente com resultado
        </button>
      </div>

      {/* Row 1: Scoreboard */}
      <TeamScoreboard events={filtered} />

      {/* Row 2: Activity chart */}
      <TeamActivityChart events={timeFiltered} />

      {/* Row 3: Seller cards */}
      <div>
        <h2 className="text-base font-semibold mb-3">Time</h2>
        {sellers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">Nenhuma atividade no período</p>
            <p className="text-sm mt-1">Tente ampliar o intervalo de tempo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sellers.map((seller) => (
              <SellerCard
                key={seller.name}
                seller={seller}
                avatarUrl={userAvatarMap[seller.name]}
                sellerConfig={sellerConfigMap[seller.name]}
                onConfigUpdated={refetchConfigs}
                onClick={() => setSelectedSeller(seller)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}