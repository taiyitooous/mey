import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS skale_orders (
      id               SERIAL PRIMARY KEY,
      external_id      TEXT UNIQUE,
      source           TEXT DEFAULT 'skale',
      customer_name    TEXT,
      customer_email   TEXT,
      customer_phone   TEXT,
      customer_doc     TEXT,
      customer_address JSONB,
      product_name     TEXT,
      product_sku      TEXT,
      product_quantity INT DEFAULT 1,
      status           TEXT DEFAULT 'processing',
      payment_status   TEXT,
      payment_method   TEXT,
      total_price      NUMERIC DEFAULT 0,
      paid_at          TIMESTAMPTZ,
      tracking_code    TEXT,
      tracking_url     TEXT,
      carrier          TEXT,
      seller_key       TEXT,
      seller_name      TEXT,
      platform         TEXT,
      note             TEXT,
      checkout_url     TEXT,
      is_test          BOOLEAN DEFAULT FALSE,
      started_at       TIMESTAMPTZ,
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS skale_events (
      id           SERIAL PRIMARY KEY,
      entity_type  TEXT,
      entity_id    TEXT,
      event_type   TEXT NOT NULL,
      user_name    TEXT,
      source       TEXT DEFAULT 'skale',
      payload      JSONB,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS threec_calls (
      id            SERIAL PRIMARY KEY,
      call_id       TEXT UNIQUE,
      agent_name    TEXT,
      agent_email   TEXT,
      phone         TEXT,
      duration      INT DEFAULT 0,
      result        TEXT,
      campaign      TEXT,
      started_at    TIMESTAMPTZ,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS threec_events (
      id         SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      agent_name TEXT,
      call_id    TEXT,
      payload    JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
