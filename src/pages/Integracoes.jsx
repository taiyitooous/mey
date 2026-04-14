import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Phone, MessageSquare, Database, Truck, Check, Copy, AlertCircle } from 'lucide-react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://mey.app'

const INTEGRATIONS = [
  {
    id: '3c', name: '3C Plus', description: 'Histórico de chamadas e agentes de voz', icon: Phone,
    webhook: `${BASE_URL}/api/webhooks/3c`,
    fields: [
      { key: 'agents', label: 'Agentes ativos', placeholder: 'ana,bruno,carla', type: 'text' },
      { key: 'secret', label: 'Webhook secret', placeholder: 'whs_...', type: 'password' },
    ],
    events: ['call_answered', 'call_dialed', 'agent_login'],
    color: '#ffffff',
  },
  {
    id: 'wavoip', name: 'Wavoip', description: 'Chamadas e mensagens WhatsApp', icon: MessageSquare,
    webhook: `${BASE_URL}/api/webhooks/wavoip`,
    fields: [
      { key: 'token', label: 'Token API', placeholder: 'wv_...', type: 'password' },
      { key: 'instance', label: 'Instância', placeholder: 'meu-numero', type: 'text' },
    ],
    events: ['whatsapp_call_received', 'message_received'],
    color: '#22c55e',
  },
  {
    id: 'datacrazy', name: 'DataCrazy', description: 'Leads e pedidos', icon: Database,
    webhook: `${BASE_URL}/api/webhooks/datacrazy`,
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'dc_...', type: 'password' },
      { key: 'campaign', label: 'ID da campanha', placeholder: '12345', type: 'text' },
    ],
    events: ['lead.created', 'lead.updated', 'order.created'],
    color: '#60a5fa',
  },
  {
    id: 'five', name: 'Five Delivery', description: 'Rastreamento logístico (via DataCrazy)', icon: Truck,
    webhook: null,
    fields: [{ key: 'token', label: 'Token Five Delivery', placeholder: 'fd_...', type: 'password' }],
    events: ['order.status_changed', 'order.delivered'],
    color: '#f59e0b',
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      className="text-faint hover:text-white transition-colors p-1.5 rounded hover:bg-white/10">
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  )
}

function IntegrationCard({ integration, delay }) {
  const [values, setValues] = useState({})
  const [active, setActive] = useState(false)
  const [saved, setSaved] = useState(false)
  const Icon = integration.icon

  const handleSave = () => {
    setActive(true); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-xl overflow-hidden hover-glow"
      style={{ background: 'rgba(14,14,14,0.9)', border: `1px solid ${active ? `${integration.color}25` : 'rgba(255,255,255,0.07)'}` }}
    >
      {/* Top bar */}
      {active && (
        <div className="h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${integration.color}, transparent)` }} />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${integration.color}10`, border: `1px solid ${integration.color}20` }}>
          <Icon size={16} style={{ color: integration.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{integration.name}</p>
            {active && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                Ativo
              </span>
            )}
          </div>
          <p className="text-xs text-faint mt-0.5">{integration.description}</p>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-success' : ''}`}
          style={!active ? { background: 'rgba(255,255,255,0.1)' } : {}} />
      </div>

      <div className="p-5 space-y-4">
        {/* Webhook */}
        {integration.webhook ? (
          <div>
            <p className="text-xs text-faint uppercase tracking-wider mb-2">URL do Webhook</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-mono flex-1 truncate" style={{ color: '#666' }}>
                {integration.webhook}
              </p>
              <CopyBtn text={integration.webhook} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <AlertCircle size={12} className="text-faint" />
            <p className="text-xs text-faint">Integrado automaticamente via DataCrazy</p>
          </div>
        )}

        {/* Fields */}
        <div className="space-y-3">
          {integration.fields.map(field => (
            <div key={field.key}>
              <p className="text-xs text-faint mb-1.5">{field.label}</p>
              <Input type={field.type} placeholder={field.placeholder}
                value={values[field.key] || ''}
                onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))} />
            </div>
          ))}
        </div>

        {/* Events */}
        <div>
          <p className="text-xs text-faint uppercase tracking-wider mb-2">Eventos</p>
          <div className="flex flex-wrap gap-1.5">
            {integration.events.map(e => (
              <span key={e} className="px-2 py-1 rounded-lg text-xs font-mono"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555' }}>
                {e}
              </span>
            ))}
          </div>
        </div>

        <button onClick={handleSave}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={saved
            ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }
            : { background: 'white', color: 'black' }}>
          {saved ? <><Check size={14} /> Salvo</> : 'Salvar configuração'}
        </button>
      </div>
    </motion.div>
  )
}

export default function Integracoes() {
  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Integrações</h1>
        <p className="text-sm text-faint mt-0.5">Conecte as ferramentas externas ao MEY</p>
      </motion.div>

      {/* Flow diagram */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl p-5 hover-glow"
        style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-white" />
          <p className="text-xs text-faint uppercase tracking-wider">Fluxo de dados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {['Webhook externo', 'Deno Function', 'Event (BD)', 'WebSocket', 'Re-render'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}>
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-faint">→</span>}
            </div>
          ))}
        </div>
      </motion.div>

      {/* SQL Schema */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="rounded-xl overflow-hidden hover-glow"
        style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs text-faint uppercase tracking-wider">Schema SQL — Supabase</p>
        </div>
        <pre className="px-5 py-4 text-xs font-mono overflow-x-auto leading-relaxed"
          style={{ color: '#555' }}>
{`create table events (
  id uuid primary key default gen_random_uuid(),
  entity_type text, entity_id text,
  event_type text not null,
  user_name text, user_email text,
  source text, payload jsonb,
  created_at timestamptz default now()
);
create table leads (id uuid primary key default gen_random_uuid(),
  name text, phone text, stage int default 1,
  seller_key text, source text, value numeric default 0, tags text[],
  created_at timestamptz default now()
);
-- + orders, collections, tasks, seller_configs

alter publication supabase_realtime add table events;`}
        </pre>
      </motion.div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {INTEGRATIONS.map((integration, i) => (
          <IntegrationCard key={integration.id} integration={integration} delay={0.2 + i * 0.08} />
        ))}
      </div>
    </div>
  )
}
