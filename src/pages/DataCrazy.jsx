import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, TrendingUp, XCircle, BarChart2, Search,
  RefreshCw, Phone, ChevronDown, ChevronUp, Tag,
  MessageSquare, Package, Clock, CheckCircle, AlertCircle,
  ArrowUpRight, DollarSign, Layers,
} from 'lucide-react'
import { format } from 'date-fns'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Avatar } from '../components/ui/Avatar'
import { formatCurrency, timeAgo } from '../lib/utils'
import { useDCLeads, useDCBusinesses, useDCStats, useDCConversations } from '../hooks/useDC'
import { useSkaleOrders } from '../hooks/useSkale'
import { useAgents } from '../hooks/use3c'

// ── Helpers ────────────────────────────────────────────────

const STATUS_CFG = {
  won:        { label: 'Ganho',      color: '#22c55e', bg: 'rgba(34,197,94,0.08)',    icon: CheckCircle },
  in_process: { label: 'Em processo',color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   icon: Clock },
  lost:       { label: 'Perdido',    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    icon: XCircle },
}

function phoneDigits(p) {
  return String(p || '').replace(/\D/g, '')
}

function matchPhone(a, b) {
  const pa = phoneDigits(a).slice(-9)
  const pb = phoneDigits(b).slice(-9)
  return pa.length >= 8 && pb.length >= 8 && pa === pb
}

// ── KPI Card ───────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-xl p-5 hover-glow relative overflow-hidden"
      style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-[0.08] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color || 'white'}, transparent)` }} />
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-4"
        style={{ background: color ? `${color}18` : 'rgba(255,255,255,0.05)', border: `1px solid ${color ? `${color}30` : 'rgba(255,255,255,0.08)'}` }}>
        <Icon size={14} style={{ color: color || '#888' }} />
      </div>
      <p className="text-3xl font-bold text-white tabular-nums mb-1">{value}</p>
      <p className="text-[10px] text-faint uppercase tracking-wider">{label}</p>
      {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
    </motion.div>
  )
}

// ── Lead Card ──────────────────────────────────────────────

function LeadCard({ lead, calls3c, skaleOrders, delay }) {
  const [open, setOpen] = useState(false)

  const matchedCalls = useMemo(() => {
    if (!lead.phone || !calls3c?.length) return []
    return calls3c.filter(c => matchPhone(c.phone, lead.phone))
  }, [lead.phone, calls3c])

  const matchedOrders = useMemo(() => {
    if (!skaleOrders?.length) return []
    const namePart = lead.name.split(' ')[0].toLowerCase()
    return skaleOrders.filter(o =>
      (o.customer_name || '').toLowerCase().includes(namePart) ||
      matchPhone(o.customer_phone, lead.phone)
    )
  }, [lead.name, lead.phone, skaleOrders])

  const hasCross = matchedCalls.length > 0 || matchedOrders.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-xl overflow-hidden hover-glow"
      style={{ background: 'rgba(12,12,12,0.92)', border: `1px solid ${hasCross ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.07)'}` }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={lead.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#444' }}>{lead.stage || lead.list || '—'}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {matchedCalls.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                <Phone size={9} />{matchedCalls.length}
              </span>
            )}
            {matchedOrders.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                <Package size={9} />{matchedOrders.length}
              </span>
            )}
            {(hasCross) && (
              <button onClick={() => setOpen(o => !o)} className="p-1 rounded hover:bg-white/10 transition-colors">
                {open ? <ChevronUp size={12} className="text-faint" /> : <ChevronDown size={12} className="text-faint" />}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {lead.source && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#555' }}>
              {lead.source}
            </span>
          )}
          {lead.tags.slice(0, 3).map(t => (
            <span key={t} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.03)', color: '#555' }}>
              <Tag size={8} />{t}
            </span>
          ))}
          {lead.attendant && (
            <span className="text-[10px] ml-auto" style={{ color: '#444' }}>{lead.attendant}</span>
          )}
        </div>
      </div>

      {/* Cross-reference detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="p-3 space-y-2">
              {matchedCalls.length > 0 && (
                <div>
                  <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Phone size={9} /> Ligações 3C correspondentes
                  </p>
                  <div className="space-y-1">
                    {matchedCalls.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 rounded"
                        style={{ background: 'rgba(34,197,94,0.05)' }}>
                        <span style={{ color: '#22c55e' }}>{c.agent?.split(' ')[0] || '—'}</span>
                        <span className="text-faint">{c.result || '—'}</span>
                        <span className="text-faint tabular-nums">{c.startedAt ? timeAgo(c.startedAt) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {matchedOrders.length > 0 && (
                <div>
                  <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Package size={9} /> Pedidos Skale correspondentes
                  </p>
                  <div className="space-y-1">
                    {matchedOrders.slice(0, 3).map((o, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 rounded"
                        style={{ background: 'rgba(167,139,250,0.05)' }}>
                        <span style={{ color: '#a78bfa' }}>{o.product_name?.slice(0, 25) || '—'}</span>
                        <span className="text-faint">{o.payment_status || '—'}</span>
                        <span className="font-medium text-white">{formatCurrency((o.total_price || 0) / 100)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Business Row ───────────────────────────────────────────

function BusinessRow({ b, skaleOrders, delay }) {
  const cfg = STATUS_CFG[b.status] || STATUS_CFG.in_process
  const Icon = cfg.icon

  const matchedOrders = useMemo(() => {
    if (!skaleOrders?.length) return []
    const namePart = (b.leadName || b.name || '').split(' ')[0].toLowerCase()
    return skaleOrders.filter(o =>
      (o.customer_name || '').toLowerCase().includes(namePart) ||
      matchPhone(o.customer_phone, b.leadPhone)
    )
  }, [b, skaleOrders])

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.28 }}
      className="flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: cfg.bg }}>
        <Icon size={12} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{b.leadName || b.name || '—'}</p>
        <p className="text-[10px] truncate" style={{ color: '#444' }}>{b.stage || b.attendant || '—'}</p>
      </div>
      {matchedOrders.length > 0 && (
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
          <Package size={9} />Skale
        </span>
      )}
      <div className="text-right shrink-0">
        {b.value > 0 && (
          <p className="text-xs font-bold text-white tabular-nums">{formatCurrency(b.value)}</p>
        )}
        <p className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</p>
      </div>
    </motion.div>
  )
}

// ── Funil de Conversão ─────────────────────────────────────

function ConversionFunnel({ leads, businesses, calls3c, skaleOrders }) {
  const totalLeads   = leads?.total || 0
  const wonDeals     = businesses?.items?.filter(b => b.status === 'won').length || 0
  const leadsWithCall = useMemo(() => {
    if (!leads?.items?.length || !calls3c?.length) return 0
    return leads.items.filter(l => l.phone && calls3c.some(c => matchPhone(c.phone, l.phone))).length
  }, [leads, calls3c])
  const leadsWithOrder = useMemo(() => {
    if (!leads?.items?.length || !skaleOrders?.length) return 0
    return leads.items.filter(l => {
      const namePart = l.name.split(' ')[0].toLowerCase()
      return skaleOrders.some(o =>
        (o.customer_name || '').toLowerCase().includes(namePart) ||
        matchPhone(o.customer_phone, l.phone)
      )
    }).length
  }, [leads, skaleOrders])

  const steps = [
    { label: 'Leads DC', value: totalLeads, color: '#60a5fa' },
    { label: 'Com ligação 3C', value: leadsWithCall, color: '#22c55e' },
    { label: 'Com pedido Skale', value: leadsWithOrder, color: '#a78bfa' },
    { label: 'Negócios ganhos', value: wonDeals, color: '#22c55e' },
  ]
  const maxV = Math.max(...steps.map(s => s.value), 1)

  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-text-secondary">{s.label}</span>
            <span className="font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / maxV) * 100}%` }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
              style={{ background: s.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────

export default function DataCrazy() {
  const [tab, setTab] = useState('leads')
  const [search, setSearch] = useState('')
  const [bizStatus, setBizStatus] = useState('all')

  const { data: leads,    isLoading: loadLeads,  refetch: refLeads }    = useDCLeads(300)
  const { data: allBiz,   isLoading: loadBiz,   refetch: refBiz }       = useDCBusinesses('all', 500)
  const { data: dcStats,  isLoading: loadStats }                         = useDCStats()
  const { data: convos,   isLoading: loadConvos }                        = useDCConversations(100)
  const { data: skaleOrders = [] }                                       = useSkaleOrders()
  const { data: agents = [] }                                            = useAgents()

  const isLoading = loadLeads || loadBiz || loadStats

  const filteredLeads = useMemo(() => {
    const items = leads?.items || []
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      l.stage.toLowerCase().includes(q) ||
      l.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [leads, search])

  const filteredBiz = useMemo(() => {
    const items = allBiz?.items || []
    const byStatus = bizStatus === 'all' ? items : items.filter(b => b.status === bizStatus)
    if (!search) return byStatus
    const q = search.toLowerCase()
    return byStatus.filter(b =>
      (b.leadName || '').toLowerCase().includes(q) ||
      (b.name || '').toLowerCase().includes(q) ||
      (b.stage || '').toLowerCase().includes(q)
    )
  }, [allBiz, bizStatus, search])

  const wonValue = useMemo(() =>
    (allBiz?.items || []).filter(b => b.status === 'won').reduce((s, b) => s + b.value, 0)
  , [allBiz])

  const convCount = Array.isArray(convos) ? convos.length : 0

  // Cross-ref: leads com 3C calls (agentes ativos com o mesmo ramal não conta, queremos chamadas)
  const calls3cAll = useMemo(() => [], []) // será preenchido via useCallHistory se necessário

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
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <BarChart2 size={16} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">DataCrazy</h1>
              <p className="text-xs text-faint mt-0.5">CRM · Leads, negócios e conversas em tempo real</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <RefreshCw size={13} className="animate-spin text-faint" />
          )}
          <button onClick={() => { refLeads(); refBiz() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
            <RefreshCw size={11} />
            Atualizar
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Total de leads" value={loadStats ? '…' : <AnimatedNumber value={dcStats?.totalLeads || 0} />}
          sub="no CRM" icon={Users} color="#60a5fa" delay={0} />
        <KPICard label="Em processo" value={loadStats ? '…' : <AnimatedNumber value={dcStats?.inProcessDeals || 0} />}
          sub="negócios ativos" icon={Clock} color="#60a5fa" delay={0.06} />
        <KPICard label="Ganhos" value={loadStats ? '…' : <AnimatedNumber value={dcStats?.wonDeals || 0} />}
          sub={wonValue > 0 ? formatCurrency(wonValue) : 'negócios fechados'} icon={CheckCircle} color="#22c55e" delay={0.12} />
        <KPICard label="Perdidos" value={loadStats ? '…' : <AnimatedNumber value={dcStats?.lostDeals || 0} />}
          sub="negócios perdidos" icon={XCircle} color="#ef4444" delay={0.18} />
        <KPICard label="Conversas" value={loadConvos ? '…' : <AnimatedNumber value={convCount} />}
          sub="abertas no CRM" icon={MessageSquare} color="#a78bfa" delay={0.24} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone, etapa ou tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-transparent text-text outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { k: 'leads', label: 'Leads', icon: Users },
          { k: 'businesses', label: 'Negócios', icon: TrendingUp },
          { k: 'funnel', label: 'Funil', icon: Layers },
        ].map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={tab === k
              ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }
              : { color: '#555' }}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">

        {/* ── LEADS ── */}
        {tab === 'leads' && (
          <motion.div key="leads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-faint">{filteredLeads.length} leads · clique para ver cruzamentos com 3C e Skale</p>
            </div>
            {loadLeads ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl p-4 animate-pulse h-28"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Users size={28} className="text-faint" />
                <p className="text-sm text-faint">
                  {search ? 'Nenhum lead encontrado' : 'Nenhum lead no DataCrazy ainda'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLeads.map((lead, i) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    calls3c={calls3cAll}
                    skaleOrders={skaleOrders}
                    delay={Math.min(i * 0.03, 0.3)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── NEGÓCIOS ── */}
        {tab === 'businesses' && (
          <motion.div key="businesses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Status filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg w-fit mb-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { k: 'all', label: 'Todos', color: '#555' },
                { k: 'in_process', label: 'Em processo', color: '#60a5fa' },
                { k: 'won', label: 'Ganhos', color: '#22c55e' },
                { k: 'lost', label: 'Perdidos', color: '#ef4444' },
              ].map(({ k, label, color }) => (
                <button key={k} onClick={() => setBizStatus(k)}
                  className="px-3 py-1.5 rounded text-[11px] font-medium transition-all"
                  style={bizStatus === k
                    ? { background: `${color}18`, color, border: `1px solid ${color}30` }
                    : { color: '#555' }}>
                  {label}
                </button>
              ))}
            </div>

            {loadBiz ? (
              <div className="rounded-xl animate-pulse h-48"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} />
            ) : filteredBiz.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <TrendingUp size={28} className="text-faint" />
                <p className="text-sm text-faint">Nenhum negócio encontrado</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden hover-glow"
                style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-[10px] text-faint uppercase tracking-wider">{filteredBiz.length} negócios</p>
                  {bizStatus === 'won' && wonValue > 0 && (
                    <p className="text-xs font-bold" style={{ color: '#22c55e' }}>{formatCurrency(wonValue)} ganho total</p>
                  )}
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {filteredBiz.map((b, i) => (
                    <BusinessRow
                      key={b.id}
                      b={b}
                      skaleOrders={skaleOrders}
                      delay={Math.min(i * 0.025, 0.25)}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── FUNIL ── */}
        {tab === 'funnel' && (
          <motion.div key="funnel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Funil de conversão */}
              <div className="rounded-xl p-5 hover-glow"
                style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <Layers size={13} style={{ color: '#60a5fa' }} />
                  <p className="text-[10px] text-faint uppercase tracking-wider">Funil DC → 3C → Skale</p>
                </div>
                <ConversionFunnel
                  leads={leads}
                  businesses={allBiz}
                  calls3c={calls3cAll}
                  skaleOrders={skaleOrders}
                />
                <p className="text-[10px] text-faint mt-4 leading-relaxed">
                  Cruzamento por telefone (leads DC ↔ chamadas 3C) e por nome/telefone (leads DC ↔ pedidos Skale).
                </p>
              </div>

              {/* Distribuição de negócios */}
              <div className="rounded-xl p-5 hover-glow"
                style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] text-faint uppercase tracking-wider mb-5">Distribuição de negócios</p>
                <div className="space-y-4">
                  {[
                    { label: 'Em processo', key: 'in_process', color: '#60a5fa' },
                    { label: 'Ganhos', key: 'won', color: '#22c55e' },
                    { label: 'Perdidos', key: 'lost', color: '#ef4444' },
                  ].map(({ label, key, color }) => {
                    const count = (allBiz?.items || []).filter(b => b.status === key).length
                    const total = (allBiz?.items || []).length || 1
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-text-secondary">{label}</span>
                          <span className="font-bold tabular-nums" style={{ color }}>
                            {count} ({Math.round((count / total) * 100)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / total) * 100}%` }}
                            transition={{ delay: 0.5, duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
                            style={{ background: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Agents online vs DC in_process */}
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-[10px] text-faint uppercase tracking-wider mb-3">Agentes 3C ativos agora</p>
                  <div className="flex flex-wrap gap-2">
                    {agents.filter(a => a.status === 'online' || a.status === 'in_call').map(a => (
                      <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]"
                        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        <span style={{ color: '#22c55e' }}>{a.name.split(' ')[0]}</span>
                      </div>
                    ))}
                    {agents.filter(a => a.status === 'online' || a.status === 'in_call').length === 0 && (
                      <p className="text-xs text-faint italic">Nenhum agente ativo no momento</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
