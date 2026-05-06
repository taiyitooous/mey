import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, DollarSign, PlusCircle, Users } from "lucide-react";
import { deduplicateCallEvents } from "@/lib/eventUtils";
import LeaderboardHeader from "@/components/leaderboard/LeaderboardHeader";
import LeaderboardKPIs from "@/components/leaderboard/LeaderboardKPIs";
import LeaderboardPodium from "@/components/leaderboard/LeaderboardPodium";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import LeaderboardCharts from "@/components/leaderboard/LeaderboardCharts";
import RegisterSaleModal from "@/components/leaderboard/RegisterSaleModal";
import RegisterLeadsModal from "@/components/leaderboard/RegisterLeadsModal";
import { getDateRange, PERIOD_OPTIONS, SALES_CRITERIA, COLLECTION_CRITERIA } from "@/lib/leaderboardUtils";

export default function Leaderboard() {
  const [period, setPeriod] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [salesCriteria, setSalesCriteria] = useState("conversion");
  const [collectionCriteria, setCollectionCriteria] = useState("payment_rate");
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);

  const { start, end } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["leaderboard_events", start, end],
    queryFn: () => base44.entities.Event.list("-created_date", 2000),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["leaderboard_orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 2000),
  });

  const { data: saleRecords = [] } = useQuery({
    queryKey: ["sale_records"],
    queryFn: () => base44.entities.SaleRecord.list("-created_date", 2000),
  });

  const { data: leadCounts = [] } = useQuery({
    queryKey: ["lead_daily_counts"],
    queryFn: () => base44.entities.LeadDailyCount.list("-date", 500),
  });

  // Filter events by period
  const filteredEvents = useMemo(() => {
    if (!start || !end) return events;
    return events.filter((e) => {
      const d = new Date(e.created_date);
      return d >= start && d <= end;
    });
  }, [events, start, end]);

  // Filter sale records by period
  const filteredSaleRecords = useMemo(() => {
    if (!start || !end) return saleRecords;
    return saleRecords.filter((r) => {
      const d = new Date(r.date + "T12:00:00");
      return d >= start && d <= end;
    });
  }, [saleRecords, start, end]);

  // Filter lead daily counts by period
  const filteredLeadCounts = useMemo(() => {
    if (!start || !end) return leadCounts;
    return leadCounts.filter((r) => {
      const d = new Date(r.date + "T12:00:00");
      return d >= start && d <= end;
    });
  }, [leadCounts, start, end]);

  // All known sellers (from sale records + lead counts) for modal selects
  const allSellers = useMemo(() => {
    const names = new Set();
    saleRecords.forEach((r) => r.seller_name && names.add(r.seller_name));
    leadCounts.forEach((r) => r.seller_name && names.add(r.seller_name));
    filteredEvents.forEach((e) => e.user_name && names.add(e.user_name.trim()));
    return Array.from(names).sort();
  }, [saleRecords, leadCounts, filteredEvents]);

  // Build sales sellers data (events + manual records)
  const salesData = useMemo(() => {
    const sellers = {};

    const ensure = (name) => {
      if (!sellers[name]) sellers[name] = { name, leadsSet: new Set(), manualLeads: 0, wins: 0, manualWins: 0, calls: 0, callsAnswered: 0, whatsapp: 0 };
    };

    // From events
    filteredEvents.forEach((e) => {
      if (!e.user_name) return;
      const name = e.user_name.trim();
      ensure(name);
      if (e.entity_type === "lead" && e.entity_id) sellers[name].leadsSet.add(e.entity_id);
      if (e.event_type === "lead.won") sellers[name].wins++;
      if (e.event_type === "whatsapp_sent" || e.event_type === "lead.whatsapp_sent") sellers[name].whatsapp++;
    });

    // From manual sale records
    filteredSaleRecords.forEach((r) => {
      if (!r.seller_name || r.type === "exit") return;
      ensure(r.seller_name);
      sellers[r.seller_name].manualWins++;
    });

    // From manual lead counts (daily, one per seller per day)
    filteredLeadCounts.forEach((r) => {
      if (!r.seller_name) return;
      ensure(r.seller_name);
      sellers[r.seller_name].manualLeads += r.lead_count || 0;
    });

    // Dedup calls
    const dedupedCalls = deduplicateCallEvents(filteredEvents);
    dedupedCalls.forEach((e) => {
      if (!e.user_name) return;
      const name = e.user_name.trim();
      ensure(name);
      sellers[name].calls++;
      try {
        const p = e.payload ? JSON.parse(e.payload) : {};
        if (p.result === "answered") sellers[name].callsAnswered++;
      } catch {}
    });

    return Object.values(sellers)
      .filter((s) => s.leadsSet.size > 0 || s.manualLeads > 0 || s.wins > 0 || s.manualWins > 0 || s.calls > 0)
      .map((s) => {
        const leads = s.leadsSet.size + s.manualLeads;
        const wins = s.wins + s.manualWins;
        return {
          name: s.name,
          leads,
          wins,
          calls: s.calls,
          callsAnswered: s.callsAnswered,
          whatsapp: s.whatsapp,
          conversion: leads > 0 ? ((wins / leads) * 100).toFixed(1) : "0.0",
          answerRate: s.calls > 0 ? ((s.callsAnswered / s.calls) * 100).toFixed(1) : "0.0",
        };
      });
  }, [filteredEvents, filteredSaleRecords, filteredLeadCounts]);

  // Build collection data
  const collectionData = useMemo(() => {
    const agents = {};

    filteredEvents.forEach((e) => {
      if (!e.user_name) return;
      if (!e.event_type?.startsWith("collection.") && e.event_type !== "payment.paid") return;
      const name = e.user_name.trim();
      if (!agents[name]) {
        agents[name] = { name, attempts: 0, promises: 0, agreements: 0, payments: 0, orders: new Set() };
      }
      if (e.entity_id) agents[name].orders.add(e.entity_id);
      if (e.event_type === "collection.call_attempted" || e.event_type === "collection.whatsapp_sent") agents[name].attempts++;
      if (e.event_type === "collection.promise_made") agents[name].promises++;
      if (e.event_type === "collection.agreement_made") agents[name].agreements++;
      if (e.event_type === "payment.paid") agents[name].payments++;
    });

    return Object.values(agents)
      .filter((a) => a.attempts > 0 || a.payments > 0)
      .map((a) => ({
        name: a.name,
        orders: a.orders.size,
        attempts: a.attempts,
        promises: a.promises,
        agreements: a.agreements,
        payments: a.payments,
        paymentRate: a.orders.size > 0 ? ((a.payments / a.orders.size) * 100).toFixed(1) : "0.0",
        conversionRate: a.attempts > 0 ? ((a.payments / a.attempts) * 100).toFixed(1) : "0.0",
      }));
  }, [filteredEvents]);

  const sortedSales = useMemo(() => {
    return [...salesData].sort((a, b) => {
      if (salesCriteria === "conversion") return parseFloat(b.conversion) - parseFloat(a.conversion);
      if (salesCriteria === "wins") return b.wins - a.wins;
      if (salesCriteria === "leads") return b.leads - a.leads;
      if (salesCriteria === "calls") return b.calls - a.calls;
      if (salesCriteria === "answer_rate") return parseFloat(b.answerRate) - parseFloat(a.answerRate);
      return 0;
    });
  }, [salesData, salesCriteria]);

  const sortedCollection = useMemo(() => {
    return [...collectionData].sort((a, b) => {
      if (collectionCriteria === "payment_rate") return parseFloat(b.paymentRate) - parseFloat(a.paymentRate);
      if (collectionCriteria === "payments") return b.payments - a.payments;
      if (collectionCriteria === "orders") return b.orders - a.orders;
      if (collectionCriteria === "attempts") return b.attempts - a.attempts;
      if (collectionCriteria === "conversion") return parseFloat(b.conversionRate) - parseFloat(a.conversionRate);
      return 0;
    });
  }, [collectionData, collectionCriteria]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <LeaderboardHeader
          period={period}
          setPeriod={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          setCustomStart={setCustomStart}
          setCustomEnd={setCustomEnd}
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLeadsModal(true)}
            className="border-border gap-2 text-muted-foreground hover:text-foreground"
          >
            <Users className="w-4 h-4" />
            Registrar Leads
          </Button>
          <Button
            size="sm"
            onClick={() => setShowSaleModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Venda
          </Button>
        </div>
      </div>

      {showSaleModal && (
        <RegisterSaleModal sellers={allSellers} onClose={() => setShowSaleModal(false)} />
      )}
      {showLeadsModal && (
        <RegisterLeadsModal sellers={allSellers} onClose={() => setShowLeadsModal(false)} />
      )}

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <TrendingUp className="w-4 h-4" /> Vendas
          </TabsTrigger>
          <TabsTrigger value="collection" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <DollarSign className="w-4 h-4" /> Cobrança
          </TabsTrigger>
        </TabsList>

        {/* VENDAS */}
        <TabsContent value="sales" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">Critério de ranking:</p>
            <Select value={salesCriteria} onValueChange={setSalesCriteria}>
              <SelectTrigger className="w-56 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALES_CRITERIA.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <LeaderboardKPIs data={sortedSales} type="sales" />
          {sortedSales.length > 0 && <LeaderboardPodium data={sortedSales} criteria={salesCriteria} type="sales" />}
          <LeaderboardCharts data={sortedSales} type="sales" />
          <LeaderboardTable data={sortedSales} criteria={salesCriteria} type="sales" loading={loadingEvents} />
        </TabsContent>

        {/* COBRANÇA */}
        <TabsContent value="collection" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">Critério de ranking:</p>
            <Select value={collectionCriteria} onValueChange={setCollectionCriteria}>
              <SelectTrigger className="w-56 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLECTION_CRITERIA.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <LeaderboardKPIs data={sortedCollection} type="collection" />
          {sortedCollection.length > 0 && <LeaderboardPodium data={sortedCollection} criteria={collectionCriteria} type="collection" />}
          <LeaderboardCharts data={sortedCollection} type="collection" />
          <LeaderboardTable data={sortedCollection} criteria={collectionCriteria} type="collection" loading={loadingEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}