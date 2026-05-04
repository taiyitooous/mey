import { useQuery, useInfiniteQuery } from '@tanstack/react-query'

async function fetchJSON(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

const PAGE_SIZE = 50

export function useSkaleOrdersInfinite() {
  return useInfiniteQuery({
    queryKey: ['skale', 'orders', 'infinite'],
    queryFn: ({ pageParam = 0 }) =>
      fetchJSON(`/api/skale/orders?limit=${PAGE_SIZE}&offset=${pageParam}`),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    refetchInterval: 15_000,
    retry: 1,
  })
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
