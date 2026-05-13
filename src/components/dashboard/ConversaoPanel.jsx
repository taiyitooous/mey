import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, TrendingUp, CheckCircle2, BarChart2 } from "lucide-react";

const C = {
  oficial:  "#4F8F63",
  pendente: "#B97A56",
  neutro:   "#6F7A72",
  fg:       "#F3F6F2",
  bg:       "#121815",
  muted:    "#17211B",
  border:   "#2A342D",
  dimmed:   "#A7B0A9",
};

const CARD = "rounded-2xl border bg-[#121815] border-[#2A342D] shadow-sm";
const fmt = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

function ConvBar({ pct, color }) {
  return (
    <div className="h-1.5 rounded-full w-full" style={{ background: "#2A342D" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  );
}

export default function ConversaoPanel() {
  const { data: orders = [] } = useQuery({
    queryKey: ["orders_conv"],
    queryFn: () => base44.entities.Order.list("-created_date", 2000),
    refetchInterval: 60000,
  });

  // Agrupa pedidos por dia de criação (últimos 7 dias + hoje)
  const dias = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const dayStr = format(d, "yyyy-MM-dd");
      const label = i === 6
        ? "Hoje"
        : format(d, "dd/MM", { locale: ptBR });

      const dayOrders = orders.filter(o => {
        const cd = o.created_date ? format(new Date(o.created_date), "yyyy-MM-dd") : null;
        return cd === dayStr;
      });

      const total = dayOrders.length;
      const pagos = dayOrders.filter(o => o.payment_status === "paid").length;
      const valorTotal = dayOrders.reduce((s, o) => s + (o.amount || 0), 0);
      const valorPago  = dayOrders.filter(o => o.payment_status === "paid").reduce((s, o) => s + (o.amount || 0), 0);
      const pct = total > 0 ? (pagos / total) * 100 : 0;

      return { label, dayStr, total, pagos, valorTotal, valorPago, pct, isToday: i === 6 };
    });
  }, [orders]);

  // Geral
  const geral = useMemo(() => {
    const total = orders.length;
    const pagos = orders.filter(o => o.payment_status === "paid").length;
    const valorTotal = orders.reduce((s, o) => s + (o.amount || 0), 0);
    const valorPago  = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + (o.amount || 0), 0);
    const pct = total > 0 ? (pagos / total) * 100 : 0;
    return { total, pagos, valorTotal, valorPago, pct };
  }, [orders]);

  const hoje = dias[dias.length - 1];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${C.oficial}22` }}>
          <BarChart2 className="w-3.5 h-3.5" style={{ color: C.oficial }} />
        </div>
        <h2 className="text-base font-semibold" style={{ color: C.fg }}>Conversão de Pedidos</h2>
      </div>

      {/* Cards Hoje + Geral */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hoje */}
        <div className={`${CARD} p-5 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: C.pendente }} />
          <p className="text-[11px] font-medium tracking-widest uppercase mb-3" style={{ color: C.neutro }}>Hoje</p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-3xl font-bold leading-none" style={{ color: C.fg }}>{hoje.total}</p>
              <p className="text-xs mt-1" style={{ color: C.neutro }}>pedidos recebidos</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold leading-none" style={{ color: C.oficial }}>{hoje.pagos}</p>
              <p className="text-xs mt-1" style={{ color: C.neutro }}>pagos</p>
            </div>
          </div>
          <ConvBar pct={hoje.pct} color={hoje.pct >= 20 ? C.oficial : C.pendente} />
          <div className="flex justify-between mt-2">
            <span className="text-xs" style={{ color: C.dimmed }}>{fmt(hoje.valorPago)} recebido</span>
            <span className="text-sm font-bold" style={{ color: hoje.pct >= 20 ? C.oficial : C.pendente }}>
              {hoje.pct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Geral */}
        <div className={`${CARD} p-5 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: C.oficial }} />
          <p className="text-[11px] font-medium tracking-widest uppercase mb-3" style={{ color: C.neutro }}>Geral (total)</p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-3xl font-bold leading-none" style={{ color: C.fg }}>{geral.total}</p>
              <p className="text-xs mt-1" style={{ color: C.neutro }}>pedidos totais</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold leading-none" style={{ color: C.oficial }}>{geral.pagos}</p>
              <p className="text-xs mt-1" style={{ color: C.neutro }}>pagos</p>
            </div>
          </div>
          <ConvBar pct={geral.pct} color={C.oficial} />
          <div className="flex justify-between mt-2">
            <span className="text-xs" style={{ color: C.dimmed }}>{fmt(geral.valorPago)} recebido</span>
            <span className="text-sm font-bold" style={{ color: C.oficial }}>{geral.pct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Tabela por dia */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-semibold" style={{ color: C.fg }}>Conversão por Dia</p>
        </div>
        <div className="divide-y" style={{ borderColor: C.border, divideColor: C.border }}>
          {/* Header */}
          <div className="grid grid-cols-5 px-5 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: C.neutro }}>
            <span>Dia</span>
            <span className="text-center">Pedidos</span>
            <span className="text-center">Pagos</span>
            <span className="text-right">Valor Pago</span>
            <span className="text-right">Conv.</span>
          </div>
          {dias.slice().reverse().map((d, i) => (
            <div
              key={i}
              className="grid grid-cols-5 px-5 py-3 items-center"
              style={{
                background: d.isToday ? `${C.oficial}08` : "transparent",
                borderColor: C.border,
              }}
            >
              <span className="text-sm font-semibold" style={{ color: d.isToday ? C.oficial : C.fg }}>
                {d.label}
              </span>
              <span className="text-sm text-center font-medium" style={{ color: C.fg }}>
                {d.total > 0 ? d.total : <span style={{ color: C.neutro }}>—</span>}
              </span>
              <span className="text-sm text-center font-medium" style={{ color: d.pagos > 0 ? C.oficial : C.neutro }}>
                {d.pagos > 0 ? d.pagos : "—"}
              </span>
              <span className="text-xs text-right" style={{ color: d.valorPago > 0 ? C.dimmed : C.neutro }}>
                {d.valorPago > 0 ? fmt(d.valorPago) : "—"}
              </span>
              <div className="flex flex-col items-end gap-1">
                {d.total > 0 ? (
                  <>
                    <span className="text-sm font-bold" style={{ color: d.pct >= 20 ? C.oficial : d.pct > 0 ? C.pendente : C.neutro }}>
                      {d.pct.toFixed(1)}%
                    </span>
                    <div className="w-16">
                      <ConvBar pct={d.pct} color={d.pct >= 20 ? C.oficial : C.pendente} />
                    </div>
                  </>
                ) : (
                  <span style={{ color: C.neutro }}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}