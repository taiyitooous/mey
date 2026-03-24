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
      queryClient.invalidateQueries({ queryKey: ["events_atividades"] });
    });

    return unsubscribe;
  }, [queryClient]);

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
    sellerConfigs.forEach((c) => { 
      map[c.seller_key] = c;
    });
    return map;
  }, [sellerConfigs]);

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
     const emailMap = {}; // email → seller
     const firstNameMap = {}; // firstName → email (para consolidar duplicatas)

     filteredEvents.forEach((event) => {
       const email = event.user_email?.toLowerCase().trim();
       const name = event.user_name?.trim();
       const firstName = name ? name.split(" ")[0].toLowerCase().trim() : null;

       // Se temos email, usa como chave principal
       if (email) {
         if (!emailMap[email]) {
           emailMap[email] = { email, name: name || email, events: [] };
         }
         // Sempre prefere nome mais completo
         if (name && name.length > emailMap[email].name.length) {
           emailMap[email].name = name;
         }
         emailMap[email].events.push(event);
         // Mapeia firstName para esse email (para consolidar depois)
         if (firstName) firstNameMap[firstName] = email;
       } else if (firstName) {
         // Se não tem email, agrupa por firstName
         const mappedEmail = firstNameMap[firstName];
         if (mappedEmail && emailMap[mappedEmail]) {
           // Já tem entrada com email, adiciona aqui
           if (name && name.length > emailMap[mappedEmail].name.length) {
             emailMap[mappedEmail].name = name;
           }
           emailMap[mappedEmail].events.push(event);
         } else if (!emailMap[firstName]) {
           // Cria novo com firstName como fallback
           emailMap[firstName] = { email: "", name: name || firstName, events: [event] };
         } else {
           // Já tem entrada por firstName
           if (name && name.length > emailMap[firstName].name.length) {
             emailMap[firstName].name = name;
           }
           emailMap[firstName].events.push(event);
         }
       } else {
         // Sem email e sem nome, agrupa como "Sistema"
         if (!emailMap["sistema"]) {
           emailMap["sistema"] = { email: "", name: "Sistema", events: [] };
         }
         emailMap["sistema"].events.push(event);
       }
     });

     return Object.values(emailMap)
       .filter((seller) => seller.events.length > 0)
       .sort((a, b) => b.events.length - a.events.length);
   }, [filteredEvents]);

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
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}