import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Entities ──────────────────────────────────────────────
export const db = {
  events: () => supabase.from('events'),
  leads: () => supabase.from('leads'),
  orders: () => supabase.from('orders'),
  collections: () => supabase.from('collections'),
  tasks: () => supabase.from('tasks'),
  sellerConfigs: () => supabase.from('seller_configs'),
  integrations: () => supabase.from('integrations'),
  skaleOrders: () => supabase.from('skale_orders'),
}
