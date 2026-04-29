import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const crm       = body.bertoldo_crm   || {}
  const customer  = body.customer        || {}
  const product   = body.product         || {}
  const transaction = body.transaction   || {}
  const shipping  = body.shipping        || {}

  const external_id     = body.transaction_id || String(crm.id_venda || '')
  const event_type      = crm.event || body.event || 'order_updated'
  const seller_name     = crm.usuario_responsavel || null
  const seller_key      = crm.src_usuario || null

  function mapStatus(raw: string | null) {
    if (!raw) return 'processing'
    const s = raw.toLowerCase()
    if (s.includes('entreg') || s === 'delivered') return 'delivered'
    if (s.includes('trânsito') || s.includes('transito') || s === 'in_transit') return 'in_transit'
    if (s.includes('saiu') || s === 'out_for_delivery') return 'out_for_delivery'
    if (s.includes('devol') || s === 'returned') return 'returned'
    if (s.includes('cancel') || s === 'cancelled') return 'cancelled'
    return 'processing'
  }

  // Upsert order
  const order = {
    external_id,
    source: 'skale',
    customer_name:    customer.name    || null,
    customer_email:   customer.email   || null,
    customer_phone:   customer.phone   || null,
    customer_doc:     customer.doc     || null,
    customer_address: customer.address || null,
    product_name:     product.name     || null,
    product_sku:      product.sku      || null,
    product_quantity: product.quantity || 1,
    status:           mapStatus(body.status || crm.status_entrega),
    payment_status:   transaction.payment_status || crm.status_pagamento || null,
    payment_method:   transaction.payment_method || null,
    total_price:      transaction.total_price || product.price || 0,
    paid_at:          transaction.paid_at || null,
    tracking_code:    shipping.tracking_code || null,
    tracking_url:     shipping.tracking_url  || null,
    carrier:          shipping.service       || null,
    seller_key,
    seller_name,
    platform:         crm.plataforma || null,
    note:             crm.observacao  || null,
    is_test:          Boolean(body.test),
    checkout_url:     transaction.checkout_url || null,
    started_at:       body.started_at || new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  }

  const { error: orderErr } = await supabase
    .from('skale_orders')
    .upsert(order, { onConflict: 'external_id' })

  if (orderErr) {
    console.error('skale_orders upsert error:', orderErr)
    return new Response(JSON.stringify({ error: orderErr.message }), { status: 500 })
  }

  // Insert event
  const event = {
    entity_type: 'order',
    entity_id:   external_id,
    event_type,
    user_name:   seller_name,
    source:      'skale',
    payload: {
      status:          body.status || crm.status_entrega,
      payment_status:  transaction.payment_status || crm.status_pagamento,
      tracking_code:   shipping.tracking_code,
      total_price:     transaction.total_price || product.price,
      platform:        crm.plataforma,
      is_test:         Boolean(body.test),
    },
  }

  const { error: eventErr } = await supabase.from('events').insert(event)
  if (eventErr) console.error('events insert error:', eventErr)

  return new Response(JSON.stringify({ ok: true, external_id, event_type }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
