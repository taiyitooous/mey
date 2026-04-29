import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSkaleEvents(limit = 10) {
  return useQuery({
    queryKey: ['skale', 'events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('source', 'skale')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
    refetchInterval: 15_000,
    retry: 1,
  })
}

export function useSkaleOrders(limit = 8) {
  return useQuery({
    queryKey: ['skale', 'orders', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skale_orders')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
    refetchInterval: 15_000,
    retry: 1,
  })
}

export function useSkaleStats() {
  return useQuery({
    queryKey: ['skale', 'stats'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [eventsRes, ordersRes, paidRes] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('source', 'skale').gte('created_at', today.toISOString()),
        supabase.from('skale_orders').select('id', { count: 'exact', head: true }).gte('started_at', today.toISOString()),
        supabase.from('skale_orders').select('total_price').in('payment_status', ['Pago', 'Confirmado', 'payment_registered']).gte('started_at', today.toISOString()),
      ])

      const revenue = (paidRes.data || []).reduce((sum, o) => sum + (o.total_price || 0), 0)

      return {
        eventsToday: eventsRes.count || 0,
        ordersToday: ordersRes.count || 0,
        revenueToday: revenue,
      }
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
