import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, PlusCircle, Users, Package, UserCog, ClipboardList } from "lucide-react";
import LeaderboardHeader from "@/components/leaderboard/LeaderboardHeader";
import LeaderboardKPIs from "@/components/leaderboard/LeaderboardKPIs";
import LeaderboardPodium from "@/components/leaderboard/LeaderboardPodium";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import LeaderboardCharts from "@/components/leaderboard/LeaderboardCharts";
import RegisterSaleModal from "@/components/leaderboard/RegisterSaleModal";
import RegisterLeadsModal from "@/components/leaderboard/RegisterLeadsModal";
import ManageProductsModal from "@/components/leaderboard/ManageProductsModal";
import ManageSellersModal from "@/components/leaderboard/ManageSellersModal";
import ManageSalesModal from "@/components/leaderboard/ManageSalesModal";
import { getDateRange, SALES_CRITERIA } from "@/lib/leaderboardUtils";

export default function Leaderboard() {
  const [period, setPeriod] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [salesCriteria, setSalesCriteria] = useState("wins");
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showSellersModal, setShowSellersModal] = useState(false);
  const [showManageSalesModal, setShowManageSalesModal] = useState(false);

  const { start, end } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const { data: saleRecords = [], isLoading: loadingSales } = useQuery({
    queryKey: ["sale_records"],
    queryFn: () => base44.entities.SaleRecord.list("-created_date", 2000),
  });

  const { data: registeredSellers = [] } = useQuery({
    queryKey: ["sellers"],
    queryFn: () => base44.entities.Seller.list("name", 200),
  });

  const { data: leadCounts = [] } = useQuery({
    queryKey: ["lead_daily_counts"],
    queryFn: () => base44.entities.LeadDailyCount.list("-date", 500),
  });

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

  // All known sellers: registered sellers first, then from records
  const allSellers = useMemo(() => {
    const names = new Set();
    registeredSellers.forEach((s) => s.name && names.add(s.name));
    saleRecords.forEach((r) => r.seller_name && names.add(r.seller_name));
    leadCounts.forEach((r) => r.seller_name && names.add(r.seller_name));
    return Array.from(names).sort();
  }, [registeredSellers, saleRecords, leadCounts]);

  // Build sales data from manual records only
  const salesData = useMemo(() => {
    const sellers = {};

    const ensure = (name) => {
      if (!sellers[name]) sellers[name] = { name, leads: 0, wins: 0 };
    };

    filteredSaleRecords.forEach((r) => {
      if (!r.seller_name || r.type === "exit") return;
      ensure(r.seller_name);
      sellers[r.seller_name].wins++;
    });

    filteredLeadCounts.forEach((r) => {
      if (!r.seller_name) return;
      ensure(r.seller_name);
      sellers[r.seller_name].leads += r.lead_count || 0;
    });

    return Object.values(sellers)
      .filter((s) => s.leads > 0 || s.wins > 0)
      .map((s) => ({
        name: s.name,
        leads: s.leads,
        wins: s.wins,
        conversion: s.leads > 0 ? ((s.wins / s.leads) * 100).toFixed(1) : "0.0",
      }));
  }, [filteredSaleRecords, filteredLeadCounts]);

  const sortedSales = useMemo(() => {
    return [...salesData].sort((a, b) => {
      if (salesCriteria === "conversion") return parseFloat(b.conversion) - parseFloat(a.conversion);
      if (salesCriteria === "wins") return b.wins - a.wins;
      if (salesCriteria === "leads") return b.leads - a.leads;
      return 0;
    });
  }, [salesData, salesCriteria]);

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
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManageSalesModal(true)}
            className="border-border gap-2 text-muted-foreground hover:text-foreground"
          >
            <ClipboardList className="w-4 h-4" />
            Gerenciar Vendas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSellersModal(true)}
            className="border-border gap-2 text-muted-foreground hover:text-foreground"
          >
            <UserCog className="w-4 h-4" />
            Vendedores
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProductsModal(true)}
            className="border-border gap-2 text-muted-foreground hover:text-foreground"
          >
            <Package className="w-4 h-4" />
            Produtos
          </Button>
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
      {showManageSalesModal && (
        <ManageSalesModal sellers={allSellers} onClose={() => setShowManageSalesModal(false)} />
      )}
      {showLeadsModal && (
        <RegisterLeadsModal sellers={allSellers} onClose={() => setShowLeadsModal(false)} />
      )}
      {showProductsModal && (
        <ManageProductsModal onClose={() => setShowProductsModal(false)} />
      )}
      {showSellersModal && (
        <ManageSellersModal onClose={() => setShowSellersModal(false)} />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Ranking de Vendas</p>
          </div>
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
        <LeaderboardTable data={sortedSales} criteria={salesCriteria} type="sales" loading={loadingSales} />
      </div>
    </div>
  );
}