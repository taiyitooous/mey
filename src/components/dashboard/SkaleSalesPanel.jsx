import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const C = {
  oficial:  "#4F8F63",
  validacao:"#C8A94D",
  danger:   "#B85C5C",
  neutro:   "#6F7A72",
  fg:       "#F3F6F2",
  muted:    "#17211B",
  border:   "#2A342D",
  bg:       "#121815",
};

const CARD = "rounded-2xl border bg-[#121815] border-[#2A342D] shadow-sm";
const fmt = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const TICK_STYLE = { fontSize: 10, fill: C.neutro };

const PremiumTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#17211B", border: "1px solid #2A342D", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ color: C.neutro, fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || C.fg, fontSize: 13, fontWeight: 700 }}>
          {typeof p.value === "number" && p.value > 200 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function MiniKpi({ label, value, sub, icon: Icon, color }) {
  return (
    <div className={`${CARD} p-5 flex flex-col gap-1 relative overflow-hidden`}>
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: C.neutro }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold leading-none mt-1" style={{ color: C.fg }}>{value}</p>
      {sub && <p className="text-xs font-semibold mt-1" style={{ color }}>{sub}</p>}
    </div>
  );
}

export default function SkaleSalesPanel() {
  const { data: skaleEvents = [] } = useQuery({
    queryKey: ["skale_events"],
    queryFn: () => base44.entities.Event.filter({ event_type: "skale.raw_payload" }, "-created_date", 500),
    refetchInterval: 30000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["skale_orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  // Filtrar apenas pedidos que vieram da Skale (tem tracking ou foram criados via webhook)
  // Identificamos pelos eventos skale que têm transaction_id
  const skaleTransactionIds = useMemo(() => {
    const ids = new Set();
    skaleEvents.forEach(ev => {
      if (ev.entity_id && ev.entity_id !== 'skale-raw') ids.add(ev.entity_id);
      try {
        const p = JSON.parse(ev.payload || '{}');
        if (p.transaction_id) ids.add(p.transaction_id);
      } catch {}
    });
    return ids;
  }, [skaleEvents]);

  const skaleOrders = useMemo(() =>
    orders.filter(o => skaleTransactionIds.has(o.order_id)),
    [orders, skaleTransactionIds]
  );

  const totalOrders = skaleOrders.length;
  const paidOrders = skaleOrders.filter(o => o.payment_status === 'paid');
  const pendingOrders = skaleOrders.filter(o => o.payment_status === 'pending');
  const canceledOrders = skaleOrders.filter(o => o.payment_status === 'canceled' || o.payment_status === 'refunded');

  const totalRevenue = paidOrders.reduce((s, o) => s + (o.amount || 0), 0);
  const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  // Vendas por dia (últimos 7 dias)
  const salesByDay = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const label = format(d, "dd/MM", { locale: ptBR });
      const dayStr = format(d, "yyyy-MM-dd");
      const count = paidOrders.filter(o => o.paid_at && format(new Date(o.paid_at), "yyyy-MM-dd") === dayStr).length;
      const value = paidOrders.filter(o => o.paid_at && format(new Date(o.paid_at), "yyyy-MM-dd") === dayStr)
        .reduce((s, o) => s + (o.amount || 0), 0);
      return { label, count, value };
    });
  }, [paidOrders]);

  // Status por estado
  const byState = useMemo(() => {
    const map = {};
    skaleOrders.forEach(o => {
      if (o.state) map[o.state] = (map[o.state] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [skaleOrders]);

  if (skaleEvents.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${C.oficial}22` }}>
          <ShoppingBag className="w-3.5 h-3.5" style={{ color: C.oficial }} />
        </div>
        <h2 className="text-base font-semibold" style={{ color: C.fg }}>Vendas via Skale</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${C.oficial}18`, color: C.oficial }}>
          {totalOrders} pedidos
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKpi label="Total Pedidos"    value={totalOrders}        icon={ShoppingBag}  color={C.oficial}   />
        <MiniKpi label="Pagos"           value={paidOrders.length}  sub={fmt(totalRevenue)} icon={CheckCircle2} color={C.oficial}   />
        <MiniKpi label="Pendentes"       value={pendingOrders.length} icon={Clock}        color={C.validacao} />
        <MiniKpi label="Ticket Médio"    value={fmt(avgTicket)}      icon={TrendingUp}   color={C.oficial}   />
      </div>

      {/* Gráfico + estados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Barras por dia */}
        <div className={`${CARD} p-6`}>
          <p className="text-sm font-semibold mb-4" style={{ color: C.fg }}>Vendas Pagas por Dia</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={salesByDay} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barCategoryGap="35%">
              <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<PremiumTooltip />} cursor={{ fill: "#2A342D", radius: 4 }} />
              <Bar dataKey="count" name="Pedidos" radius={[4, 4, 0, 0]}>
                {salesByDay.map((_, i) => (
                  <Cell key={i} fill={i === salesByDay.length - 1 ? C.oficial : `${C.oficial}70`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por estado */}
        <div className={`${CARD} p-6`}>
          <p className="text-sm font-semibold mb-4" style={{ color: C.fg }}>Pedidos por Estado</p>
          {byState.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: C.neutro }}>Sem dados de estado</p>
          ) : (
            <div className="space-y-3">
              {byState.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: C.fg }}>{item.name}</span>
                    <span className="text-sm font-bold" style={{ color: C.oficial }}>{item.count}</span>
                  </div>
                  <div className="h-[3px] rounded-full" style={{ background: "#2A342D" }}>
                    <div className="h-full rounded-full" style={{ width: `${(item.count / byState[0].count) * 100}%`, background: C.oficial }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimos pedidos */}
      <div className={`${CARD} p-6`}>
        <p className="text-sm font-semibold mb-4" style={{ color: C.fg }}>Últimos Pedidos Skale</p>
        <div className="space-y-2">
          {skaleOrders.slice(0, 8).map((o, i) => {
            const statusColor = o.payment_status === 'paid' ? C.oficial : o.payment_status === 'pending' ? C.validacao : C.danger;
            const statusLabel = o.payment_status === 'paid' ? 'Pago' : o.payment_status === 'pending' ? 'Pendente' : 'Cancelado';
            return (
              <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: "#0B0F0D", border: "1px solid #2A342D" }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: `${C.oficial}18`, color: C.oficial }}>
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.fg }}>{o.customer_name || '—'}</p>
                    <p className="text-[11px]" style={{ color: C.neutro }}>{o.order_id} · {o.city || '?'}/{o.state || '?'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: C.fg }}>{fmt(o.amount)}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor}18`, color: statusColor }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}