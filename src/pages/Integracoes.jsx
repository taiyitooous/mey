import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Phone, MessageSquare, Database, Truck,
  Check, Copy, AlertCircle, Wifi, WifiOff,
  RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  Activity, Users, Radio,
} from 'lucide-react'
import { Input } from '../components/ui/Input'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { use3cStatus, useAgents, useCampaigns } from '../hooks/use3c'
import { api3c } from '../lib/api3c'

const WEBHOOK_BASE = typeof window !== 'undefined' ? window.location.origin : 'https://mey.app'

const INTEGRATIONS = [
  {
    id: '3c', name: '3C Plus', description: 'Histórico de chamadas e agentes de voz',
    icon: Phone, webhook: `${WEBHOOK_BASE}/api/webhooks/3c`,
    docsUrl: 'https://alo.3cplusnow.com/help',
    events: ['call_answered', 'call-history-was-created', 'call-was-connected', 'agent_login'],
    color: '#ffffff',
    fields: [
      { key: 'token', label: 'API Token', placeholder: 'R02FvFe...', type: 'password', value: import.meta.env.VITE_3C_TOKEN || '' },
      { key: 'agents', label: 'Agentes ativos (nomes separados por vírgula)', placeholder: 'ana,bruno,carla', type: 'text' },
    ],
    sqls: `-- Evento de chamada via webhook 3C:\nPOST ${WEBHOOK_BASE}/api/webhooks/3c\n{ "event": "call-history-was-created", "call_id": "...", "agent_name": "...", "speaking_time": 142 }`,
  },
  {
    id: 'wavoip', name: 'Wavoip', description: 'Chamadas e mensagens WhatsApp',
    icon: MessageSquare, webhook: `${WEBHOOK_BASE}/api/webhooks/wavoip`,
    docsUrl: 'https://github.com/wavoip',
    events: ['whatsapp_call_received', 'message_received', 'call_ended'],
    color: '#22c55e',
    fields: [
      { key: 'token', label: 'Token API', placeholder: 'wv_...', type: 'password' },
      { key: 'instance', label: 'Instância', placeholder: 'meu-numero', type: 'text' },
    ],
    sqls: null,
  },
  {
    id: 'datacrazy', name: 'DataCrazy', description: 'Leads e pedidos',
    icon: Database, webhook: `${WEBHOOK_BASE}/api/webhooks/datacrazy`,
    docsUrl: null,
    events: ['lead.created', 'lead.updated', 'order.created'],
    color: '#60a5fa',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'dc_...', type: 'password' },
      { key: 'campaign', label: 'ID da campanha', placeholder: '12345', type: 'text' },
    ],
    sqls: null,
  },
  {
    id: 'five', name: 'Five Delivery', description: 'Rastreamento logístico (via DataCrazy)',
    icon: Truck, webhook: null,
    docsUrl: null,
    events: ['order.status_changed', 'order.delivered'],
    color: '#f59e0b',
    fields: [{ key: 'token', label: 'Token Five Delivery', placeholder: 'fd_...', type: 'password' }],
    sqls: null,
  },
]

function CopyBtn({ text, small }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="shrink-0 transition-all rounded p-1 hover:bg-white/10"
      title="Copiar"
    >
      {copied
        ? <Check size={small ? 10 : 12} className="text-success" />
        : <Copy size={small ? 10 : 12} className="text-faint hover:text-text-secondary" />
      }
    </button>
  )
}

// ── 3C Live panel ──────────────────────────────────────────
function ThreeCLivePanel() {
  const { data: connected, isLoading, isError, refetch, isFetching } = use3cStatus()
  const { data: agents } = useAgents()
  const { data: campaigns } = useCampaigns()
  const [expanded, setExpanded] = useState(true)

  const online = agents?.filter(a => ['online', 'in_call'].includes(a.status)).length || 0
  const total = agents?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-xl overflow-hidden hover-glow"
      style={{
        background: 'rgba(12,12,12,0.92)',
        border: `1px solid ${connected ? 'rgba(34,197,94,0.2)' : isError ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {connected && (
        <div className="h-[1.5px]"
          style={{ background: 'linear-gradient(90deg, transparent, #22c55e, transparent)' }} />
      )}

      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Phone size={15} className="text-text-secondary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">3C Plus</p>
                {isLoading || isFetching ? (
                  <span className="text-[10px] text-faint animate-pulse">verificando…</span>
                ) : connected ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                    Conectado
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555' }}>
                    Offline / CORS
                  </span>
                )}
              </div>
              <p className="text-xs text-faint mt-0.5">app.3c.plus/api/v1</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              title="Reconectar">
              <RefreshCw size={13} className={`text-faint ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-white/10">
              {expanded ? <ChevronUp size={13} className="text-faint" /> : <ChevronDown size={13} className="text-faint" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-5 space-y-4">
              {/* Token */}
              <div>
                <p className="text-[10px] text-faint uppercase tracking-wider mb-2">API Token (configurado)</p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg font-geist"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs flex-1 truncate" style={{ color: '#444' }}>
                    {import.meta.env.VITE_3C_TOKEN?.slice(0, 20)}…
                  </p>
                  <CopyBtn text={import.meta.env.VITE_3C_TOKEN || ''} />
                </div>
              </div>

              {/* Stats */}
              {connected && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg p-3 text-center"
                    style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
                    <p className="text-xl font-bold text-white tabular-nums">
                      <AnimatedNumber value={online} />
                    </p>
                    <p className="text-[10px] text-faint mt-0.5">Online</p>
                  </div>
                  <div className="rounded-lg p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xl font-bold text-white tabular-nums">
                      <AnimatedNumber value={total} />
                    </p>
                    <p className="text-[10px] text-faint mt-0.5">Agentes</p>
                  </div>
                  <div className="rounded-lg p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xl font-bold text-white tabular-nums">
                      <AnimatedNumber value={campaigns?.length || 0} />
                    </p>
                    <p className="text-[10px] text-faint mt-0.5">Campanhas</p>
                  </div>
                </div>
              )}

              {/* Agents list */}
              {connected && agents && agents.length > 0 && (
                <div>
                  <p className="text-[10px] text-faint uppercase tracking-wider mb-2">Agentes ao vivo</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {agents.map(a => (
                      <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          a.status === 'online' || a.status === 'in_call' ? 'bg-success' :
                          a.status === 'paused' ? 'bg-warning' : 'bg-subtle'
                        }`} style={a.status === 'online' || a.status === 'in_call' ? { boxShadow: '0 0 6px rgba(34,197,94,0.6)' } : {}} />
                        <p className="text-xs text-text flex-1">{a.name}</p>
                        {a.campaign && <span className="text-[10px] text-faint">{a.campaign}</span>}
                        <span className="text-[10px]" style={{
                          color: a.status === 'in_call' ? '#fff' :
                                 a.status === 'online' ? '#22c55e' :
                                 a.status === 'paused' ? '#f59e0b' : '#333'
                        }}>
                          {a.status === 'in_call' ? 'Em ligação' : a.status === 'online' ? 'Online' : a.status === 'paused' ? 'Pausa' : 'Offline'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Offline notice */}
              {isError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <AlertCircle size={13} className="text-faint shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-text-secondary">Conexão direta bloqueada por CORS.</p>
                    <p className="text-[10px] text-faint mt-1">Em produção, configure um proxy backend para <span className="font-mono">app.3c.plus/api/v1</span>. Em dev, o proxy Vite está ativo em <span className="font-mono">/proxy-3c</span>.</p>
                  </div>
                </div>
              )}

              {/* Webhook events */}
              <div>
                <p className="text-[10px] text-faint uppercase tracking-wider mb-2">Eventos recebidos via Webhook</p>
                <div className="flex flex-wrap gap-1.5">
                  {['call-history-was-created', 'call-was-connected', 'agent_login', 'agent_logout'].map(e => (
                    <span key={e} className="px-2 py-1 rounded-lg text-[10px] font-mono"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555' }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Generic integration card ───────────────────────────────
function IntegrationCard({ integration, delay }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(integration.fields.map(f => [f.key, f.value || '']))
  )
  const [active, setActive] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const Icon = integration.icon

  const handleSave = () => {
    setActive(true); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
      className="rounded-xl overflow-hidden hover-glow"
      style={{
        background: 'rgba(12,12,12,0.92)',
        border: `1px solid ${active ? `${integration.color}20` : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {active && (
        <div className="h-[1.5px]"
          style={{ background: `linear-gradient(90deg, transparent, ${integration.color}, transparent)` }} />
      )}

      <div className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${integration.color}0e`, border: `1px solid ${integration.color}1a` }}>
          <Icon size={15} style={{ color: integration.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{integration.name}</p>
            {active && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                Ativo
              </span>
            )}
          </div>
          <p className="text-xs text-faint mt-0.5">{integration.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-2 h-2 rounded-full ${active ? 'bg-success' : ''}`}
            style={active
              ? { boxShadow: '0 0 6px rgba(34,197,94,0.6)' }
              : { background: 'rgba(255,255,255,0.08)' }} />
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-white/10">
            {expanded ? <ChevronUp size={13} className="text-faint" /> : <ChevronDown size={13} className="text-faint" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-5 space-y-4">
              {/* Webhook URL */}
              {integration.webhook ? (
                <div>
                  <p className="text-[10px] text-faint uppercase tracking-wider mb-2">URL do Webhook</p>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg font-geist"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs flex-1 truncate" style={{ color: '#555' }}>{integration.webhook}</p>
                    <CopyBtn text={integration.webhook} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <AlertCircle size={11} className="text-faint" />
                  <p className="text-xs text-faint">Integrado automaticamente via DataCrazy</p>
                </div>
              )}

              {/* Fields */}
              <div className="space-y-3">
                {integration.fields.map(field => (
                  <div key={field.key}>
                    <p className="text-[10px] text-faint uppercase tracking-wider mb-1.5">{field.label}</p>
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={values[field.key] || ''}
                      onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {/* Events */}
              <div>
                <p className="text-[10px] text-faint uppercase tracking-wider mb-2">Eventos</p>
                <div className="flex flex-wrap gap-1.5">
                  {integration.events.map(e => (
                    <span key={e} className="px-2 py-1 rounded-lg text-[10px] font-mono"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555' }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>

              {integration.docsUrl && (
                <a href={integration.docsUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-faint hover:text-text-secondary transition-colors">
                  <ExternalLink size={11} />
                  Documentação oficial
                </a>
              )}

              <button
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={saved
                  ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }
                  : { background: 'white', color: 'black' }
                }
              >
                {saved ? <><Check size={13} /> Salvo</> : 'Salvar configuração'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function Integracoes() {
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      >
        <h1 className="text-2xl font-bold text-white tracking-tight">Integrações</h1>
        <p className="text-xs text-faint mt-0.5">Conecte as ferramentas externas ao MEY</p>
      </motion.div>

      {/* Data flow */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-xl p-5 hover-glow"
        style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap size={13} className="text-white" />
          <p className="text-[10px] text-faint uppercase tracking-wider">Fluxo de dados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs overflow-x-auto scroll-x">
          {['Webhook 3C/Wavoip', 'Vite Proxy /proxy-3c', 'React Query', 'WebSocket (Supabase)', 'Re-render'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1.5 rounded-lg font-medium whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#888' }}>
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-faint">→</span>}
            </div>
          ))}
        </div>
      </motion.div>

      {/* 3C Live panel */}
      <ThreeCLivePanel />

      {/* Schema */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-xl overflow-hidden hover-glow"
        style={{ background: 'rgba(12,12,12,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-faint uppercase tracking-wider">Schema SQL — Supabase</p>
          <CopyBtn text={`create table events (
  id uuid primary key default gen_random_uuid(),
  entity_type text, entity_id text,
  event_type text not null,
  user_name text, user_email text,
  source text, payload jsonb,
  created_at timestamptz default now()
);
alter publication supabase_realtime add table events;`} />
        </div>
        <pre className="px-5 py-4 text-xs overflow-x-auto leading-relaxed font-geist"
          style={{ color: '#444' }}>
{`create table events (
  id uuid primary key default gen_random_uuid(),
  entity_type text,        -- lead | order | payment | collection
  entity_id text,          -- ID do objeto
  event_type text not null,-- call_answered | lead.won | ...
  user_name text,          -- vendedor
  source text,             -- 3c | wavoip | datacrazy | mey
  payload jsonb,           -- speaking_time, result, value...
  created_at timestamptz default now()
);

create table leads (id uuid primary key default gen_random_uuid(),
  name text, phone text, stage int default 1,
  seller_key text, source text, value numeric default 0,
  created_at timestamptz default now()
);

-- Realtime
alter publication supabase_realtime add table events;`}
        </pre>
      </motion.div>

      {/* Other integrations */}
      <div className="space-y-3">
        {INTEGRATIONS.filter(i => i.id !== '3c').map((integration, i) => (
          <IntegrationCard key={integration.id} integration={integration} delay={0.28 + i * 0.07} />
        ))}
      </div>
    </div>
  )
}
