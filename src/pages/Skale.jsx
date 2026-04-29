import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, Package, CreditCard, Truck, CheckCircle,
  XCircle, Clock, RefreshCw, Search, ExternalLink,
  Copy, Check, ChevronRight, DollarSign, TrendingUp,
  AlertCircle, MapPin, User, Phone, Mail, Hash,
} from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { useSkaleOrders, useSkaleEvents, useSkaleStats } from '../hooks/useSkale'
import { formatCurrency, formatDateTime, timeAgo } from '../lib/utils'

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
  pix:     { label: 'Pix',          color: '#22c55e' },
  boleto:  { label: 'Boleto',       color: '#f59e0b' },
  credit:  { label: 'Cartão',       color: '#60a5fa' },
  after:   { label: 'After Pay',    color: '#a78bfa' },
  other:   { label: 'Outro',        color: '#888'    },
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

const EVENT_LABEL = {
  order_created: 'Pedido criado', order_approved: 'Pedido aprovado',
  status_updated: 'Status atualizado', tracking_updated: 'Rastreio atualizado',
  payment_created: 'Pagamento criado', payment_registered: 'Pagamento confirmado',
  payment_status_updated: 'Status de pgto alterado', order_paid_manual: 'Marcado como pago',
  order_partial_paid_manual: 'Pago parcialmente', order_updated: 'Pedido atualizado',
  test_mapping: 'Teste de evento',
}

// ── Mock data (fallback se Supabase não configurado) ───────

const MOCK_ORDERS = [
  {
    id: 'm1', external_id: 'ven_8832', customer_name: 'Maria Silva', customer_email: 'maria@email.com',
    customer_phone: '11999999999', customer_doc: '12345678900',
    customer_address: { zip_code: '01001000', street: 'Rua Exemplo', number: '123', district: 'Centro', city: 'São Paulo', state: 'SP', complement: 'Apto 10' },
    product_name: 'Kit Produto Exemplo', product_sku: 'SKU6-LV0m', product_quantity: 2,
    status: 'delivered', payment_status: 'Aguardando Pagamento', payment_method: 'After Pay',
    total_price: 69900, tracking_code: 'AD322479048BR', carrier: '123Log',
    seller_name: 'João Vendedor', platform: 'Asaas',
    started_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
  },
  {
    id: 'm2', external_id: 'ven_9100', customer_name: 'Carlos Andrade', customer_email: 'carlos@email.com',
    customer_phone: '21988887777', customer_doc: '98765432100',
    customer_address: { street: 'Av. Brasil', number: '500', city: 'Rio de Janeiro', state: 'RJ' },
    product_name: 'Suplemento Premium X', product_sku: 'SUP-001', product_quantity: 1,
    status: 'in_transit', payment_status: 'Pago', payment_method: 'Pix',
    total_price: 18990, tracking_code: 'BR987654321', carrier: 'Correios',
    seller_name: 'Ana Lima', platform: 'Asaas',
    started_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
  },
  {
    id: 'm3', external_id: 'ven_9203', customer_name: 'Fernanda Costa', customer_email: 'fer@email.com',
    customer_phone: '31977776666', customer_doc: '11122233344',
    customer_address: { street: 'Rua das Flores', number: '88', city: 'Belo Horizonte', state: 'MG' },
    product_name: 'Curso Online Avançado', product_sku: 'CURSO-ADV', product_quantity: 1,
    status: 'processing', payment_status: 'Aguardando Pagamento', payment_method: 'Boleto',
    total_price: 29700, tracking_code: null, carrier: null,
    seller_name: 'Bruno Sales', platform: 'Asaas',
    started_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'm4', external_id: 'ven_9310', customer_name: 'Rafael Moura', customer_email: 'rafa@email.com',
    customer_phone: '41966665555', customer_doc: '55566677788',
    customer_address: { street: 'Rua XV de Novembro', number: '200', city: 'Curitiba', state: 'PR' },
    product_name: 'Kit Beleza Completo', product_sku: 'KIT-BLZ', product_quantity: 3,
    status: 'out_for_delivery', payment_status: 'Pago', payment_method: 'Cartão de Crédito',
    total_price: 45000, tracking_code: 'JD555444333BR', carrier: 'JadLog',
    seller_name: 'Carla Ramos', platform: 'Asaas',
    started_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
  },
  {
    id: 'm5', external_id: 'ven_9401', customer_name: 'Juliana Neves', customer_email: 'ju@email.com',
    customer_phone: '51955554444', customer_doc: '33344455566',
    customer_address: { street: 'Av. Ipiranga', number: '1000', city: 'Porto Alegre', state: 'RS' },
    product_name: 'Produto Fitness Pro', product_sku: 'FIT-PRO', product_quantity: 2,
    status: 'returned', payment_status: 'Estornado', payment_method: 'Pix',
    total_price: 15800, tracking_code: 'TE111222333BR', carrier: 'Total Express',
    seller_name: 'Diego Matos', platform: 'Asaas',
    started_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
  },
  {
    id: 'm6', external_id: 'ven_9512', customer_name: 'Thiago Barbosa', customer_email: 'thiago@email.com',
    customer_phone: '61944443333', customer_doc: '77788899900',
    customer_address: { street: 'SQN 304', number: 'Bloco A', city: 'Brasília', state: 'DF' },
    product_name: 'Assinatura Mensal VIP', product_sku: 'VIP-MES', product_quantity: 1,
    status: 'delivered', payment_status: 'Pago', payment_method: 'Pix',
    total_price: 9700, tracking_code: 'BR222333444BR', carrier: 'Correios',
    seller_name: 'João Vendedor', platform: 'Asaas',
    started_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
  },
]

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

// ── Order Card ─────────────────────────────────────────────

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
      {/* Header */}
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

      {/* Delivery timeline */}
      {showTimeline && (
        <div className="flex items-center gap-1 mb-3">
          {DELIVERY_TIMELINE.map((step, i) => {
            const done = i <= curStep
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={done
                    ? { background: '#a78bfa' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
                  }>
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

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.04)', color: pay.color }}>
            {pay.label}
          </span>
          <span className="text-[10px] truncate" style={{ color: payStatusColor }}>
            {order.payment_status || '—'}
          </span>
        </div>
        <p className="text-sm font-bold text-white tabular-nums shrink-0">
          {formatCurrency((order.total_price || 0) / 100)}
        </p>
      </div>

      {/* Tracking */}
      {order.tracking_code && (
        <div className="mt-2 flex items-center gap-1.5 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <Truck size={10} className="text-faint shrink-0" />
          <p className="text-[10px] font-mono truncate" style={{ color: '#444' }}>
            {order.tracking_code}
          </p>
          {order.carrier && <span className="text-[10px] text-faint shrink-0">· {order.carrier}</span>}
        </div>
      )}
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

        {/* Status bar */}
        <div className="flex items-center justify-between p-3 rounded-lg"
          style={{ background: status.bg, border: `1px solid ${status.border}` }}>
          <div className="flex items-center gap-2">
            <StatusIcon size={14} style={{ color: status.color }} />
            <p className="text-sm font-semibold" style={{ color: status.color }}>{status.label}</p>
          </div>
          <p className="text-sm font-bold text-white">{formatCurrency((order.total_price || 0) / 100)}</p>
        </div>

        {/* Pagamento */}
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
              <p className="text-sm font-medium" style={{ color: payStatusColor }}>
                {order.payment_status || '—'}
              </p>
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

        {/* Produto */}
        <div className="p-3 rounded-lg space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] text-faint uppercase tracking-wider">Produto</p>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-white">{order.product_name || '—'}</p>
              {order.product_sku && (
                <p className="text-[10px] font-mono mt-0.5" style={{ color: '#444' }}>SKU: {order.product_sku}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-faint">Qtd</p>
              <p className="text-sm font-bold text-white">{order.product_quantity || 1}</p>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div className="p-3 rounded-lg space-y-2.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px] text-faint uppercase tracking-wider">Cliente</p>
          <div className="space-y-1.5">
            {order.customer_name && (
              <div className="flex items-center gap-2">
                <User size={11} className="text-faint shrink-0" />
                <p className="text-xs text-text">{order.customer_name}</p>
              </div>
            )}
            {order.customer_email && (
              <div className="flex items-center gap-2">
                <Mail size={11} className="text-faint shrink-0" />
                <p className="text-xs text-text">{order.customer_email}</p>
              </div>
            )}
            {order.customer_phone && (
              <div className="flex items-center gap-2">
                <Phone size={11} className="text-faint shrink-0" />
                <p className="text-xs text-text">{order.customer_phone}</p>
              </div>
            )}
            {order.customer_doc && (
              <div className="flex items-center gap-2">
                <Hash size={11} className="text-faint shrink-0" />
                <p className="text-xs text-text">{order.customer_doc}</p>
              </div>
            )}
            {addr.street && (
              <div className="flex items-start gap-2">
                <MapPin size={11} className="text-faint shrink-0 mt-0.5" />
                <p className="text-xs text-text">
                  {addr.street}, {addr.number}
                  {addr.complement ? `, ${addr.complement}` : ''}
                  {addr.district ? ` — ${addr.district}` : ''}
                  {addr.city ? ` · ${addr.city}/${addr.state}` : ''}
                  {addr.zip_code ? ` · CEP ${addr.zip_code}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rastreio */}
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
                  <ExternalLink size={11} />
                  Rastrear
                </a>
              )}
            </div>
          </div>
        )}

        {/* Meta */}
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
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPay, setFilterPay] = useState('all')
  const [selected, setSelected] = useState(null)

  const { data: rawOrders, isLoading, refetch, isFetching } = useSkaleOrders(100)
  const { data: stats } = useSkaleStats()

  // Use mock if no real data
  const orders = (rawOrders && rawOrders.length > 0) ? rawOrders : MOCK_ORDERS
  const isMock = !rawOrders || rawOrders.length === 0

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
          (o.tracking_code || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [orders, filterStatus, filterPay, search])

  // Stats from real data or mock
  const statsPaid   = orders.filter(o => ['Pago', 'Confirmado'].includes(o.payment_status)).length
  const statsPend   = orders.filter(o => ['Aguardando Pagamento', 'Pendente'].includes(o.payment_status)).length
  const statsRev    = orders.filter(o => ['Pago', 'Confirmado'].includes(o.payment_status)).reduce((s, o) => s + (o.total_price || 0), 0)
  const statsDelivered = orders.filter(o => o.status === 'delivered').length

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
          {isMock && (
            <span className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555' }}>
              dados de exemplo
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
          { label: 'Total de pedidos', value: orders.length, icon: ShoppingCart, color: '#a78bfa', suffix: '' },
          { label: 'Receita confirmada', value: formatCurrency(statsRev / 100), icon: DollarSign, color: '#22c55e', isText: true },
          { label: 'Pagos', value: statsPaid, icon: CheckCircle, color: '#22c55e', suffix: '' },
          { label: 'Aguardando pgto', value: statsPend, icon: Clock, color: '#f59e0b', suffix: '' },
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
                : <p className="text-2xl font-bold text-white tabular-nums"><AnimatedNumber value={s.value} /></p>
              }
            </motion.div>
          )
        })}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center gap-3 flex-wrap"
      >
        {/* Search */}
        <div className="flex-1 min-w-48">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por cliente, pedido, produto ou rastreio…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-transparent text-text outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[{ k: 'all', label: 'Todos' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ k, label: v.label }))].map(({ k, label }) => (
            <button key={k}
              onClick={() => setFilterStatus(k)}
              className="px-2.5 py-1 rounded text-[11px] font-medium transition-all"
              style={filterStatus === k
                ? { background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }
                : { color: '#555' }
              }>
              {label}
            </button>
          ))}
        </div>

        {/* Payment filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[{ k: 'all', label: 'Pgto', color: '#555' }, ...Object.entries(PAY_CFG).map(([k, v]) => ({ k, label: v.label, color: v.color }))].map(({ k, label, color }) => (
            <button key={k}
              onClick={() => setFilterPay(k)}
              className="px-2.5 py-1 rounded text-[11px] font-medium transition-all"
              style={filterPay === k
                ? { background: 'rgba(255,255,255,0.08)', color: color || '#fff', border: '1px solid rgba(255,255,255,0.12)' }
                : { color: '#555' }
              }>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Orders grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl p-4 animate-pulse h-36"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <AlertCircle size={18} className="text-faint" />
            </div>
            <p className="text-sm text-text-secondary">Nenhum pedido encontrado</p>
            <p className="text-xs text-faint">Ajuste os filtros ou aguarde novos webhooks da Skale</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {filtered.map((order, i) => (
                <OrderCard
                  key={order.id || order.external_id}
                  order={order}
                  onClick={setSelected}
                  delay={i * 0.04}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-center text-[11px] text-faint mt-4">
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} · atualiza a cada 15s
          </p>
        )}
      </motion.div>

      {/* Detail modal */}
      <OrderModal order={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
