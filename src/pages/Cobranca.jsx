import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageSquare, Clock, CheckCircle, FileText } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Avatar } from '../components/ui/Avatar'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { COLLECTIONS, SELLERS } from '../lib/mockData'
import { formatCurrency, formatDate, timeAgo } from '../lib/utils'

const STATUS_CONFIG = {
  new:       { label: 'Novo',       color: '#555',    bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
  pending:   { label: 'Pendente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)'   },
  contacted: { label: 'Contatado',  color: '#888',    bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)'  },
  agreement: { label: 'Acordo',     color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)'   },
  paid:      { label: 'Pago',       color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)'    },
  failed:    { label: 'Falhou',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'    },
}

function CollectionCard({ collection, onClick, delay }) {
  const cfg = STATUS_CONFIG[collection.status]
  const seller = SELLERS.find(s => s.seller_key === collection.seller_key)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={() => onClick(collection)}
      className="rounded-xl p-4 cursor-pointer hover-glow"
      style={{ background: 'rgba(14,14,14,0.9)', border: `1px solid rgba(255,255,255,0.07)` }}
      whileHover={{ y: -2 }}
    >
      {/* Status top bar */}
      <div className="h-[2px] rounded-full mb-4 -mt-4 -mx-4 rounded-t-xl"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}40, transparent)` }} />

      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-white">{collection.customer_name}</p>
          <p className="text-xs text-faint mt-0.5">{collection.phone}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {cfg.label}
        </span>
      </div>

      <p className="text-2xl font-bold text-white mb-3 tabular-nums">
        {formatCurrency(collection.amount)}
      </p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5" style={{ color: '#555' }}>
          <Phone size={10} />
          {collection.attempts} tentativas
        </div>
        {collection.promise_date && (
          <div className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
            <Clock size={10} />
            {formatDate(collection.promise_date)}
          </div>
        )}
      </div>

      {seller && (
        <div className="flex items-center gap-1.5 mt-3 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Avatar name={seller.name} size="sm" />
          <span className="text-xs text-faint">{seller.name.split(' ')[0]}</span>
          {collection.last_contact && (
            <span className="text-xs ml-auto" style={{ color: '#333' }}>
              {timeAgo(collection.last_contact)}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

function CollectionModal({ collection, onClose, onUpdate }) {
  const [status, setStatus] = useState(collection?.status || 'pending')
  const [notes, setNotes] = useState(collection?.notes || '')
  const [promiseDate, setPromiseDate] = useState(collection?.promise_date?.split('T')[0] || '')

  if (!collection) return null
  const cfg = STATUS_CONFIG[status]

  return (
    <Modal open={!!collection} onClose={onClose} title={`Cobrança — ${collection.customer_name}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-xs text-faint mb-1">Valor em aberto</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(collection.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-faint mb-1">Tentativas</p>
            <p className="text-2xl font-bold text-white">{collection.attempts}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#ddd' }}>
            <Phone size={13} /> Ligar
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#ddd' }}>
            <MessageSquare size={13} /> WhatsApp
          </button>
        </div>

        <div>
          <p className="text-xs text-faint mb-2">Status</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(STATUS_CONFIG).map(([val, c]) => (
              <button key={val} onClick={() => setStatus(val)}
                className="py-2 rounded-lg text-xs font-medium transition-all"
                style={status === val
                  ? { background: c.bg, border: `1px solid ${c.border}`, color: c.color }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {['agreement', 'pending'].includes(status) && (
          <div>
            <p className="text-xs text-faint mb-1">Data da promessa</p>
            <Input type="date" value={promiseDate} onChange={e => setPromiseDate(e.target.value)} />
          </div>
        )}

        <div>
          <p className="text-xs text-faint mb-1">Observações</p>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Detalhes do acordo..." rows={3} />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => { onUpdate({ ...collection, status, notes, promise_date: promiseDate || null }); onClose() }}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Cobranca() {
  const [collections, setCollections] = useState(COLLECTIONS)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => collections.filter(c => {
    const matchSearch = !search || c.customer_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  }), [collections, search, statusFilter])

  const summary = useMemo(() => {
    const open = collections.filter(c => ['new', 'pending', 'contacted'].includes(c.status))
    return {
      total: collections.length,
      open: open.length,
      amount: open.reduce((s, c) => s + c.amount, 0),
      agreements: collections.filter(c => c.status === 'agreement').length,
      paid: collections.filter(c => c.status === 'paid').length,
    }
  }, [collections])

  return (
    <div className="p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Cobrança</h1>
        <p className="text-sm text-faint mt-0.5">Gestão de inadimplência</p>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Em aberto', value: summary.open, color: '#f59e0b', delay: 0 },
          { label: 'Valor total', value: formatCurrency(summary.amount), color: '#f0f0f0', isText: true, delay: 0.07 },
          { label: 'Acordos', value: summary.agreements, color: '#60a5fa', delay: 0.14 },
          { label: 'Pagos hoje', value: summary.paid, color: '#22c55e', delay: 0.21 },
        ].map(({ label, value, color, isText, delay }) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="rounded-xl p-4 hover-glow"
            style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs text-faint mb-1.5">{label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>
              {isText ? value : <AnimatedNumber value={value} />}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
        <div className="flex gap-1.5 flex-wrap">
          {[['all', 'Todos'], ...Object.entries(STATUS_CONFIG).map(([v, c]) => [v, c.label])].map(([val, lbl]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={statusFilter === val
                ? { background: 'white', color: 'black' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#666' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {filtered.map((c, i) => (
            <CollectionCard key={c.id} collection={c} onClick={setSelected} delay={i * 0.06} />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-faint">Nenhuma cobrança encontrada</div>
        )}
      </div>

      <CollectionModal collection={selected} onClose={() => setSelected(null)}
        onUpdate={u => setCollections(p => p.map(c => c.id === u.id ? u : c))} />
    </div>
  )
}
