const API = '/api/entities'

function entityClient(name) {
  const url = `${API}/${name}`

  return {
    async list(orderBy = '-created_date', limit = 1000) {
      const r = await fetch(`${url}?order=${encodeURIComponent(orderBy)}&limit=${limit}`)
      if (!r.ok) throw new Error(`${name} list failed`)
      return r.json()
    },

    async filter(filters = {}, orderBy = '-created_date', limit = 1000) {
      const params = new URLSearchParams({ order: orderBy, limit })
      Object.entries(filters).forEach(([k, v]) => v !== undefined && params.set(k, v))
      const r = await fetch(`${url}?${params}`)
      if (!r.ok) throw new Error(`${name} filter failed`)
      return r.json()
    },

    async get(id) {
      const r = await fetch(`${url}/${id}`)
      if (!r.ok) throw new Error(`${name} get failed`)
      return r.json()
    },

    async create(data) {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!r.ok) throw new Error(`${name} create failed`)
      return r.json()
    },

    async update(id, data) {
      const r = await fetch(`${url}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!r.ok) throw new Error(`${name} update failed`)
      return r.json()
    },

    async delete(id) {
      const r = await fetch(`${url}/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(`${name} delete failed`)
    },

    subscribe(cb) {
      return () => {}
    },
  }
}

export const base44 = {
  entities: {
    SaleRecord: entityClient('sale-records'),
    Seller: entityClient('sellers'),
    LeadDailyCount: entityClient('lead-daily-counts'),
    Team: entityClient('teams'),
    Product: entityClient('products'),
    Event: entityClient('events'),
    Lead: entityClient('leads'),
    Order: entityClient('orders'),
    Task: entityClient('tasks'),
    User: entityClient('users'),
    SellerConfig: entityClient('seller-configs'),
    WavoipConfig: entityClient('wavoip-configs'),
    LeadSnapshot: entityClient('lead-snapshots'),
  },
}
