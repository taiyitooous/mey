import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import TeamScoreboard from "@/components/atividades/TeamScoreboard";
import TeamActivityChart from "@/components/atividades/TeamActivityChart";
import SellerCard from "@/components/atividades/SellerCard";
import SellerProfilePage from "@/components/atividades/SellerProfilePage";
import { subDays } from "date-fns";
import { getCategory, isCallAttempt } from "@/lib/eventUtils";

// Retorna início/fim do dia em SP (em timestamps UTC)
function startOfDaySP(date = new Date()) {
  const spStr = date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Date(spStr + "T00:00:00-03:00").getTime();
}

function endOfDaySP(date = new Date()) {
  const spStr = date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Date(spStr + "T23:59:59.999-03:00").getTime();
}

const TIME_RANGES = [
  { key: "hoje", label: "Hoje", getStart: () => startOfDaySP(new Date()) },
  { key: "ontem", label: "Ontem", getStart: () => startOfDaySP(subDays(new Date(), 1)), getEnd: () => endOfDaySP(subDays(new Date(), 1)) },
  { key: "7d", label: "7 dias", getStart: () => startOfDaySP(subDays(new Date(), 6)) },
  { key: "30d", label: "30 dias", getStart: () => startOfDaySP(subDays(new Date(), 29)) },
];

const CHANNELS = [
  { key: "all", label: "Todos" },
  { key: "call", label: "3C" },
  { key: "whatsapp", label: "WhatsApp Wavoip" },
  { key: "stage", label: "Etapa" },
  { key: "won", label: "Ganho" },
  { key: "lost", label: "Perdido" },
  { key: "collection", label: "Cobrança" },
];

const RESULT_EVENTS = [
  "lead.won", "lead.lost", "payment.paid",
  "collection.promise_made", "collection.agreement_made",
  "call_answered", "whatsapp_replied", "whatsapp_call_received",
];

export default function Atividades() {
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [timeRange, setTimeRange] = useState("hoje");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [resultOnly, setResultOnly] = useState(false);
  const queryClient = useQueryClient();

  // Filtro de período
  const getDateRange = () => {
    const range = TIME_RANGES.find(r => r.key === timeRange);
    return {
      startDate: range.getStart(),
      endDate: range.getEnd ? range.getEnd() : new Date(),
    };
  };

  const { data: events = [] } = useQuery({
    queryKey: ["events_atividades", timeRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const all = await base44.entities.Event.list("-created_date", 2000);
      return all.filter((e) => {
        const eventDateSP = new Date(e.created_date).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const startDateSP = new Date(startDate).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const endDateSP = new Date(endDate).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        return eventDateSP >= startDateSP && eventDateSP <= endDateSP;
      });
    },
    refetchInterval: 5000,
    staleTime: 0,
    gcTime: 0,
  });

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.Event.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["events_atividades"], exact: false });
    });

    return unsubscribe;
  }, [queryClient]);

  // Force refetch quando timeRange muda
  useEffect(() => {
    queryClient.refetchQueries({ queryKey: ["events_atividades"] });
  }, [timeRange, queryClient]);

  const { data: users = [] } = useQuery({
    queryKey: ["users_all"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: sellerConfigs = [], refetch: refetchConfigs } = useQuery({
    queryKey: ["seller_configs"],
    queryFn: () => base44.entities.SellerConfig.list(),
  });

  const { data: wavoipConfigs = [] } = useQuery({
    queryKey: ["wavoip_configs"],
    queryFn: () => base44.entities.WavoipConfig.list(),
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
    sellerConfigs.forEach((c) => { 
      map[c.seller_key] = c;
    });
    return map;
  }, [sellerConfigs]);

  const wavoipUserNames = useMemo(() => {
    const names = new Set();
    wavoipConfigs.forEach((c) => {
      if (c.user_name) names.add(c.user_name.split(" ")[0].toLowerCase().trim());
    });
    return names;
  }, [wavoipConfigs]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    // Filtro de canal
    if (selectedChannel !== "all") {
      filtered = filtered.filter((e) => getCategory(e.event_type) === selectedChannel);
    }
    
    // Filtro de resultado apenas
    if (resultOnly) {
      filtered = filtered.filter((e) => RESULT_EVENTS.includes(e.event_type));
    }
    
    return filtered;
  }, [events, selectedChannel, resultOnly]);

  const sellers = useMemo(() => {
    // Vendedores com 3C em TODO o período
    const sellersWith3C = new Set(
      events
        .filter(isCallAttempt)
        .map((e) => e.user_name?.split(" ")[0].toLowerCase().trim())
    );

    // Construir mapa com TODOS os eventos (não apenas filteredEvents)
    const map = {};

    events.forEach((event) => {
      const email = event.user_email?.toLowerCase().trim();
      const name = event.user_name?.trim();
      const firstName = name ? name.split(" ")[0].toLowerCase().trim() : null;

      const key = email || firstName || "sistema";

      if (!map[key]) {
        map[key] = { email: email || "", name: name || key, events: [] };
      } else {
        // Preferir nome mais completo
        if (name && name.length > map[key].name.length) {
          map[key].name = name;
        }
        if (email) map[key].email = email;
      }

      map[key].events.push(event);
    });

    // Consolidar por firstName
    const consolidated = {};
    const processed = new Set();

    Object.entries(map).forEach(([key, seller]) => {
      if (processed.has(key)) return;

      const sellerFirstName = seller.name.split(" ")[0].toLowerCase().trim();
      let mergedSeller = { ...seller, events: [] };
      
      // Verificar se tem Wavoip
      const hasWavoip = wavoipUserNames.has(sellerFirstName);

      // Procura por outros com mesmo firstName e mescla
      Object.entries(map).forEach(([otherKey, otherSeller]) => {
        if (otherKey === key && !processed.has(otherKey)) {
          mergedSeller.events.push(...seller.events);
          processed.add(key);
          return;
        }

        const otherFirstName = otherSeller.name.split(" ")[0].toLowerCase().trim();
        
        if (sellerFirstName === otherFirstName && otherKey !== key && !processed.has(otherKey)) {
          const otherHasWavoip = wavoipUserNames.has(otherFirstName);
          
          // Mescla eventos
          mergedSeller.events.push(...otherSeller.events);
          
          // Preferir quem tem Wavoip para nome/email
          if (otherHasWavoip && !hasWavoip) {
            mergedSeller.name = otherSeller.name;
            mergedSeller.email = otherSeller.email;
          } else if (otherSeller.name.length > mergedSeller.name.length) {
            mergedSeller.name = otherSeller.name;
          }
          if (!mergedSeller.email && otherSeller.email) {
            mergedSeller.email = otherSeller.email;
          }
          
          processed.add(otherKey);
        }
      });

      if (!processed.has(key)) {
        mergedSeller.events.push(...seller.events);
        processed.add(key);
      }

      consolidated[sellerFirstName] = mergedSeller;
    });

    // Retornar apenas os que têm 3C
    return Object.values(consolidated)
      .filter((seller) => {
        const sellerKey = seller.name.split(" ")[0].toLowerCase().trim();
        return sellersWith3C.has(sellerKey);
      })
      .map((seller) => ({
        ...seller,
        events: seller.events.filter((e) => filteredEvents.some((fe) => fe.id === e.id))
      }))
      .filter((seller) => seller.events.length > 0)
      .sort((a, b) => b.events.length - a.events.length);
  }, [filteredEvents, events, wavoipUserNames, userAvatarMap, sellerConfigMap]);

  // If a seller profile is open, show full-page view
  if (selectedSeller) {
    // Chave normalizada para buscar config (primeiro nome em minúsculas)
    const normalizedKey = selectedSeller.name ? selectedSeller.name.split(" ")[0].toLowerCase().trim() : "";
    return (
      <SellerProfilePage
        seller={selectedSeller}
        avatarUrl={userAvatarMap[selectedSeller?.name]}
        sellerConfig={sellerConfigMap[normalizedKey]}
        onClose={() => setSelectedSeller(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Check-in & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Performance do time em tempo real</p>
          </div>
          
          {/* Filtros de período */}
          <div className="flex gap-2 flex-wrap justify-end">
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeRange === range.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros de canal e resultado */}
      <div className="flex gap-2 flex-wrap items-center pb-2 border-b border-border">
        <div className="flex gap-1.5 flex-wrap">
          {CHANNELS.map((channel) => (
            <button
              key={channel.key}
              onClick={() => setSelectedChannel(channel.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedChannel === channel.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {channel.label}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setResultOnly(!resultOnly)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ml-auto ${
            resultOnly
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          ✓ Somente com resultado
        </button>
      </div>

      {/* Row 1: Scoreboard */}
      <TeamScoreboard events={filteredEvents} />

      {/* Row 2: Activity chart */}
      <TeamActivityChart events={filteredEvents} />

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
            {sellers.map((seller) => {
              // Chave normalizada para buscar config (primeiro nome em minúsculas)
              const normalizedKey = seller.name ? seller.name.split(" ")[0].toLowerCase().trim() : "";
              return (
                <SellerCard
                  key={seller.email || seller.name}
                  seller={seller}
                  avatarUrl={userAvatarMap[seller.email] || userAvatarMap[seller.name]}
                  sellerConfig={sellerConfigMap[normalizedKey]}
                  onConfigUpdated={refetchConfigs}
                  onClick={() => setSelectedSeller(seller)}
                  selectedChannel={selectedChannel}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}