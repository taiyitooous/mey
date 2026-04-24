import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Truck, CheckCircle, XCircle, Clock, RefreshCw, Plus } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useOrders, ORDER_STATUS_LABELS } from '../lib/store'
import { formatCurrency, formatDate } from '../lib/utils'

const STATUS_CONFIG = {
  processing:       { label: 'Processando',     icon: Clock,        color: '#888',    bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.08)' },
  in_transit:       { label: 'Em Trânsito',      icon: Truck,        color: '#f0f0f0', bg: 'rgba(255,255,255,0.06)',  border: 'rgba(255,255,255,0.12)' },
  out_for_delivery: { label: 'Saiu p/ Entrega',  icon: Package,      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.2)'   },
  delivered:        { label: 'Entregue',          icon: CheckCircle,  color: '#22c55e', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.2)'    },
  returned:         { label: 'Devolvido',         icon: RefreshCw,    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.2)'    },
  cancelled:        { label: 'Cancelado',         icon: XCircle,      color: '#ef4444', bg: 'rgba(239,68,68,0.06)',    border: 'rgba(239,68,68,0.15)'   },
}

const TIMELINE = ['processing', 'in_transit', 'out_for_delivery', 'delivered']
const ALL_STATUSES = Object.keys(STATUS_CONFIG)

function OrderCard({ order, onClick, delay }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing
  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay, duration: 0.3 }}
      onClick={() => onClick(order)}
      className="rounded-xl p-4 cursor-pointer hover-glow"
      style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">{order.customer_name}</p>
          <p className="text-xs text-faint mt-0.5">{order.carrier || '—'}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          <Icon size={10} />
          {cfg.label}
        </div>
      </div>

      {!['returned', 'cancelled'].includes(order.status) && (
        <div className="flex items-center gap-1 mb-3">
          {TIMELINE.map((step, i) => {
            const cur = TIMELINE.indexOf(order.status)
            const done = i <= cur
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={done ? { background: 'white' } : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {done && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
                {i < TIMELINE.length - 1 && (
                  <div className="flex-1 h-px mx-1"
                    style={{ background: done && cur > i ? 'white' : 'rgba(255,255,255,0.08)' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs font-mono" style={{ color: '#444' }}>{order.tracking_code || 'Sem rastreio'}</p>
        <p className="text-sm font-bold text-white">{formatCurrency(order.value || 0)}</p>
      </div>
    </motion.div>
  )
}

function OrderModal({ order, onClose, onUpdateStatus, onDelete }) {
  if (!order) return null
  return (
    <Modal open={!!order} onClose={onClose} title={order.customer_name} className="max-w-md mx-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div><p className="text-[10px] text-faint mb-1">Transportadora</p><p className="text-sm text-text">{order.carrier || '—'}</p></div>
          <div><p className="text-[10px] text-faint mb-1">Rastreio</p><p className="text-sm font-mono text-text">{order.tracking_code || '—'}</p></div>
          <div><p className="text-[10px] text-faint mb-1">Valor</p><p className="text-sm text-text">{formatCurrency(order.value || 0)}</p></div>
          <div><p className="text-[10px] text-faint mb-1">Criado em</p><p className="text-sm text-text">{formatDate(order.created_at)}</p></div>
        </div>
        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-2">Atualizar status</p>
          <div className="flex gap-2 flex-wrap">
            {ALL_STATUSES.filter(s => s !== order.status).map(s => {
              const cfg = STATUS_CONFIG[s]
              return (
                <button key={s} onClick={() => onUpdateStatus(order.id, s)}
                  className="px-3 py-1.5 text-xs rounded-lg transition-all"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
        <button onClick={() => { onDelete(order.id); onClose() }}
          className="w-full py-2 rounded-xl text-xs text-faint transition-colors hover:text-destructive"
          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'transparent' }}>
          Excluir pedido
        </button>
      </div>
    </Modal>
  )
}

function AddOrderModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ customer_name: '', carrier: '', tracking_code: '', value: '', status: 'processing' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.customer_name.trim()) return
    onAdd({ ...form, value: Number(form.value) || 0 })
    setForm({ customer_name: '', carrier: '', tracking_code: '', value: '', status: 'processing' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Novo pedido" className="max-w-sm mx-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { key: 'customer_name', label: 'Cliente', placeholder: 'Nome do cliente', required: true },
          { key: 'carrier', label: 'Transportadora', placeholder: 'Correios, JadLog...' },
          { key: 'tracking_code', label: 'Código de rastreio', placeholder: 'BR123...' },
          { key: 'value', label: 'Valor (R$)', placeholder: '0', type: 'number' },
        ].map(({ key, label, placeholder, type, required }) => (
          <div key={key}>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">{label}</p>
            <Input type={type || 'text'} placeholder={placeholder} required={required}
              value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        <div>
          <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">Status inicial</p>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            className="w-full h-9 px-3 text-sm rounded text-text"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
        <button type="submit"
          className="w-full py-2.5 rounded-xl text-sm font-medium mt-2"
          style={{ background: 'white', color: 'black' }}>
          Criar pedido
        </button>
      </form>
    </Modal>
  )
}

export default function Logistica() {
  const { items: orders, add, update, remove } = useOrders()
  const [selected, setSelected] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q || o.customer_name?.toLowerCase().includes(q) || o.tracking_code?.includes(q)
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  }), [orders, search, statusFilter])

  const summary = useMemo(() => ({
    total: orders.length,
    in_transit: orders.filter(o => o.status === 'in_transit').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    returned: orders.filter(o => o.status === 'returned').length,
  }), [orders])

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Logística</h1>
          <p className="text-xs text-faint mt-0.5">{orders.length} pedidos cadastrados</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'white', color: 'black' }}>
          <Plus size={14} />
          Novo pedido
        </button>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: summary.total, color: '#f0f0f0' },
          { label: 'Em trânsito', value: summary.in_transit, color: '#f0f0f0' },
          { label: 'Entregues', value: summary.delivered, color: '#22c55e' },
          { label: 'Devolvidos', value: summary.returned, color: '#ef4444' },
        ].map(({ label, value, color }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-xl p-4 hover-glow"
            style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] text-faint uppercase tracking-wider mb-2">{label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>
              <AnimatedNumber value={value} />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Input placeholder="Buscar cliente ou rastreio…" value={search}
          onChange={e => setSearch(e.target.value)} className="w-60" />
        <div className="flex gap-1.5">
          {[['all', 'Todos'], ['in_transit', 'Em trânsito'], ['delivered', 'Entregues'], ['returned', 'Devolvidos']].map(([val, lbl]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={statusFilter === val
                ? { background: 'white', color: 'black' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Empty */}
      {orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Package size={20} className="text-faint" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white mb-1">Nenhum pedido cadastrado</p>
            <p className="text-xs text-faint">Cadastre pedidos manualmente ou integre com Five Delivery.</p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'white', color: 'black' }}>
            <Plus size={13} />
            Cadastrar pedido
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="sync">
            {filtered.map((order, i) => (
              <OrderCard key={order.id} order={order} onClick={setSelected} delay={i * 0.04} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <OrderModal
        order={selected}
        onClose={() => setSelected(null)}
        onUpdateStatus={(id, status) => { update(id, { status }); setSelected(null) }}
        onDelete={remove}
      />
      <AddOrderModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={add} />
    </div>
  )
}
