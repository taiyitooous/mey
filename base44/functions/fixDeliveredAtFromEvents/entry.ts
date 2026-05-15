import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Corrige delivered_at de pedidos onde foi gravado o horário do webhook (receivedAt)
// em vez da data real de entrega.
//
// Fonte da verdade: eventos skale.raw_payload com status="delivered"
// O campo body.updated_at contém a data real da entrega na Skale.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // Busca todos os eventos Skale (paginando)
  let allEvents = [];
  let skip = 0;
  const batchSize = 1000;
  while (true) {
    const batch = await db.Event.filter({ event_type: 'skale.raw_payload' }, '-created_date', batchSize, skip);
    allEvents = allEvents.concat(batch);
    if (batch.length < batchSize) break;
    skip += batchSize;
  }

  console.log('[Fix] Total de eventos skale.raw_payload:', allEvents.length);

  // Monta mapa: transaction_id -> data real de entrega (updated_at do payload Skale)
  const realDeliveryByOrderId = {};

  for (const ev of allEvents) {
    try {
      const payload = JSON.parse(ev.payload || '{}');
      if (payload.status !== 'delivered') continue;
      const transactionId = payload.transaction_id;
      if (!transactionId) continue;
      const updatedAt = payload.updated_at; // ex: "2026-05-15 16:07:00"
      if (!updatedAt) continue;

      // Converte para ISO (o formato é "YYYY-MM-DD HH:mm:ss" no fuso BR -03)
      const realDate = new Date(updatedAt + '-03:00').toISOString();

      const existing = realDeliveryByOrderId[transactionId];
      // Guarda a mais antiga (caso haja múltiplos eventos de entrega)
      if (!existing || realDate < existing) {
        realDeliveryByOrderId[transactionId] = realDate;
      }
    } catch {
      // ignora payloads inválidos
    }
  }

  console.log('[Fix] Pedidos com data real de entrega encontrada:', Object.keys(realDeliveryByOrderId).length);

  // Busca todos os pedidos entregues
  const orders = await db.Order.list('-created_date', 2000);
  const deliveredOrders = orders.filter(o => o.logistics_status === 'delivered' && o.delivered_at);

  console.log('[Fix] Pedidos entregues no banco:', deliveredOrders.length);

  const fixed = [];
  const skipped_no_event = [];

  for (const order of deliveredOrders) {
    const realDate = realDeliveryByOrderId[order.order_id];
    if (!realDate) {
      skipped_no_event.push(order.order_id);
      continue;
    }

    const currentMs = new Date(order.delivered_at).getTime();
    const realMs = new Date(realDate).getTime();
    const diffHours = (currentMs - realMs) / (1000 * 60 * 60);

    // Corrige se a data atual difere em mais de 6 horas da data real
    if (Math.abs(diffHours) > 6) {
      await db.Order.update(order.id, { delivered_at: realDate });
      fixed.push({
        order_id: order.order_id,
        customer_name: order.customer_name,
        old_delivered_at: order.delivered_at,
        new_delivered_at: realDate,
        diff_hours: diffHours.toFixed(1),
      });
      console.log(`[Fix] ✓ ${order.order_id} (${order.customer_name}): ${order.delivered_at} → ${realDate} (diff: ${diffHours.toFixed(1)}h)`);
    }
  }

  return Response.json({
    success: true,
    total_events_scanned: allEvents.length,
    total_orders_with_real_date: Object.keys(realDeliveryByOrderId).length,
    total_orders_delivered: deliveredOrders.length,
    fixed_count: fixed.length,
    skipped_no_event_count: skipped_no_event.length,
    fixed,
    sample_skipped: skipped_no_event.slice(0, 10),
  });
});