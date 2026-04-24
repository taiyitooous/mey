const TOKEN = import.meta.env.VITE_3C_TOKEN || 'R02FvFejFgDpLxz4iIJn7s14EveNi9vDJt6c8tptGt6vYJjdcqwXHrzAPuDB'

// In dev: use Vite proxy (/proxy-3c) to bypass CORS
// In prod: call directly — 3C Plus API must allow the origin
const BASE = import.meta.env.DEV
  ? '/proxy-3c/api/v1'
  : 'https://app.3c.plus/api/v1'

async function request(path, params = {}) {
  const qs = new URLSearchParams({ api_token: TOKEN, ...params })
  const url = `${BASE}${path}?${qs}`

  const res = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`3C API ${res.status} on ${path}`)
  }

  const text = await res.text()
  if (!text) return []

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`3C API returned non-JSON on ${path}`)
  }
}

export const api3c = {
  agents:      (params = {}) => request('/agents', params),
  campaigns:   ()            => request('/campaigns'),
  callHistory: (params = {}) => request('/call-history', params),
  queues:      ()            => request('/queues'),
  stats:       (params = {}) => request('/stats', params),
  ping:        ()            => request('/agents', { per_page: 1 }),
}
