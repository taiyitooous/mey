import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Truck, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { ORDERS, ORDER_STATUS_LABELS } from '../lib/mockData'
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils'

const STATUS_CONFIG = {
  processing:       { label: 'Processando',     icon: Clock,        color: '#888',    bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.08)' },
  in_transit:       { label: 'Em Trânsito',      icon: Truck,        color: '#f0f0f0', bg: 'rgba(255,255,255,0.06)',  border: 'rgba(255,255,255,0.12)' },
  out_for_delivery: { label: 'Saiu p/ Entrega',  icon: Package,      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.2)'   },
  delivered:        { label: 'Entregue',          icon: CheckCircle,  color: '#22c55e', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.2)'    },
  returned:         { label: 'Devolvido',         icon: RefreshCw,    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.2)'    },
  cancelled:        { label: 'Cancelado',         icon: XCircle,      color: '#ef4444', bg: 'rgba(239,68,68,0.06)',    border: 'rgba(239,68,68,0.15)'   },
}

const TIMELINE_STEPS = ['processing', 'in_transit', 'out_for_delivery', 'delivered']

function OrderCard({ order, onClick, delay }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing
  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={() => onClick(order)}
      className="rounded-xl p-4 cursor-pointer hover-glow group"
      style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">{order.customer_name}</p>
          <p className="text-xs text-faint mt-0.5">{order.carrier}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          <Icon size={10} />
          {cfg.label}
        </div>
      </div>

      {/* Tracking */}
      {!['returned', 'cancelled'].includes(order.status) && (
        <div className="flex items-center gap-1 mb-3">
          {TIMELINE_STEPS.map((step, i) => {
            const curIdx = TIMELINE_STEPS.indexOf(order.status)
            const stepIdx = i
            const done = stepIdx <= curIdx
            return (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-white' : ''}`}
                  style={!done ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' } : {}}>
                  {done && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-1"
                    style={{ background: done && TIMELINE_STEPS.indexOf(order.status) > i ? 'white' : 'rgba(255,255,255,0.08)' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs font-mono" style={{ color: '#444' }}>
          {order.tracking_code || 'Sem rastreio'}
        </p>
        <p className="text-sm font-bold text-white">{formatCurrency(order.value)}</p>
      </div>
    </motion.div>
  )
}

function OrderModal({ order, onClose }) {
  if (!order) return null
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg mx-4 rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-sm font-semibold text-white">{order.customer_name}</h2>
            <p className="text-xs text-faint mt-0.5">{order.id}</p>
          </div>
          <button onClick={onClose} className="text-faint hover:text-white text-xl">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status badge */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <cfg.icon size={14} style={{ color: cfg.color }} />
            <p className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
          </div>

          {/* Timeline */}
          {!['returned', 'cancelled'].includes(order.status) && (
            <div>
              <p className="text-xs text-faint uppercase tracking-wider mb-4">Rastreamento</p>
              <div className="flex items-start">
                {TIMELINE_STEPS.map((step, i) => {
                  const curIdx = TIMELINE_STEPS.indexOf(order.status)
                  const done = i <= curIdx
                  const SCfg = STATUS_CONFIG[step]
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1.5">
                        <motion.div
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          animate={done ? { background: 'white', boxShadow: '0 0 12px rgba(255,255,255,0.2)' } : {}}
                          style={!done ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' } : {}}
                        >
                          <SCfg.icon size={14} className={done ? 'text-black' : 'text-faint'} />
                        </motion.div>
                        <p className={`text-xs text-center w-16 ${done ? 'text-white' : 'text-faint'}`}>{SCfg.label}</p>
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className="flex-1 h-px mx-2 mb-6"
                          style={{ background: done && curIdx > i ? 'white' : 'rgba(255,255,255,0.08)' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Transportadora', value: order.carrier },
              { label: 'Código de rastreio', value: order.tracking_code || 'Aguardando', mono: true },
              { label: 'Valor', value: formatCurrency(order.value), bold: true },
              { label: 'Criado em', value: formatDate(order.created_at) },
              { label: 'Última atualização', value: formatDateTime(order.updated_at) },
            ].map(({ label, value, mono, bold }) => (
              <div key={label}>
                <p className="text-xs text-faint mb-1">{label}</p>
                <p className={`text-sm ${bold ? 'font-bold text-white' : 'text-text-secondary'} ${mono ? 'font-mono text-xs' : ''}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function Logistica() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => ORDERS.filter(o => {
    const matchSearch = !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.tracking_code || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  }), [search, statusFilter])

  const statusGroups = useMemo(() =>
    Object.keys(STATUS_CONFIG).map(s => ({
      status: s,
      ...STATUS_CONFIG[s],
      count: ORDERS.filter(o => o.status === s).length
    })).filter(g => g.count > 0),
    []
  )

  return (
    <div className="p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Logística</h1>
          <p className="text-sm text-faint mt-0.5">Rastreio de pedidos</p>
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: 'Pedidos', value: ORDERS.length },
            { label: 'Entregues', value: ORDERS.filter(o => o.status === 'delivered').length, color: '#22c55e' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center px-4 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs text-faint">{label}</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: color || '#f0f0f0' }}>
                <AnimatedNumber value={value} />
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatusFilter('all')}
          className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
          style={statusFilter === 'all'
            ? { background: 'white', color: 'black' }
            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#666' }}>
          Todos ({ORDERS.length})
        </button>
        {statusGroups.map(({ status, label, icon: Icon, color, bg, border, count }) => (
          <button key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={statusFilter === status
              ? { background: bg, border: `1px solid ${border}`, color }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#555' }}>
            <Icon size={10} />
            {label} <span className="opacity-60">({count})</span>
          </button>
        ))}
      </div>

      <Input placeholder="Buscar cliente ou rastreio..." value={search}
        onChange={e => setSearch(e.target.value)} className="w-64" />

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <AnimatePresence>
          {filtered.map((order, i) => (
            <OrderCard key={order.id} order={order} onClick={setSelected} delay={i * 0.06} />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-faint">Nenhum pedido encontrado</div>
        )}
      </div>

      <AnimatePresence>
        {selected && <OrderModal order={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}
