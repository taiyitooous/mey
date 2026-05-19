import React, { useMemo } from "react";
import { isCallAttempt, isEffectiveContact, deduplicateCallEvents, isWavoipCallAttempt, isWavoipCallAnswered } from "@/lib/eventUtils";
import { X, Download, Phone, PhoneMissed, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

function Bar({ pct, color }) {
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function RelatorioLigacoes({ events, onClose, periodoLabel }) {
  const rows = useMemo(() => {
    // Agrupa por vendedor
    const map = {};

    // 3C — ligações dedupadas
    const calls3c = deduplicateCallEvents(events);
    for (const ev of calls3c) {
      const name = ev.user_name?.trim() || "Desconhecido";
      if (!map[name]) map[name] = { name, calls3c: 0, answered3c: 0, wavoip: 0, answeredWavoip: 0 };
      map[name].calls3c++;
      if (isEffectiveContact(ev)) map[name].answered3c++;
    }

    // Wavoip — ligações WhatsApp
    for (const ev of events) {
      if (!isWavoipCallAttempt(ev)) continue;
      const name = ev.user_name?.trim() || "Desconhecido";
      if (!map[name]) map[name] = { name, calls3c: 0, answered3c: 0, wavoip: 0, answeredWavoip: 0 };
      map[name].wavoip++;
      if (isWavoipCallAnswered(ev)) map[name].answeredWavoip++;
    }

    return Object.values(map)
      .filter(r => r.calls3c + r.wavoip > 0)
      .map(r => ({
        ...r,
        totalCalls: r.calls3c + r.wavoip,
        totalAnswered: r.answered3c + r.answeredWavoip,
        totalUnanswered: (r.calls3c - r.answered3c) + (r.wavoip - r.answeredWavoip),
        pctAnswered: (r.calls3c + r.wavoip) > 0
          ? ((r.answered3c + r.answeredWavoip) / (r.calls3c + r.wavoip) * 100)
          : 0,
      }))
      .sort((a, b) => b.totalCalls - a.totalCalls);
  }, [events]);

  const totals = useMemo(() => {
    const totalCalls = rows.reduce((s, r) => s + r.totalCalls, 0);
    const totalAnswered = rows.reduce((s, r) => s + r.totalAnswered, 0);
    return {
      totalCalls,
      totalAnswered,
      totalUnanswered: totalCalls - totalAnswered,
      pctAnswered: totalCalls > 0 ? (totalAnswered / totalCalls * 100) : 0,
    };
  }, [rows]);

  function exportCSV() {
    const header = "Vendedor,Total Ligações,Atendidas,Não Atendidas,% Atendidas,3C Total,3C Atendidas,WhatsApp Total,WhatsApp Atendidas";
    const lines = rows.map(r =>
      `${r.name},${r.totalCalls},${r.totalAnswered},${r.totalUnanswered},${r.pctAnswered.toFixed(1)}%,${r.calls3c},${r.answered3c},${r.wavoip},${r.answeredWavoip}`
    );
    lines.push(`TOTAL,${totals.totalCalls},${totals.totalAnswered},${totals.totalUnanswered},${totals.pctAnswered.toFixed(1)}%,,,, `);

    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-ligacoes-${periodoLabel || "periodo"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Relatório de Ligações</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Período: {periodoLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={exportCSV} className="gap-2">
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-border">
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totals.totalCalls}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total de ligações</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totals.totalAnswered}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Atendidas · {totals.pctAnswered.toFixed(1)}%</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{totals.totalUnanswered}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Não atendidas · {(100 - totals.pctAnswered).toFixed(1)}%</p>
          </div>
        </div>

        {/* Tabela por pessoa */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {rows.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma ligação no período</p>
          )}
          {rows.map((r) => (
            <div key={r.name} className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-foreground">{r.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-primary">
                    <PhoneCall className="w-3.5 h-3.5" />
                    {r.totalAnswered} atendidas
                  </span>
                  <span className="flex items-center gap-1 text-destructive">
                    <PhoneMissed className="w-3.5 h-3.5" />
                    {r.totalUnanswered} não atendidas
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    {r.totalCalls} total
                  </span>
                </div>
              </div>

              {/* Barra de atendimento */}
              <Bar pct={r.pctAnswered} color="bg-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{r.pctAnswered.toFixed(1)}% atendidas</span>
                <span>{(100 - r.pctAnswered).toFixed(1)}% não atendidas</span>
              </div>

              {/* Breakdown 3C vs Wavoip */}
              {(r.calls3c > 0 || r.wavoip > 0) && (
                <div className="flex gap-4 mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  {r.calls3c > 0 && (
                    <span>3C: {r.answered3c}/{r.calls3c} ({r.calls3c > 0 ? (r.answered3c / r.calls3c * 100).toFixed(0) : 0}%)</span>
                  )}
                  {r.wavoip > 0 && (
                    <span>WhatsApp: {r.answeredWavoip}/{r.wavoip} ({r.wavoip > 0 ? (r.answeredWavoip / r.wavoip * 100).toFixed(0) : 0}%)</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}