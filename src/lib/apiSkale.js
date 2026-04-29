import { supabase } from './supabase'

// ── Payload normalization ──────────────────────────────────

export function parseSkalePayload(body) {
  if (!body || typeof body !== 'object') return null

  const crm = body.bertoldo_crm || {}
  const customer = body.customer || {}
  const product = body.product || {}
  const transaction = body.transaction || {}
  const shipping = body.shipping || {}

  return {
    event: crm.event || body.event || 'order_updated',
    transaction_id: body.transaction_id || String(crm.id_venda || ''),
    seller_id: body.seller_id || null,
    seller_name: crm.usuario_responsavel || null,
    seller_key: crm.src_usuario || null,
    is_test: Boolean(body.test),

    // Status
    status: body.status || crm.status_entrega || null,
    payment_status: transaction.payment_status || crm.status_pagamento || null,
    payment_method: transaction.payment_method || null,

    // Customer
    customer: {
      name: customer.name || null,
      email: customer.email || null,
      doc: customer.doc || null,
      phone: customer.phone || null,
      address: customer.address || null,
    },

    // Product
    product: {
      name: product.name || null,
      price: product.price || 0,
      code: product.code || null,
      sku: product.sku || null,
      quantity: product.quantity || 1,
    },

    // Transaction
    total_price: transaction.total_price || product.price || 0,
    checkout_url: transaction.checkout_url || null,
    paid_at: transaction.paid_at || null,

    // Shipping
    shipping: {
      service: shipping.service || null,
      tracking_code: shipping.tracking_code || null,
      tracking_url: shipping.tracking_url || null,
      fee: shipping.fee || 0,
    },

    // Meta
    platform: crm.plataforma || null,
    note: crm.observacao || null,
    started_at: body.started_at || null,
    updated_at: body.updated_at || null,
  }
}

// ── Map to internal order format ──────────────────────────

export function toInternalOrder(parsed) {
  return {
    external_id: parsed.transaction_id,
    source: 'skale',
    customer_name: parsed.customer.name,
    customer_email: parsed.customer.email,
    customer_phone: parsed.customer.phone,
    customer_doc: parsed.customer.doc,
    customer_address: parsed.customer.address,
    product_name: parsed.product.name,
    product_sku: parsed.product.sku,
    product_quantity: parsed.product.quantity,
    status: mapSkaleStatus(parsed.status),
    payment_status: parsed.payment_status,
    payment_method: parsed.payment_method,
    total_price: parsed.total_price,
    paid_at: parsed.paid_at,
    tracking_code: parsed.shipping.tracking_code,
    tracking_url: parsed.shipping.tracking_url,
    carrier: parsed.shipping.service,
    seller_key: parsed.seller_key,
    seller_name: parsed.seller_name,
    platform: parsed.platform,
    note: parsed.note,
    is_test: parsed.is_test,
    checkout_url: parsed.checkout_url,
    started_at: parsed.started_at,
  }
}

// ── Map to internal event format ──────────────────────────

export function toInternalEvent(parsed) {
  return {
    entity_type: 'order',
    entity_id: parsed.transaction_id,
    event_type: parsed.event,
    user_name: parsed.seller_name,
    source: 'skale',
    payload: {
      status: parsed.status,
      payment_status: parsed.payment_status,
      tracking_code: parsed.shipping.tracking_code,
      total_price: parsed.total_price,
      platform: parsed.platform,
      is_test: parsed.is_test,
    },
  }
}

// ── Status mapping ─────────────────────────────────────────

function mapSkaleStatus(raw) {
  if (!raw) return 'processing'
  const s = raw.toLowerCase()
  if (s.includes('entreg') || s === 'delivered') return 'delivered'
  if (s.includes('trânsito') || s.includes('transito') || s === 'in_transit') return 'in_transit'
  if (s.includes('saiu') || s === 'out_for_delivery') return 'out_for_delivery'
  if (s.includes('devol') || s === 'returned') return 'returned'
  if (s.includes('cancel') || s === 'cancelled') return 'cancelled'
  return 'processing'
}

// ── Supabase helpers (for Edge Function / server side) ────

export async function upsertSkaleOrder(parsed) {
  const order = toInternalOrder(parsed)
  const { data, error } = await supabase
    .from('skale_orders')
    .upsert(order, { onConflict: 'external_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertSkaleEvent(parsed) {
  const event = toInternalEvent(parsed)
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single()
  if (error) throw error
  return data
}
