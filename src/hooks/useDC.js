import { useQuery } from '@tanstack/react-query'

async function fetchJSON(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`DC proxy ${res.status}: ${path}`)
  return res.json()
}

// DC resposta: { count: N, total: valor_monetário, data: [...] }
function extractItems(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  return data.data || data.leads || data.businesses || data.conversations || data.products || data.items || []
}

// ── Normalizadores ─────────────────────────────────────────

export function normalizeLead(l) {
  // Etapa vem das tags (ex: "Etapa01", "Etapa02")
  const etapaTag = (l.tags || []).find(t => /^etapa/i.test(t.name || ''))
  return {
    id: String(l.id || ''),
    name: l.name || 'Sem nome',
    phone: String(l.phone || l.rawPhone || '').replace(/\D/g, ''),
    phoneRaw: String(l.phone || l.rawPhone || ''),
    email: l.email || '',
    stage: etapaTag?.name || '',
    tags: (l.tags || []).map(t => t.name || '').filter(Boolean),
    source: typeof l.source === 'string' ? l.source : (l.source?.name || ''),
    attendant: l.attendant?.name || '',
    list: (l.lists || [])[0]?.name || '',
    metrics: l.metrics || null,
    createdAt: l.createdAt || null,
  }
}

export function normalizeBusiness(b) {
  const products = Array.isArray(b.products) ? b.products : []
  // leadPhone está em b.lead.contacts[0].contactId
  const leadPhone = (b.lead?.contacts || [])[0]?.contactId || ''
  const productName = products[0]?.product?.name || ''
  return {
    id: String(b.id || ''),
    code: b.code || 0,
    name: productName || `Negócio #${b.code}`,
    status: b.status || 'in_process',
    // b.total é o valor monetário em R$ (ex: 540 = R$540)
    value: Number(b.total || 0),
    leadName: `#${b.code}`,
    leadPhone: String(leadPhone).replace(/\D/g, ''),
    products: products.map(p => ({
      name: p.product?.name || '',
      price: Number(p.price || p.product?.price || 0),
      qty: Number(p.quantity || 1),
    })),
    wonAt: b.statusChangedAt || null,
    createdAt: b.createdAt || null,
  }
}

// ── Hooks ──────────────────────────────────────────────────

export function useDCLeads(take = 300) {
  return useQuery({
    queryKey: ['dc', 'leads', take],
    queryFn: async () => {
      const data = await fetchJSON(`/api/dc/leads?skip=0&take=${take}`)
      return {
        items: extractItems(data).map(normalizeLead),
        total: data?.count ?? (Array.isArray(data) ? data.length : 0),
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 2,
  })
}

export function useDCBusinesses(status = 'all', take = 500) {
  return useQuery({
    queryKey: ['dc', 'businesses', status, take],
    queryFn: async () => {
      const qs = status !== 'all' ? `&status=${status}` : ''
      const data = await fetchJSON(`/api/dc/businesses?skip=0&take=${take}${qs}`)
      return {
        items: extractItems(data).map(normalizeBusiness),
        // count = quantidade, total = soma monetária
        count: data?.count ?? (Array.isArray(data) ? data.length : 0),
        totalValue: data?.total ?? 0,
      }
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
      return { items: extractItems(data), count: data?.count ?? 0 }
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
