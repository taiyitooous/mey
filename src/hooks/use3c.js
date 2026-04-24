import { useQuery } from '@tanstack/react-query'
import { api3c } from '../lib/api3c'

function normalizeAgents(data) {
  const items = Array.isArray(data) ? data : (data?.data || data?.agents || [])
  return items.map(a => ({
    id: String(a.id || a.agent_id || Math.random()),
    name: a.name || a.agent_name || a.username || 'Agente',
    status: a.status || a.current_status || 'offline',
    campaign: a.campaign || a.campaign_name || a.queue || '',
    extension: a.extension || a.ramal || '',
    loginAt: a.login_at || a.logged_at || null,
    pauseReason: a.pause_reason || a.break_reason || null,
  }))
}

function normalizeCampaigns(data) {
  const items = Array.isArray(data) ? data : (data?.data || data?.campaigns || [])
  return items.map(c => ({
    id: c.id,
    name: c.name || c.campaign_name,
    type: c.type || c.campaign_type || 'preview',
    active: c.active ?? c.is_active ?? true,
    agentCount: c.agent_count || c.agents_count || 0,
  }))
}

function normalizeCallHistory(data) {
  const items = Array.isArray(data) ? data : (data?.data || data?.calls || data?.call_history || [])
  return items.map(c => ({
    id: String(c.id || c.call_id || Math.random()),
    agent: c.agent_name || c.agent || c.username || '',
    phone: c.phone || c.to || c.destination || c.called_number || '',
    duration: Number(c.duration || c.speaking_time || c.talk_time || 0),
    result: c.result || c.disposition || c.status || c.call_result || '',
    startedAt: c.started_at || c.call_date || c.created_at || null,
    campaign: c.campaign || c.campaign_name || '',
    callId: c.call_id || c.id || '',
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
