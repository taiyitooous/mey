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
    dc_token: process.env.DC_TOKEN ? '✓ configurado' : '✗ ausente',
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

// Reprocessa eventos antigos com event_type='unknown' que vieram no formato correto
app.post('/api/3c/reprocess', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, payload FROM threec_events WHERE event_type = 'unknown' LIMIT 500`
    )
    let fixed = 0
    for (const row of rows) {
      const body = row.payload
      const key  = Object.keys(body).find(k => k.includes('call') || k.includes('agent'))
      if (!key) continue
      const eventData = body[key] || {}
      const ch        = eventData.callHistory || eventData
      const call_id   = String(ch.telephony_id || ch._id || ch.id || '')
      const agent_name = ch.agent?.name || null
      const duration  = Number(ch.speaking_time || ch.billed_time || 0)
      const campaign  = ch.campaign?.name || null
      const phone     = ch.number || ch.phone || null
      const started_at = ch.call_date || ch.created_at || null
      const result    = ch.qualification?.name || null

      await pool.query(
        `UPDATE threec_events SET event_type=$1, agent_name=$2, call_id=$3 WHERE id=$4`,
        [key, agent_name, call_id, row.id]
      )
      if (call_id) {
        await pool.query(`
          INSERT INTO threec_calls (call_id, agent_name, phone, duration, result, campaign, started_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (call_id) DO UPDATE SET
            duration = EXCLUDED.duration, result = EXCLUDED.result,
            agent_name = COALESCE(EXCLUDED.agent_name, threec_calls.agent_name)
        `, [call_id, agent_name, phone, duration, result, campaign, started_at])
      }
      fixed++
    }
    res.json({ ok: true, reprocessed: fixed })
  } catch (err) {
    res.status(500).json({ error: err.message })
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

// Histórico de chamadas do banco
app.get('/api/3c/calls', async (req, res) => {
  try {
    const limit    = Math.min(parseInt(req.query.limit    || '60'),  500)
    const offset   = parseInt(req.query.offset   || '0')
    const search   = req.query.search
    const agent    = req.query.agent
    const campaign = req.query.campaign

    const where = []; const params = []
    if (search) {
      params.push(`%${search}%`)
      const n = params.length
      where.push(`(agent_name ILIKE $${n} OR phone ILIKE $${n} OR result ILIKE $${n})`)
    }
    if (agent && agent !== 'all') {
      params.push(agent); where.push(`agent_name = $${params.length}`)
    }
    if (campaign && campaign !== 'all') {
      params.push(campaign); where.push(`campaign = $${params.length}`)
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : ''
    params.push(limit, offset)

    const { rows } = await pool.query(
      `SELECT * FROM threec_calls ${w} ORDER BY started_at DESC NULLS LAST LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Filtros disponíveis (agentes e campanhas distintos)
app.get('/api/3c/filters', async (req, res) => {
  try {
    const [ag, ca] = await Promise.all([
      pool.query(`SELECT DISTINCT agent_name FROM threec_calls WHERE agent_name IS NOT NULL ORDER BY agent_name`),
      pool.query(`SELECT DISTINCT campaign FROM threec_calls WHERE campaign IS NOT NULL ORDER BY campaign`),
    ])
    res.json({ agents: ag.rows.map(r => r.agent_name), campaigns: ca.rows.map(r => r.campaign) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET — verificação/ping que algumas plataformas fazem antes de ativar o webhook
app.get('/api/webhooks/3c', (req, res) => {
  console.log('[3c webhook GET] verificação recebida', req.query)
  res.json({ ok: true, service: 'mey', endpoint: '3c' })
})

// Webhook 3C (eventos em tempo real)
// A 3C envia o tipo do evento como CHAVE do objeto:
// { "call-history-was-created": { "bootTime": "...", "callHistory": { ... } } }
app.post('/api/webhooks/3c', async (req, res) => {
  try {
    const body = req.body || {}

    // Detecta o event_type pela chave do payload
    const KNOWN_EVENTS = [
      'call-history-was-created', 'call-was-connected', 'call-was-answered',
      'agent_login', 'agent_logout', 'agent-status-was-changed',
      'manual-call-was-requested', 'campaign-was-started', 'campaign-was-paused',
    ]
    let event_type = body.event || body.type || null
    let eventData  = body

    if (!event_type) {
      const key = Object.keys(body).find(k => KNOWN_EVENTS.includes(k))
      if (key) {
        event_type = key
        eventData  = body[key] || {}
      } else {
        event_type = Object.keys(body)[0] || 'unknown'
        eventData  = body[event_type] || body
      }
    }

    // Extrai callHistory se presente
    const ch         = eventData.callHistory || eventData
    const agent_name = ch.agent?.name || eventData.agent_name || null
    const call_id    = String(ch.telephony_id || ch._id || ch.id || ch.call_id || '')
    const phone      = ch.number || ch.phone || ch.to || null
    const duration   = Number(ch.speaking_time || ch.billed_time || ch.duration || 0)
    const campaign   = ch.campaign?.name || ch.campaign_name || null
    const started_at = ch.call_date || ch.created_at || eventData.bootTime || null
    const result     = ch.qualification?.name || ch.result || ch.disposition || null

    console.log(`[3c webhook] ${event_type} | agente: ${agent_name} | call: ${call_id} | ${duration}s`)

    // Salva o evento
    await pool.query(
      `INSERT INTO threec_events (event_type, agent_name, call_id, payload) VALUES ($1,$2,$3,$4)`,
      [event_type, agent_name, call_id, JSON.stringify(body)]
    )

    // Persiste chamada se for evento de histórico
    if (call_id && ['call-history-was-created', 'call-was-connected', 'call-was-answered'].includes(event_type)) {
      await pool.query(`
        INSERT INTO threec_calls (call_id, agent_name, phone, duration, result, campaign, started_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (call_id) DO UPDATE SET
          duration   = EXCLUDED.duration,
          result     = EXCLUDED.result,
          agent_name = COALESCE(EXCLUDED.agent_name, threec_calls.agent_name),
          campaign   = COALESCE(EXCLUDED.campaign, threec_calls.campaign)
      `, [call_id, agent_name, phone, duration, result, campaign, started_at])
    }

    res.json({ ok: true, event_type, call_id })
  } catch (err) {
    console.error('[3c webhook error]', err)
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

// ── Diagnóstico de duplicatas ──────────────────────────────
app.get('/api/skale/debug-duplicates', async (req, res) => {
  try {
    const { rows: dupes } = await pool.query(`
      SELECT customer_name, COUNT(*) as total,
             array_agg(external_id ORDER BY started_at DESC) as external_ids,
             array_agg(DISTINCT status) as statuses,
             array_agg(DISTINCT payment_status) as pay_statuses,
             array_agg(DISTINCT product_name) as products
      FROM skale_orders
      WHERE is_test = FALSE
      GROUP BY customer_name
      HAVING COUNT(*) > 3
      ORDER BY total DESC
      LIMIT 30
    `)

    // Ver eventos recentes da skale para entender o payload
    const { rows: events } = await pool.query(`
      SELECT entity_id as external_id, event_type, payload, created_at
      FROM skale_events
      WHERE source = 'skale'
      ORDER BY created_at DESC
      LIMIT 10
    `)

    // Ver sample dos pedidos da Rosa (ou quem tiver mais)
    const topName = dupes[0]?.customer_name
    const { rows: sample } = topName ? await pool.query(`
      SELECT id, external_id, status, payment_status, total_price, started_at, updated_at
      FROM skale_orders
      WHERE customer_name = $1 AND is_test = FALSE
      ORDER BY started_at DESC
    `, [topName]) : { rows: [] }

    res.json({ duplicates: dupes, recentEvents: events, sampleOrders: sample, topName })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Orders API ─────────────────────────────────────────────

app.get('/api/skale/orders', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || '10000'), 10000)
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

// ── DataCrazy CRM — proxy ─────────────────────────────────

const DC_TOKEN = process.env.DC_TOKEN || ''
const DC_BASE  = 'https://api.g1.datacrazy.io/api/v1'

async function dcFetch(path, params = {}) {
  const qs = new URLSearchParams(params)
  const url = `${DC_BASE}${path}${qs.toString() ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${DC_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`DC API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

// Leads (com search e paginação)
app.get('/api/dc/leads', async (req, res) => {
  try {
    const params = { skip: req.query.skip || 0, take: req.query.take || 200 }
    if (req.query.search) params.search = req.query.search
    const data = await dcFetch('/leads', params)
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// Negócios (deals — won / in_process / lost)
app.get('/api/dc/businesses', async (req, res) => {
  try {
    const params = { skip: req.query.skip || 0, take: req.query.take || 500 }
    if (req.query.status && req.query.status !== 'all') params['filter[status]'] = req.query.status
    const data = await dcFetch('/businesses', params)
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// Conversas
app.get('/api/dc/conversations', async (req, res) => {
  try {
    const params = { skip: req.query.skip || 0, take: req.query.take || 100 }
    if (req.query.search) params.search = req.query.search
    const data = await dcFetch('/conversations', params)
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// Produtos
app.get('/api/dc/products', async (req, res) => {
  try {
    const data = await dcFetch('/products', { skip: 0, take: 200 })
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// Stats agregado (paralelo para não estourar rate limit do cliente)
app.get('/api/dc/stats', async (req, res) => {
  try {
    const [leads, won, inProcess, lost] = await Promise.all([
      dcFetch('/leads',      { skip: 0, take: 1 }),
      dcFetch('/businesses', { skip: 0, take: 1, 'filter[status]': 'won' }),
      dcFetch('/businesses', { skip: 0, take: 1, 'filter[status]': 'in_process' }),
      dcFetch('/businesses', { skip: 0, take: 1, 'filter[status]': 'lost' }),
    ])
    // ATENÇÃO: na API DC, "total" = soma monetária, "count" = quantidade de registros
    const totalLeads     = leads?.count     ?? (Array.isArray(leads) ? leads.length : 0)
    const wonDeals       = won?.count       ?? (Array.isArray(won) ? won.length : 0)
    const wonValue       = won?.total       ?? 0   // soma monetária dos ganhos em R$
    const inProcessDeals = inProcess?.count ?? (Array.isArray(inProcess) ? inProcess.length : 0)
    const lostDeals      = lost?.count      ?? (Array.isArray(lost) ? lost.length : 0)
    res.json({ totalLeads, wonDeals, wonValue, inProcessDeals, lostDeals })
  } catch (err) {
    res.status(502).json({ error: err.message })
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
