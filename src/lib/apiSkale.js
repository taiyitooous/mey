// Webhook URL for Skale configuration
export const SKALE_WEBHOOK_URL = `${window.location.origin}/api/webhooks/skale`

// ── Payload normalization (reference) ────────────────────
// Used by server/index.js — kept here for documentation

export function parseSkalePayload(body) {
  if (!body || typeof body !== 'object') return null

  const crm         = body.bertoldo_crm  || {}
  const customer    = body.customer       || {}
  const product     = body.product        || {}
  const transaction = body.transaction    || {}
  const shipping    = body.shipping       || {}

  return {
    event:          crm.event || body.event || 'order_updated',
    transaction_id: body.transaction_id || String(crm.id_venda || ''),
    seller_name:    crm.usuario_responsavel || null,
    seller_key:     crm.src_usuario || null,
    is_test:        Boolean(body.test),
    status:         body.status || crm.status_entrega || null,
    payment_status: transaction.payment_status || crm.status_pagamento || null,
    payment_method: transaction.payment_method || null,
    customer: {
      name:    customer.name    || null,
      email:   customer.email   || null,
      doc:     customer.doc     || null,
      phone:   customer.phone   || null,
      address: customer.address || null,
    },
    product: {
      name:     product.name     || null,
      price:    product.price    || 0,
      sku:      product.sku      || null,
      quantity: product.quantity || 1,
    },
    total_price:  transaction.total_price || product.price || 0,
    checkout_url: transaction.checkout_url || null,
    paid_at:      transaction.paid_at || null,
    shipping: {
      service:       shipping.service       || null,
      tracking_code: shipping.tracking_code || null,
      tracking_url:  shipping.tracking_url  || null,
      fee:           shipping.fee           || 0,
    },
    platform:   crm.plataforma || null,
    note:       crm.observacao  || null,
    started_at: body.started_at || null,
    updated_at: body.updated_at || null,
  }
}
