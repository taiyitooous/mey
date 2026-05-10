import { Router } from 'express'
import { pool } from './db.js'

const router = Router()

const ENTITY_MAP = {
  'sellers':           { table: 'sellers',           idCol: 'id', orderCol: 'name' },
  'sale-records':      { table: 'sale_records',      idCol: 'id', orderCol: 'created_date' },
  'lead-daily-counts': { table: 'lead_daily_counts', idCol: 'id', orderCol: 'created_date' },
  'teams':             { table: 'teams',             idCol: 'id', orderCol: 'name' },
  'products':          { table: 'products',          idCol: 'id', orderCol: 'name' },
  'events':            { table: 'mey_events',        idCol: 'id', orderCol: 'created_date' },
  'leads':             { table: 'leads',             idCol: 'id', orderCol: 'created_date' },
  'tasks':             { table: 'tasks',             idCol: 'id', orderCol: 'created_date' },
  'seller-configs':    { table: 'seller_configs',    idCol: 'id', orderCol: 'created_date' },
  'wavoip-configs':    { table: 'wavoip_configs',    idCol: 'id', orderCol: 'created_date' },
  'lead-snapshots':    { table: 'lead_snapshots',    idCol: 'id', orderCol: 'snapshot_date' },
  'users':             { table: 'sellers',           idCol: 'id', orderCol: 'name' },
  'orders':            { table: 'skale_orders',      idCol: 'id', orderCol: 'updated_at' },
}

const ALLOWED_COLS = {
  sellers:           ['name', 'team_id', 'active'],
  sale_records:      ['date', 'seller_name', 'customer_name', 'items', 'total', 'payment_done', 'type'],
  lead_daily_counts: ['date', 'seller_name', 'lead_count'],
  teams:             ['name', 'leader_name', 'color', 'active'],
  products:          ['name', 'default_price', 'active'],
  mey_events:        ['event_type', 'user_name', 'user_email', 'entity_type', 'entity_id', 'source', 'payload'],
  leads:             ['name', 'phone', 'email', 'seller_name', 'status', 'stage', 'notes'],
  tasks:             ['title', 'entity_type', 'entity_id', 'action', 'due_date', 'status'],
  seller_configs:    ['seller_key', 'meta_json'],
  wavoip_configs:    ['user_name', 'phone', 'active'],
  lead_snapshots:    ['snapshot_date', 'total_leads', 'leads_by_stage', 'leads_by_seller', 'leads_by_status', 'total_expected_value', 'new_leads_count', 'won_leads_count', 'lost_leads_count'],
  skale_orders:      [],
}

function parseOrder(orderStr, defaultCol) {
  if (!orderStr) return { col: defaultCol, dir: 'DESC' }
  const desc = orderStr.startsWith('-')
  const col = orderStr.replace(/^-/, '').replace(/[^a-z_]/g, '')
  return { col: col || defaultCol, dir: desc ? 'DESC' : 'ASC' }
}

function buildWhere(entity, query) {
  const allowed = ALLOWED_COLS[entity] || []
  const conditions = []
  const values = []
  for (const [key, val] of Object.entries(query)) {
    if (allowed.includes(key) && val !== undefined) {
      values.push(val)
      conditions.push(`${key} = $${values.length}`)
    }
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values }
}

// Normalized orders query for Dashboard compatibility
const ORDERS_NORMALIZED_SQL = `
  SELECT
    id::text,
    external_id,
    customer_name,
    seller_name,
    seller_key,
    platform,
    tracking_code,
    carrier,
    status        AS logistics_status,
    CASE
      WHEN payment_status ILIKE 'pago'        THEN 'paid'
      WHEN payment_status ILIKE 'confirmado'  THEN 'paid'
      WHEN payment_status ILIKE 'aprovado'    THEN 'paid'
      ELSE LOWER(COALESCE(payment_status, 'pending'))
    END           AS payment_status,
    COALESCE(collection_status, '') AS collection_status,
    total_price   AS amount,
    paid_at,
    delivered_at,
    started_at    AS created_date,
    updated_at
  FROM skale_orders
  WHERE is_test = FALSE
`

// LIST / FILTER
router.get('/:entity', async (req, res) => {
  const cfg = ENTITY_MAP[req.params.entity]
  if (!cfg) return res.status(404).json({ error: 'Unknown entity' })

  const { order, limit = 1000, ...filters } = req.query
  const lim = Math.min(parseInt(limit) || 1000, 5000)

  // Special normalized view for orders (Dashboard compat)
  if (cfg.table === 'skale_orders') {
    try {
      const { col, dir } = parseOrder(order, 'started_at')
      const { rows } = await pool.query(
        `${ORDERS_NORMALIZED_SQL} ORDER BY ${col} ${dir} LIMIT $1`, [lim]
      )
      return res.json(rows)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  const { col, dir } = parseOrder(order, cfg.orderCol)
  const { where, values } = buildWhere(cfg.table, filters)

  try {
    const { rows } = await pool.query(
      `SELECT * FROM ${cfg.table} ${where} ORDER BY ${col} ${dir} LIMIT ${lim}`,
      values
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET ONE
router.get('/:entity/:id', async (req, res) => {
  const cfg = ENTITY_MAP[req.params.entity]
  if (!cfg) return res.status(404).json({ error: 'Unknown entity' })

  try {
    const { rows } = await pool.query(
      `SELECT * FROM ${cfg.table} WHERE ${cfg.idCol} = $1`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// CREATE
router.post('/:entity', async (req, res) => {
  const cfg = ENTITY_MAP[req.params.entity]
  if (!cfg) return res.status(404).json({ error: 'Unknown entity' })

  const allowed = ALLOWED_COLS[cfg.table] || []
  const data = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  )

  if (!Object.keys(data).length) return res.status(400).json({ error: 'No valid fields' })

  const cols = Object.keys(data)
  const vals = Object.values(data)
  const placeholders = cols.map((_, i) => `$${i + 1}`)

  try {
    const { rows } = await pool.query(
      `INSERT INTO ${cfg.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      vals
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// UPDATE (PATCH)
router.patch('/:entity/:id', async (req, res) => {
  const cfg = ENTITY_MAP[req.params.entity]
  if (!cfg) return res.status(404).json({ error: 'Unknown entity' })

  const allowed = ALLOWED_COLS[cfg.table] || []
  const data = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  )

  if (!Object.keys(data).length) return res.status(400).json({ error: 'No valid fields' })

  const sets = Object.keys(data).map((k, i) => `${k} = $${i + 1}`)
  const vals = [...Object.values(data), req.params.id]

  try {
    const { rows } = await pool.query(
      `UPDATE ${cfg.table} SET ${sets.join(', ')} WHERE ${cfg.idCol} = $${vals.length} RETURNING *`,
      vals
    )
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE
router.delete('/:entity/:id', async (req, res) => {
  const cfg = ENTITY_MAP[req.params.entity]
  if (!cfg) return res.status(404).json({ error: 'Unknown entity' })

  try {
    await pool.query(
      `DELETE FROM ${cfg.table} WHERE ${cfg.idCol} = $1`,
      [req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
