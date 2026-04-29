import { useQuery } from '@tanstack/react-query'

async function fetchJSON(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

export function useSkaleOrders(limit = 100) {
  return useQuery({
    queryKey: ['skale', 'orders', limit],
    queryFn: () => fetchJSON(`/api/skale/orders?limit=${limit}`),
    refetchInterval: 15_000,
    retry: 1,
  })
}

export function useSkaleStats() {
  return useQuery({
    queryKey: ['skale', 'stats'],
    queryFn: () => fetchJSON('/api/skale/stats'),
    refetchInterval: 30_000,
    retry: 1,
  })
}
