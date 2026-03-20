import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import HourLeaderboard from "@/components/atividades/HourLeaderboard";
import SellerCard from "@/components/atividades/SellerCard";
import SellerProfileDialog from "@/components/atividades/SellerProfileDialog";
import {
  startOfDay,
  startOfYesterday,
  endOfYesterday,
  subHours,
  startOfWeek,
} from "date-fns";

const TIME_RANGES = [
  { key: "2h", label: "Últimas 2h", getStart: () => subHours(new Date(), 2) },
  { key: "hoje", label: "Hoje", getStart: () => startOfDay(new Date()) },
  { key: "24h", label: "Últimas 24h", getStart: () => subHours(new Date(), 24) },
  {
    key: "ontem",
    label: "Ontem",
    getStart: () => startOfYesterday(),
    getEnd: () => endOfYesterday(),
  },
  {
    key: "semana",
    label: "Semana",
    getStart: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  },
];

const ACTION_TYPES = [
  { key: "all", label: "Todos" },
  { key: "call", label: "3C" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "stage", label: "Etapa" },
  { key: "won", label: "Ganho" },
  { key: "lost", label: "Perdido" },
  { key: "collection", label: "Cobrança" },
  { key: "payment", label: "Pagamento" },
];

const RESULT_EVENTS = [
  "lead.won",
  "lead.lost",
  "payment.paid",
  "collection.promise_made",
  "collection.agreement_made",
];

function getCategory(eventType) {
  if (eventType?.includes("call")) return "call";
  if (eventType?.includes("whatsapp")) return "whatsapp";
  if (eventType?.includes("stage_changed")) return "stage";
  if (eventType === "lead.won") return "won";
  if (eventType === "lead.lost") return "lost";
  if (eventType === "payment.paid") return "payment";
  if (eventType?.startsWith("collection.")) return "collection";
  return "other";
}

export default function Atividades() {
  const [timeRange, setTimeRange] = useState("hoje");
  const [actionFilter, setActionFilter] = useState("all");
  const [onlyWithResult, setOnlyWithResult] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events_all"],
    queryFn: () => base44.entities.Event.list("-created_date", 1000),
    refetchInterval: 60000, // refresh every minute
  });

  const range = TIME_RANGES.find((r) => r.key === timeRange) || TIME_RANGES[1];
  const startDate = range.getStart();
  const endDate = range.getEnd ? range.getEnd() : new Date();

  // Filter by time range
  const timeFiltered = useMemo(
    () =>
      events.filter((e) => {
        const d = new Date(e.created_date);
        return d >= startDate && d <= endDate;
      }),
    [events, timeRange]
  );

  // Filter by action type
  const actionFiltered = useMemo(
    () =>
      actionFilter === "all"
        ? timeFiltered
        : timeFiltered.filter((e) => getCategory(e.event_type) === actionFilter),
    [timeFiltered, actionFilter]
  );

  // Filter by result
  const filtered = useMemo(
    () =>
      onlyWithResult
        ? actionFiltered.filter((e) => RESULT_EVENTS.includes(e.event_type))
        : actionFiltered,
    [actionFiltered, onlyWithResult]
  );

  // Group by seller
  const sellers = useMemo(() => {
    const map = {};
    filtered.forEach((event) => {
      const key = event.user_name || event.created_by || "Sistema";
      if (!map[key]) map[key] = { name: key, events: [] };
      map[key].events.push(event);
    });
    return Object.values(map).sort((a, b) => b.events.length - a.events.length);
  }, [filtered]);

  const statCards = [
    { label: "Total de ações", value: filtered.length },
    { label: "Vendedores ativos", value: sellers.length },
    { label: "Ganhos", value: filtered.filter((e) => e.event_type === "lead.won").length },
    {
      label: "Pagamentos",
      value: filtered.filter((e) => e.event_type === "payment.paid").length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
        <p className="text-sm text-muted-foreground mt-1">Check-in em tempo real do time</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Time range */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                timeRange === r.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Action type pills */}
        <div className="flex flex-wrap gap-1">
          {ACTION_TYPES.map((a) => (
            <button
              key={a.key}
              onClick={() => setActionFilter(a.key)}
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                actionFilter === a.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Only with result toggle */}
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Hour leaderboard */}
      {(timeRange === "hoje" || timeRange === "2h" || timeRange === "24h") && (
        <HourLeaderboard events={timeFiltered} />
      )}

      {/* Seller cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
        </div>
      ) : sellers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Nenhuma atividade no período selecionado</p>
          <p className="text-sm mt-1">Tente ampliar o intervalo de tempo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map((seller) => (
            <SellerCard
              key={seller.name}
              seller={seller}
              onClick={() => setSelectedSeller(seller)}
            />
          ))}
        </div>
      )}

      {/* Profile Dialog */}
      {selectedSeller && (
        <SellerProfileDialog
          seller={selectedSeller}
          open={!!selectedSeller}
          onClose={() => setSelectedSeller(null)}
        />
      )}
    </div>
  );
}