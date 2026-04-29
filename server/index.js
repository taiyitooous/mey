import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool, initDB } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// ── Payload parser ─────────────────────────────────────────

function mapStatus(raw) {
  if (!raw) return 'processing'
  const s = raw.toLowerCase()
  if (s.includes('entreg') || s === 'delivered') return 'delivered'
  if (s.includes('trânsito') || s.includes('transito') || s === 'in_transit') return 'in_transit'
  if (s.includes('saiu') || s === 'out_for_delivery') return 'out_for_delivery'
  if (s.includes('devol') || s === 'returned') return 'returned'
  if (s.includes('cancel') || s === 'cancelled') return 'cancelled'
  return 'processing'
}

// ── Webhook Skale ──────────────────────────────────────────

app.post('/api/webhooks/skale', async (req, res) => {
  try {
    const body        = req.body || {}
    const crm         = body.bertoldo_crm  || {}
    const customer    = body.customer       || {}
    const product     = body.product        || {}
    const transaction = body.transaction    || {}
    const shipping    = body.shipping       || {}

    const external_id  = body.transaction_id || String(crm.id_venda || '')
    const event_type   = crm.event || body.event || 'order_updated'
    const seller_name  = crm.usuario_responsavel || null
    const seller_key   = crm.src_usuario || null

    // Upsert order
    await pool.query(`
      INSERT INTO skale_orders (
        external_id, source, customer_name, customer_email, customer_phone,
        customer_doc, customer_address, product_name, product_sku,
        product_quantity, status, payment_status, payment_method, total_price,
        paid_at, tracking_code, tracking_url, carrier, seller_key, seller_name,
        platform, note, is_test, checkout_url, started_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,NOW()
      )
      ON CONFLICT (external_id) DO UPDATE SET
        status           = EXCLUDED.status,
        payment_status   = EXCLUDED.payment_status,
        payment_method   = EXCLUDED.payment_method,
        total_price      = EXCLUDED.total_price,
        tracking_code    = EXCLUDED.tracking_code,
        tracking_url     = EXCLUDED.tracking_url,
        carrier          = EXCLUDED.carrier,
        seller_name      = EXCLUDED.seller_name,
        note             = EXCLUDED.note,
        paid_at          = EXCLUDED.paid_at,
        updated_at       = NOW()
    `, [
      external_id,
      'skale',
      customer.name    || null,
      customer.email   || null,
      customer.phone   || null,
      customer.doc     || null,
      customer.address ? JSON.stringify(customer.address) : null,
      product.name     || null,
      product.sku      || null,
      product.quantity || 1,
      mapStatus(body.status || crm.status_entrega),
      transaction.payment_status || crm.status_pagamento || null,
      transaction.payment_method || null,
      transaction.total_price || product.price || 0,
      transaction.paid_at || null,
      shipping.tracking_code || null,
      shipping.tracking_url  || null,
      shipping.service       || null,
      seller_key,
      seller_name,
      crm.plataforma || null,
      crm.observacao  || null,
      Boolean(body.test),
      transaction.checkout_url || null,
      body.started_at || new Date().toISOString(),
    ])

    // Insert event log
    await pool.query(`
      INSERT INTO skale_events (entity_type, entity_id, event_type, user_name, source, payload)
      VALUES ('order', $1, $2, $3, 'skale', $4)
    `, [
      external_id,
      event_type,
      seller_name,
      JSON.stringify({
        status:         body.status || crm.status_entrega,
        payment_status: transaction.payment_status || crm.status_pagamento,
        tracking_code:  shipping.tracking_code,
        total_price:    transaction.total_price || product.price,
        platform:       crm.plataforma,
        is_test:        Boolean(body.test),
      }),
    ])

    res.json({ ok: true, external_id, event_type })
  } catch (err) {
    console.error('[skale webhook]', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Orders API ─────────────────────────────────────────────

app.get('/api/skale/orders', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || '100'), 500)
    const offset = parseInt(req.query.offset || '0')
    const status = req.query.status
    const search = req.query.search

    let where = ['is_test = FALSE']
    const params = []

    if (status && status !== 'all') {
      params.push(status)
      where.push(`status = $${params.length}`)
    }

    if (search) {
      params.push(`%${search}%`)
      const n = params.length
      where.push(`(customer_name ILIKE $${n} OR external_id ILIKE $${n} OR product_name ILIKE $${n} OR tracking_code ILIKE $${n})`)
    }

    params.push(limit, offset)
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const { rows } = await pool.query(
      `SELECT * FROM skale_orders ${whereClause} ORDER BY started_at DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    res.json(rows)
  } catch (err) {
    console.error('[GET /api/skale/orders]', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Stats API ──────────────────────────────────────────────

app.get('/api/skale/stats', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE started_at >= $1)                                          AS orders_today,
        COUNT(*) FILTER (WHERE payment_status IN ('Pago','Confirmado') AND started_at >= $1) AS paid_today,
        COUNT(*) FILTER (WHERE payment_status IN ('Aguardando Pagamento','Pendente') AND started_at >= $1) AS pending_today,
        COALESCE(SUM(total_price) FILTER (WHERE payment_status IN ('Pago','Confirmado') AND started_at >= $1), 0) AS revenue_today,
        COUNT(*) AS orders_total,
        COALESCE(SUM(total_price) FILTER (WHERE payment_status IN ('Pago','Confirmado')), 0) AS revenue_total
      FROM skale_orders
      WHERE is_test = FALSE
    `, [today.toISOString()])

    res.json(rows[0])
  } catch (err) {
    console.error('[GET /api/skale/stats]', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Serve React app (static) ───────────────────────────────

const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

// ── Start ──────────────────────────────────────────────────

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`MEY server running on port ${PORT}`))
  })
  .catch(err => {
    console.error('DB init failed:', err)
    process.exit(1)
  })
