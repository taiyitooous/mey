import { useQuery } from '@tanstack/react-query'
import { api3c } from '../lib/api3c'

// Safely converts any API value to a plain string
function toStr(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    return v.name || v.extension_number || v.label || v.value || String(v.id || '')
  }
  return String(v)
}

// Map 3C status strings to our internal keys
function mapStatus(raw) {
  const s = toStr(raw).toLowerCase()
  if (s.includes('call') || s === 'oncall' || s === 'in_call') return 'in_call'
  if (s === 'online' || s === 'ready' || s === 'available' || s === 'logged_in' || s === 'logado') return 'online'
  if (s.includes('pause') || s.includes('pausa') || s === 'break') return 'paused'
  if (s === 'offline' || s === 'logged_out' || s === '' || s === 'deslogado') return 'offline'
  // fallback: if non-empty treat as online, otherwise offline
  return s ? 'online' : 'offline'
}

function normalizeAgents(data) {
  const items = Array.isArray(data) ? data
    : (data?.data || data?.agents || data?.items || [])
  return items.map(a => ({
    id: String(a.id || a.agent_id || Math.random()),
    name: toStr(a.name || a.agent_name || a.username) || 'Agente',
    status: mapStatus(a.status || a.current_status || a.agent_status || ''),
    campaign: toStr(a.campaign || a.campaign_name || a.queue || a.fila || ''),
    extension: toStr(a.extension || a.ramal || a.extension_number || ''),
    loginAt: a.login_at || a.logged_at || null,
    pauseReason: toStr(a.pause_reason || a.break_reason || a.motivo_pausa || '') || null,
  }))
}

function normalizeCampaigns(data) {
  const items = Array.isArray(data) ? data
    : (data?.data || data?.campaigns || data?.items || [])
  return items.map(c => ({
    id: String(c.id || ''),
    name: toStr(c.name || c.campaign_name) || 'Campanha',
    type: toStr(c.type || c.campaign_type) || 'preview',
    active: c.active ?? c.is_active ?? true,
    agentCount: Number(c.agent_count || c.agents_count || 0),
  }))
}

function normalizeCallHistory(data) {
  const items = Array.isArray(data) ? data
    : (data?.data || data?.calls || data?.call_history || data?.items || [])
  return items.map(c => ({
    id: String(c.id || c.call_id || Math.random()),
    agent: toStr(c.agent_name || c.agent || c.username || c.operador || ''),
    phone: toStr(c.phone || c.to || c.destination || c.called_number || c.numero || ''),
    duration: Number(c.duration || c.speaking_time || c.talk_time || c.tempo_fala || 0),
    result: toStr(c.result || c.disposition || c.status || c.call_result || c.resultado || ''),
    startedAt: c.started_at || c.call_date || c.created_at || c.data_inicio || null,
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
    select: () => true,
  })
}
