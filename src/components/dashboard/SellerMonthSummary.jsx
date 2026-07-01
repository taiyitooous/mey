import React from "react";
import { Truck, TrendingUp, ChevronUp, ChevronDown, Minus } from "lucide-react";

const C = {
  oficial: "#4F8F63",
  pendente: "#B97A56",
  neutro: "#6F7A72",
  dourado: "#C8A94D",
  roxo: "#9B79D4",
  azul: "#3AAFCA",
};

const CARD_BASE = "rounded-2xl border bg-[#121815] border-[#2A342D] shadow-sm";
const fmt = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const DATA = [
  { seller: "Isa Rodrigues Da Silva", paid: 97, scheduled: 170, scheduledValue: 90237, unpaid: 9, unpaidValue: 4293, leads: 2640 },
  { seller: "Luiz Gustavo Pereira dos Santos", paid: 80, scheduled: 154, scheduledValue: 89109, unpaid: 9, unpaidValue: 5165, leads: 2656 },
  { seller: "Juliana Peixoto Da Silva", paid: 75, scheduled: 156, scheduledValue: 87423.99, unpaid: 12, unpaidValue: 7612, leads: 2692 },
  { seller: "Wellington Ramos Ferreira", paid: 71, scheduled: 132, scheduledValue: 52175, unpaid: 10, unpaidValue: 4316, leads: 2666 },
  { seller: "Ana Carolina da Silva Ponciano", paid: 65, scheduled: 93, scheduledValue: 51179, unpaid: 6, unpaidValue: 2948, leads: 2684 },
  { seller: "Livia Borges Santa Rosa", paid: 50, scheduled: 101, scheduledValue: 54925, unpaid: 3, unpaidValue: 1101, leads: 1955 },
  { seller: "Luisa Isabelly Benone Lucindo", paid: 22, scheduled: 67, scheduledValue: 31931, unpaid: 3, unpaidValue: 1635, leads: 975 },
  { seller: "Edna Batista da Silva", paid: 21, scheduled: 73, scheduledValue: 39867, unpaid: 6, unpaidValue: 2506, leads: 1485 },
  { seller: "Lara Lorena Silva Carvalho", paid: 21, scheduled: 80, scheduledValue: 42658, unpaid: 2, unpaidValue: 886, leads: 1498 },
  { seller: "Erick Nascimento Santos", paid: 0, scheduled: 18, scheduledValue: 10264, unpaid: 0, unpaidValue: 0, leads: 248 },
];

const TOTAL = DATA.reduce(
  (acc, r) => ({
    paid: acc.paid + r.paid,
    scheduled: acc.scheduled + r.scheduled,
    scheduledValue: acc.scheduledValue + r.scheduledValue,
    unpaid: acc.unpaid + r.unpaid,
    unpaidValue: acc.unpaidValue + r.unpaidValue,
    leads: acc.leads + r.leads,
  }),
  { paid: 0, scheduled: 0, scheduledValue: 0, unpaid: 0, unpaidValue: 0, leads: 0 }
);

function ConversionBadge({ scheduled, leads }) {
  if (!leads || leads === 0) return <span className="text-xs" style={{ color: C.neutro }}>—</span>;
  const pct = (scheduled / leads) * 100;
  const color = pct >= 6 ? C.oficial : pct >= 5 ? C.dourado : C.pendente;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {pct >= 6 ? <ChevronUp className="w-3 h-3" /> : pct >= 5 ? <Minus className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {pct.toFixed(1)}%
    </span>
  );
}

export default function SellerMonthSummary() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#F3F6F2] tracking-tight">Resumo por Vendedor</h2>
          <p className="text-xs mt-0.5" style={{ color: C.neutro }}>Junho / 2026</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: "#17211B", borderColor: "#2A342D" }}>
          <Truck className="w-4 h-4" style={{ color: C.oficial }} />
          <span className="text-sm font-semibold text-[#F3F6F2]">Pedidos entregues:</span>
          <span className="text-sm font-bold" style={{ color: C.oficial }}>604</span>
        </div>
      </div>

      <div className={`${CARD_BASE} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0B0F0D" }}>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: C.neutro }}>Vendedor</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: C.oficial }}>Qtd. Pagos</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: C.neutro }}>Qtd. Agend.</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: C.dourado }}>Valor Agend.</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: C.roxo }}>Leads</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: C.azul }}>Conversão</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: C.pendente }}>Qtd. Inadimpl.</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: C.pendente }}>Valor Inadimpl.</th>
              </tr>
            </thead>
            <tbody>
              {DATA.map((row) => (
                <tr key={row.seller} className="border-t border-[#2A342D]/50 transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${C.oficial}cc, ${C.oficial}77)` }}
                      >
                        {row.seller.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-[#F3F6F2] truncate">{row.seller}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold" style={{ color: C.oficial }}>{row.paid}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-[#F3F6F2]">{row.scheduled}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold" style={{ color: C.dourado }}>{fmt(row.scheduledValue)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold" style={{ color: C.roxo }}>{row.leads.toLocaleString("pt-BR")}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ConversionBadge scheduled={row.scheduled} leads={row.leads} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold" style={{ color: row.unpaid > 0 ? C.pendente : C.neutro }}>{row.unpaid}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold" style={{ color: row.unpaidValue > 0 ? C.pendente : C.neutro }}>
                      {row.unpaidValue > 0 ? fmt(row.unpaidValue) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2" style={{ background: "#17211B", borderColor: C.oficial }}>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-bold text-[#F3F6F2]">TOTAL</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm font-bold" style={{ color: C.oficial }}>{TOTAL.paid}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm font-bold text-[#F3F6F2]">{TOTAL.scheduled}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm font-bold" style={{ color: C.dourado }}>{fmt(TOTAL.scheduledValue)}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm font-bold" style={{ color: C.roxo }}>{TOTAL.leads.toLocaleString("pt-BR")}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <ConversionBadge scheduled={TOTAL.scheduled} leads={TOTAL.leads} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm font-bold" style={{ color: C.pendente }}>{TOTAL.unpaid}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm font-bold" style={{ color: C.pendente }}>{fmt(TOTAL.unpaidValue)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}