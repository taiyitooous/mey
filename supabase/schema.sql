-- Tabela de eventos (todas as integrações)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  entity_type text,
  entity_id   text,
  event_type  text not null,
  user_name   text,
  source      text,
  payload     jsonb,
  created_at  timestamptz default now()
);

-- Tabela de pedidos Skale
create table if not exists skale_orders (
  id               uuid primary key default gen_random_uuid(),
  external_id      text unique,
  source           text default 'skale',
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  customer_doc     text,
  customer_address jsonb,
  product_name     text,
  product_sku      text,
  product_quantity int default 1,
  status           text default 'processing',
  payment_status   text,
  payment_method   text,
  total_price      numeric default 0,
  paid_at          timestamptz,
  tracking_code    text,
  tracking_url     text,
  carrier          text,
  seller_key       text,
  seller_name      text,
  platform         text,
  note             text,
  checkout_url     text,
  is_test          boolean default false,
  started_at       timestamptz,
  updated_at       timestamptz default now()
);

-- Realtime
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table skale_orders;
