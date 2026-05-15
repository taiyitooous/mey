import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Preenche skale_created_at nos pedidos existentes a partir dos eventos brutos salvos
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // Busca todos os eventos brutos da Skale
  const events = await db.Event.filter({ event_type: 'skale.raw_payload', source: 'five_delivery' }, '-created_date', 5000);
  console.log(`[backfill] Eventos brutos encontrados: ${events.length}`);

  // Monta mapa: transaction_id -> skale_created_at
  const createdAtMap = {};
  for (const ev of events) {
    if (!ev.payload) continue;
    let body;
    try { body = JSON.parse(ev.payload); } catch { continue; }
    const tid = body.transaction_id || body.order_id;
    if (!tid) continue;
    const raw = body.transaction?.created_at || body.started_at;
    if (!raw) continue;
    // Guarda apenas a mais antiga (primeira criação)
    const d = new Date(raw);
    if (!createdAtMap[tid] || d < new Date(createdAtMap[tid])) {
      createdAtMap[tid] = d.toISOString();
    }
  }

  const idsWithDate = Object.keys(createdAtMap);
  console.log(`[backfill] transaction_ids com data: ${idsWithDate.length}`);

  // Busca todos os pedidos (sem skale_created_at) e processa em batches paralelos
  const allOrders = await db.Order.list('-created_date', 2000);
  const toFix = allOrders.filter(o => !o.skale_created_at && createdAtMap[o.order_id]);
  console.log(`[backfill] Pedidos a corrigir: ${toFix.length}`);

  // Processa em batches de 50 paralelos, com pausa entre batches pra não timeout
  const BATCH = 50;
  let fixed = 0;
  const batches = [];
  for (let i = 0; i < toFix.length; i += BATCH) {
    batches.push(toFix.slice(i, i + BATCH));
  }
  // Processa todos os batches em paralelo (é seguro pois são updates independentes)
  const results = await Promise.allSettled(
    batches.map(batch =>
      Promise.all(batch.map(order =>
        db.Order.update(order.id, { skale_created_at: createdAtMap[order.order_id] })
      ))
    )
  );
  results.forEach(r => { if (r.status === 'fulfilled') fixed += r.value.length; });

  return Response.json({
    events_scanned: events.length,
    ids_with_date: idsWithDate.length,
    total_orders: allOrders.length,
    orders_fixed: fixed,
    message: `${fixed} pedidos atualizados com skale_created_at`,
  });
});