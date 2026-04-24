import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Plus, DollarSign, ChevronRight } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useLeads, useSellers, STAGE_LABELS } from '../lib/store'
import { formatCurrency } from '../lib/utils'

const STAGES = [1, 2, 3, 4, 5]

const STAGE_BG = {
  1: 'rgba(255,255,255,0.02)', 2: 'rgba(255,255,255,0.025)',
  3: 'rgba(255,255,255,0.03)', 4: 'rgba(255,255,255,0.035)',
  5: 'rgba(34,197,94,0.05)',
}
const STAGE_BORDER = {
  1: 'rgba(255,255,255,0.07)', 2: 'rgba(255,255,255,0.07)',
  3: 'rgba(255,255,255,0.07)', 4: 'rgba(255,255,255,0.07)',
  5: 'rgba(34,197,94,0.18)',
}

function LeadCard({ lead, onClick, index }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03, duration: 0.28 }}
      onClick={() => onClick(lead)}
      className="rounded-lg p-3 cursor-pointer hover-glow"
      style={{ background: 'rgba(14,14,14,0.95)', border: '1px solid rgba(255,255,255,0.07)' }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-white leading-tight truncate">{lead.name}</p>
        {Number(lead.value) > 0 && (
          <span className="text-xs font-semibold text-success shrink-0">{formatCurrency(lead.value)}</span>
        )}
      </div>
      <p className="text-xs mb-2" style={{ color: '#444' }}>{lead.phone || '—'}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-faint capitalize">{lead.source || 'manual'}</span>
        <ChevronRight size={11} className="text-faint" />
      </div>
    </motion.div>
  )
}

function LeadModal({ lead, onClose, onMove, onDelete }) {
  if (!lead) return null
  return (
    <Modal open={!!lead} onClose={onClose} title={lead.name} className="max-w-md mx-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div><p className="text-[10px] text-faint mb-1">Telefone</p><p className="text-sm text-text">{lead.phone || '—'}</p></div>
          <div><p className="text-[10px] text-faint mb-1">Valor</p><p className="text-sm text-text">{lead.value ? formatCurrency(lead.value) : '—'}</p></div>
          <div><p className="text-[10px] text-faint mb-1">Etapa</p><span className="tag">{STAGE_LABELS[lead.stage]}</span></div>
          <div><p className="text-[10px] text-faint mb-1">Origem</p><p className="text-sm text-text capitalize">{lead.source || 'manual'}</p></div>
        </div>
        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-2">Mover para etapa</p>
          <div className="flex gap-2 flex-wrap">
            {STAGES.filter(s => s !== lead.stage).map(s => (
              <button key={s} onClick={() => onMove(lead.id, s)}
                className="px-3 py-1.5 text-xs rounded-lg transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}>
                {STAGE_LABELS[s]}
              </button>
            ))}
            <button onClick={() => onMove(lead.id, 0)}
              className="px-3 py-1.5 text-xs rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              Perdido
            </button>
          </div>
        </div>
        <button onClick={() => { onDelete(lead.id); onClose() }}
          className="w-full py-2 rounded-xl text-xs text-faint transition-colors hover:text-destructive"
          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'transparent' }}>
          Excluir lead
        </button>
      </div>
    </Modal>
  )
}

function AddLeadModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', phone: '', value: '', source: 'manual', stage: '1' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onAdd({ ...form, stage: Number(form.stage), value: Number(form.value) || 0 })
    setForm({ name: '', phone: '', value: '', source: 'manual', stage: '1' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Novo lead" className="max-w-sm mx-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { key: 'name', label: 'Nome', placeholder: 'ex: João Silva', required: true },
          { key: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999' },
          { key: 'value', label: 'Valor estimado (R$)', placeholder: '0', type: 'number' },
          { key: 'source', label: 'Origem', placeholder: 'datacrazy, manual...' },
        ].map(({ key, label, placeholder, type, required }) => (
          <div key={key}>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">{label}</p>
            <Input type={type || 'text'} placeholder={placeholder} required={required}
              value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Etapa inicial</p>
          <select value={form.stage} onChange={e => set('stage', e.target.value)}
            className="w-full h-9 px-3 text-sm rounded text-text"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </div>
        <button type="submit"
          className="w-full py-2.5 rounded-xl text-sm font-medium mt-2"
          style={{ background: 'white', color: 'black' }}>
          Criar lead
        </button>
      </form>
    </Modal>
  )
}

export default function Vendas() {
  const { items: leads, add, update, remove } = useLeads()
  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => leads.filter(l => {
    const q = search.toLowerCase()
    return l.stage > 0 && (!q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q))
  }), [leads, search])

  const byStage = useMemo(() => STAGES.reduce((acc, s) => {
    acc[s] = filtered.filter(l => l.stage === s)
    return acc
  }, {}), [filtered])

  const wonValue = leads.filter(l => l.stage === 5).reduce((s, l) => s + Number(l.value || 0), 0)

  const handleMove = (id, stage) => { update(id, { stage }); setSelected(null) }

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vendas</h1>
          <p className="text-xs text-faint mt-0.5">Kanban de leads · {leads.filter(l => l.stage > 0).length} ativos</p>
        </div>
        <div className="flex items-center gap-3">
          {wonValue > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <DollarSign size={13} className="text-success" />
              <span className="font-bold text-success text-sm">{formatCurrency(wonValue)}</span>
            </div>
          )}
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'white', color: 'black' }}>
            <Plus size={14} />
            Novo lead
          </button>
        </div>
      </motion.div>

      <Input placeholder="Buscar por nome ou telefone…" value={search}
        onChange={e => setSearch(e.target.value)} className="max-w-xs" />

      {leads.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Phone size={20} className="text-faint" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white mb-1">Nenhum lead cadastrado</p>
            <p className="text-xs text-faint">Adicione leads manualmente ou integre com DataCrazy.</p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'white', color: 'black' }}>
            <Plus size={13} />
            Criar primeiro lead
          </button>
        </motion.div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scroll-x">
          {STAGES.map((stage, si) => (
            <motion.div key={stage} className="shrink-0 w-60"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.07, ease: [0.23, 1, 0.32, 1] }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${stage === 5 ? 'bg-success' : 'bg-subtle'}`} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-text">
                    {STAGE_LABELS[stage]}
                  </p>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded tabular-nums"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#555' }}>
                  {byStage[stage]?.length || 0}
                </span>
              </div>
              <div className="space-y-2 min-h-[60px] rounded-xl p-2"
                style={{ background: STAGE_BG[stage], border: `1px solid ${STAGE_BORDER[stage]}` }}>
                <AnimatePresence>
                  {(byStage[stage] || []).map((lead, i) => (
                    <LeadCard key={lead.id} lead={lead} onClick={setSelected} index={i} />
                  ))}
                </AnimatePresence>
                {!(byStage[stage] || []).length && (
                  <div className="py-4 text-center">
                    <p className="text-xs" style={{ color: '#222' }}>Vazio</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <LeadModal lead={selected} onClose={() => setSelected(null)} onMove={handleMove} onDelete={remove} />
      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={add} />
    </div>
  )
}
