import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Plus, CheckCircle, FileText } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useCollections } from '../lib/store'
import { formatCurrency, formatDate, timeAgo } from '../lib/utils'

const STATUS_CONFIG = {
  new:       { label: 'Novo',       color: '#555',    bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
  pending:   { label: 'Pendente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)'   },
  contacted: { label: 'Contatado',  color: '#888',    bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)'  },
  agreement: { label: 'Acordo',     color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)'   },
  paid:      { label: 'Pago',       color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)'    },
  failed:    { label: 'Falhou',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'    },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

function CollectionCard({ item, onClick, delay }) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.new
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay, duration: 0.3 }}
      onClick={() => onClick(item)}
      className="rounded-xl p-4 cursor-pointer hover-glow"
      style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
      whileHover={{ y: -2 }}
    >
      <div className="h-[1.5px] -mt-4 -mx-4 mb-4 rounded-t-xl"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}40, transparent)` }} />
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-white">{item.customer_name}</p>
          <p className="text-xs text-faint mt-0.5">{item.phone || '—'}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      <p className="text-2xl font-bold text-white mb-3 tabular-nums">{formatCurrency(item.amount || 0)}</p>
      <div className="flex items-center justify-between text-xs text-faint">
        <span>{item.attempts || 0} tentativas</span>
        {item.last_contact && <span>{timeAgo(item.last_contact)}</span>}
      </div>
    </motion.div>
  )
}

function CollectionModal({ item, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(item?.notes || '')
  if (!item) return null
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.new
  return (
    <Modal open={!!item} onClose={onClose} title={item.customer_name} className="max-w-md mx-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div><p className="text-[10px] text-faint mb-1">Valor</p><p className="text-lg font-bold text-white">{formatCurrency(item.amount || 0)}</p></div>
          <div><p className="text-[10px] text-faint mb-1">Status</p><span className="tag">{cfg.label}</span></div>
          <div><p className="text-[10px] text-faint mb-1">Telefone</p><p className="text-sm text-text">{item.phone || '—'}</p></div>
          <div><p className="text-[10px] text-faint mb-1">Tentativas</p><p className="text-sm text-text">{item.attempts || 0}</p></div>
        </div>

        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-2">Atualizar status</p>
          <div className="flex gap-1.5 flex-wrap">
            {ALL_STATUSES.filter(s => s !== item.status).map(s => {
              const c = STATUS_CONFIG[s]
              return (
                <button key={s} onClick={() => onUpdate(item.id, { status: s, last_contact: new Date().toISOString(), attempts: (item.attempts || 0) + 1 })}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Observações</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded text-text resize-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="Promessas, acordos, observações…"
          />
          <button onClick={() => onUpdate(item.id, { notes })}
            className="mt-2 px-3 py-1.5 text-xs rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}>
            Salvar nota
          </button>
        </div>

        <button onClick={() => { onDelete(item.id); onClose() }}
          className="w-full py-2 rounded-xl text-xs text-faint transition-colors hover:text-destructive"
          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'transparent' }}>
          Excluir cobrança
        </button>
      </div>
    </Modal>
  )
}

function AddModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ customer_name: '', phone: '', amount: '', status: 'new' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.customer_name.trim()) return
    onAdd({ ...form, amount: Number(form.amount) || 0, attempts: 0 })
    setForm({ customer_name: '', phone: '', amount: '', status: 'new' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Nova cobrança" className="max-w-sm mx-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { key: 'customer_name', label: 'Cliente', placeholder: 'Nome', required: true },
          { key: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999' },
          { key: 'amount', label: 'Valor (R$)', placeholder: '0', type: 'number' },
        ].map(({ key, label, placeholder, type, required }) => (
          <div key={key}>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">{label}</p>
            <Input type={type || 'text'} placeholder={placeholder} required={required}
              value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <button type="submit"
          className="w-full py-2.5 rounded-xl text-sm font-medium mt-2"
          style={{ background: 'white', color: 'black' }}>
          Criar cobrança
        </button>
      </form>
    </Modal>
  )
}

export default function Cobranca() {
  const { items, add, update, remove } = useCollections()
  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() =>
    statusFilter === 'all' ? items : items.filter(i => i.status === statusFilter)
  , [items, statusFilter])

  const totalValue = items.reduce((s, i) => s + Number(i.amount || 0), 0)
  const paidValue = items.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cobrança</h1>
          <p className="text-xs text-faint mt-0.5">{items.length} cobranças · {formatCurrency(totalValue)} em aberto</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'white', color: 'black' }}>
          <Plus size={14} />
          Nova cobrança
        </button>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total inadimplência', value: formatCurrency(totalValue), big: true },
          { label: 'Recuperado', value: formatCurrency(paidValue), color: '#22c55e' },
          { label: 'Pendentes', value: items.filter(i => i.status === 'pending').length, color: '#f59e0b' },
        ].map(({ label, value, color, big }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-xl p-4 hover-glow"
            style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-2">{label}</p>
            <p className={`font-bold tabular-nums ${big ? 'text-xl' : 'text-2xl'}`} style={{ color: color || '#f0f0f0' }}>
              {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Todas'], ...ALL_STATUSES.map(s => [s, STATUS_CONFIG[s].label])].map(([val, lbl]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={statusFilter === val
              ? { background: 'white', color: 'black' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Empty */}
      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <FileText size={20} className="text-faint" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white mb-1">Nenhuma cobrança cadastrada</p>
            <p className="text-xs text-faint">Cadastre cobranças manualmente para gestão de inadimplência.</p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'white', color: 'black' }}>
            <Plus size={13} />
            Cadastrar cobrança
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="sync">
            {filtered.map((item, i) => (
              <CollectionCard key={item.id} item={item} onClick={setSelected} delay={i * 0.04} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <CollectionModal item={selected} onClose={() => setSelected(null)} onUpdate={update} onDelete={remove} />
      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={add} />
    </div>
  )
}
