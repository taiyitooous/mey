import { useState, useCallback } from 'react'

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

function makeStore(key, initial = []) {
  return function useStore() {
    const [items, setItems] = useState(() => readStorage(key, initial))

    const save = useCallback((next) => {
      setItems(next)
      writeStorage(key, next)
    }, [])

    const add = useCallback((item) => {
      const next = [...readStorage(key, initial), { ...item, id: genId(), created_at: new Date().toISOString() }]
      save(next)
      return next[next.length - 1]
    }, [save])

    const update = useCallback((id, patch) => {
      const next = readStorage(key, initial).map(i => i.id === id ? { ...i, ...patch } : i)
      save(next)
    }, [save])

    const remove = useCallback((id) => {
      save(readStorage(key, initial).filter(i => i.id !== id))
    }, [save])

    const reset = useCallback(() => save(initial), [save])

    return { items, add, update, remove, reset }
  }
}

export const useSellers   = makeStore('mey_sellers',     [])
export const useLeads     = makeStore('mey_leads',       [])
export const useOrders    = makeStore('mey_orders',      [])
export const useTasks     = makeStore('mey_tasks',       [])
export const useCollections = makeStore('mey_collections', [])
export const useEvents    = makeStore('mey_events',      [])

export const STAGE_LABELS = {
  0: 'Perdido', 1: 'Novo', 2: 'Contato',
  3: 'Proposta', 4: 'Negociação', 5: 'Ganho',
}

export const ORDER_STATUS_LABELS = {
  processing: 'Processando', in_transit: 'Em Trânsito',
  out_for_delivery: 'Saiu p/ Entrega', delivered: 'Entregue',
  returned: 'Devolvido', cancelled: 'Cancelado',
}
