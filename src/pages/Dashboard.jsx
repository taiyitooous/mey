import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadialBarChart, RadialBar
} from 'recharts'
import { TrendingUp, Phone, MessageSquare, Target, DollarSign, AlertTriangle, ArrowUpRight, Zap, Activity } from 'lucide-react'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { EVENTS, SELLERS, LEADS } from '../lib/mockData'
import { formatCurrency, formatSeconds, timeAgo } from '../lib/utils'

// ── Static chart data ──────────────────────────────────────
const HOURS = [
  { hour: '8h', calls: 4, won: 0 },
  { hour: '9h', calls: 11, won: 1 },
  { hour: '10h', calls: 18, won: 3 },
  { hour: '11h', calls: 22, won: 2 },
  { hour: '12h', calls: 8, won: 1 },
  { hour: '13h', calls: 14, won: 2 },
  { hour: '14h', calls: 19, won: 4 },
  { hour: '15h', calls: 24, won: 3 },
  { hour: '16h', calls: 16, won: 2 },
]

const WEEK_DATA = [
  { day: 'Seg', calls: 87, won: 12, revenue: 8400 },
  { day: 'Ter', calls: 102, won: 15, revenue: 11200 },
  { day: 'Qua', calls: 94, won: 11, revenue: 7800 },
  { day: 'Qui', calls: 118, won: 18, revenue: 14600 },
  { day: 'Sex', calls: 76, won: 9, revenue: 6300 },
  { day: 'Sáb', calls: 43, won: 6, revenue: 4100 },
  { day: 'Hoje', calls: 136, won: 16, revenue: 12800 },
]

// ── Custom tooltip ─────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs space-y-1 shadow-xl"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="text-white font-semibold">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: '#aaa' }}>
          {p.name}: <span className="text-white font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, delay = 0, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="hover-glow relative overflow-hidden rounded-xl cursor-default"
      style={{
        background: 'rgba(14,14,14,0.9)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Top-right glow */}
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, white, transparent)' }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Icon size={16} className="text-text-secondary" />
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-xs font-medium text-success">
              <ArrowUpRight size={12} />
              {trend}
            </div>
          )}
        </div>
        <p className="text-3xl font-bold text-white mb-1 tabular-nums">{value}</p>
        <p className="text-xs text-faint uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── Live ticker feed ───────────────────────────────────────
function LiveFeed({ events }) {
  const items = useMemo(() => {
    const base = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return [...base, ...base] // duplicate for seamless loop
  }, [events])

  return (
    <div className="overflow-hidden h-[360px] relative">
      {/* Fade overlays */}
      <div className="absolute top-0 left-0 right-0 h-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #0e0e0e, transparent)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-12 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0e0e0e, transparent)' }} />

      <div className="ticker-inner">
        {items.map((event, i) => (
          <div key={`${event.id}-${i}`}
            className="flex items-start gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
              event.event_type === 'lead.won' ? 'bg-success' :
              event.event_type === 'lead.lost' ? 'bg-destructive' :
              event.event_type === 'whatsapp_call_received' ? 'bg-white' :
              'bg-subtle'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text leading-relaxed">
                <span className="font-semibold text-white">{event.user_name.split(' ')[0]}</span>
                {' '}
                {event.event_type === 'call_answered' && `→ ligação (${event.payload?.result || 'sem resultado'})`}
                {event.event_type === 'whatsapp_call_received' && '→ WhatsApp recebido'}
                {event.event_type === 'lead.won' && `→ venda ${formatCurrency(event.payload?.value)}`}
                {event.event_type === 'lead.lost' && '→ lead perdido'}
              </p>
              {event.payload?.speaking_time && (
                <p className="text-xs text-faint">{formatSeconds(event.payload.speaking_time)} falados</p>
              )}
            </div>
            <span className="text-xs text-faint shrink-0 tabular-nums">{timeAgo(event.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Radial progress ────────────────────────────────────────
function RadialProgress({ value, max, label, color = '#fff' }) {
  const pct = Math.round((value / max) * 100)
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{pct}%</span>
        </div>
      </div>
      <p className="text-xs text-faint text-center">{label}</p>
      <p className="text-sm font-semibold text-text">{value}/{max}</p>
    </div>
  )
}

export default function Dashboard() {
  const [tick, setTick] = useState(0)

  // Simulate live updates
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 8000)
    return () => clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    const calls = EVENTS.filter(e => e.event_type === 'call_answered' || e.event_type === 'whatsapp_call_received')
    const won = EVENTS.filter(e => e.event_type === 'lead.won')
    const totalWonValue = won.reduce((sum, e) => sum + (e.payload?.value || 0), 0)
    const answered = calls.filter(e => e.payload?.result === 'interested' || e.payload?.result === 'callback' || e.event_type === 'whatsapp_call_received')
    const contactRate = calls.length ? Math.round((answered.length / calls.length) * 100) : 0
    const avgTalk = calls.length
      ? Math.round(calls.reduce((s, e) => s + (e.payload?.speaking_time || 0), 0) / calls.length)
      : 0
    return { calls: calls.length, won: won.length, totalWonValue, contactRate, avgTalk }
  }, [tick])

  const sellerStats = useMemo(() => {
    return SELLERS.map(seller => {
      const evts = EVENTS.filter(e => e.user_name === seller.name)
      const calls = evts.filter(e => e.event_type === 'call_answered' || e.event_type === 'whatsapp_call_received').length
      const won = evts.filter(e => e.event_type === 'lead.won').length
      const lastEvent = evts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      const isActive = lastEvent && (Date.now() - new Date(lastEvent.created_at)) < 30 * 60 * 1000
      return { ...seller, calls, won, lastEvent, isActive }
    }).sort((a, b) => b.calls - a.calls)
  }, [tick])

  const recentEvents = useMemo(() =>
    [...EVENTS].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [tick]
  )

  const activeCount = sellerStats.filter(s => s.isActive).length

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-faint mt-0.5">Visão geral da operação em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {activeCount} ativos
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-faint"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Activity size={11} />
            Ao vivo
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Ligações hoje"
          value={<AnimatedNumber value={stats.calls} />}
          sub="3C Plus + WhatsApp"
          icon={Phone}
          delay={0}
          trend="+12%"
        />
        <KPICard
          label="Vendas fechadas"
          value={<AnimatedNumber value={stats.won} />}
          sub={formatCurrency(stats.totalWonValue)}
          icon={TrendingUp}
          delay={0.08}
          trend="+8%"
        />
        <KPICard
          label="Taxa de contato"
          value={<AnimatedNumber value={stats.contactRate} suffix="%" />}
          sub="das ligações atendidas"
          icon={Target}
          delay={0.16}
        />
        <KPICard
          label="Tempo médio"
          value={formatSeconds(stats.avgTalk)}
          sub="por ligação"
          icon={DollarSign}
          delay={0.24}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart — calls */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="lg:col-span-2 rounded-xl overflow-hidden hover-glow"
          style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-faint uppercase tracking-wider">Ligações por hora</p>
              <p className="text-xl font-bold text-white mt-0.5">
                <AnimatedNumber value={HOURS.reduce((s, h) => s + h.calls, 0)} /> ligações
              </p>
            </div>
            <span className="tag">hoje</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={HOURS} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="95%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="calls" name="Ligações"
                stroke="rgba(255,255,255,0.7)" fill="url(#callsGradient)"
                strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'white', stroke: 'none' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radial stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
          className="rounded-xl p-5 hover-glow"
          style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-xs text-faint uppercase tracking-wider mb-5">Saúde da operação</p>
          <div className="flex flex-col gap-4 items-center">
            <RadialProgress value={stats.contactRate} max={100} label="Taxa contato" color="#ffffff" />
            <div className="w-full space-y-3">
              {[
                { label: 'Calls atendidas', value: 8, max: 12 },
                { label: 'Meta vendas', value: stats.won, max: 20 },
              ].map(({ label, value, max }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-faint">{label}</span>
                    <span className="text-text-secondary">{value}/{max}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                      transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Week bar + feed + ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart — week */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="rounded-xl overflow-hidden hover-glow"
          style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs text-faint uppercase tracking-wider">Vendas da semana</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {formatCurrency(WEEK_DATA.reduce((s, d) => s + d.revenue, 0))}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={WEEK_DATA} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="won" name="Vendas" radius={[4, 4, 0, 0]}
                fill="rgba(255,255,255,0.15)"
                activeBar={{ fill: 'rgba(255,255,255,0.85)' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Live feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.4 }}
          className="rounded-xl overflow-hidden hover-glow"
          style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 pt-4 pb-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute w-2.5 h-2.5 rounded-full bg-success/20 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
            </div>
            <p className="text-xs text-faint uppercase tracking-wider">Feed ao vivo</p>
          </div>
          <LiveFeed events={recentEvents} />
        </motion.div>

        {/* Ranking */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.4 }}
          className="rounded-xl overflow-hidden hover-glow"
          style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-faint uppercase tracking-wider">Ranking hoje</p>
          </div>
          <div>
            {sellerStats.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.07 }}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="text-xs w-4 tabular-nums"
                  style={{ color: i === 0 ? '#fff' : '#444' }}>
                  {i + 1}
                </span>
                <div className="relative">
                  <Avatar name={s.name} size="sm" />
                  {s.isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2"
                      style={{ borderColor: '#0e0e0e' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text truncate">{s.name.split(' ')[0]}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-1 rounded-full flex-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full bg-white rounded-full"
                        style={{ width: `${(s.calls / (sellerStats[0]?.calls || 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">{s.calls}</p>
                  <p className="text-xs text-success">{s.won}✓</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="rounded-xl p-5 hover-glow"
        style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={14} className="text-warning" />
          <p className="text-xs text-faint uppercase tracking-wider">Alertas da operação</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Leads parados > 24h', value: 3, color: 'text-warning', desc: 'sem atividade recente', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)' },
            { label: 'Entregas atrasadas', value: 1, color: 'text-destructive', desc: 'aguardam há 7+ dias', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' },
            { label: 'Cobranças vencendo', value: 2, color: 'text-text', desc: 'promessas em 3 dias', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' },
          ].map(({ label, value, color, desc, bg, border }) => (
            <div key={label} className="rounded-lg p-4"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <p className="text-xs text-faint mb-2">{label}</p>
              <p className={`text-3xl font-bold ${color} tabular-nums`}>
                <AnimatedNumber value={value} />
              </p>
              <p className="text-xs text-text-secondary mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
