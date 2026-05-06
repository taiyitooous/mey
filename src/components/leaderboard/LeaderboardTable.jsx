import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trophy, Medal, Search } from "lucide-react";
import { getCriteriaValue } from "@/lib/leaderboardUtils";

const RANK_ICONS = [
  <Trophy className="w-4 h-4 text-primary" />,
  <Medal className="w-4 h-4 text-muted-foreground" />,
  <Medal className="w-4 h-4 text-muted-foreground/50" />,
];

const RANK_BG = [
  "bg-primary/5 border-primary/20",
  "bg-muted/30 border-border",
  "bg-muted/10 border-border",
];

export default function LeaderboardTable({ data, criteria, type, loading }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.name.toLowerCase().includes(q));
  }, [data, search]);

  if (loading) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-10 bg-card border-border text-center">
        <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">Nenhum dado disponível para o período selecionado</p>
      </Card>
    );
  }

  const salesCols = ["Leads", "Vendas", "Conversão %", "Ligações", "Atendidas", "Taxa Atend."];
  const collectionCols = ["Pedidos", "Tentativas", "Promessas", "Pagamentos", "Taxa Pgto."];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ranking completo</h2>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-card border-border placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Colaborador</th>
                {type === "sales" && salesCols.map((col) => (
                  <th key={col} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">{col}</th>
                ))}
                {type === "collection" && collectionCols.map((col) => (
                  <th key={col} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">{col}</th>
                ))}
                <th className="text-right px-4 py-3 text-xs font-semibold text-primary">Critério</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum vendedor encontrado para "{search}"
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => {
                  // rank position is based on original data array
                  const originalIdx = data.indexOf(row);
                  return (
                    <tr
                      key={row.name}
                      className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${originalIdx < 3 ? RANK_BG[originalIdx] : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center w-6 h-6">
                          {originalIdx < 3
                            ? RANK_ICONS[originalIdx]
                            : <span className="text-xs text-muted-foreground font-semibold">{originalIdx + 1}</span>
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`font-medium ${originalIdx === 0 ? "text-foreground" : "text-foreground/80"}`}>{row.name}</span>
                        </div>
                      </td>

                      {type === "sales" && (
                        <>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.leads}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.wins}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.conversion}%</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.calls}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.callsAnswered}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.answerRate}%</td>
                        </>
                      )}

                      {type === "collection" && (
                        <>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.orders}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.attempts}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.promises}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.payments}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.paymentRate}%</td>
                        </>
                      )}

                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-sm ${originalIdx === 0 ? "text-primary" : "text-foreground"}`}>
                          {getCriteriaValue(row, criteria, type)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {search && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/10 text-xs text-muted-foreground">
            {filtered.length} de {data.length} colaboradores
          </div>
        )}
      </Card>
    </div>
  );
}