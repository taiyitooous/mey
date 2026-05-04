import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, PhoneCall, PhoneOff, PhoneMissed, Clock, Search,
  RefreshCw, Users, Activity, TrendingUp, Mic, MicOff,
  Coffee, ChevronDown, ChevronUp, Radio,
} from 'lucide-react'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useAgents, useCampaigns, use3cStatus, use3cStats, use3cCallsInfinite } from '../hooks/use3c'
import { formatCurrency, timeAgo, formatSeconds } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'

// ── Fetch helpers ──────────────────────────────────────────

async function fetchJSON(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function useFilters() {
  return useQuery({
    queryKey: ['3c', 'filters'],
    queryFn: () => fetchJSON('/api/3c/filters'),
    staleTime: 60_000,
  })
}

// ── Config ─────────────────────────────────────────────────

const AGENT_STATUS = {
  online:   { label: 'Disponível',  color: '#22c55e', dot: 'bg-success', shadow: '0 0 6px rgba(34,197,94,0.7)' },
  in_call:  { label: 'Em ligação',  color: '#ffffff', dot: 'bg-white',   shadow: '0 0 6px rgba(255,255,255,0.5)' },
  paused:   { label: 'Em pausa',    color: '#f59e0b', dot: 'bg-warning', shadow: '0 0 4px rgba(245,158,11,0.5)' },
  offline:  { label: 'Offline',     color: '#333',    dot: 'bg-subtle',  shadow: 'none' },
}

function durationColor(s) {
  if (!s || s === 0) return '#444'
  if (s < 30)  return '#ef4444'
  if (s < 120) return '#f59e0b'
  return '#22c55e'
}

// ── Agent Card ─────────────────────────────────────────────

function AgentCard({ agent, delay }) {
  const cfg = AGENT_STATUS[agent.status] || AGENT_STATUS.offline
  const StatusIcon = agent.status === 'in_call' ? PhoneCall
    : agent.status === 'paused'  ? Coffee
    : agent.status === 'online'  ? Mic
    : MicOff

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-xl p-3.5 hover-glow"
      style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {agent.name?.[0]?.toUpperCase() || '?'}
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${cfg.dot}`}
            style={{ boxShadow: cfg.shadow }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{agent.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusIcon size={10} style={{ color: cfg.color }} />
            <p className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</p>
            {agent.campaign && (
              <span className="text-[10px] text-faint truncate">· {agent.campaign}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Call Row ───────────────────────────────────────────────

function CallRow({ call, delay }) {
  const dur = Number(call.duration || 0)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover-glow"
      style={{ background: 'rgba(12,12,12,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {dur > 0
          ? <Phone size={12} className="text-success" />
          : <PhoneMissed size={12} className="text-faint" />
        }
      </div>

      {/* Agent */}
      <div className="w-44 min-w-0 shrink-0">
        <p className="text-xs text-white truncate">{call.agent_name || '—'}</p>
      </div>

      {/* Phone */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono truncate" style={{ color: '#555' }}>{call.phone || '—'}</p>
      </div>

      {/* Duration */}
      <div className="w-16 text-right shrink-0">
        <span className="text-xs font-mono tabular-nums" style={{ color: durationColor(dur) }}>
          {dur > 0 ? formatSeconds(dur) : '—'}
        </span>
      </div>

      {/* Result */}
      <div className="w-36 shrink-0 text-right">
        <span className="text-[11px] text-faint truncate block">{call.result || '—'}</span>
      </div>

      {/* Campaign */}
      <div className="w-36 shrink-0 hidden lg:block">
        <span className="text-[11px] truncate block" style={{ color: '#444' }}>{call.campaign || '—'}</span>
      </div>

      {/* Time */}
      <div className="w-20 text-right shrink-0">
        <span className="text-[10px] text-faint">{timeAgo(call.started_at)}</span>
      </div>
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────

export default function TresC() {
  const [search, setSearch]           = useState('')
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterCamp, setFilterCamp]   = useState('all')
  const [agentsOpen, setAgentsOpen]   = useState(true)

  const { data: connected, isLoading: checking } = use3cStatus()
  const { data: agents = [] }    = useAgents()
  const { data: campaigns = [] } = useCampaigns()
  const { data: stats }          = use3cStats()
  const { data: filters }        = useFilters()

  const {
    data: pages,
    isLoading: callsLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = use3cCallsInfinite()

  const allCalls = pages?.pages.flat() ?? []

  const filtered = useMemo(() => {
    return allCalls.filter(c => {
      if (filterAgent !== 'all' && c.agent_name !== filterAgent) return false
      if (filterCamp  !== 'all' && c.campaign    !== filterCamp)  return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (c.agent_name || '').toLowerCase().includes(q) ||
          (c.phone      || '').toLowerCase().includes(q) ||
          (c.result     || '').toLowerCase().includes(q) ||
          (c.campaign   || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allCalls, filterAgent, filterCamp, search])

  const online  = agents.filter(a => ['online','in_call'].includes(a.status)).length
  const inCall  = agents.filter(a => a.status === 'in_call').length
  const paused  = agents.filter(a => a.status === 'paused').length

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.45, ease:[0.23,1,0.32,1] }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Phone size={15} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">3C Plus</h1>
              {checking ? (
                <span className="text-[10px] text-faint animate-pulse">verificando…</span>
              ) : connected ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', color:'#22c55e' }}>
                  <Radio size={8} /> Ao vivo
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#555' }}>
                  Offline
                </span>
              )}
            </div>
            <p className="text-xs text-faint mt-0.5">Histórico completo · atualiza a cada 15s</p>
          </div>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10"
          style={{ border:'1px solid rgba(255,255,255,0.08)', color:'#888' }}>
          <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total de chamadas', value: Number(stats?.total_calls || 0), icon: Phone,       color: '#fff' },
          { label: 'Agentes online',    value: online,                           icon: Users,       color: '#22c55e' },
          { label: 'Em ligação agora',  value: inCall,                           icon: PhoneCall,   color: '#fff' },
          { label: 'Duração média',     value: Math.round(Number(stats?.avg_duration || 0)), icon: Clock, color: '#f59e0b', suffix: 's' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label}
              initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: 0.06 + i*0.06, duration:0.38 }}
              className="rounded-xl p-4 hover-glow"
              style={{ background:'rgba(12,12,12,0.92)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={12} style={{ color: s.color }} />
                <p className="text-[10px] text-faint">{s.label}</p>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">
                <AnimatedNumber value={s.value} />{s.suffix || ''}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Agentes ao vivo */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.16, duration:0.42 }}
        className="rounded-xl overflow-hidden hover-glow"
        style={{ background:'rgba(12,12,12,0.92)', border:'1px solid rgba(255,255,255,0.07)' }}>

        <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
          style={{ borderBottom: agentsOpen ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          onClick={() => setAgentsOpen(o => !o)}>
          <div className="flex items-center gap-2">
            <Users size={13} className="text-faint" />
            <p className="text-sm font-semibold text-white">Agentes</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full tabular-nums"
              style={{ background:'rgba(255,255,255,0.05)', color:'#666' }}>
              {agents.length} total · {online} online · {inCall} em call · {paused} pausa
            </span>
          </div>
          {agentsOpen ? <ChevronUp size={13} className="text-faint" /> : <ChevronDown size={13} className="text-faint" />}
        </div>

        <AnimatePresence>
          {agentsOpen && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
              exit={{ height:0, opacity:0 }} transition={{ duration:0.28 }} style={{ overflow:'hidden' }}>
              {agents.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-xs text-faint">Nenhum agente logado no momento</p>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {agents
                    .sort((a, b) => {
                      const order = { in_call:0, online:1, paused:2, offline:3 }
                      return (order[a.status] ?? 4) - (order[b.status] ?? 4)
                    })
                    .map((agent, i) => (
                      <AgentCard key={agent.id} agent={agent} delay={i * 0.03} />
                    ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Filtros histórico */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
        transition={{ delay:0.2, duration:0.42 }}
        className="flex items-center gap-3 flex-wrap">

        <div className="flex-1 min-w-52 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar agente, telefone, resultado…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-transparent text-text outline-none"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }} />
        </div>

        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-xs bg-transparent text-text outline-none cursor-pointer"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <option value="all">Todos os agentes</option>
          {(filters?.agents || []).map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={filterCamp} onChange={e => setFilterCamp(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-xs bg-transparent text-text outline-none cursor-pointer"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <option value="all">Todas as campanhas</option>
          {(filters?.campaigns || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </motion.div>

      {/* Histórico — header da tabela */}
      <div className="flex items-center gap-3 px-4 pb-1"
        style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-4 shrink-0" />
        <div className="w-44 shrink-0"><p className="text-[10px] text-faint uppercase tracking-wider">Agente</p></div>
        <div className="flex-1"><p className="text-[10px] text-faint uppercase tracking-wider">Telefone</p></div>
        <div className="w-16 text-right shrink-0"><p className="text-[10px] text-faint uppercase tracking-wider">Duração</p></div>
        <div className="w-36 text-right shrink-0"><p className="text-[10px] text-faint uppercase tracking-wider">Resultado</p></div>
        <div className="w-36 hidden lg:block shrink-0"><p className="text-[10px] text-faint uppercase tracking-wider">Campanha</p></div>
        <div className="w-20 text-right shrink-0"><p className="text-[10px] text-faint uppercase tracking-wider">Hora</p></div>
      </div>

      {/* Histórico — rows */}
      <div className="space-y-1">
        {callsLoading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse"
              style={{ background:'rgba(255,255,255,0.03)' }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <PhoneOff size={24} className="text-faint mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Nenhuma chamada encontrada</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((call, i) => (
              <CallRow key={call.id || call.call_id} call={call} delay={Math.min(i * 0.015, 0.3)} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Load more */}
      {filtered.length > 0 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-[11px] text-faint">{filtered.length} chamadas carregadas</p>
          {hasNextPage && (
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#888' }}>
              {isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
