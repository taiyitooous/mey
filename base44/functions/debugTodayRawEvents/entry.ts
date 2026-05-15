import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  // Pega pedidos entregues hoje (por delivered_at)
  const allDelivered = await db.Order.filter({ logistics_status: 'delivered' }, '-delivered_at', 500);
  const todayDelivered = allDelivered.filter(o =>
    o.delivered_at && new Date(o.delivered_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === todayStr
  );

  const orderIds = todayDelivered.map(o => o.order_id);

  // Busca eventos brutos desses pedidos
  const events = await db.Event.filter({ event_type: 'skale.raw_payload' }, '-created_date', 2000);
  const relevantEvents = events.filter(e => orderIds.includes(e.entity_id));

  // Extrai campos de data de cada evento
  const parsed = relevantEvents.map(e => {
    let body = {};
    try { body = JSON.parse(e.payload || '{}'); } catch {}
    return {
      transaction_id: body.transaction_id,
      started_at: body.started_at,
      transaction_created_at: body.transaction?.created_at,
      updated_at: body.updated_at,
      event_created_date: e.created_date?.substring(0, 10),
    };
  });

  // Pega um sample do primeiro pedido entregue hoje
  const firstOrder = todayDelivered[0];
  const firstEvents = parsed.filter(p => p.transaction_id === firstOrder?.order_id);

  return Response.json({
    today: todayStr,
    delivered_today_count: todayDelivered.length,
    total_raw_events: relevantEvents.length,
    first_order: firstOrder ? {
      order_id: firstOrder.order_id,
      customer_name: firstOrder.customer_name,
      skale_created_at: firstOrder.skale_created_at,
      created_date: firstOrder.created_date?.substring(0, 10),
      delivered_at: firstOrder.delivered_at?.substring(0, 10),
    } : null,
    first_order_events: firstEvents,
    all_parsed_sample: parsed.slice(0, 10),
  });
});