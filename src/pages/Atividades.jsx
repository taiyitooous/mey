import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageSquare, Clock, TrendingUp } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { EVENTS, SELLERS } from '../lib/mockData'
import { formatSeconds, timeAgo } from '../lib/utils'

const IDLE_THRESHOLD_MIN = 30

function ContactBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{
            background: value >= 70 ? '#22c55e' : value >= 40 ? '#ffffff' : 'rgba(255,255,255,0.3)'
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.0, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <span className="text-xs font-medium text-text-secondary tabular-nums w-8 text-right">{value}%</span>
    </div>
  )
}

function SellerCard({ seller, delay }) {
  const evts = EVENTS
    .filter(e => e.user_name === seller.name)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const calls = evts.filter(e => e.event_type === 'call_answered')
  const whatsapps = evts.filter(e => e.event_type === 'whatsapp_call_received')
  const won = evts.filter(e => e.event_type === 'lead.won')
  const totalTalk = calls.reduce((s, e) => s + (e.payload?.speaking_time || 0), 0)
  const avgTalk = calls.length ? Math.round(totalTalk / calls.length) : 0
  const answered = calls.filter(e => ['interested', 'callback'].includes(e.payload?.result))
  const contactRate = calls.length ? Math.round((answered.length / calls.length) * 100) : 0

  const lastEvent = evts[0]
  const minsSince = lastEvent
    ? Math.floor((Date.now() - new Date(lastEvent.created_at)) / 60000)
    : 9999
  const isActive = minsSince < IDLE_THRESHOLD_MIN

  const metrics = [
    { label: 'Ligações', value: calls.length, icon: Phone },
    { label: 'WhatsApp', value: whatsapps.length, icon: MessageSquare },
    { label: 'TMA', value: formatSeconds(avgTalk), icon: Clock, isText: true },
    { label: 'Vendas', value: won.length, icon: TrendingUp },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl overflow-hidden hover-glow"
      style={{
        background: 'rgba(14,14,14,0.9)',
        border: `1px solid ${isActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Active glow top bar */}
      {isActive && (
        <div className="h-[2px] w-full"
          style={{ background: 'linear-gradient(90deg, transparent, #22c55e, transparent)' }} />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="relative">
          <Avatar name={seller.name} size="lg" />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${isActive ? 'bg-success' : 'bg-subtle'}`}
            style={{ borderColor: '#0e0e0e' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{seller.name}</p>
          <p className="text-xs mt-0.5" style={{ color: isActive ? '#22c55e' : '#444' }}>
            {isActive ? `Ativo · ${timeAgo(lastEvent?.created_at)}` : lastEvent ? `Parado há ${minsSince}min` : 'Sem atividade'}
          </p>
        </div>
        {!isActive && minsSince > 45 && (
          <span className="text-xs px-2 py-1 rounded-full"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            Inativo
          </span>
        )}
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-4 divide-x"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }}>
        {metrics.map(({ label, value, icon: Icon, isText }) => (
          <div key={label} className="py-3 flex flex-col items-center gap-1">
            <Icon size={11} className="text-faint" />
            <p className="text-sm font-bold text-white tabular-nums">
              {isText ? value : <AnimatedNumber value={value} />}
            </p>
            <p className="text-xs text-faint">{label}</p>
          </div>
        ))}
      </div>

      {/* Contact rate */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-faint">Taxa de contato</p>
        </div>
        <ContactBar value={contactRate} />
      </div>

      {/* Recent events */}
      <div className="px-4 py-3 space-y-1.5">
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#333' }}>Últimas ações</p>
        {evts.slice(0, 4).length === 0 ? (
          <p className="text-xs text-faint italic">Sem atividade hoje</p>
        ) : (
          evts.slice(0, 4).map((evt, i) => (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 + i * 0.05 }}
              className="flex items-center gap-2"
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                evt.event_type === 'lead.won' ? 'bg-success' :
                evt.event_type === 'whatsapp_call_received' ? 'bg-white' :
                'bg-subtle'
              }`} />
              <p className="text-xs flex-1 truncate" style={{ color: '#666' }}>
                {evt.event_type === 'call_answered' && `Ligação · ${evt.payload?.result || '—'}`}
                {evt.event_type === 'whatsapp_call_received' && 'WhatsApp recebido'}
                {evt.event_type === 'lead.won' && '✓ Venda fechada'}
                {evt.event_type === 'lead.lost' && 'Lead perdido'}
              </p>
              <span className="text-xs shrink-0 tabular-nums" style={{ color: '#333' }}>
                {timeAgo(evt.created_at)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default function Atividades() {
  const [filter, setFilter] = useState('all')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(id)
  }, [])

  const sellers = useMemo(() => {
    return SELLERS.map(s => {
      const evts = EVENTS.filter(e => e.user_name === s.name)
      const lastEvt = evts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      const mins = lastEvt ? Math.floor((now - new Date(lastEvt.created_at)) / 60000) : 9999
      return { ...s, isActive: mins < IDLE_THRESHOLD_MIN }
    })
  }, [now])

  const filtered = useMemo(() => {
    if (filter === 'active') return sellers.filter(s => s.isActive)
    if (filter === 'idle') return sellers.filter(s => !s.isActive)
    return sellers
  }, [sellers, filter])

  const summary = {
    active: sellers.filter(s => s.isActive).length,
    idle: sellers.filter(s => !s.isActive).length,
    totalCalls: EVENTS.filter(e => e.event_type === 'call_answered').length,
    totalWon: EVENTS.filter(e => e.event_type === 'lead.won').length,
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Atividades</h1>
          <p className="text-sm text-faint mt-0.5">Check-in em tempo real do time</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Atualizado agora
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Ativos', value: summary.active, color: '#22c55e' },
          { label: 'Inativos', value: summary.idle, color: '#444' },
          { label: 'Ligações', value: summary.totalCalls, color: '#f0f0f0' },
          { label: 'Vendas', value: summary.totalWon, color: '#f0f0f0' },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-xl p-4 hover-glow"
            style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-xs text-faint mb-1.5">{label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>
              <AnimatedNumber value={value} />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[['all', 'Todos'], ['active', 'Ativos'], ['idle', 'Inativos']].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={filter === val
              ? { background: 'white', color: 'black' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#666' }
            }
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((seller, i) => (
            <SellerCard key={seller.id} seller={seller} delay={i * 0.07} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
