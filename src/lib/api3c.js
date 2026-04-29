// Todas as chamadas passam pelo backend Express — sem CORS, token seguro no servidor

async function request(path, params = {}) {
  const qs = new URLSearchParams(params)
  const url = `/api/3c${path}${qs.toString() ? `?${qs}` : ''}`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })

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
  calls:       (params = {}) => request('/calls', params),
  stats:       ()            => request('/stats'),
  ping:        ()            => request('/ping'),
}
