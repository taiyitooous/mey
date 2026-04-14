import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageSquare, ChevronRight, TrendingUp, DollarSign } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { LEADS, EVENTS, SELLERS, STAGE_LABELS } from '../lib/mockData'
import { formatDateTime, timeAgo, formatCurrency } from '../lib/utils'

const STAGES = [1, 2, 3, 4, 5]

const STAGE_COLORS = {
  1: 'rgba(255,255,255,0.04)',
  2: 'rgba(255,255,255,0.05)',
  3: 'rgba(255,255,255,0.06)',
  4: 'rgba(255,255,255,0.07)',
  5: 'rgba(34,197,94,0.06)',
}
const STAGE_BORDER = {
  1: 'rgba(255,255,255,0.07)',
  2: 'rgba(255,255,255,0.07)',
  3: 'rgba(255,255,255,0.07)',
  4: 'rgba(255,255,255,0.07)',
  5: 'rgba(34,197,94,0.18)',
}

function LeadCard({ lead, onClick, index }) {
  const events = EVENTS.filter(e => e.entity_id === lead.id)
  const lastEvent = events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  const calls = events.filter(e => e.event_type === 'call_answered').length
  const whatsapps = events.filter(e => e.event_type === 'whatsapp_call_received').length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => onClick(lead)}
      className="rounded-lg p-3 cursor-pointer hover-glow group"
      style={{
        background: 'rgba(14,14,14,0.95)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-white leading-tight">{lead.name}</p>
        {lead.value > 0 && (
          <span className="text-xs font-semibold text-success shrink-0">{formatCurrency(lead.value)}</span>
        )}
      </div>
      <p className="text-xs mb-2.5" style={{ color: '#444' }}>{lead.phone}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: '#555' }}>
          {calls > 0 && <span className="flex items-center gap-1"><Phone size={9} />{calls}</span>}
          {whatsapps > 0 && <span className="flex items-center gap-1"><MessageSquare size={9} />{whatsapps}</span>}
        </div>
        <p className="text-xs" style={{ color: '#333' }}>{lastEvent ? timeAgo(lastEvent.created_at) : '—'}</p>
      </div>
      {lead.seller_key && (
        <div className="flex items-center gap-1.5 mt-2 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Avatar name={SELLERS.find(s => s.seller_key === lead.seller_key)?.name || ''} size="sm" />
          <span className="text-xs capitalize" style={{ color: '#555' }}>{lead.seller_key}</span>
        </div>
      )}
    </motion.div>
  )
}

function LeadModal({ lead, onClose, onMove }) {
  const events = EVENTS
    .filter(e => e.entity_id === lead?.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (!lead) return null

  return (
    <Modal open={!!lead} onClose={onClose} title={lead.name} className="max-w-xl mx-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div><p className="text-xs text-faint mb-1">Telefone</p><p className="text-sm text-text">{lead.phone}</p></div>
          <div><p className="text-xs text-faint mb-1">Origem</p><p className="text-sm text-text capitalize">{lead.source}</p></div>
          <div>
            <p className="text-xs text-faint mb-1">Etapa</p>
            <span className="tag">{STAGE_LABELS[lead.stage]}</span>
          </div>
          <div><p className="text-xs text-faint mb-1">Vendedor</p><p className="text-sm text-text capitalize">{lead.seller_key}</p></div>
        </div>

        <div>
          <p className="text-xs text-faint uppercase tracking-wider mb-2">Mover para etapa</p>
          <div className="flex gap-2 flex-wrap">
            {STAGES.filter(s => s !== lead.stage).map(s => (
              <button key={s} onClick={() => onMove(lead, s)}
                className="px-3 py-1.5 text-xs rounded-lg transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}>
                {STAGE_LABELS[s]}
              </button>
            ))}
            <button onClick={() => onMove(lead, 0)}
              className="px-3 py-1.5 text-xs rounded-lg transition-colors"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              Marcar perdido
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-faint uppercase tracking-wider mb-2">Histórico</p>
          {events.length === 0 ? (
            <p className="text-xs text-faint italic">Nenhum evento</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {events.map(evt => (
                <div key={evt.id} className="flex items-start gap-2 text-xs">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    evt.event_type === 'lead.won' ? 'bg-success' :
                    evt.event_type === 'lead.lost' ? 'bg-destructive' : 'bg-subtle'
                  }`} />
                  <div className="flex-1">
                    <p className="text-text-secondary">
                      {evt.event_type === 'call_answered' && `Ligação — ${evt.payload?.result || ''} · ${evt.payload?.speaking_time || 0}s`}
                      {evt.event_type === 'whatsapp_call_received' && 'WhatsApp recebido'}
                      {evt.event_type === 'lead.won' && `Venda — ${formatCurrency(evt.payload?.value)}`}
                      {evt.event_type === 'lead.lost' && `Perdido — ${evt.payload?.reason || '—'}`}
                    </p>
                    <p className="text-faint">{evt.user_name} · {formatDateTime(evt.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function Vendas() {
  const [leads, setLeads] = useState(LEADS)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [sellerFilter, setSellerFilter] = useState('all')

  const filtered = useMemo(() => leads.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
    const matchSeller = sellerFilter === 'all' || l.seller_key === sellerFilter
    return matchSearch && matchSeller && l.stage > 0
  }), [leads, search, sellerFilter])

  const byStage = useMemo(() => STAGES.reduce((acc, s) => {
    acc[s] = filtered.filter(l => l.stage === s)
    return acc
  }, {}), [filtered])

  const totalValue = leads.filter(l => l.stage === 5).reduce((s, l) => s + (l.value || 0), 0)

  const handleMove = (lead, newStage) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: newStage } : l))
    setSelected(null)
  }

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Vendas</h1>
          <p className="text-sm text-faint mt-0.5">Kanban de leads por etapa</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <DollarSign size={13} className="text-success" />
          <span className="font-bold text-success">{formatCurrency(totalValue)}</span>
          <span className="text-xs text-faint">ganhos</span>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input placeholder="Buscar lead..." value={search}
          onChange={e => setSearch(e.target.value)} className="w-52" />
        <Select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)} className="w-40">
          <option value="all">Todos</option>
          {SELLERS.map(s => <option key={s.seller_key} value={s.seller_key}>{s.name.split(' ')[0]}</option>)}
        </Select>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage, si) => (
          <motion.div
            key={stage}
            className="shrink-0 w-60"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.07 }}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${stage === 5 ? 'bg-success' : 'bg-subtle'}`} />
                  <p className="text-xs font-semibold text-text uppercase tracking-wider">
                    {STAGE_LABELS[stage]}
                  </p>
                </div>
                <p className="text-xs text-faint pl-3.5 mt-0.5">
                  <AnimatedNumber value={byStage[stage]?.length || 0} /> leads
                  {stage === 5 && byStage[5]?.reduce((s, l) => s + (l.value || 0), 0) > 0 &&
                    ` · ${formatCurrency(byStage[5].reduce((s, l) => s + (l.value || 0), 0))}`}
                </p>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded tabular-nums"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#555' }}>
                {byStage[stage]?.length || 0}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[80px] rounded-xl p-2"
              style={{ background: STAGE_COLORS[stage], border: `1px solid ${STAGE_BORDER[stage]}` }}>
              <AnimatePresence>
                {(byStage[stage] || []).map((lead, i) => (
                  <LeadCard key={lead.id} lead={lead} onClick={setSelected} index={i} />
                ))}
              </AnimatePresence>
              {(byStage[stage] || []).length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-xs" style={{ color: '#2a2a2a' }}>Vazio</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <LeadModal lead={selected} onClose={() => setSelected(null)} onMove={handleMove} />
    </div>
  )
}
