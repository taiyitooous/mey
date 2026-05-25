import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import TeamScoreboard from "@/components/atividades/TeamScoreboard";
import TeamActivityChart from "@/components/atividades/TeamActivityChart";
import SellerCard from "@/components/atividades/SellerCard";
import SellerProfilePage from "@/components/atividades/SellerProfilePage";
import QualificacoesList from "@/components/atividades/QualificacoesList";
import QualificacoesPorHorario from "@/components/atividades/QualificacoesPorHorario";
import RelatorioLigacoes from "@/components/atividades/RelatorioLigacoes";
import WavoipHistorico from "@/components/atividades/WavoipHistorico";
import { subDays } from "date-fns";
import { getCategory, isCallAttempt } from "@/lib/eventUtils";
import { FileBarChart, Smartphone } from "lucide-react";

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
  { key: "custom", label: "Personalizado" },
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
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [activeView, setActiveView] = useState("geral"); // "geral" | "wavoip"
  const [customStart, setCustomStart] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  const [customEnd, setCustomEnd] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  const queryClient = useQueryClient();

  // Filtro de período
  const getDateRange = () => {
    if (timeRange === "custom") {
      return {
        startDate: new Date(customStart + "T00:00:00-03:00").getTime(),
        endDate: new Date(customEnd + "T23:59:59.999-03:00").getTime(),
      };
    }
    const range = TIME_RANGES.find(r => r.key === timeRange);
    return {
      startDate: range.getStart(),
      endDate: range.getEnd ? range.getEnd() : new Date(),
    };
  };

  const { data: events = [] } = useQuery({
    queryKey: ["events_atividades", timeRange, customStart, customEnd],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const startMs = typeof startDate === "number" ? startDate : new Date(startDate).getTime();
      const endMs = typeof endDate === "number" ? endDate : new Date(endDate).getTime();

      // Busca paginada sem filtro de data no servidor (filtra no cliente)
      let all = [];
      let skip = 0;
      const batchSize = 500;
      while (true) {
        const batch = await base44.entities.Event.list("-created_date", batchSize, skip);
        // Filtra pelo período no cliente
        const inRange = batch.filter((e) => {
          const t = new Date(e.created_date).getTime();
          return t >= startMs && t <= endMs;
        });
        all = all.concat(inRange);
        // Se o último evento do batch já é anterior ao startDate, para
        if (batch.length < batchSize) break;
        const lastEventTime = new Date(batch[batch.length - 1].created_date).getTime();
        if (lastEventTime < startMs) break;
        skip += batchSize;
      }
      return all;
    },
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 1,
  });

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.Event.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["events_atividades"], exact: false });
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
      if (selectedChannel === "whatsapp") {
        // Apenas eventos Wavoip reais (source === "whatsapp")
        filtered = filtered.filter((e) => e.source === "whatsapp" && getCategory(e.event_type) === "whatsapp");
      } else {
        filtered = filtered.filter((e) => getCategory(e.event_type) === selectedChannel);
      }
    }
    
    // Filtro de resultado apenas
    if (resultOnly) {
      filtered = filtered.filter((e) => RESULT_EVENTS.includes(e.event_type));
    }
    
    return filtered;
  }, [events, selectedChannel, resultOnly]);

  const filteredEventIds = useMemo(() => new Set(filteredEvents.map((e) => e.id)), [filteredEvents]);

  const sellers = useMemo(() => {
    // Vendedores com qualquer atividade em TODO o período (3C, WhatsApp, etc)
    const sellersWithActivity = new Set(
      events
        .filter((e) => e.user_name && e.user_name !== "Sistema")
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

    // Consolidar por firstName — encontra correspondências por substring
    const consolidated = {};
    const processed = new Set();

    Object.entries(map).forEach(([key, seller]) => {
      if (processed.has(key)) return;

      const sellerFirstName = seller.name.split(" ")[0].toLowerCase().trim();
      let mergedSeller = { ...seller, events: [...seller.events] };
      
      // Verificar se tem Wavoip
      const hasWavoip = wavoipUserNames.has(sellerFirstName);

      // Procura por outros com primeiro nome similar (substring ou exato)
      Object.entries(map).forEach(([otherKey, otherSeller]) => {
        if (otherKey === key || processed.has(otherKey)) return;

        const otherFirstName = otherSeller.name.split(" ")[0].toLowerCase().trim();
        const otherHasWavoip = wavoipUserNames.has(otherFirstName);
        
        // Match se forem iguais ou um contiver o outro (substring)
        const isMatch = sellerFirstName === otherFirstName || 
                       sellerFirstName.includes(otherFirstName) || 
                       otherFirstName.includes(sellerFirstName);
        
        if (isMatch) {
          // Mescla eventos
          mergedSeller.events.push(...otherSeller.events);
          
          // Preferir nome mais longo (mais completo) ou quem tem Wavoip
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

      processed.add(key);
      consolidated[sellerFirstName] = mergedSeller;
    });

    // Retornar qualquer um com atividade
    return Object.values(consolidated)
      .filter((seller) => {
        const sellerKey = seller.name.split(" ")[0].toLowerCase().trim();
        // Considera ativo se tiver qualquer evento (email vazio não deve bloquear)
        return sellersWithActivity.has(sellerKey) || seller.events.length > 0;
      })
      .map((seller) => ({
        ...seller,
        displayEvents: seller.events.filter((e) => filteredEventIds.has(e.id))
      }))
      .filter((seller) => seller.displayEvents.length > 0)
      .sort((a, b) => b.events.length - a.events.length);
  }, [filteredEvents, events, wavoipUserNames, userAvatarMap, sellerConfigMap]);

  const periodoLabel = useMemo(() => {
    if (timeRange === "custom") return `${customStart} → ${customEnd}`;
    return TIME_RANGES.find(r => r.key === timeRange)?.label || timeRange;
  }, [timeRange, customStart, customEnd]);

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
    <>
    {showRelatorio && (
      <RelatorioLigacoes
        events={events}
        onClose={() => setShowRelatorio(false)}
        periodoLabel={periodoLabel}
      />
    )}
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Check-in & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Performance do time em tempo real</p>
          </div>
          
          {/* Filtros de período + botão relatório */}
          <div className="flex gap-2 flex-wrap justify-end items-center">
            <button
              onClick={() => setShowRelatorio(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <FileBarChart className="w-3.5 h-3.5" />
              Relatório ligações
            </button>
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
            {timeRange === "custom" && (
              <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1">
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs bg-transparent text-foreground border-none outline-none w-32 cursor-pointer"
                />
                <span className="text-muted-foreground text-xs">→</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs bg-transparent text-foreground border-none outline-none w-32 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Abas de visão */}
      <div className="flex gap-1 border-b border-border pb-0 mb-0">
        <button
          onClick={() => setActiveView("geral")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeView === "geral"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Visão Geral (3C)
        </button>
        <button
          onClick={() => setActiveView("wavoip")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeView === "wavoip"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Wavoip / WhatsApp
        </button>
      </div>

      {/* Filtros de canal e resultado — só na visão geral */}
      {activeView === "geral" && <div className="flex gap-2 flex-wrap items-center pb-2 border-b border-border">
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
      </div>}

      {/* Vista Wavoip */}
      {activeView === "wavoip" && (
        <WavoipHistorico events={events} />
      )}

      {/* Vista Geral */}
      {activeView === "geral" && <>
      {/* Row 1: Scoreboard */}
      <TeamScoreboard events={filteredEvents} />

      {/* Row 2: Activity chart */}
      <TeamActivityChart events={filteredEvents} />

      {/* Row 2.5: Qualificações */}
      <QualificacoesList events={filteredEvents} />

      {/* Row 2.6: Qualificações por horário */}
      <QualificacoesPorHorario events={filteredEvents} />

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
              const config = sellerConfigMap[normalizedKey];
              return (
                <SellerCard
                  key={seller.email || seller.name}
                  seller={{ ...seller, events: seller.displayEvents }}
                  avatarUrl={userAvatarMap[seller.email] || userAvatarMap[seller.name]}
                  sellerConfig={config}
                  onConfigUpdated={refetchConfigs}
                  onClick={() => setSelectedSeller({ ...seller, events: seller.events })}
                  selectedChannel={selectedChannel}
                />
              );
            })}
          </div>
        )}
      </div>
      </>}
    </div>
    </>
  );
}