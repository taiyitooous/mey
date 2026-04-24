import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, MessageSquare, Clock, TrendingUp,
  Headphones, Wifi, WifiOff, Plus, X, UserPlus,
} from 'lucide-react'
import { format } from 'date-fns'
import { Avatar } from '../components/ui/Avatar'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { formatSeconds } from '../lib/utils'
import { useAgents, useCallHistory } from '../hooks/use3c'
import { useSellers } from '../lib/store'

// ── Status config ──────────────────────────────────────────
const STATUS_CFG = {
  online:   { label: 'Online',     color: '#22c55e', glow: 'rgba(34,197,94,0.4)'   },
  in_call:  { label: 'Em ligação', color: '#ffffff', glow: 'rgba(255,255,255,0.25)' },
  paused:   { label: 'Pausa',      color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  offline:  { label: 'Offline',    color: '#2a2a2a', glow: 'transparent'            },
}

// ── Agent card from real 3C data ───────────────────────────
function AgentCard({ agent, calls, delay }) {
  const cfg = STATUS_CFG[agent.status] || STATUS_CFG.offline
  const isActive = agent.status === 'online' || agent.status === 'in_call'

  const myCallsToday = useMemo(() => {
    if (!calls?.length) return []
    const agentFirst = agent.name.toLowerCase().split(' ')[0]
    return calls.filter(c =>
      c.agent.toLowerCase().split(' ')[0] === agentFirst ||
      c.agent.toLowerCase().includes(agentFirst)
    )
  }, [calls, agent.name])

  const totalCalls = myCallsToday.length
  const avgTalk = totalCalls
    ? Math.round(myCallsToday.reduce((s, c) => s + c.duration, 0) / totalCalls)
    : 0
  const contactedResults = ['interessado', 'interested', 'callback', 'sale', 'sucesso', 'contato', 'venda']
  const contacted = myCallsToday.filter(c => contactedResults.includes(c.result?.toLowerCase())).length
  const contactRate = totalCalls ? Math.round((contacted / totalCalls) * 100) : 0

  const lastCall = myCallsToday.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay, duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-xl overflow-hidden hover-glow"
      style={{
        background: 'rgba(12,12,12,0.92)',
        border: `1px solid ${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {isActive && (
        <div className="h-[1.5px]"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="relative">
          <Avatar name={agent.name} size="lg" />
          <motion.span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: cfg.color, borderColor: '#0c0c0c', boxShadow: `0 0 8px ${cfg.glow}` }}
            animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Headphones size={10} style={{ color: cfg.color }} />
            <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
            {agent.campaign && (
              <span className="text-[10px] text-faint truncate">· {agent.campaign}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Wifi size={11} className="text-success" />
          {agent.pauseReason && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              {agent.pauseReason}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { label: 'Ligações', value: totalCalls, icon: Phone },
          { label: 'TMA', value: formatSeconds(avgTalk), icon: Clock, isText: true },
          { label: 'Contato', value: `${contactRate}%`, icon: TrendingUp, isText: true },
        ].map(({ label, value, icon: Icon, isText }, i) => (
          <div key={label} className="py-3 flex flex-col items-center gap-1"
            style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <Icon size={10} className="text-faint" />
            <p className="text-sm font-bold text-white tabular-nums">
              {isText ? value : <AnimatedNumber value={value} />}
            </p>
            <p className="text-[10px] text-faint">{label}</p>
          </div>
        ))}
      </div>

      {/* Contact rate bar */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-faint uppercase tracking-wider">Taxa de contato</p>
          <span className="text-[10px] text-text-secondary tabular-nums">{contactRate}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: contactRate >= 70 ? '#22c55e' : contactRate >= 40 ? '#fff' : 'rgba(255,255,255,0.25)' }}
            initial={{ width: 0 }}
            animate={{ width: `${contactRate}%` }}
            transition={{ duration: 1.0, ease: [0.23, 1, 0.32, 1], delay: delay + 0.2 }}
          />
        </div>
      </div>

      {/* Last call */}
      <div className="px-4 py-3">
        {lastCall ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
            <p className="text-xs text-text-secondary flex-1 truncate">
              Última: {lastCall.phone || '—'} · {lastCall.result || '—'}
            </p>
            <span className="text-[10px] text-faint tabular-nums shrink-0">
              {lastCall.startedAt ? format(new Date(lastCall.startedAt), 'HH:mm') : '—'}
            </span>
          </div>
        ) : (
          <p className="text-xs text-faint italic">Sem ligações registradas hoje</p>
        )}
      </div>

      {agent.extension && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-mono text-faint">Ramal: {agent.extension}</p>
        </div>
      )}
    </motion.div>
  )
}

// ── Manual seller card ─────────────────────────────────────
function ManualSellerCard({ seller, onRemove, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay, duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-xl overflow-hidden hover-glow"
      style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="relative">
          <Avatar name={seller.name} size="lg" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
            style={{ background: '#2a2a2a', borderColor: '#0c0c0c' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{seller.name}</p>
          <p className="text-xs text-faint mt-0.5">{seller.role || 'Vendedor'}</p>
        </div>
        <button onClick={() => onRemove(seller.id)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
          <X size={12} className="text-faint" />
        </button>
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-1.5 text-[10px] text-faint">
          <WifiOff size={9} />
          Sem integração 3C · cadastrado manualmente
        </div>
      </div>
    </motion.div>
  )
}

// ── Add seller modal ───────────────────────────────────────
function AddSellerModal({ open, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('Vendedor')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), role: role.trim() || 'Vendedor' })
    setName('')
    setRole('Vendedor')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar vendedor" className="max-w-sm mx-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Nome completo</p>
          <Input
            autoFocus
            placeholder="ex: Ana Lima"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Cargo</p>
          <Input
            placeholder="Vendedor"
            value={role}
            onChange={e => setRole(e.target.value)}
          />
        </div>
        <button type="submit" disabled={!name.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: 'white', color: 'black' }}>
          Adicionar
        </button>
      </form>
    </Modal>
  )
}

// ── Empty state ────────────────────────────────────────────
function EmptyState({ is3cError, onAdd }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {is3cError ? <WifiOff size={20} className="text-faint" /> : <Headphones size={20} className="text-faint" />}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white mb-1">
          {is3cError ? 'Sem conexão com a 3C Plus' : 'Nenhum agente online'}
        </p>
        <p className="text-xs text-faint max-w-xs">
          {is3cError
            ? 'Não foi possível conectar à API da 3C. Adicione vendedores manualmente ou configure a integração.'
            : 'Os agentes aparecerão aqui quando estiverem logados na 3C Plus.'}
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}
      >
        <UserPlus size={13} />
        Adicionar manualmente
      </button>
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function Atividades() {
  const [filter, setFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: agents, isLoading, isError } = useAgents()
  const { data: callsToday } = useCallHistory(today)
  const { items: manualSellers, add: addSeller, remove: removeSeller } = useSellers()

  const filtered = useMemo(() => {
    if (!agents) return []
    if (filter === 'active') return agents.filter(a => a.status === 'online' || a.status === 'in_call')
    if (filter === 'paused') return agents.filter(a => a.status === 'paused')
    if (filter === 'offline') return agents.filter(a => a.status === 'offline')
    return agents
  }, [agents, filter])

  const summary = useMemo(() => {
    const a = agents || []
    return {
      online: a.filter(x => x.status === 'online' || x.status === 'in_call').length,
      paused: a.filter(x => x.status === 'paused').length,
      offline: a.filter(x => x.status === 'offline').length,
      total: a.length,
    }
  }, [agents])

  const totalCallsToday = callsToday?.length || 0

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Atividades</h1>
          <p className="text-xs text-faint mt-0.5">
            {isLoading ? 'Conectando à 3C Plus…' :
             isError ? 'Sem conexão 3C · dados manuais' :
             `${summary.total} agentes · atualiza a cada 10s`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isError && !isLoading && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', color: '#22c55e' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              3C ao vivo
            </div>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#888' }}
          >
            <Plus size={12} />
            Adicionar
          </button>
        </div>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Online', value: isLoading ? '…' : summary.online, color: '#22c55e' },
          { label: 'Em pausa', value: isLoading ? '…' : summary.paused, color: '#f59e0b' },
          { label: 'Offline', value: isLoading ? '…' : summary.offline, color: '#333' },
          { label: 'Ligações hoje', value: isLoading ? '…' : totalCallsToday, color: '#f0f0f0' },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-xl p-4 hover-glow"
            style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[10px] text-faint uppercase tracking-wider mb-2">{label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>
              {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          ['all', 'Todos'],
          ['active', 'Online'],
          ['paused', 'Pausa'],
          ['offline', 'Offline'],
        ].map(([val, lbl]) => (
          <motion.button
            key={val}
            onClick={() => setFilter(val)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={filter === val
              ? { background: 'white', color: 'black' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }
            }
          >
            {lbl}
          </motion.button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-2.5 w-20 rounded" />
                  </div>
                </div>
                <div className="skeleton h-2 w-full rounded" />
                <div className="skeleton h-2 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agents grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="sync">
            {filtered.length === 0 && manualSellers.length === 0
              ? <EmptyState is3cError={isError} onAdd={() => setAddOpen(true)} />
              : null
            }
            {filtered.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} calls={callsToday} delay={i * 0.05} />
            ))}
            {manualSellers.map((seller, i) => (
              <ManualSellerCard
                key={seller.id}
                seller={seller}
                onRemove={removeSeller}
                delay={(filtered.length + i) * 0.05}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddSellerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addSeller}
      />
    </div>
  )
}
