import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlusCircle, ClipboardList, TrendingUp, DollarSign, Calendar, Trophy, Medal, Search } from "lucide-react";
import { getDateRange, PERIOD_OPTIONS } from "@/lib/leaderboardUtils";
import RegisterSkaleModal from "./RegisterSkaleModal";
import ManageSkaleModal from "./ManageSkaleModal";

const CRITERIA = [
  { value: "scheduled", label: "Maior número de agendamentos" },
  { value: "revenue", label: "Maior faturamento" },
];

const PERSON_COLORS = ["#4F8F63", "#3AAFCA", "#E8B84B", "#B85C5C", "#9B79D4", "#E87D4B", "#4B8FCA"];
const GOLD = "#F5C842";
const SILVER = "#9BADB7";
const BRONZE = "#CD7F54";
const RANK_COLORS = [GOLD, SILVER, BRONZE];

function RankBadge({ rank }) {
  if (rank === 0) return <Trophy className="w-4 h-4" style={{ color: GOLD }} />;
  if (rank === 1) return <Medal className="w-4 h-4" style={{ color: SILVER }} />;
  if (rank === 2) return <Medal className="w-4 h-4" style={{ color: BRONZE }} />;
  return <span className="text-xs text-muted-foreground font-semibold w-5 text-center">{rank + 1}</span>;
}

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl border border-border p-4 flex items-center gap-4" style={{ background: "linear-gradient(135deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}22` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-extrabold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function SkaleLeaderboard({ allSellers }) {
  const [period, setPeriod] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [criteria, setCriteria] = useState("scheduled");
  const [showRegister, setShowRegister] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [search, setSearch] = useState("");

  const { start, end } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const toSPDateStr = (date) => date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const startStr = start ? toSPDateStr(start) : null;
  const endStr = end ? toSPDateStr(end) : null;

  const { data: records = [] } = useQuery({
    queryKey: ["skale_records"],
    queryFn: () => base44.entities.SkaleRecord.list("-date", 2000),
  });

  const filtered = useMemo(() => {
    if (!startStr || !endStr) return records;
    return records.filter((r) => r.date >= startStr && r.date <= endStr);
  }, [records, startStr, endStr]);

  // Agrupa por vendedor
  const rankData = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!r.seller_name) return;
      const k = r.seller_name.trim().toLowerCase();
      if (!map[k]) map[k] = { name: r.seller_name.trim(), scheduled: 0, revenue: 0, customers: [] };
      map[k].scheduled += Number(r.scheduled_count) || 1;
      map[k].revenue += Number(r.revenue) || 0;
      if (r.customer_name) map[k].customers.push({ customer: r.customer_name, date: r.date, revenue: r.revenue });
    });
    return Object.values(map).sort((a, b) =>
      criteria === "revenue" ? b.revenue - a.revenue : b.scheduled - a.scheduled
    );
  }, [filtered, criteria]);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return rankData;
    return rankData.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [rankData, search]);

  const totalScheduled = rankData.reduce((s, r) => s + r.scheduled, 0);
  const totalRevenue = rankData.reduce((s, r) => s + r.revenue, 0);

  const fmtCurrency = (v) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Ranking Skale</h2>
            <p className="text-sm text-muted-foreground">Agendamentos e faturamento por vendedor</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowManage(true)}
            className="border-border gap-2 text-muted-foreground hover:text-foreground"
          >
            <ClipboardList className="w-4 h-4" />
            Gerenciar
          </Button>
          <Button
            size="sm"
            onClick={() => setShowRegister(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar
          </Button>
        </div>
      </div>

      {/* Period filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        {PERIOD_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={period === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(opt.value)}
            className={period === opt.value ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}
          >
            {opt.label}
          </Button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8 w-36 text-xs bg-card border-border" />
            <span className="text-muted-foreground text-xs">até</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8 w-36 text-xs bg-card border-border" />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard icon={Calendar} label="Total Agendamentos" value={totalScheduled} color="#4F8F63" />
        <KPICard icon={DollarSign} label="Faturamento Total" value={fmtCurrency(totalRevenue)} color="#E8B84B" />
        <KPICard icon={TrendingUp} label="Vendedores ativos" value={rankData.length} color="#3AAFCA" />
      </div>

      {/* Criteria selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Ranking Skale</p>
        </div>
        <Select value={criteria} onValueChange={setCriteria}>
          <SelectTrigger className="w-56 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRITERIA.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ranking Completo</h2>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar vendedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-card border-border"
            />
          </div>
        </div>

        {rankData.length === 0 ? (
          <div
            className="rounded-2xl border border-border p-12 text-center"
            style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
          >
            <Calendar className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum agendamento registrado no período</p>
            <Button size="sm" className="mt-4 bg-primary hover:bg-primary/90" onClick={() => setShowRegister(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Registrar agora
            </Button>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-border overflow-hidden"
            style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border" style={{ background: "hsl(150 17% 7%)" }}>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider w-12">#</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Vendedor</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Agendamentos</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Faturamento</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Clientes</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#4F8F63" }}>
                      Critério
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {searchFiltered.map((row, idx) => {
                    const originalIdx = rankData.indexOf(row);
                    const color = PERSON_COLORS[originalIdx % PERSON_COLORS.length];
                    const isTop3 = originalIdx < 3;
                    const rankColor = RANK_COLORS[originalIdx];
                    const criteriaValue = criteria === "revenue"
                      ? fmtCurrency(row.revenue)
                      : `${row.scheduled} agend.`;

                    return (
                      <tr
                        key={row.name}
                        className="border-b border-border/60 transition-colors"
                        style={{ background: isTop3 ? `${rankColor}08` : "transparent" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `${color}0D`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isTop3 ? `${rankColor}08` : "transparent"; }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center w-6">
                            <RankBadge rank={originalIdx} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                              style={{ background: `radial-gradient(circle, ${color}cc, ${color}88)`, boxShadow: `0 0 10px ${color}44` }}
                            >
                              {row.name.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className="font-semibold"
                              style={{ color: isTop3 ? rankColor : "hsl(var(--foreground))" }}
                            >
                              {row.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">{row.scheduled}</td>
                        <td className="px-4 py-3.5 text-right font-semibold" style={{ color: row.revenue > 0 ? "#E8B84B" : undefined }}>
                          {row.revenue > 0 ? fmtCurrency(row.revenue) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right text-muted-foreground text-xs">{row.customers.length}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span
                            className="font-extrabold text-sm px-2.5 py-0.5 rounded-full"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
                          >
                            {criteriaValue}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showRegister && (
        <RegisterSkaleModal sellers={allSellers} onClose={() => setShowRegister(false)} />
      )}
      {showManage && (
        <ManageSkaleModal onClose={() => setShowManage(false)} />
      )}
    </div>
  );
}