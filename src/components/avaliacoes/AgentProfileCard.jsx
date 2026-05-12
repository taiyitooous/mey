import React, { useState } from "react";
import { ChevronDown, ChevronUp, Phone, Clock, CheckCircle2, AlertCircle, Loader2, Zap, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import ScoreRing from "./ScoreRing";
import AgentOverallSummary from "./AgentOverallSummary";

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

const fmtDuration = (s) => {
  const v = Math.round(s || 0);
  const m = Math.floor(v / 60), sec = v % 60;
  return m > 0 ? `${m}min ${sec}s` : `${sec}s`;
};

const getSpeakingTime = (ev) => ev.total_speaking_time || ev.speaking_time || 0;

const fmtDate = (d) => d
  ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  : "—";

function StatusBadge({ status }) {
  const cfg = {
    pending: { label: "Aguardando", color: C.neutro, icon: Clock },
    processing: { label: "Avaliando...", color: C.warn, icon: Loader2, spin: true },
    done: { label: "Avaliado", color: C.oficial, icon: CheckCircle2 },
    error: { label: "Erro", color: C.danger, icon: AlertCircle },
  }[status] || { label: status, color: C.neutro, icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}18`, color: cfg.color }}>
      <Icon className={`w-2.5 h-2.5 ${cfg.spin ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function CallRow({ ev }) {
  const [open, setOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const queryClient = useQueryClient();
  const isDone = ev.evaluation_status === "done";
  const isPending = ev.evaluation_status === "pending" || ev.evaluation_status === "error";
  const strengths = (() => { try { return JSON.parse(ev.strengths || "[]"); } catch { return []; } })();
  const improvements = (() => { try { return JSON.parse(ev.improvements || "[]"); } catch { return []; } })();

  const handleTrigger = async (e) => {
    e.stopPropagation();
    setTriggering(true);
    try {
      await base44.functions.invoke("evaluateCall", { evaluation_id: ev.id });
      setTimeout(() => queryClient.invalidateQueries(["call_evaluations"]), 3000);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#0D1410", borderColor: C.border }}>
      {/* Row header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        {/* Mini score ring */}
        <div className="shrink-0">
          {isDone
            ? <ScoreRing score={ev.score} size={40} />
            : <div className="w-10 h-10 rounded-full border flex items-center justify-center text-xs" style={{ borderColor: C.border, color: C.neutro }}>—</div>}
        </div>

        {/* Contact info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: C.fg }}>
            {ev.contact_name || ev.phone || "Contato desconhecido"}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: C.dimmed }}>
              <Phone className="w-2.5 h-2.5" /> {ev.total_calls || 1} lig.
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: C.dimmed }}>
              <Clock className="w-2.5 h-2.5" /> {fmtDuration(getSpeakingTime(ev))}
            </span>
            <span className="text-[10px]" style={{ color: C.neutro }}>última: {fmtDate(ev.last_called_at)}</span>
            {ev.last_qualification && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: C.muted, color: C.dimmed }}>{ev.last_qualification}</span>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {isDone && (
            <div className="hidden sm:flex items-center gap-2 text-[10px]" style={{ color: C.neutro }}>
              <span>Tom: <b style={{ color: C.fg }}>{ev.score_tone?.toFixed(1)}</b></span>
              <span>Obj: <b style={{ color: C.fg }}>{ev.score_objections?.toFixed(1)}</b></span>
              <span>Pitch: <b style={{ color: C.fg }}>{ev.score_pitch?.toFixed(1)}</b></span>
            </div>
          )}
          <StatusBadge status={ev.evaluation_status} />
          {isPending && (
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold"
              style={{ background: `${C.oficial}22`, color: C.oficial }}
            >
              <Zap className="w-2.5 h-2.5" />
              {triggering ? "..." : "Avaliar"}
            </button>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5" style={{ color: C.neutro }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: C.neutro }} />}
        </div>
      </button>

      {/* Expanded evaluation */}
      {open && isDone && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: C.border }}>
          {/* Score rings */}
          <div className="flex items-center justify-around pt-3 flex-wrap gap-3">
            <ScoreRing score={ev.score} size={72} label="Geral" />
            <ScoreRing score={ev.score_tone} size={56} label="Tom" />
            <ScoreRing score={ev.score_objections} size={56} label="Objeções" />
            <ScoreRing score={ev.score_pitch} size={56} label="Pitch" />
          </div>

          {ev.feedback_summary && (
            <div className="rounded-lg p-3" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.neutro }}>Resumo</p>
              <p className="text-xs leading-relaxed" style={{ color: C.fg }}>{ev.feedback_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { label: "Tom & Abordagem", text: ev.feedback_tone, score: ev.score_tone },
              { label: "Objeções", text: ev.feedback_objections, score: ev.score_objections },
              { label: "Pitch", text: ev.feedback_pitch, score: ev.score_pitch },
            ].map((item, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.neutro }}>{item.label}</p>
                  <span className="text-xs font-bold" style={{ color: item.score >= 7 ? C.oficial : item.score >= 5 ? C.warn : C.danger }}>{item.score?.toFixed(1)}</span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: C.dimmed }}>{item.text}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {strengths.length > 0 && (
              <div className="rounded-lg p-3" style={{ background: `${C.oficial}0A`, border: `1px solid ${C.oficial}25` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.oficial }}>✓ Pontos Fortes</p>
                <ul className="space-y-1">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: C.fg }}>
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: C.oficial }} />{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {improvements.length > 0 && (
              <div className="rounded-lg p-3" style={{ background: `${C.warn}0A`, border: `1px solid ${C.warn}25` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.warn }}>↑ A Melhorar</p>
                <ul className="space-y-1">
                  {improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: C.fg }}>
                      <Star className="w-3 h-3 mt-0.5 shrink-0" style={{ color: C.warn }} />{s}
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

export default function AgentProfileCard({ agentName, evaluations }) {
  const [open, setOpen] = useState(true);

  const doneEvals = evaluations.filter(e => e.evaluation_status === "done");
  const avgScore = doneEvals.length > 0
    ? doneEvals.reduce((s, e) => s + (e.score || 0), 0) / doneEvals.length
    : null;
  const avgTone = doneEvals.length > 0 ? doneEvals.reduce((s, e) => s + (e.score_tone || 0), 0) / doneEvals.length : null;
  const avgObj = doneEvals.length > 0 ? doneEvals.reduce((s, e) => s + (e.score_objections || 0), 0) / doneEvals.length : null;
  const avgPitch = doneEvals.length > 0 ? doneEvals.reduce((s, e) => s + (e.score_pitch || 0), 0) / doneEvals.length : null;

  const totalCalls = evaluations.reduce((s, e) => s + (e.total_calls || 1), 0);
  const totalTime = evaluations.reduce((s, e) => s + getSpeakingTime(e), 0);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: C.bg, borderColor: C.border }}>
      {/* Agent header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-5 px-6 py-5 hover:bg-white/5 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
          style={{ background: `${C.oficial}22`, color: C.oficial }}>
          {agentName?.charAt(0)?.toUpperCase() || "?"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold" style={{ color: C.fg }}>{agentName}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs" style={{ color: C.neutro }}>{evaluations.length} contato{evaluations.length !== 1 ? "s" : ""}</span>
            <span className="text-xs" style={{ color: C.neutro }}>{totalCalls} ligação{totalCalls !== 1 ? "ões" : ""}</span>
            <span className="text-xs" style={{ color: C.neutro }}>{fmtDuration(totalTime)} total</span>
            <span className="text-xs" style={{ color: C.neutro }}>{doneEvals.length} avaliado{doneEvals.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Score rings */}
        {avgScore != null && (
          <div className="flex items-center gap-4 shrink-0">
            <ScoreRing score={avgScore} size={64} label="Geral" />
            <div className="hidden sm:flex flex-col gap-1 text-xs" style={{ color: C.neutro }}>
              <span>Tom: <b style={{ color: C.fg }}>{avgTone?.toFixed(1)}</b></span>
              <span>Obj: <b style={{ color: C.fg }}>{avgObj?.toFixed(1)}</b></span>
              <span>Pitch: <b style={{ color: C.fg }}>{avgPitch?.toFixed(1)}</b></span>
            </div>
          </div>
        )}

        {open ? <ChevronUp className="w-5 h-5 shrink-0" style={{ color: C.neutro }} /> : <ChevronDown className="w-5 h-5 shrink-0" style={{ color: C.neutro }} />}
      </button>

      {/* Call list */}
      {open && (
        <div className="pb-4 space-y-2 border-t" style={{ borderColor: C.border }}>
          <AgentOverallSummary agentName={agentName} evaluations={evaluations} />
          <p className="text-[10px] font-bold uppercase tracking-widest pt-1 pb-1 px-4" style={{ color: C.neutro }}>
            Ligações por contato
          </p>
          <div className="px-4 space-y-2">
            {evaluations.map(ev => <CallRow key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}
    </div>
  );
}