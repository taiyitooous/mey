import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, Package, CreditCard, Truck, CheckCircle,
  XCircle, Clock, RefreshCw, Search, ExternalLink,
  Copy, Check, ChevronRight, DollarSign, TrendingUp,
  MapPin, User, Phone, Mail, Hash, ChevronDown, ChevronUp,
  LayoutGrid, List,
} from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Avatar } from '../components/ui/Avatar'
import { useSkaleOrders } from '../hooks/useSkale'
import { formatCurrency, timeAgo } from '../lib/utils'

// ── Config ─────────────────────────────────────────────────

const STATUS_CFG = {
  processing:       { label: 'Processando',     icon: Clock,        color: '#888',    bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.08)' },
  in_transit:       { label: 'Em Trânsito',      icon: Truck,        color: '#f0f0f0', bg: 'rgba(255,255,255,0.06)',  border: 'rgba(255,255,255,0.12)' },
  out_for_delivery: { label: 'Saiu p/ Entrega',  icon: Package,      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.2)'   },
  delivered:        { label: 'Entregue',          icon: CheckCircle,  color: '#22c55e', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.2)'    },
  returned:         { label: 'Devolvido',         icon: RefreshCw,    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.2)'    },
  cancelled:        { label: 'Cancelado',         icon: XCircle,      color: '#ef4444', bg: 'rgba(239,68,68,0.06)',    border: 'rgba(239,68,68,0.15)'   },
}

const PAY_CFG = {
  pix:    { label: 'Pix',       color: '#22c55e' },
  boleto: { label: 'Boleto',    color: '#f59e0b' },
  credit: { label: 'Cartão',    color: '#60a5fa' },
  after:  { label: 'After Pay', color: '#a78bfa' },
  other:  { label: 'Outro',     color: '#888'    },
}

const PAY_STATUS_CFG = {
  'Pago':                { color: '#22c55e' },
  'Confirmado':          { color: '#22c55e' },
  'Aguardando Pagamento':{ color: '#f59e0b' },
  'Pendente':            { color: '#f59e0b' },
  'Recusado':            { color: '#ef4444' },
  'Estornado':           { color: '#ef4444' },
}

const DELIVERY_TIMELINE = ['processing', 'in_transit', 'out_for_delivery', 'delivered']

// ── Helpers ────────────────────────────────────────────────

function payKey(method) {
  if (!method) return 'other'
  const m = method.toLowerCase()
  if (m.includes('pix')) return 'pix'
  if (m.includes('boleto')) return 'boleto'
  if (m.includes('cart') || m.includes('credit')) return 'credit'
  if (m.includes('after')) return 'after'
  return 'other'
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1 rounded hover:bg-white/10 transition-colors"
    >
      {copied ? <Check size={11} className="text-success" /> : <Copy size={11} className="text-faint" />}
    </button>
  )
}

// ── Order Card (view por pedido) ───────────────────────────

function OrderCard({ order, onClick, delay }) {
  const status = STATUS_CFG[order.status] || STATUS_CFG.processing
  const StatusIcon = status.icon
  const pk = payKey(order.payment_method)
  const pay = PAY_CFG[pk]
  const payStatusColor = PAY_STATUS_CFG[order.payment_status]?.color || '#888'
  const curStep = DELIVERY_TIMELINE.indexOf(order.status)
  const showTimeline = !['returned', 'cancelled'].includes(order.status)

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
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{order.customer_name}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: '#444' }}>{order.product_name || '—'}</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium shrink-0"
          style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>
          <StatusIcon size={10} />
          {status.label}
        </div>
      </div>

      {showTimeline && (
        <div className="flex items-center gap-1 mb-3">
          {DELIVERY_TIMELINE.map((step, i) => {
            const done = i <= curStep
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={done ? { background: '#a78bfa' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {i < DELIVERY_TIMELINE.length - 1 && (
                  <div className="flex-1 h-px mx-1"
                    style={{ background: done && curStep > i ? '#a78bfa' : 'rgba(255,255,255,0.07)' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.04)', color: pay.color }}>{pay.label}</span>
          <span className="text-[10px] truncate" style={{ color: payStatusColor }}>{order.payment_status || '—'}</span>
        </div>
        <p className="text-sm font-bold text-white tabular-nums shrink-0">
          {formatCurrency((order.total_price || 0) / 100)}
        </p>
      </div>

      {order.tracking_code && (
        <div className="mt-2 flex items-center gap-1.5 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <Truck size={10} className="text-faint shrink-0" />
          <p className="text-[10px] font-mono truncate" style={{ color: '#444' }}>{order.tracking_code}</p>
          {order.carrier && <span className="text-[10px] text-faint shrink-0">· {order.carrier}</span>}
        </div>
      )}
    </motion.div>
  )
}

// ── Customer Card (view por cliente) ───────────────────────

function CustomerCard({ customer, onClick, delay }) {
  const [expanded, setExpanded] = useState(false)
  const { name, orders, totalSpent, paidCount, latestStatus, latestDate, phone, email } = customer

  const statusColors = { delivered: '#22c55e', in_transit: '#f0f0f0', out_for_delivery: '#f59e0b', processing: '#888', returned: '#ef4444', cancelled: '#ef4444' }
  const statusLabel  = STATUS_CFG[latestStatus]?.label || 'Processando'
  const statusColor  = statusColors[latestStatus] || '#888'

  const isRepeat = orders.length > 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-xl overflow-hidden hover-glow"
      style={{
        background: 'rgba(12,12,12,0.92)',
        border: `1px solid ${isRepeat ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Header do cliente */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              {isRepeat && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                  {orders.length}× comprou
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs tabular-nums font-bold" style={{ color: '#22c55e' }}>
                {formatCurrency(totalSpent / 100)}
              </p>
              <span className="text-[10px]" style={{ color: statusColor }}>{statusLabel}</span>
              {latestDate && <span className="text-[10px] text-faint">{timeAgo(latestDate)}</span>}
            </div>
          </div>

          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            {expanded
              ? <ChevronUp size={14} className="text-faint" />
              : <ChevronDown size={14} className="text-faint" />}
          </button>
        </div>

        {/* Mini linha de pedidos */}
        {!expanded && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {orders.map(o => {
              const pk = payKey(o.payment_method)
              const pay = PAY_CFG[pk]
              const payColor = PAY_STATUS_CFG[o.payment_status]?.color || '#666'
              return (
                <button
                  key={o.external_id}
                  onClick={() => onClick(o)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span style={{ color: pay.color }}>{pay.label}</span>
                  <span style={{ color: payColor }}>{o.payment_status || '—'}</span>
                  <span className="font-bold text-white">{formatCurrency((o.total_price || 0) / 100)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Lista expandida de pedidos */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {phone || email ? (
              <div className="px-4 py-2 flex items-center gap-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {phone && <span className="flex items-center gap-1.5 text-[11px] text-faint"><Phone size={10} />{phone}</span>}
                {email && <span className="flex items-center gap-1.5 text-[11px] text-faint"><Mail size={10} />{email}</span>}
              </div>
            ) : null}

            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {orders.map((o, i) => {
                const st = STATUS_CFG[o.status] || STATUS_CFG.processing
                const StIcon = st.icon
                const pk = payKey(o.payment_method)
                const pay = PAY_CFG[pk]
                const payColor = PAY_STATUS_CFG[o.payment_status]?.color || '#666'
                return (
                  <div
                    key={o.external_id}
                    onClick={() => onClick(o)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ background: st.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{o.product_name || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: pay.color }}>{pay.label}</span>
                        <span className="text-[10px]" style={{ color: payColor }}>{o.payment_status || '—'}</span>
                        {o.tracking_code && (
                          <span className="text-[10px] font-mono" style={{ color: '#444' }}>{o.tracking_code}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-white tabular-nums">{formatCurrency((o.total_price || 0) / 100)}</p>
                      <p className="text-[10px] text-faint">{o.started_at ? timeAgo(o.started_at) : '—'}</p>
                    </div>
                    <ChevronRight size={12} className="text-faint shrink-0" />
                  </div>
                )
              })}
            </div>

            {orders.length > 1 && (
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(167,139,250,0.03)' }}>
                <p className="text-[10px] text-faint">{orders.length} pedidos · cliente recorrente</p>
                <p className="text-xs font-bold tabular-nums" style={{ color: '#a78bfa' }}>
                  {formatCurrency(totalSpent / 100)} total
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Order Modal ────────────────────────────────────────────

function OrderModal({ order, onClose }) {
  if (!order) return null
  const status = STATUS_CFG[order.status] || STATUS_CFG.processing
  const StatusIcon = status.icon
  const pk = payKey(order.payment_method)
  const pay = PAY_CFG[pk]
  const payStatusColor = PAY_STATUS_CFG[order.payment_status]?.color || '#888'
  const addr = order.customer_address || {}

  return (
    <Modal open={!!order} onClose={onClose} title={`Pedido #${order.external_id}`} className="max-w-lg mx-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg"
          style={{ background: status.bg, border: `1px solid ${status.border}` }}>
          <div className="flex items-center gap-2">
            <StatusIcon size={14} style={{ color: status.color }} />
            <p className="text-sm font-semibold" style={{ color: status.color }}>{status.label}</p>
          </div>
          <p className="text-sm font-bold text-white">{formatCurrency((order.total_price || 0) / 100)}</p>
        </div>

        <div className="p-3 rounded-lg space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] text-faint uppercase tracking-wider">Pagamento</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-faint mb-0.5">Método</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.04)', color: pay.color }}>
                {order.payment_method || pay.label}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-faint mb-0.5">Status</p>
              <p className="text-sm font-medium" style={{ color: payStatusColor }}>{order.payment_status || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-faint mb-0.5">Plataforma</p>
              <p className="text-xs text-text">{order.platform || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-faint mb-0.5">Vendedor</p>
              <p className="text-xs text-text">{order.seller_name || '—'}</p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] text-faint uppercase tracking-wider">Produto</p>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-white">{order.product_name || '—'}</p>
              {order.product_sku && <p className="text-[10px] font-mono mt-0.5" style={{ color: '#444' }}>SKU: {order.product_sku}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-faint">Qtd</p>
              <p className="text-sm font-bold text-white">{order.product_quantity || 1}</p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg space-y-2.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] text-faint uppercase tracking-wider">Cliente</p>
          <div className="space-y-1.5">
            {order.customer_name && <div className="flex items-center gap-2"><User size={11} className="text-faint shrink-0" /><p className="text-xs text-text">{order.customer_name}</p></div>}
            {order.customer_email && <div className="flex items-center gap-2"><Mail size={11} className="text-faint shrink-0" /><p className="text-xs text-text">{order.customer_email}</p></div>}
            {order.customer_phone && <div className="flex items-center gap-2"><Phone size={11} className="text-faint shrink-0" /><p className="text-xs text-text">{order.customer_phone}</p></div>}
            {order.customer_doc && <div className="flex items-center gap-2"><Hash size={11} className="text-faint shrink-0" /><p className="text-xs text-text">{order.customer_doc}</p></div>}
            {addr.street && (
              <div className="flex items-start gap-2">
                <MapPin size={11} className="text-faint shrink-0 mt-0.5" />
                <p className="text-xs text-text">
                  {addr.street}, {addr.number}{addr.complement ? `, ${addr.complement}` : ''}
                  {addr.district ? ` — ${addr.district}` : ''}{addr.city ? ` · ${addr.city}/${addr.state}` : ''}
                  {addr.zip_code ? ` · CEP ${addr.zip_code}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {(order.tracking_code || order.carrier) && (
          <div className="p-3 rounded-lg space-y-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] text-faint uppercase tracking-wider">Envio</p>
            <div className="flex items-center justify-between gap-2">
              <div>
                {order.carrier && <p className="text-xs text-white mb-1">{order.carrier}</p>}
                {order.tracking_code && (
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-mono" style={{ color: '#a78bfa' }}>{order.tracking_code}</p>
                    <CopyBtn text={order.tracking_code} />
                  </div>
                )}
              </div>
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-faint hover:text-white transition-colors shrink-0">
                  <ExternalLink size={11} />Rastrear
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-1 text-[10px] text-faint">
          <span>Criado {timeAgo(order.started_at)}</span>
          <span className="font-mono" style={{ color: '#333' }}>#{order.external_id}</span>
        </div>
      </div>
    </Modal>
  )
}

// ── Main ───────────────────────────────────────────────────

export default function Skale() {
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPay, setFilterPay]   = useState('all')
  const [selected, setSelected]     = useState(null)
  const [viewMode, setViewMode]     = useState('customer') // 'order' | 'customer'

  const { data: orders = [], isLoading, isError, refetch, isFetching } = useSkaleOrders()

  // ── Filtragem ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (filterStatus !== 'all' && o.status !== filterStatus) return false
      if (filterPay !== 'all' && payKey(o.payment_method) !== filterPay) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (o.customer_name || '').toLowerCase().includes(q) ||
          (o.external_id || '').toLowerCase().includes(q) ||
          (o.product_name || '').toLowerCase().includes(q) ||
          (o.tracking_code || '').toLowerCase().includes(q) ||
          (o.customer_phone || '').includes(q)
        )
      }
      return true
    })
  }, [orders, filterStatus, filterPay, search])

  // ── Agrupamento por cliente ────────────────────────────
  const customers = useMemo(() => {
    const map = new Map()
    for (const o of filtered) {
      // Chave: primeiro agrupa por telefone, depois por nome
      const phone = (o.customer_phone || '').replace(/\D/g, '').slice(-9)
      const key = phone.length >= 8 ? `phone:${phone}` : `name:${(o.customer_name || '').toLowerCase().trim()}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: o.customer_name || '—',
          phone: o.customer_phone || '',
          email: o.customer_email || '',
          orders: [],
          totalSpent: 0,
          paidCount: 0,
          latestDate: null,
          latestStatus: o.status,
        })
      }
      const c = map.get(key)
      c.orders.push(o)
      c.totalSpent += o.total_price || 0
      if (['Pago', 'Confirmado'].includes(o.payment_status)) c.paidCount++
      const d = o.started_at ? new Date(o.started_at) : null
      if (d && (!c.latestDate || d > new Date(c.latestDate))) {
        c.latestDate = o.started_at
        c.latestStatus = o.status
      }
    }
    // Ordena: clientes com mais pedidos primeiro, depois por data
    return Array.from(map.values()).sort((a, b) => {
      if (b.orders.length !== a.orders.length) return b.orders.length - a.orders.length
      return new Date(b.latestDate || 0) - new Date(a.latestDate || 0)
    })
  }, [filtered])

  // ── Stats ──────────────────────────────────────────────
  const statsPaid  = orders.filter(o => ['Pago', 'Confirmado'].includes(o.payment_status)).length
  const statsPend  = orders.filter(o => ['Aguardando Pagamento', 'Pendente'].includes(o.payment_status)).length
  const statsRev   = orders.filter(o => ['Pago', 'Confirmado'].includes(o.payment_status)).reduce((s, o) => s + (o.total_price || 0), 0)
  const uniqueCustomers = useMemo(() => {
    const phones = new Set()
    const names  = new Set()
    for (const o of orders) {
      const p = (o.customer_phone || '').replace(/\D/g, '').slice(-9)
      if (p.length >= 8) phones.add(p)
      else names.add((o.customer_name || '').toLowerCase().trim())
    }
    return phones.size + names.size
  }, [orders])

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <ShoppingCart size={16} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Skale</h1>
              <p className="text-xs text-faint mt-0.5">SkalePay · Gateway de pagamento & checkout</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isError && (
            <span className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              erro de conexão
            </span>
          )}
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="grid grid-cols-4 gap-3"
      >
        {[
          { label: 'Clientes únicos',    value: uniqueCustomers, icon: User,         color: '#a78bfa', isNum: true },
          { label: 'Total de pedidos',   value: orders.length,   icon: ShoppingCart, color: '#a78bfa', isNum: true },
          { label: 'Receita confirmada', value: formatCurrency(statsRev / 100), icon: DollarSign, color: '#22c55e', isText: true },
          { label: 'Pagos',             value: statsPaid,        icon: CheckCircle,  color: '#22c55e', isNum: true },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.38 }}
              className="rounded-xl p-4 hover-glow"
              style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={12} style={{ color: s.color }} />
                <p className="text-[10px] text-faint">{s.label}</p>
              </div>
              {s.isText
                ? <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                : <p className="text-2xl font-bold text-white tabular-nums"><AnimatedNumber value={s.value} /></p>}
            </motion.div>
          )
        })}
      </motion.div>

      {/* Filters + view toggle */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center gap-3 flex-wrap"
      >
        <div className="flex-1 min-w-48 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input type="text" placeholder="Buscar por cliente, pedido, produto, telefone ou rastreio…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-transparent text-text outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>

        {/* Status */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[{ k: 'all', label: 'Todos' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ k, label: v.label }))].map(({ k, label }) => (
            <button key={k} onClick={() => setFilterStatus(k)}
              className="px-2.5 py-1 rounded text-[11px] font-medium transition-all"
              style={filterStatus === k ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' } : { color: '#555' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Pagamento */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[{ k: 'all', label: 'Pgto', color: '#555' }, ...Object.entries(PAY_CFG).map(([k, v]) => ({ k, label: v.label, color: v.color }))].map(({ k, label, color }) => (
            <button key={k} onClick={() => setFilterPay(k)}
              className="px-2.5 py-1 rounded text-[11px] font-medium transition-all"
              style={filterPay === k ? { background: 'rgba(255,255,255,0.08)', color: color || '#fff', border: '1px solid rgba(255,255,255,0.12)' } : { color: '#555' }}>
              {label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setViewMode('customer')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all"
            style={viewMode === 'customer' ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' } : { color: '#555' }}>
            <User size={11} />Por cliente
          </button>
          <button onClick={() => setViewMode('order')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all"
            style={viewMode === 'order' ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' } : { color: '#555' }}>
            <LayoutGrid size={11} />Por pedido
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl p-4 animate-pulse h-36"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 max-w-md mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
              <ShoppingCart size={22} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Nenhum pedido encontrado</p>
              <p className="text-xs text-faint">Tente ajustar os filtros ou a busca</p>
            </div>
          </div>

        ) : viewMode === 'customer' ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-faint">
                {customers.length} cliente{customers.length !== 1 ? 's' : ''} ·{' '}
                {customers.filter(c => c.orders.length > 1).length} recorrentes ·{' '}
                {filtered.length} pedidos
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {customers.map((c, i) => (
                  <CustomerCard
                    key={c.key}
                    customer={c}
                    onClick={setSelected}
                    delay={Math.min(i * 0.03, 0.25)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-faint">{filtered.length} pedidos · atualiza a cada 30s</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {filtered.map((order, i) => (
                  <OrderCard
                    key={order.id || order.external_id}
                    order={order}
                    onClick={setSelected}
                    delay={Math.min(i * 0.03, 0.25)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>

      <OrderModal order={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
