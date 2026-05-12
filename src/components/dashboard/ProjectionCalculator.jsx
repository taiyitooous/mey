import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calculator, Target, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";

const C = {
  oficial:  "#4F8F63",
  validacao:"#C8A94D",
  neutro:   "#6F7A72",
  bg:       "#121815",
  border:   "#2A342D",
  muted:    "#17211B",
  fg:       "#F3F6F2",
  dimmed:   "#A7B0A9",
};

function SellerRow({ seller, goalSales }) {
  const needed = seller.conversion > 0
    ? Math.ceil(goalSales / (seller.conversion / 100))
    : null;
  const gap = needed != null ? needed - seller.currentLeads : null;
  const feasible = gap != null && gap <= 0;

  return (
    <div
      className="flex items-center gap-3 py-3 border-b last:border-0"
      style={{ borderColor: C.border }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0"
        style={{ background: `${C.oficial}99` }}
      >
        {seller.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + conversion */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: C.fg }}>{seller.name}</p>
        <p className="text-xs" style={{ color: C.neutro }}>
          Conversão atual: <span style={{ color: C.oficial }}>{seller.conversion.toFixed(1)}%</span>
          {" · "}{seller.currentLeads} leads registrados
        </p>
      </div>

      {/* Projection result */}
      <div className="text-right shrink-0">
        {needed == null ? (
          <p className="text-xs" style={{ color: C.neutro }}>Sem dados de conversão</p>
        ) : (
          <>
            <p className="text-base font-bold" style={{ color: feasible ? C.oficial : C.validacao }}>
              {needed.toLocaleString()} leads
            </p>
            <p className="text-xs" style={{ color: feasible ? C.oficial : C.neutro }}>
              {feasible
                ? `✓ Meta já atingível (+${Math.abs(gap)} de sobra)`
                : `Faltam ${gap.toLocaleString()} leads`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProjectionCalculator() {
  const [goalSales, setGoalSales] = useState(20);
  const [open, setOpen] = useState(true);

  const { data: allSales = [] } = useQuery({
    queryKey: ["sale_records"],
    queryFn: () => base44.entities.SaleRecord.list("-date", 2000),
  });

  const { data: allLeads = [] } = useQuery({
    queryKey: ["lead_daily_counts"],
    queryFn: () => base44.entities.LeadDailyCount.list("-date", 500),
  });

  // Build per-seller stats (all-time)
  const sellers = useMemo(() => {
    const map = {};

    allSales.forEach((r) => {
      if (!r.seller_name || r.type === "exit") return;
      const k = r.seller_name.trim().toLowerCase();
      if (!map[k]) map[k] = { name: r.seller_name.trim(), wins: 0, totalLeads: 0 };
      map[k].wins++;
    });

    allLeads.forEach((r) => {
      if (!r.seller_name) return;
      const k = r.seller_name.trim().toLowerCase();
      if (!map[k]) map[k] = { name: r.seller_name.trim(), wins: 0, totalLeads: 0 };
      map[k].totalLeads += r.lead_count || 0;
    });

    return Object.values(map)
      .filter((s) => s.totalLeads > 0 || s.wins > 0)
      .map((s) => ({
        name: s.name,
        wins: s.wins,
        currentLeads: s.totalLeads,
        conversion: s.totalLeads > 0 ? (s.wins / s.totalLeads) * 100 : 0,
      }))
      .filter((s) => s.conversion > 0)
      .sort((a, b) => b.conversion - a.conversion);
  }, [allSales, allLeads]);

  // Team aggregate
  const teamConversion = useMemo(() => {
    const totalWins = sellers.reduce((s, r) => s + r.wins, 0);
    const totalLeads = sellers.reduce((s, r) => s + r.currentLeads, 0);
    return totalLeads > 0 ? (totalWins / totalLeads) * 100 : 0;
  }, [sellers]);

  const teamNeeded = teamConversion > 0 ? Math.ceil(goalSales / (teamConversion / 100)) : null;

  return (
    <div
      className="rounded-2xl border shadow-sm overflow-hidden"
      style={{ background: C.bg, borderColor: C.border }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-7 py-5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.oficial}18` }}>
            <Calculator className="w-4 h-4" style={{ color: C.oficial }} />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold" style={{ color: C.fg }}>Calculadora de Projeção</p>
            <p className="text-xs" style={{ color: C.neutro }}>Simule leads necessários por meta de vendas</p>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: C.neutro }} />
          : <ChevronDown className="w-4 h-4" style={{ color: C.neutro }} />}
      </button>

      {open && (
        <div className="px-7 pb-7 space-y-6">
          {/* Goal input */}
          <div
            className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: C.muted, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center gap-3 flex-1">
              <Target className="w-5 h-5 shrink-0" style={{ color: C.oficial }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: C.fg }}>Meta de Vendas</p>
                <p className="text-xs" style={{ color: C.neutro }}>Quantas vendas você quer atingir?</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGoalSales((v) => Math.max(1, v - 1))}
                className="w-8 h-8 rounded-lg border text-sm font-bold transition-colors hover:bg-white/10"
                style={{ borderColor: C.border, color: C.fg }}
              >−</button>
              <Input
                type="number"
                min={1}
                value={goalSales}
                onChange={(e) => setGoalSales(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center font-bold text-lg h-10"
                style={{ background: "#0B0F0D", borderColor: C.border, color: C.fg }}
              />
              <button
                onClick={() => setGoalSales((v) => v + 1)}
                className="w-8 h-8 rounded-lg border text-sm font-bold transition-colors hover:bg-white/10"
                style={{ borderColor: C.border, color: C.fg }}
              >+</button>
              <span className="text-sm font-medium" style={{ color: C.dimmed }}>vendas</span>
            </div>
          </div>

          {/* Team aggregate */}
          <div
            className="rounded-xl p-4 flex flex-wrap items-center gap-6"
            style={{ background: `${C.oficial}0E`, border: `1px solid ${C.oficial}30` }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: C.oficial }} />
              <span className="text-sm font-semibold" style={{ color: C.fg }}>Equipe (média ponderada)</span>
            </div>
            <div className="flex items-center gap-6 flex-wrap ml-auto">
              <div className="text-center">
                <p className="text-xs" style={{ color: C.neutro }}>Conversão da equipe</p>
                <p className="text-lg font-bold" style={{ color: C.oficial }}>{teamConversion.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: C.neutro }}>Leads necessários (equipe)</p>
                <p className="text-lg font-bold" style={{ color: C.fg }}>
                  {teamNeeded ? teamNeeded.toLocaleString() : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: C.neutro }}>Leads por vendedor</p>
                <p className="text-lg font-bold" style={{ color: C.validacao }}>
                  {teamNeeded && sellers.length > 0
                    ? Math.ceil(teamNeeded / sellers.length).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Per seller breakdown */}
          {sellers.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: C.neutro }}>
              Sem dados de vendedores disponíveis
            </p>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: C.neutro }} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.neutro }}>
                  Projeção Individual — {goalSales} vendas
                </p>
              </div>
              <div
                className="rounded-xl overflow-hidden divide-y"
                style={{ border: `1px solid ${C.border}`, divideColor: C.border }}
              >
                {sellers.map((seller) => (
                  <div key={seller.name} style={{ background: C.muted }}>
                    <SellerRow seller={seller} goalSales={goalSales} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}