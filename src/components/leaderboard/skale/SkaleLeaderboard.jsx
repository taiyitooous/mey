import React, { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  PlusCircle, ClipboardList, TrendingUp, DollarSign, Calendar,
  Trophy, Medal, Search, Users, Pencil, Check, X, ChevronUp, ChevronDown, Minus
} from "lucide-react";
import { getDateRange, PERIOD_OPTIONS } from "@/lib/leaderboardUtils";
import RegisterSkaleModal from "./RegisterSkaleModal";
import ManageSkaleModal from "./ManageSkaleModal";

const CRITERIA = [
  { value: "scheduled", label: "Agendamentos" },
  { value: "revenue", label: "Faturamento" },
];

const PERSON_COLORS = ["#4F8F63", "#3AAFCA", "#E8B84B", "#B85C5C", "#9B79D4", "#E87D4B", "#4B8FCA"];
const GOLD = "#F5C842";
const SILVER = "#9BADB7";
const BRONZE = "#CD7F54";
const RANK_COLORS = [GOLD, SILVER, BRONZE];

function RankBadge({ rank }) {
  if (rank === 0) return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}22` }}>
      <Trophy className="w-3.5 h-3.5" style={{ color: GOLD }} />
    </div>
  );
  if (rank === 1) return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${SILVER}22` }}>
      <Medal className="w-3.5 h-3.5" style={{ color: SILVER }} />
    </div>
  );
  if (rank === 2) return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${BRONZE}22` }}>
      <Medal className="w-3.5 h-3.5" style={{ color: BRONZE }} />
    </div>
  );
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/40">
      <span className="text-xs text-muted-foreground font-bold">{rank + 1}</span>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, sub }) {
  return (
    <div
      className="rounded-2xl border border-border/60 p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(150 14% 10%), hsl(150 17% 7%))" }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-foreground leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function ConversionBadge({ value }) {
  if (!value) return <span className="text-muted-foreground/40 text-xs">—</span>;
  const num = parseFloat(value);
  const color = num >= 10 ? "#4F8F63" : num >= 6 ? "#E8B84B" : "#B85C5C";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {num >= 10 ? <ChevronUp className="w-3 h-3" /> : num >= 6 ? <Minus className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {value}%
    </span>
  );
}

export default function SkaleLeaderboard({ allSellers }) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [criteria, setCriteria] = useState("scheduled");
  const [showRegister, setShowRegister] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [search, setSearch] = useState("");

  const [editingLeadSeller, setEditingLeadSeller] = useState(null);
  const [editingLeadValue, setEditingLeadValue] = useState("");
  const [savingLead, setSavingLead] = useState(false);
  const inputRef = useRef(null);
  const editingLeadValueRef = useRef("");

  const { start, end } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const toSPDateStr = (date) => date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const startStr = start ? toSPDateStr(start) : null;
  const endStr = end ? toSPDateStr(end) : null;

  const refMonthStr = useMemo(() => {
    if (!startStr) return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7) + "-01";
    return startStr.slice(0, 7) + "-01";
  }, [startStr]);

  const { data: records = [] } = useQuery({
    queryKey: ["skale_records"],
    queryFn: () => base44.entities.SkaleRecord.list("-date", 2000),
  });

  const { data: leadCounts = [] } = useQuery({
    queryKey: ["lead_daily_counts"],
    queryFn: () => base44.entities.LeadDailyCount.list("-date", 5000),
  });

  const filtered = useMemo(() => {
    if (!startStr || !endStr) return records;
    return records.filter((r) => {
      if (!r.date) return false;
      const recYear = parseInt(r.date.slice(0, 4));
      const recMonth = parseInt(r.date.slice(5, 7)) - 1;
      const recMonthStart = `${recYear}-${String(recMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(recYear, recMonth + 1, 0);
      const recMonthEnd = lastDay.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      return recMonthStart <= endStr && recMonthEnd >= startStr;
    });
  }, [records, startStr, endStr]);

  const leadsBySellerInPeriod = useMemo(() => {
    const map = {};
    leadCounts.forEach((lc) => {
      if (!lc.seller_name || !lc.date) return;
      const lcYear = parseInt(lc.date.slice(0, 4));
      const lcMonth = parseInt(lc.date.slice(5, 7)) - 1;
      const lcMonthEnd = new Date(lcYear, lcMonth + 1, 0).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      if (startStr && lcMonthEnd < startStr) return;
      if (endStr && lc.date > endStr) return;
      const k = lc.seller_name.trim().toLowerCase();
      map[k] = (map[k] || 0) + (Number(lc.lead_count) || 0);
    });
    return map;
  }, [leadCounts, startStr, endStr]);

  const rankData = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      if (!r.seller_name) return;
      const k = r.seller_name.trim().toLowerCase();
      if (!map[k]) map[k] = { name: r.seller_name.trim(), scheduled: 0, revenue: 0 };
      map[k].scheduled += Number(r.scheduled_count) || 1;
      map[k].revenue += Number(r.revenue) || 0;
    });
    return Object.values(map)
      .map((row) => {
        const leads = leadsBySellerInPeriod[row.name.trim().toLowerCase()] || 0;
        const conversion = leads > 0 ? ((row.scheduled / leads) * 100).toFixed(1) : null;
        return { ...row, leads, conversion };
      })
      .sort((a, b) => criteria === "revenue" ? b.revenue - a.revenue : b.scheduled - a.scheduled);
  }, [filtered, criteria, leadsBySellerInPeriod]);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return rankData;
    return rankData.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [rankData, search]);

  const totalScheduled = rankData.reduce((s, r) => s + r.scheduled, 0);
  const totalRevenue = rankData.reduce((s, r) => s + r.revenue, 0);
  const totalLeads = Object.values(leadsBySellerInPeriod).reduce((s, v) => s + v, 0);
  const totalConversion = totalLeads > 0 ? ((totalScheduled / totalLeads) * 100).toFixed(1) : null;

  const fmtCurrency = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const startLeadEdit = (row) => {
    const val = row.leads > 0 ? String(row.leads) : "";
    editingLeadValueRef.current = val;
    setEditingLeadValue(val);
    setEditingLeadSeller(row.name);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelLeadEdit = () => {
    setEditingLeadSeller(null);
    setEditingLeadValue("");
    editingLeadValueRef.current = "";
  };

  const saveLeadEdit = async (sellerName) => {
    const leadsNum = Number(editingLeadValueRef.current) || 0;
    const sellerKey = sellerName.trim().toLowerCase();
    setSavingLead(true);

    const existingInPeriod = leadCounts.filter((lc) => {
      if (lc.seller_name?.trim().toLowerCase() !== sellerKey) return false;
      if (!lc.date) return false;
      const lcYear = parseInt(lc.date.slice(0, 4));
      const lcMonth = parseInt(lc.date.slice(5, 7)) - 1;
      const lcMonthEnd = new Date(lcYear, lcMonth + 1, 0).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      if (startStr && lcMonthEnd < startStr) return false;
      if (endStr && lc.date > endStr) return false;
      return true;
    });

    for (const lc of existingInPeriod) {
      await base44.entities.LeadDailyCount.delete(lc.id);
    }

    if (leadsNum > 0) {
      await base44.entities.LeadDailyCount.create({
        seller_name: sellerName.trim(),
        date: refMonthStr,
        lead_count: leadsNum,
      });
    }

    await queryClient.refetchQueries({ queryKey: ["lead_daily_counts"] });
    setEditingLeadSeller(null);
    setEditingLeadValue("");
    editingLeadValueRef.current = "";
    setSavingLead(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Ranking Skale</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Agendamentos e faturamento por vendedor</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowManage(true)}
            className="border-border/60 gap-2 text-muted-foreground hover:text-foreground h-9"
          >
            <ClipboardList className="w-4 h-4" />
            Gerenciar
          </Button>
          <Button
            size="sm"
            onClick={() => setShowRegister(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-9"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar
          </Button>
        </div>
      </div>

      {/* Period filters */}
      <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-xl border border-border/40 bg-card/50 w-fit">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              period === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border/40">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-7 w-32 text-xs bg-card border-border/60" />
            <span className="text-muted-foreground text-xs">→</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-7 w-32 text-xs bg-card border-border/60" />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={Calendar} label="Agendamentos" value={totalScheduled.toLocaleString("pt-BR")} color="#4F8F63" sub="no período" />
        <KPICard icon={DollarSign} label="Faturamento" value={fmtCurrency(totalRevenue)} color="#E8B84B" sub="receita total" />
        <KPICard icon={Users} label="Leads" value={totalLeads.toLocaleString("pt-BR")} color="#9B79D4" sub="recebidos" />
        <KPICard
          icon={TrendingUp}
          label="Conversão"
          value={totalConversion ? `${totalConversion}%` : "—"}
          color="#3AAFCA"
          sub="agend. / leads"
        />
      </div>

      {/* Table section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Ranking Completo</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border/40 bg-card/50">
              {CRITERIA.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCriteria(c.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    criteria === c.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar vendedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 w-48 text-xs bg-card border-border/60"
            />
          </div>
        </div>

        {rankData.length === 0 ? (
          <div
            className="rounded-2xl border border-border/60 p-16 text-center"
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
          <div className="rounded-2xl border border-border/60 overflow-hidden" style={{ background: "hsl(150 14% 9%)" }}>
            {/* Table header */}
            <div className="grid gap-0 border-b border-border/40" style={{
              gridTemplateColumns: "52px 1fr 110px 160px 110px 110px 120px",
              background: "hsl(150 17% 7%)"
            }}>
              {["#", "Vendedor", "Agend.", "Faturamento", "Leads", "Conversão", "Critério"].map((h, i) => (
                <div key={h} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest ${i === 0 ? "text-center" : i > 1 ? "text-right" : ""}`}
                  style={{ color: i === 4 ? "#9B79D4" : i === 5 ? "#3AAFCA" : i === 6 ? "#4F8F63" : "hsl(var(--muted-foreground))" }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {searchFiltered.map((row) => {
              const originalIdx = rankData.indexOf(row);
              const color = PERSON_COLORS[originalIdx % PERSON_COLORS.length];
              const isTop3 = originalIdx < 3;
              const rankColor = RANK_COLORS[originalIdx];
              const criteriaValue = criteria === "revenue" ? fmtCurrency(row.revenue) : `${row.scheduled}`;
              const isEditingThis = editingLeadSeller === row.name;

              return (
                <div
                  key={row.name}
                  className="grid border-b border-border/30 group transition-colors hover:bg-white/[0.02]"
                  style={{
                    gridTemplateColumns: "52px 1fr 110px 160px 110px 110px 120px",
                    background: isTop3 ? `${rankColor}06` : "transparent",
                  }}
                >
                  {/* Rank */}
                  <div className="px-3 py-3.5 flex items-center justify-center">
                    <RankBadge rank={originalIdx} />
                  </div>

                  {/* Seller */}
                  <div className="px-4 py-3.5 flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0 shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}
                    >
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className="font-semibold text-sm truncate"
                      style={{ color: isTop3 ? rankColor : undefined }}
                    >
                      {row.name}
                    </span>
                  </div>

                  {/* Scheduled */}
                  <div className="px-4 py-3.5 flex items-center justify-end">
                    <span className="text-sm font-semibold text-foreground">{row.scheduled}</span>
                  </div>

                  {/* Revenue */}
                  <div className="px-4 py-3.5 flex items-center justify-end">
                    <span className="text-sm font-semibold" style={{ color: row.revenue > 0 ? "#E8B84B" : "hsl(var(--muted-foreground))" }}>
                      {row.revenue > 0 ? fmtCurrency(row.revenue) : "—"}
                    </span>
                  </div>

                  {/* Leads - editable */}
                  <div className="px-4 py-3.5 flex items-center justify-end">
                    {isEditingThis ? (
                      <div className="flex items-center gap-1">
                        <Input
                          ref={inputRef}
                          type="number"
                          min={0}
                          value={editingLeadValue}
                          onChange={(e) => {
                            editingLeadValueRef.current = e.target.value;
                            setEditingLeadValue(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveLeadEdit(row.name);
                            if (e.key === "Escape") cancelLeadEdit();
                          }}
                          className="h-7 w-20 text-xs bg-card border-border text-right"
                        />
                        <button onClick={() => saveLeadEdit(row.name)} disabled={savingLead} className="text-primary hover:opacity-70 disabled:opacity-40 transition-opacity">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelLeadEdit} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group/leads cursor-default">
                        <span className="text-sm font-semibold" style={{ color: row.leads > 0 ? "#9B79D4" : undefined }}>
                          {row.leads > 0 ? row.leads.toLocaleString("pt-BR") : "—"}
                        </span>
                        <button
                          onClick={() => startLeadEdit(row)}
                          className="opacity-0 group-hover/leads:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                          title="Editar leads"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Conversion */}
                  <div className="px-4 py-3.5 flex items-center justify-end">
                    <ConversionBadge value={row.conversion} />
                  </div>

                  {/* Criteria badge */}
                  <div className="px-4 py-3.5 flex items-center justify-end">
                    <span
                      className="text-xs font-extrabold px-3 py-1 rounded-full tabular-nums"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
                    >
                      {criteriaValue} {criteria === "scheduled" ? "agend." : ""}
                    </span>
                  </div>
                </div>
              );
            })}
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