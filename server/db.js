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

    CREATE TABLE IF NOT EXISTS sellers (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      team_id    TEXT,
      active     BOOLEAN DEFAULT true,
      created_date TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sale_records (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date          DATE NOT NULL,
      seller_name   TEXT NOT NULL,
      customer_name TEXT,
      items         TEXT,
      total         NUMERIC DEFAULT 0,
      payment_done  BOOLEAN DEFAULT false,
      type          TEXT DEFAULT 'sale',
      created_date  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lead_daily_counts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date        DATE NOT NULL,
      seller_name TEXT NOT NULL,
      lead_count  INTEGER DEFAULT 0,
      created_date TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teams (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name         TEXT NOT NULL,
      leader_name  TEXT NOT NULL,
      color        TEXT DEFAULT '#4F8F63',
      active       BOOLEAN DEFAULT true,
      created_date TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      default_price NUMERIC DEFAULT 0,
      active        BOOLEAN DEFAULT true,
      created_date  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mey_events (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type   TEXT,
      user_name    TEXT,
      user_email   TEXT,
      entity_type  TEXT,
      entity_id    TEXT,
      source       TEXT,
      payload      TEXT,
      created_date TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS leads (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name         TEXT,
      phone        TEXT,
      email        TEXT,
      seller_name  TEXT,
      status       TEXT DEFAULT 'open',
      stage        INTEGER DEFAULT 1,
      notes        TEXT,
      created_date TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title        TEXT NOT NULL,
      entity_type  TEXT,
      entity_id    TEXT,
      action       TEXT,
      due_date     DATE,
      status       TEXT DEFAULT 'pending',
      created_date TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS seller_configs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_key   TEXT UNIQUE NOT NULL,
      meta_json    TEXT,
      created_date TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wavoip_configs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_name    TEXT,
      phone        TEXT,
      active       BOOLEAN DEFAULT true,
      created_date TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lead_snapshots (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot_date       DATE NOT NULL,
      total_leads         INTEGER DEFAULT 0,
      leads_by_stage      TEXT,
      leads_by_seller     TEXT,
      leads_by_status     TEXT,
      total_expected_value NUMERIC DEFAULT 0,
      new_leads_count     INTEGER DEFAULT 0,
      won_leads_count     INTEGER DEFAULT 0,
      lost_leads_count    INTEGER DEFAULT 0,
      created_date        TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}
