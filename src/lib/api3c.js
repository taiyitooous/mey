const TOKEN = import.meta.env.VITE_3C_TOKEN || 'R02FvFejFgDpLxz4iIJn7s14EveNi9vDJt6c8tptGt6vYJjdcqwXHrzAPuDB'
const BASE = import.meta.env.DEV ? '/proxy-3c/api/v1' : 'https://app.3c.plus/api/v1'

async function request(path, params = {}) {
  const qs = new URLSearchParams({ api_token: TOKEN, ...params })
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`3C API ${res.status}: ${path}`)
  return res.json()
}

export const api3c = {
  agents: (params = {}) => request('/agents', params),
  campaigns: () => request('/campaigns'),
  callHistory: (params = {}) => request('/call-history', params),
  queues: () => request('/queues'),
  stats: (params = {}) => request('/stats', params),
  ping: () => request('/agents', { per_page: 1 }),
}
