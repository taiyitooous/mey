import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Phone, Target, Clock,
  AlertTriangle, ArrowUpRight, Activity, Users, Zap,
} from 'lucide-react'
import { format, subDays, getHours } from 'date-fns'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { ActivityGraph } from '../components/ui/ActivityGraph'
import { Avatar } from '../components/ui/Avatar'
import { formatCurrency, formatSeconds } from '../lib/utils'
import { useCallHistory, useAgents } from '../hooks/use3c'
import { useLeads, useSellers } from '../lib/store'

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
function KPICard({ label, value, sub, icon: Icon, delay = 0, trend, live }) {
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
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Icon size={15} className="text-text-secondary" />
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

// ── Radial ─────────────────────────────────────────────────
function RadialProgress({ value, max, label }) {
  const pct = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100)
  const r = 28
  const circ = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[72px] h-[72px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <motion.circle
            cx="36" cy="36" r={r} fill="none" stroke="white" strokeWidth="5"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
            transition={{ delay: 0.8, duration: 1.0, ease: [0.23, 1, 0.32, 1] }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{pct}%</span>
        </div>
      </div>
      <p className="text-[10px] text-faint text-center leading-tight">{label}</p>
    </div>
  )
}

// ── Live event feed ────────────────────────────────────────
function CallFeed({ calls }) {
  const items = useMemo(() => {
    if (!calls?.length) return []
    const sorted = [...calls]
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 30)
    return [...sorted, ...sorted]
  }, [calls])

  if (!items.length) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <p className="text-xs text-faint italic">Sem ligações registradas hoje</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden h-[280px] relative">
      <div className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #0c0c0c, transparent)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-10 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0c0c0c, transparent)' }} />
      <div className="ticker-inner">
        {items.map((call, i) => (
          <div key={`${call.id}-${i}`} className="flex items-start gap-3 px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: call.duration > 60 ? 'white' : 'rgba(255,255,255,0.2)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text leading-relaxed">
                <span className="font-semibold text-white">{call.agent.split(' ')[0]}</span>
                {' → '}{call.phone || '—'}{call.result ? ` (${call.result})` : ''}
              </p>
              {call.duration > 0 && (
                <p className="text-[10px] text-faint">{formatSeconds(call.duration)}</p>
              )}
            </div>
            <span className="text-[10px] text-faint shrink-0 tabular-nums">
              {call.startedAt ? format(new Date(call.startedAt), 'HH:mm') : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Agent ranking ──────────────────────────────────────────
function AgentRanking({ agents, calls }) {
  const ranked = useMemo(() => {
    if (!agents?.length) return []
    return agents.map(a => {
      const agentFirst = a.name.toLowerCase().split(' ')[0]
      const myCalls = calls?.filter(c =>
        c.agent.toLowerCase().split(' ')[0] === agentFirst
      ) || []
      return { ...a, callCount: myCalls.length, isActive: a.status === 'online' || a.status === 'in_call' }
    }).sort((a, b) => b.callCount - a.callCount).slice(0, 8)
  }, [agents, calls])

  if (!ranked.length) {
    return (
      <div className="flex items-center justify-center py-12">
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

// ── Main ───────────────────────────────────────────────────
export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: calls, isSuccess: hasCalls, isLoading: loadingCalls } = useCallHistory(today)
  const { data: agents, isLoading: loadingAgents } = useAgents()
  const { items: leads } = useLeads()
  const { items: manualSellers } = useSellers()

  // ── KPI stats from real 3C data ────────────────────────
  const stats = useMemo(() => {
    if (!hasCalls || !calls?.length) {
      return { total: 0, answered: 0, contactRate: 0, avgTalk: 0 }
    }
    const answered = calls.filter(c => c.duration > 10)
    const contactedResults = ['interessado', 'interested', 'callback', 'sale', 'sucesso', 'venda']
    const contacted = answered.filter(c => contactedResults.includes(c.result?.toLowerCase()))
    const avgTalk = answered.length
      ? Math.round(answered.reduce((s, c) => s + c.duration, 0) / answered.length)
      : 0
    return {
      total: calls.length,
      answered: answered.length,
      contactRate: answered.length ? Math.round((contacted.length / answered.length) * 100) : 0,
      avgTalk,
    }
  }, [calls, hasCalls])

  // ── Online agents ──────────────────────────────────────
  const activeAgents = useMemo(() =>
    agents?.filter(a => a.status === 'online' || a.status === 'in_call').length || 0
  , [agents])

  // ── Hourly chart from real calls ───────────────────────
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}h`,
      calls: 0,
    }))
    if (calls?.length) {
      calls.forEach(c => {
        if (!c.startedAt) return
        const h = getHours(new Date(c.startedAt))
        if (h >= 0 && h < 24) hours[h].calls++
      })
    }
    return hours.filter(h => {
      const n = parseInt(h.hour)
      return n >= 7 && n <= 21
    })
  }, [calls])

  // ── Activity graph — 16 weeks of estimated data ────────
  const activityData = useMemo(() => {
    const todayCount = stats.total
    return Array.from({ length: 112 }, (_, i) => ({
      date: format(subDays(new Date(), 111 - i), 'yyyy-MM-dd'),
      count: i === 111 ? todayCount : 0,
    }))
  }, [stats.total])

  // ── Won leads from store ───────────────────────────────
  const wonLeads = leads.filter(l => l.stage === 5)
  const wonValue = wonLeads.reduce((s, l) => s + Number(l.value || 0), 0)

  const isLoading = loadingCalls || loadingAgents

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
            {hasCalls
              ? <span>Dados reais da <span className="text-success">3C Plus</span> · {today}</span>
              : isLoading ? 'Carregando dados da 3C Plus…' : 'Conecte a 3C Plus para ver dados reais'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', color: '#22c55e' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {activeAgents} ativos
          </div>
          {hasCalls && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }}>
              <Activity size={10} />
              Ao vivo
            </div>
          )}
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Ligações hoje"
          value={isLoading ? '…' : <AnimatedNumber value={stats.total} />}
          sub={hasCalls ? '3C Plus · dados reais' : 'aguardando 3C'}
          icon={Phone} delay={0} live={hasCalls}
        />
        <KPICard
          label="Vendas ganhas"
          value={<AnimatedNumber value={wonLeads.length} />}
          sub={wonValue > 0 ? formatCurrency(wonValue) : 'cadastre em Vendas'}
          icon={TrendingUp} delay={0.08}
        />
        <KPICard
          label="Taxa de contato"
          value={isLoading ? '…' : <AnimatedNumber value={stats.contactRate} suffix="%" />}
          sub="das ligações atendidas"
          icon={Target} delay={0.16}
        />
        <KPICard
          label="Tempo médio"
          value={isLoading ? '…' : formatSeconds(stats.avgTalk)}
          sub="por ligação"
          icon={Clock} delay={0.24}
        />
      </div>

      {/* Hourly chart + health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-2 rounded-xl overflow-hidden hover-glow"
          style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-faint uppercase tracking-wider">Ligações por hora</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {hasCalls
                  ? <><AnimatedNumber value={stats.total} /> ligações</>
                  : <span className="text-text-secondary text-sm">Aguardando dados 3C…</span>}
              </p>
            </div>
            <span className="tag">{hasCalls ? 'real' : 'sem dados'}</span>
          </div>
          <ResponsiveContainer width="100%" height={170}>
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-xl p-5 hover-glow"
          style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[10px] text-faint uppercase tracking-wider mb-4">Saúde da operação</p>
          <div className="flex flex-col gap-4 items-center">
            <RadialProgress value={stats.contactRate} max={100} label="Taxa contato" />
            <div className="w-full space-y-3">
              {[
                { label: 'Agentes online', value: activeAgents, max: Math.max(agents?.length || 1, activeAgents) },
                { label: 'Ligações atend.', value: stats.answered, max: Math.max(stats.total, 1) },
              ].map(({ label, value, max }) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-faint">{label}</span>
                    <span className="text-text-secondary tabular-nums">{value}/{max}</span>
                  </div>
                  <div className="data-bar">
                    <motion.div className="data-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((value / Math.max(max, 1)) * 100, 100)}%` }}
                      transition={{ delay: 0.9, duration: 1.0, ease: [0.23, 1, 0.32, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Activity graph */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-xl p-5 hover-glow overflow-hidden"
        style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-faint uppercase tracking-wider">Atividade de ligações</p>
            <p className="text-sm font-semibold text-white mt-0.5">
              {hasCalls
                ? <><AnimatedNumber value={stats.total} /> ligações hoje</>
                : 'Histórico disponível após integração 3C'}
            </p>
          </div>
          <span className="tag">16 semanas</span>
        </div>
        <div className="overflow-x-auto scroll-x">
          <ActivityGraph data={activityData} />
        </div>
      </motion.div>

      {/* Feed + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-xl overflow-hidden hover-glow"
          style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 pt-4 pb-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="relative flex h-2 w-2">
              {hasCalls && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-50" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${hasCalls ? 'bg-success' : 'bg-subtle'}`} />
            </span>
            <p className="text-[10px] text-faint uppercase tracking-wider">Feed de ligações · 3C</p>
          </div>
          <CallFeed calls={calls} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
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

      {/* Summary — manual data alerts */}
      {(leads.length > 0 || manualSellers.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-xl p-5 hover-glow"
          style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={13} className="text-white" />
            <p className="text-[10px] text-faint uppercase tracking-wider">Dados cadastrados manualmente</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Vendedores', value: manualSellers.length, desc: 'cadastrados' },
              { label: 'Leads ativos', value: leads.filter(l => l.stage > 0 && l.stage < 5).length, desc: 'em andamento' },
              { label: 'Vendas ganhas', value: wonLeads.length, desc: formatCurrency(wonValue) },
            ].map(({ label, value, desc }) => (
              <div key={label} className="rounded-xl p-4 hover-glow"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] text-faint uppercase tracking-wider mb-2">{label}</p>
                <p className="text-3xl font-bold text-white tabular-nums">
                  <AnimatedNumber value={value} />
                </p>
                <p className="text-xs text-text-secondary mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
