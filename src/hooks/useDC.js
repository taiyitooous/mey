import { useQuery } from '@tanstack/react-query'

async function fetchJSON(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`DC proxy ${res.status}: ${path}`)
  return res.json()
}

// Normaliza a lista de itens de uma resposta paginada do DC
function extractItems(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  return data.data || data.leads || data.businesses || data.conversations || data.products || data.items || []
}

function extractTotal(data) {
  if (!data || typeof data !== 'object') return 0
  return data.total ?? data.count ?? data.totalCount ?? 0
}

// ── Normalizadores ─────────────────────────────────────────

export function normalizeLead(l) {
  const contact = l.contact || l.contacts?.[0] || {}
  const phone = contact.phone || contact.whatsapp || l.phone || ''
  return {
    id: String(l.id || l._id || ''),
    name: l.name || contact.name || l.fullName || 'Sem nome',
    phone: String(phone).replace(/\D/g, ''),
    phoneRaw: String(phone),
    email: contact.email || l.email || '',
    stage: l.stage?.name || l.stageName || l.stage || '',
    tags: Array.isArray(l.tags) ? l.tags.map(t => t.name || t) : [],
    source: l.source?.name || l.source || '',
    attendant: l.attendant?.name || l.attendantName || '',
    list: l.list?.name || l.listName || '',
    createdAt: l.createdAt || l.created_at || null,
    updatedAt: l.updatedAt || l.updated_at || null,
  }
}

export function normalizeBusiness(b) {
  const products = Array.isArray(b.products) ? b.products : []
  const totalValue = products.reduce((s, p) => s + (Number(p.price || p.value || 0) * Number(p.quantity || 1)), 0)
    || Number(b.value || b.total || b.amount || 0)
  return {
    id: String(b.id || b._id || ''),
    name: b.name || b.title || '',
    status: b.status || 'in_process',
    value: totalValue,
    leadName: b.lead?.name || b.leadName || b.contact?.name || '',
    leadPhone: String(b.lead?.phone || b.contact?.phone || '').replace(/\D/g, ''),
    stage: b.stage?.name || b.stageName || b.stage || '',
    attendant: b.attendant?.name || b.attendantName || '',
    products: products.map(p => ({ name: p.name || '', price: Number(p.price || 0), qty: Number(p.quantity || 1) })),
    lossReason: b.lossReason?.name || b.lossReason || '',
    wonAt: b.wonAt || b.won_at || null,
    lostAt: b.lostAt || b.lost_at || null,
    createdAt: b.createdAt || b.created_at || null,
  }
}

// ── Hooks ──────────────────────────────────────────────────

export function useDCLeads(take = 300) {
  return useQuery({
    queryKey: ['dc', 'leads', take],
    queryFn: async () => {
      const data = await fetchJSON(`/api/dc/leads?skip=0&take=${take}`)
      return { items: extractItems(data).map(normalizeLead), total: extractTotal(data) }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 2,
    select: d => d,
  })
}

export function useDCBusinesses(status = 'all', take = 500) {
  return useQuery({
    queryKey: ['dc', 'businesses', status, take],
    queryFn: async () => {
      const qs = status !== 'all' ? `&status=${status}` : ''
      const data = await fetchJSON(`/api/dc/businesses?skip=0&take=${take}${qs}`)
      return { items: extractItems(data).map(normalizeBusiness), total: extractTotal(data) }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 2,
  })
}

export function useDCStats() {
  return useQuery({
    queryKey: ['dc', 'stats'],
    queryFn: () => fetchJSON('/api/dc/stats'),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 2,
  })
}

export function useDCConversations(take = 100) {
  return useQuery({
    queryKey: ['dc', 'conversations', take],
    queryFn: async () => {
      const data = await fetchJSON(`/api/dc/conversations?skip=0&take=${take}`)
      return extractItems(data)
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 2,
  })
}

export function useDCProducts() {
  return useQuery({
    queryKey: ['dc', 'products'],
    queryFn: async () => {
      const data = await fetchJSON('/api/dc/products')
      return extractItems(data)
    },
    staleTime: 300_000,
    retry: 2,
  })
}
