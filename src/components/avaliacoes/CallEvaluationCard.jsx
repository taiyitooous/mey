import React, { useState } from "react";
import { ChevronDown, ChevronUp, Phone, Clock, Star, Zap, CheckCircle2, AlertCircle, Loader2, PhoneCall } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import ScoreRing from "./ScoreRing";

const C = {
  oficial: "#4F8F63",
  neutro: "#6F7A72",
  bg: "#121815",
  muted: "#17211B",
  border: "#2A342D",
  fg: "#F3F6F2",
  dimmed: "#A7B0A9",
  warn: "#C8A94D",
  danger: "#B85C5C",
};

const StatusBadge = ({ status }) => {
  const cfg = {
    pending: { label: "Aguardando", color: C.neutro, icon: Clock },
    processing: { label: "Avaliando...", color: C.warn, icon: Loader2, spin: true },
    done: { label: "Avaliado", color: C.oficial, icon: CheckCircle2 },
    error: { label: "Erro", color: C.danger, icon: AlertCircle },
  }[status] || { label: status, color: C.neutro, icon: Clock };

  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}18`, color: cfg.color }}>
      <Icon className={`w-3 h-3 ${cfg.spin ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
};

export default function CallEvaluationCard({ evaluation }) {
  const [open, setOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const queryClient = useQueryClient();

  const isDone = evaluation.evaluation_status === "done";
  const isPending = evaluation.evaluation_status === "pending" || evaluation.evaluation_status === "error";

  const handleTrigger = async (e) => {
    e.stopPropagation();
    setTriggering(true);
    try {
      await base44.functions.invoke("evaluateCall", { evaluation_id: evaluation.id });
      setTimeout(() => queryClient.invalidateQueries(["call_evaluations"]), 3000);
    } finally {
      setTriggering(false);
    }
  };

  const strengths = (() => { try { return JSON.parse(evaluation.strengths || "[]"); } catch { return []; } })();
  const improvements = (() => { try { return JSON.parse(evaluation.improvements || "[]"); } catch { return []; } })();

  const fmtDuration = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}min ${sec}s` : `${sec}s`;
  };

  const lastCallDate = evaluation.last_called_at
    ? new Date(evaluation.last_called_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : new Date(evaluation.created_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: C.bg, borderColor: C.border }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left"
      >
        {/* Score ring */}
        <div className="shrink-0">
          {isDone
            ? <ScoreRing score={evaluation.score} size={52} />
            : <div className="w-[52px] h-[52px] rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: C.border, color: C.neutro }}>—</div>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold" style={{ color: C.fg }}>{evaluation.agent_name}</p>
            {(evaluation.contact_name || evaluation.phone) && (
              <p className="text-xs" style={{ color: C.neutro }}>→ {evaluation.contact_name || evaluation.phone}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#2A342D", color: C.dimmed }}>
              <Phone className="w-3 h-3" /> {evaluation.total_calls || 1} ligação{(evaluation.total_calls || 1) !== 1 ? "ões" : ""}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: C.dimmed }}>
              <Clock className="w-3 h-3" /> {fmtDuration(evaluation.total_speaking_time || evaluation.speaking_time || 0)} total
            </span>
            <span className="text-xs" style={{ color: C.neutro }}>última: {lastCallDate}</span>
            {evaluation.last_qualification && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#2A342D", color: C.dimmed }}>
                {evaluation.last_qualification}
              </span>
            )}
          </div>
        </div>

        {/* Right side: status + scores summary */}
        <div className="flex items-center gap-4 shrink-0">
          {isDone && (
            <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: C.neutro }}>
              <span>Tom: <b style={{ color: C.fg }}>{evaluation.score_tone?.toFixed(1)}</b></span>
              <span>Obj: <b style={{ color: C.fg }}>{evaluation.score_objections?.toFixed(1)}</b></span>
              <span>Pitch: <b style={{ color: C.fg }}>{evaluation.score_pitch?.toFixed(1)}</b></span>
            </div>
          )}
          <StatusBadge status={evaluation.evaluation_status} />
          {isPending && (
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
              style={{ background: `${C.oficial}22`, color: C.oficial }}
            >
              <Zap className="w-3 h-3" />
              {triggering ? "Avaliando..." : "Avaliar agora"}
            </button>
          )}
          {open ? <ChevronUp className="w-4 h-4" style={{ color: C.neutro }} /> : <ChevronDown className="w-4 h-4" style={{ color: C.neutro }} />}
        </div>
      </button>

      {/* Expanded content */}
      {open && isDone && (
        <div className="px-5 pb-5 space-y-5 border-t" style={{ borderColor: C.border }}>
          {/* Score rings */}
          <div className="flex items-center justify-around pt-4 flex-wrap gap-4">
            <ScoreRing score={evaluation.score} size={90} label="Geral" />
            <ScoreRing score={evaluation.score_tone} size={72} label="Tom/Abordagem" />
            <ScoreRing score={evaluation.score_objections} size={72} label="Objeções" />
            <ScoreRing score={evaluation.score_pitch} size={72} label="Pitch" />
          </div>

          {/* Summary */}
          {evaluation.feedback_summary && (
            <div className="rounded-xl p-4" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.neutro }}>Resumo</p>
              <p className="text-sm leading-relaxed" style={{ color: C.fg }}>{evaluation.feedback_summary}</p>
            </div>
          )}

          {/* Feedback details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Tom & Abordagem", text: evaluation.feedback_tone, score: evaluation.score_tone },
              { label: "Objeções", text: evaluation.feedback_objections, score: evaluation.score_objections },
              { label: "Pitch de Vendas", text: evaluation.feedback_pitch, score: evaluation.score_pitch },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.neutro }}>{item.label}</p>
                  <span className="text-sm font-bold" style={{ color: item.score >= 7 ? C.oficial : item.score >= 5 ? C.warn : C.danger }}>{item.score?.toFixed(1)}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: C.dimmed }}>{item.text}</p>
              </div>
            ))}
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strengths.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: `${C.oficial}0A`, border: `1px solid ${C.oficial}25` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.oficial }}>✓ Pontos Fortes</p>
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: C.fg }}>
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C.oficial }} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {improvements.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: `${C.warn}0A`, border: `1px solid ${C.warn}25` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.warn }}>↑ A Melhorar</p>
                <ul className="space-y-2">
                  {improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: C.fg }}>
                      <Star className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C.warn }} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}