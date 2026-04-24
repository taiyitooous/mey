import { useQuery } from '@tanstack/react-query'
import { api3c } from '../lib/api3c'

// Converts ANY value (object, number, null, array) to a plain string safely
function toStr(v) {
  if (v == null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'boolean') return ''
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.map(toStr).join(', ')
  if (typeof v === 'object') {
    // Try common string-like fields that 3C nests in objects
    const s = v.name || v.extension_number || v.label || v.value || v.title || v.text || v.description
    if (s != null && typeof s !== 'object') return String(s)
    if (v.id != null) return String(v.id)
    return ''
  }
  return String(v)
}

// Map any 3C status string to our 4 internal states
function mapStatus(raw) {
  const s = toStr(raw).toLowerCase().trim()
  if (!s || s === 'offline' || s === 'logged_out' || s === 'deslogado') return 'offline'
  if (s.includes('call') || s === 'oncall' || s === 'em_ligacao') return 'in_call'
  if (s.includes('pause') || s.includes('pausa') || s.includes('break') || s === 'em_pausa') return 'paused'
  return 'online' // ready, available, logged_in, logado, etc.
}

function normalizeAgents(data) {
  // Log raw response to help diagnose API shape
  if (import.meta.env.DEV) {
    console.log('[3C /agents raw]', JSON.stringify(data)?.slice(0, 800))
  }

  let items = []
  if (Array.isArray(data)) {
    items = data
  } else if (data && typeof data === 'object') {
    items = data.data || data.agents || data.items || data.result || Object.values(data)[0] || []
    if (!Array.isArray(items)) items = []
  }

  return items.map(a => {
    if (!a || typeof a !== 'object') return null
    return {
      id: String(a.id || a.agent_id || a.user_id || Math.random()),
      name: toStr(a.name || a.agent_name || a.username || a.full_name || a.nome) || 'Agente',
      status: mapStatus(a.status || a.current_status || a.agent_status || a.situacao || ''),
      campaign: toStr(a.campaign || a.campaign_name || a.queue || a.fila || a.queue_name || ''),
      extension: toStr(a.extension || a.ramal || a.extension_number || ''),
      loginAt: toStr(a.login_at || a.logged_at || a.logado_em || '') || null,
      pauseReason: toStr(a.pause_reason || a.break_reason || a.motivo_pausa || a.reason || '') || null,
    }
  }).filter(Boolean)
}

function normalizeCampaigns(data) {
  let items = []
  if (Array.isArray(data)) {
    items = data
  } else if (data && typeof data === 'object') {
    items = data.data || data.campaigns || data.items || []
    if (!Array.isArray(items)) items = []
  }
  return items.map(c => ({
    id: String(c.id || ''),
    name: toStr(c.name || c.campaign_name) || 'Campanha',
    type: toStr(c.type || c.campaign_type) || 'preview',
    active: Boolean(c.active ?? c.is_active ?? true),
    agentCount: Number(c.agent_count || c.agents_count || 0),
  }))
}

function normalizeCallHistory(data) {
  if (import.meta.env.DEV && data) {
    console.log('[3C /call-history raw]', JSON.stringify(data)?.slice(0, 800))
  }

  let items = []
  if (Array.isArray(data)) {
    items = data
  } else if (data && typeof data === 'object') {
    items = data.data || data.calls || data.call_history || data.items || data.result || []
    if (!Array.isArray(items)) items = []
  }

  return items.map(c => ({
    id: String(c.id || c.call_id || Math.random()),
    agent: toStr(c.agent_name || c.agent || c.username || c.operador || c.nome_agente || ''),
    phone: toStr(c.phone || c.to || c.destination || c.called_number || c.numero || c.fone || ''),
    duration: Number(c.duration || c.speaking_time || c.talk_time || c.tempo_fala || 0),
    result: toStr(c.result || c.disposition || c.call_result || c.resultado || c.status || ''),
    startedAt: toStr(c.started_at || c.call_date || c.created_at || c.data_inicio || '') || null,
    campaign: toStr(c.campaign || c.campaign_name || c.campanha || ''),
    callId: toStr(c.call_id || c.id || ''),
  }))
}

export function useAgents() {
  return useQuery({
    queryKey: ['3c', 'agents'],
    queryFn: () => api3c.agents({ per_page: 100 }),
    refetchInterval: 10_000,
    retry: 2,
    retryDelay: 3000,
    select: normalizeAgents,
  })
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['3c', 'campaigns'],
    queryFn: () => api3c.campaigns(),
    staleTime: 60_000,
    retry: 2,
    select: normalizeCampaigns,
  })
}

export function useCallHistory(dateStr) {
  return useQuery({
    queryKey: ['3c', 'call-history', dateStr],
    queryFn: () => api3c.callHistory({ date: dateStr, per_page: 1000 }),
    staleTime: 30_000,
    retry: 2,
    select: normalizeCallHistory,
    enabled: !!dateStr,
  })
}

export function use3cStatus() {
  return useQuery({
    queryKey: ['3c', 'status'],
    queryFn: () => api3c.ping(),
    retry: 1,
    staleTime: 30_000,
    select: (data) => {
      // Connected if we got any response with data
      return !!(data && (Array.isArray(data) ? data.length >= 0 : true))
    },
  })
}
