import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Star, Loader2, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import ScoreRing from "./ScoreRing";

const C = {
  oficial: "#4F8F63",
  neutro: "#6F7A72",
  bg: "#0D1410",
  muted: "#17211B",
  border: "#2A342D",
  fg: "#F3F6F2",
  dimmed: "#A7B0A9",
  warn: "#C8A94D",
  danger: "#B85C5C",
};

export default function AgentOverallSummary({ agentName, evaluations }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const doneEvals = evaluations.filter(e => e.evaluation_status === "done");

  if (doneEvals.length === 0) return null;

  // Médias
  const avg = (field) => doneEvals.reduce((s, e) => s + (e[field] || 0), 0) / doneEvals.length;
  const avgScore = avg("score");
  const avgTone = avg("score_tone");
  const avgObj = avg("score_objections");
  const avgPitch = avg("score_pitch");

  // Pontos fortes e melhorias mais frequentes
  const allStrengths = doneEvals.flatMap(e => { try { return JSON.parse(e.strengths || "[]"); } catch { return []; } });
  const allImprovements = doneEvals.flatMap(e => { try { return JSON.parse(e.improvements || "[]"); } catch { return []; } });

  const topItems = (arr, n = 3) => {
    const freq = {};
    arr.forEach(s => { const k = s.toLowerCase().trim(); freq[k] = (freq[k] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  };

  const topStrengths = topItems(allStrengths);
  const topImprovements = topItems(allImprovements);

  const scoreColor = (s) => s >= 7 ? C.oficial : s >= 5 ? C.warn : C.danger;

  const handleEvalAll = async () => {
    setLoading(true);
    const pending = evaluations.filter(e => e.evaluation_status === "pending" || e.evaluation_status === "error");
    try {
      for (const ev of pending) {
        await base44.functions.invoke("evaluateCall", { evaluation_id: ev.id });
      }
      setTimeout(() => queryClient.invalidateQueries(["call_evaluations"]), 3000);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = evaluations.filter(e => e.evaluation_status === "pending" || e.evaluation_status === "error").length;

  return (
    <div className="mx-4 mb-3 rounded-xl border overflow-hidden" style={{ background: C.bg, borderColor: C.border }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.oficial }}>
            Avaliação Geral do Perfil
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${C.oficial}18`, color: C.oficial }}>
            {doneEvals.length} avaliado{doneEvals.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini scores inline */}
          <div className="hidden sm:flex items-center gap-3 text-[10px]" style={{ color: C.neutro }}>
            <span>Tom: <b style={{ color: scoreColor(avgTone) }}>{avgTone.toFixed(1)}</b></span>
            <span>Obj: <b style={{ color: scoreColor(avgObj) }}>{avgObj.toFixed(1)}</b></span>
            <span>Pitch: <b style={{ color: scoreColor(avgPitch) }}>{avgPitch.toFixed(1)}</b></span>
          </div>
          <ScoreRing score={avgScore} size={40} />
          {open ? <ChevronUp className="w-3.5 h-3.5" style={{ color: C.neutro }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: C.neutro }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: C.border }}>
          {/* Score rings */}
          <div className="flex items-center justify-around pt-3 flex-wrap gap-3">
            <ScoreRing score={avgScore} size={72} label="Geral" />
            <ScoreRing score={avgTone} size={56} label="Tom" />
            <ScoreRing score={avgObj} size={56} label="Objeções" />
            <ScoreRing score={avgPitch} size={56} label="Pitch" />
          </div>

          {/* Sub-scores detail */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Tom & Abordagem", score: avgTone },
              { label: "Objeções", score: avgObj },
              { label: "Pitch de Vendas", score: avgPitch },
            ].map((item, i) => (
              <div key={i} className="rounded-lg p-3 text-center" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: C.neutro }}>{item.label}</p>
                <p className="text-xl font-bold" style={{ color: scoreColor(item.score) }}>{item.score.toFixed(1)}</p>
                <div className="mt-1.5 h-1 rounded-full" style={{ background: C.border }}>
                  <div className="h-1 rounded-full" style={{ width: `${item.score * 10}%`, background: scoreColor(item.score) }} />
                </div>
              </div>
            ))}
          </div>

          {/* Pontos fortes / melhorias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {topStrengths.length > 0 && (
              <div className="rounded-lg p-3" style={{ background: `${C.oficial}0A`, border: `1px solid ${C.oficial}25` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.oficial }}>✓ Pontos Fortes Frequentes</p>
                <ul className="space-y-1">
                  {topStrengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] capitalize" style={{ color: C.fg }}>
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: C.oficial }} />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {topImprovements.length > 0 && (
              <div className="rounded-lg p-3" style={{ background: `${C.warn}0A`, border: `1px solid ${C.warn}25` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.warn }}>↑ Melhorias Prioritárias</p>
                <ul className="space-y-1">
                  {topImprovements.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] capitalize" style={{ color: C.fg }}>
                      <Star className="w-3 h-3 mt-0.5 shrink-0" style={{ color: C.warn }} />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Botão avaliar pendentes */}
          {pendingCount > 0 && (
            <button
              onClick={handleEvalAll}
              disabled={loading}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-semibold"
              style={{ background: `${C.oficial}22`, color: C.oficial }}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {loading ? "Avaliando..." : `Avaliar ${pendingCount} pendente${pendingCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}