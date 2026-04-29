import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool, initDB } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Health / diagnóstico ───────────────────────────────────

app.get('/api/health', async (req, res) => {
  let dbOk = false
  try { await pool.query('SELECT 1'); dbOk = true } catch {}
  res.json({
    ok: true,
    db: dbOk,
    threec_token: process.env.THREEC_TOKEN ? '✓ configurado' : '✗ ausente',
    node: process.version,
    env: process.env.NODE_ENV,
  })
})

// Teste manual de webhook 3C
app.get('/api/3c/test-webhook', async (req, res) => {
  const fake = {
    event: 'call-history-was-created',
    call_id: `test_${Date.now()}`,
    agent_name: 'Agente Teste',
    phone: '11999990000',
    speaking_time: 120,
    duration: 120,
    result: 'interested',
    campaign: 'Campanha Teste',
    started_at: new Date().toISOString(),
  }
  await pool.query(
    `INSERT INTO threec_events (event_type, agent_name, call_id, payload) VALUES ($1,$2,$3,$4)`,
    [fake.event, fake.agent_name, fake.call_id, JSON.stringify(fake)]
  )
  await pool.query(`
    INSERT INTO threec_calls (call_id, agent_name, phone, duration, result, campaign, started_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (call_id) DO NOTHING
  `, [fake.call_id, fake.agent_name, fake.phone, fake.duration, fake.result, fake.campaign, fake.started_at])
  res.json({ ok: true, inserted: fake })
})

// Ver últimos eventos 3C recebidos
app.get('/api/3c/recent-events', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM threec_events ORDER BY created_at DESC LIMIT 20`
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── 3C Plus — proxy & webhook ──────────────────────────────

const THREEC_TOKEN = process.env.THREEC_TOKEN || ''
const THREEC_BASE  = 'https://app.3c.plus/api/v1'

async function threecFetch(path, params = {}) {
  const qs = new URLSearchParams({ api_token: THREEC_TOKEN, ...params })
  const res = await fetch(`${THREEC_BASE}${path}?${qs}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`3C API ${res.status} on ${path}`)
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

// Proxy: agentes ao vivo
app.get('/api/3c/agents', async (req, res) => {
  try {
    const data = await threecFetch('/agents', { per_page: 200 })
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// Proxy: campanhas
app.get('/api/3c/campaigns', async (req, res) => {
  try {
    const data = await threecFetch('/campaigns')
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// Proxy: histórico de chamadas (salva no banco também)
app.get('/api/3c/call-history', async (req, res) => {
  try {
    const params = {}
    if (req.query.date)     params.date     = req.query.date
    if (req.query.per_page) params.per_page = req.query.per_page || 200
    const data = await threecFetch('/call-history', params)

    // Persist no banco em background
    const items = Array.isArray(data) ? data : (data?.data || data?.calls || [])
    if (items.length > 0) {
      for (const c of items) {
        const callId = String(c.id || c.call_id || '')
        if (!callId) continue
        await pool.query(`
          INSERT INTO threec_calls (call_id, agent_name, phone, duration, result, campaign, started_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (call_id) DO NOTHING
        `, [
          callId,
          String(c.agent_name || c.agent || c.username || ''),
          String(c.phone || c.to || c.destination || ''),
          Number(c.duration || c.speaking_time || 0),
          String(c.result || c.disposition || ''),
          String(c.campaign || c.campaign_name || ''),
          c.started_at || c.call_date || c.created_at || null,
        ]).catch(() => {})
      }
    }

    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// Proxy: ping / status
app.get('/api/3c/ping', async (req, res) => {
  try {
    await threecFetch('/agents', { per_page: 1 })
    res.json({ ok: true })
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message })
  }
})

// Stats do banco (chamadas do dia)
app.get('/api/3c/stats', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                 AS total_calls,
        COUNT(*) FILTER (WHERE result ILIKE '%interested%')     AS interested,
        COUNT(*) FILTER (WHERE result ILIKE '%no_answer%')      AS no_answer,
        COALESCE(AVG(duration) FILTER (WHERE duration > 0), 0)  AS avg_duration,
        COALESCE(SUM(duration), 0)                              AS total_duration
      FROM threec_calls
      WHERE created_at >= $1
    `, [today.toISOString()])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Histórico de chamadas do banco (sem depender da 3C estar disponível)
app.get('/api/3c/calls', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100'), 500)
    const { rows } = await pool.query(
      `SELECT * FROM threec_calls ORDER BY started_at DESC NULLS LAST LIMIT $1`, [limit]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Webhook 3C (eventos em tempo real)
app.post('/api/webhooks/3c', async (req, res) => {
  console.log('[3c webhook] recebido:', JSON.stringify(req.body)?.slice(0, 300))
  try {
    const body = req.body || {}
    const event_type = body.event || body.type || 'unknown'
    const agent_name = body.agent_name || body.agent || null
    const call_id    = String(body.call_id || body.id || '')

    // Salva o evento
    await pool.query(`
      INSERT INTO threec_events (event_type, agent_name, call_id, payload)
      VALUES ($1, $2, $3, $4)
    `, [event_type, agent_name, call_id, JSON.stringify(body)])

    // Se for histórico de chamada, upsert em threec_calls
    if (['call-history-was-created', 'call_answered', 'call-was-connected'].includes(event_type)) {
      const callId = call_id || String(body.call_id || '')
      if (callId) {
        await pool.query(`
          INSERT INTO threec_calls (call_id, agent_name, phone, duration, result, campaign, started_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (call_id) DO UPDATE SET
            duration   = EXCLUDED.duration,
            result     = EXCLUDED.result,
            agent_name = EXCLUDED.agent_name
        `, [
          callId,
          agent_name,
          body.phone || body.to || body.destination || null,
          Number(body.speaking_time || body.duration || 0),
          body.result || body.disposition || null,
          body.campaign || body.campaign_name || null,
          body.started_at || body.call_date || null,
        ])
      }
    }

    res.json({ ok: true, event_type })
  } catch (err) {
    console.error('[3c webhook]', err)
    res.status(500).json({ error: err.message })
  }
})

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
