import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Phone, Target, Clock,
  ArrowUpRight, Activity, Users, ShoppingCart, DollarSign, CheckCircle, BarChart2, Layers,
} from 'lucide-react'
import { getHours } from 'date-fns'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Avatar } from '../components/ui/avatar'
import { formatCurrency, formatSeconds } from '../lib/utils'
import { use3cStats, use3cCalls, useAgents } from '../hooks/use3c'
import { useSkaleStats, useSkaleOrders } from '../hooks/useSkale'
import { useDCStats } from '../hooks/useDC'

// ── Chart tooltip ──────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs space-y-1 shadow-2xl"
      style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
      <p className="font-semibold text-white">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: '#888' }}>
          {p.name}: <span className="text-white font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── KPI card ───────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, delay = 0, trend, live, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="hover-glow card-press relative overflow-hidden rounded-xl"
      style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.1] pointer-events-none"
        style={{ background: 'radial-gradient(circle, white, transparent)' }} />
      <div className="p-5 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: accent ? `${accent}18` : 'rgba(255,255,255,0.05)', border: `1px solid ${accent ? `${accent}30` : 'rgba(255,255,255,0.08)'}` }}>
            <Icon size={15} style={accent ? { color: accent } : {}} className={accent ? '' : 'text-text-secondary'} />
          </div>
          <div className="flex items-center gap-2">
            {live && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs font-medium text-success">
                <ArrowUpRight size={11} />{trend}
              </div>
            )}
          </div>
        </div>
        <p className="text-3xl font-bold text-white mb-1 tabular-nums">{value}</p>
        <p className="text-[11px] text-faint uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── Live call feed ─────────────────────────────────────────
function CallFeed({ calls }) {
  const items = useMemo(() => {
    if (!calls?.length) return []
    return [...calls]
      .sort((a, b) => new Date(b.started_at || b.startedAt || 0) - new Date(a.started_at || a.startedAt || 0))
      .slice(0, 40)
  }, [calls])

  if (!items.length) {
    return (
      <div className="h-[260px] flex items-center justify-center">
        <p className="text-xs text-faint italic">Sem ligações no banco ainda</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-[260px] divide-y" style={{ scrollbarWidth: 'none', borderColor: 'rgba(255,255,255,0.04)' }}>
      {items.map((call, i) => {
        const agent = call.agent_name || call.agent || '—'
        const dt    = call.started_at || call.startedAt
        return (
          <div key={`${call.id || call.call_id}-${i}`} className="flex items-start gap-3 px-4 py-2.5">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: (call.duration || 0) > 60 ? 'white' : 'rgba(255,255,255,0.2)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text leading-relaxed">
                <span className="font-semibold text-white">{agent.split(' ')[0]}</span>
                {' → '}{call.phone || '—'}{call.result ? ` · ${call.result}` : ''}
              </p>
              {(call.duration || 0) > 0 && (
                <p className="text-[10px] text-faint">{formatSeconds(call.duration)}</p>
              )}
            </div>
            <span className="text-[10px] text-faint shrink-0 tabular-nums">
              {dt ? new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Agent ranking ──────────────────────────────────────────
function AgentRanking({ agents, calls }) {
  const ranked = useMemo(() => {
    if (!agents?.length) return []
    return agents.map(a => {
      const first = a.name.toLowerCase().split(' ')[0]
      const myCalls = calls?.filter(c => {
        const cn = (c.agent_name || c.agent || '').toLowerCase().split(' ')[0]
        return cn === first
      }) || []
      return { ...a, callCount: myCalls.length, isActive: a.status === 'online' || a.status === 'in_call' }
    }).sort((a, b) => b.callCount - a.callCount).slice(0, 8)
  }, [agents, calls])

  if (!ranked.length) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-xs text-faint italic">Sem agentes conectados</p>
      </div>
    )
  }

  const max = ranked[0]?.callCount || 1

  return (
    <div>
      {ranked.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + i * 0.06, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-3 px-5 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span className="text-xs w-4 tabular-nums font-mono"
            style={{ color: i === 0 ? '#fff' : '#333' }}>{i + 1}</span>
          <div className="relative shrink-0">
            <Avatar name={a.name} size="sm" />
            {a.isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2"
                style={{ borderColor: '#0c0c0c', boxShadow: '0 0 5px rgba(34,197,94,0.6)' }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text truncate">{a.name.split(' ')[0]}</p>
            <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <motion.div className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${(a.callCount / max) * 100}%` }}
                transition={{ delay: 0.7 + i * 0.06, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
          </div>
          <p className="text-xs font-bold text-white tabular-nums shrink-0">{a.callCount}</p>
        </motion.div>
      ))}
    </div>
  )
}

// ── Recent Skale orders feed ───────────────────────────────
function OrderFeed({ orders }) {
  const recent = useMemo(() => {
    if (!orders?.length) return []
    return [...orders]
      .sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0))
      .slice(0, 30)
  }, [orders])

  if (!recent.length) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-xs text-faint italic">Nenhum pedido recebido ainda</p>
      </div>
    )
  }

  const PAY_COLOR = { Pago: '#22c55e', Confirmado: '#22c55e', Pendente: '#f59e0b', 'Aguardando Pagamento': '#f59e0b', Recusado: '#ef4444' }

  return (
    <div className="overflow-y-auto h-[200px] divide-y" style={{ scrollbarWidth: 'none', borderColor: 'rgba(255,255,255,0.04)' }}>
      {recent.map((o, i) => (
        <div key={o.id || i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{o.customer_name || '—'}</p>
            <p className="text-[10px] truncate" style={{ color: '#444' }}>{o.product_name || '—'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold text-white tabular-nums">{formatCurrency((o.total_price || 0) / 100)}</p>
            <p className="text-[10px]" style={{ color: PAY_COLOR[o.payment_status] || '#555' }}>
              {o.payment_status || '—'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function Dashboard() {
  const { data: stats3cRaw, isLoading: loadingStats3c } = use3cStats()
  const { data: calls = [],  isLoading: loadingCalls   } = use3cCalls(500)
  const { data: agents,      isLoading: loadingAgents  } = useAgents()
  const { data: skaleStats,  isLoading: loadingSkale   } = useSkaleStats()
  const { data: skaleOrders = [] }                        = useSkaleOrders()
  const { data: dcStats }                                 = useDCStats()

  // ── 3C KPIs — direto do banco ─────────────────────────
  const totalCalls  = Number(stats3cRaw?.total_calls  || 0)
  const avgDuration = Math.round(Number(stats3cRaw?.avg_duration || 0))
  const answered    = useMemo(() => calls.filter(c => (c.duration || 0) > 10).length, [calls])
  const hasData     = totalCalls > 0

  const activeAgents = useMemo(() =>
    agents?.filter(a => a.status === 'online' || a.status === 'in_call').length || 0
  , [agents])

  // ── Hourly chart — distribuição horária do banco ───────
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}h`, calls: 0 }))
    calls.forEach(c => {
      const dt = c.started_at || c.startedAt
      if (!dt) return
      const h = getHours(new Date(dt))
      if (h >= 0 && h < 24) hours[h].calls++
    })
    return hours.filter(h => parseInt(h.hour) >= 7 && parseInt(h.hour) <= 21)
  }, [calls])

  // ── Skale KPIs ─────────────────────────────────────────
  const revenueToday  = Number(skaleStats?.revenue_today  || 0)
  const ordersToday   = Number(skaleStats?.orders_today   || 0)
  const paidToday     = Number(skaleStats?.paid_today     || 0)
  const revenueTotal  = Number(skaleStats?.revenue_total  || 0)
  const ordersTotal   = Number(skaleStats?.orders_total   || 0)

  const dcWonCount   = dcStats?.wonDeals       || 0
  const dcLeadsTotal = dcStats?.totalLeads     || 0
  const dcInProcess  = dcStats?.inProcessDeals || 0
  const dcWonValue   = dcStats?.wonValue       || 0  // soma monetária em R$

  const isLoading = loadingStats3c || loadingCalls || loadingAgents

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-xs text-faint mt-0.5">
            Dados reais · <span className="text-success">3C Plus</span> + <span style={{ color: '#a78bfa' }}>Skale</span> · histórico completo
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', color: '#22c55e' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {activeAgents} ativos
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
            <ShoppingCart size={10} />
            {ordersTotal} pedidos
          </div>
        </div>
      </motion.div>

      {/* KPIs — row 1: 3C */}
      <div>
        <p className="text-[10px] text-faint uppercase tracking-wider mb-3 flex items-center gap-2">
          <Phone size={10} /> 3C Plus · Histórico do banco
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total de ligações"
            value={isLoading ? '…' : <AnimatedNumber value={totalCalls} />}
            sub={hasData ? 'no banco · 3C Plus' : 'aguardando dados'}
            icon={Phone} delay={0} live={hasData}
          />
          <KPICard
            label="Agentes ativos"
            value={loadingAgents ? '…' : <AnimatedNumber value={activeAgents} />}
            sub={`de ${agents?.length || 0} cadastrados`}
            icon={Users} delay={0.06} live={activeAgents > 0}
          />
          <KPICard
            label="Atendidas (amostra)"
            value={isLoading ? '…' : <AnimatedNumber value={answered} />}
            sub={calls.length > 0 ? `de ${calls.length} carregadas` : 'aguardando dados'}
            icon={Activity} delay={0.12}
          />
          <KPICard
            label="Tempo médio"
            value={isLoading ? '…' : formatSeconds(avgDuration)}
            sub="por ligação · média geral"
            icon={Clock} delay={0.18}
          />
        </div>
      </div>

      {/* KPIs — row 2: Skale */}
      <div>
        <p className="text-[10px] text-faint uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShoppingCart size={10} /> Skale · Hoje
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Receita hoje"
            value={loadingSkale ? '…' : formatCurrency(revenueToday / 100)}
            sub="pagamentos confirmados"
            icon={DollarSign} delay={0.06} accent="#22c55e"
            trend={revenueToday > 0 ? undefined : undefined}
          />
          <KPICard
            label="Pedidos hoje"
            value={loadingSkale ? '…' : <AnimatedNumber value={ordersToday} />}
            sub={`${paidToday} pagos`}
            icon={ShoppingCart} delay={0.12} accent="#a78bfa"
          />
          <KPICard
            label="Pagos hoje"
            value={loadingSkale ? '…' : <AnimatedNumber value={paidToday} />}
            sub={ordersToday > 0 ? `${Math.round((paidToday / ordersToday) * 100)}% dos pedidos` : '—'}
            icon={CheckCircle} delay={0.18} accent="#22c55e"
          />
          <KPICard
            label="Receita total"
            value={loadingSkale ? '…' : formatCurrency(revenueTotal / 100)}
            sub={`${ordersTotal} pedidos no total`}
            icon={TrendingUp} delay={0.24} accent="#a78bfa"
          />
        </div>
      </div>

      {/* Hourly chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-xl overflow-hidden hover-glow"
        style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-faint uppercase tracking-wider">Distribuição por hora · 3C Plus</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {hasData
                ? <><AnimatedNumber value={totalCalls} /> ligações no total</>
                : <span className="text-text-secondary text-sm">Aguardando dados 3C…</span>}
            </p>
          </div>
          <span className="tag">{hasData ? 'real' : 'sem dados'}</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={hourlyData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="95%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" tick={{ fill: '#3a3a3a', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#3a3a3a', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="calls" name="Ligações"
              stroke="rgba(255,255,255,0.6)" fill="url(#callsGrad)"
              strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: 'white', stroke: 'none' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Feed + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-xl overflow-hidden hover-glow"
          style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 pt-4 pb-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="relative flex h-2 w-2">
              {hasData && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-50" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${hasData ? 'bg-success' : 'bg-subtle'}`} />
            </span>
            <p className="text-[10px] text-faint uppercase tracking-wider">Últimas ligações · 3C banco</p>
          </div>
          <CallFeed calls={calls} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-xl overflow-hidden hover-glow"
          style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[10px] text-faint uppercase tracking-wider">Ranking · ligações hoje</p>
            <Users size={12} className="text-faint" />
          </div>
          <AgentRanking agents={agents} calls={calls} />
        </motion.div>
      </div>

      {/* DataCrazy KPIs */}
      <div>
        <p className="text-[10px] text-faint uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart2 size={10} /> DataCrazy · CRM
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Leads no CRM" value={<AnimatedNumber value={dcLeadsTotal} />}
            sub="total de contatos" icon={Users} delay={0} accent="#60a5fa" />
          <KPICard label="Em negociação" value={<AnimatedNumber value={dcInProcess} />}
            sub="negócios em processo" icon={Target} delay={0.06} accent="#60a5fa" />
          <KPICard label="Negócios ganhos" value={<AnimatedNumber value={dcWonCount} />}
            sub={dcWonValue > 0 ? formatCurrency(dcWonValue) : 'fechados no CRM'} icon={CheckCircle} delay={0.12} accent="#22c55e" />
          <KPICard label="Conversão DC→Skale" value={
            dcLeadsTotal > 0 && ordersTotal > 0
              ? `${Math.min(Math.round((ordersTotal / dcLeadsTotal) * 100), 100)}%`
              : '—'
          } sub="leads → pedidos Skale" icon={Layers} delay={0.18} accent="#a78bfa" />
        </div>
      </div>

      {/* Skale recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-xl overflow-hidden hover-glow"
        style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {skaleOrders.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: '#a78bfa' }} />}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: skaleOrders.length > 0 ? '#a78bfa' : '#333' }} />
            </span>
            <p className="text-[10px] text-faint uppercase tracking-wider">Últimos pedidos · Skale</p>
          </div>
          <ShoppingCart size={12} className="text-faint" />
        </div>
        <OrderFeed orders={skaleOrders} />
      </motion.div>

    </div>
  )
}
