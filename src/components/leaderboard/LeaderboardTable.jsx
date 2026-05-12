import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Trophy, Medal, Search } from "lucide-react";
import { getCriteriaValue } from "@/lib/leaderboardUtils";

const PERSON_COLORS = [
  "#4F8F63", "#3AAFCA", "#E8B84B", "#B85C5C", "#9B79D4", "#E87D4B", "#4B8FCA",
];

const GOLD   = "#F5C842";
const SILVER = "#9BADB7";
const BRONZE = "#CD7F54";

const RANK_COLORS = [GOLD, SILVER, BRONZE];

function RankBadge({ rank }) {
  if (rank === 0) return <Trophy className="w-4 h-4" style={{ color: GOLD }} />;
  if (rank === 1) return <Medal className="w-4 h-4" style={{ color: SILVER }} />;
  if (rank === 2) return <Medal className="w-4 h-4" style={{ color: BRONZE }} />;
  return <span className="text-xs text-muted-foreground font-semibold w-5 text-center">{rank + 1}</span>;
}

export default function LeaderboardTable({ data, criteria, type, loading }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.name.toLowerCase().includes(q));
  }, [data, search]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#2A342D] p-6 space-y-3"
        style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-[#2A342D] p-12 text-center"
        style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}>
        <Trophy className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Nenhum dado disponível para o período selecionado</p>
      </div>
    );
  }

  const salesCols = ["Leads", "Vendas", "Conversão %"];
  const collectionCols = ["Pedidos", "Tentativas", "Promessas", "Pagamentos", "Taxa Pgto."];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ranking Completo</h2>
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

      <div
        className="rounded-2xl border border-[#2A342D] overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A342D]" style={{ background: "hsl(150 17% 7%)" }}>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider w-12">#</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Colaborador</th>
                {type === "sales" && salesCols.map((col) => (
                  <th key={col} className="text-right px-4 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{col}</th>
                ))}
                {type === "collection" && collectionCols.map((col) => (
                  <th key={col} className="text-right px-4 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">{col}</th>
                ))}
                <th className="text-right px-5 py-3.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#4F8F63" }}>Critério</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum vendedor encontrado para "{search}"
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const originalIdx = data.indexOf(row);
                  const personColor = PERSON_COLORS[originalIdx % PERSON_COLORS.length];
                  const isTop3 = originalIdx < 3;
                  const rankColor = RANK_COLORS[originalIdx];

                  return (
                    <tr
                      key={row.name}
                      className="border-b border-[#2A342D]/60 transition-colors group"
                      style={{
                        background: isTop3
                          ? `${rankColor}08`
                          : "transparent",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${personColor}0D`}
                      onMouseLeave={(e) => e.currentTarget.style.background = isTop3 ? `${rankColor}08` : "transparent"}
                    >
                      {/* Rank */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center w-6">
                          <RankBadge rank={originalIdx} />
                        </div>
                      </td>

                      {/* Name + Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                            style={{
                              background: `radial-gradient(circle, ${personColor}cc, ${personColor}88)`,
                              boxShadow: `0 0 10px ${personColor}44`,
                            }}
                          >
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                          <Link
                            to={`/seller-profile?seller=${encodeURIComponent(row.name)}`}
                            className="font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-80"
                            style={{ color: isTop3 ? rankColor : "hsl(var(--foreground))" }}
                          >
                            {row.name}
                          </Link>
                        </div>
                      </td>

                      {type === "sales" && (
                        <>
                          <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">{row.leads}</td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">{row.wins}</td>
                          <td className="px-4 py-3.5 text-right">
                            <span
                              className="font-semibold"
                              style={{ color: parseFloat(row.conversion) >= 7 ? "#4F8F63" : parseFloat(row.conversion) >= 4 ? "#E8B84B" : "hsl(var(--muted-foreground))" }}
                            >
                              {row.conversion}%
                            </span>
                          </td>
                        </>
                      )}

                      {type === "collection" && (
                        <>
                          <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">{row.orders}</td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">{row.attempts}</td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">{row.promises}</td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">{row.payments}</td>
                          <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">{row.paymentRate}%</td>
                        </>
                      )}

                      {/* Criteria value */}
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className="font-extrabold text-sm px-2.5 py-0.5 rounded-full"
                          style={{
                            background: `${personColor}18`,
                            color: personColor,
                            border: `1px solid ${personColor}40`,
                          }}
                        >
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
          <div className="px-5 py-2.5 border-t border-[#2A342D] text-xs text-muted-foreground">
            {filtered.length} de {data.length} colaboradores
          </div>
        )}
      </div>
    </div>
  );
}