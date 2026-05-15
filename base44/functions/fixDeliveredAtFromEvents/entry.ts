import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Corrige pedidos onde delivered_at foi gravado com a data do webhook (horário atual)
// em vez da data real de entrega vinda do histórico do 123Log.
// Estratégia: faz o match via tracking_code entre Order e Event 123Log.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // Busca todos os pedidos entregues
  const orders = await db.Order.list('-created_date', 2000);
  const deliveredOrders = orders.filter(o => o.logistics_status === 'delivered' && o.delivered_at && o.tracking_code);

  // Busca todos os eventos 123Log (últimos 10000)
  const events = await db.Event.filter({ event_type: '123log.tracking' }, '-created_date', 5000);

  console.log('[Fix] Pedidos entregues com tracking:', deliveredOrders.length);
  console.log('[Fix] Eventos 123Log:', events.length);

  // Monta mapa: tracking_code -> data real de entrega (via código BD nos Correios)
  const DELIVERY_CODES = new Set(['BD', 'BDE', 'BDI', 'BDR']);
  const realDeliveryByTracking = {};

  for (const ev of events) {
    try {
      const payload = JSON.parse(ev.payload || '{}');
      const trackingCode = payload.delivery?.tracking_code;
      if (!trackingCode) continue;

      // Busca no history o evento de entrega real (código BD*)
      const history = payload.delivery?.history || [];
      const deliveryEntry = history.find(h => DELIVERY_CODES.has(h.code));

      if (deliveryEntry?.date) {
        const realDate = new Date(deliveryEntry.date).toISOString();
        const existing = realDeliveryByTracking[trackingCode];
        // Guarda a mais antiga
        if (!existing || realDate < existing) {
          realDeliveryByTracking[trackingCode] = realDate;
        }
      }

      // Também considera delivery.status === 'delivered' com last_event.date
      if (payload.delivery?.status === 'delivered' && payload.delivery?.last_event?.date) {
        const realDate = new Date(payload.delivery.last_event.date).toISOString();
        const existing = realDeliveryByTracking[trackingCode];
        if (!existing || realDate < existing) {
          realDeliveryByTracking[trackingCode] = realDate;
        }
      }
    } catch {
      // ignora payloads inválidos
    }
  }

  console.log('[Fix] Trackings com data real encontrada:', Object.keys(realDeliveryByTracking).length);

  const fixed = [];
  const skipped = [];

  for (const order of deliveredOrders) {
    const realDate = realDeliveryByTracking[order.tracking_code];
    if (!realDate) {
      skipped.push({ order_id: order.order_id, tracking: order.tracking_code, reason: 'no_event_found' });
      continue;
    }

    const currentDelivered = new Date(order.delivered_at);
    const realDelivered = new Date(realDate);

    // Corrige se a data atual difere por mais de 6 horas da data real
    const diffHours = (currentDelivered - realDelivered) / (1000 * 60 * 60);
    if (Math.abs(diffHours) > 6) {
      await db.Order.update(order.id, { delivered_at: realDate });
      fixed.push({
        order_id: order.order_id,
        customer_name: order.customer_name,
        tracking_code: order.tracking_code,
        old_delivered_at: order.delivered_at,
        new_delivered_at: realDate,
        diff_hours: diffHours.toFixed(1),
      });
      console.log(`[Fix] Corrigido ${order.order_id} (${order.customer_name}): ${order.delivered_at} → ${realDate} (${diffHours.toFixed(1)}h)`);
    }
  }

  return Response.json({
    success: true,
    total_delivered: deliveredOrders.length,
    total_with_real_date: Object.keys(realDeliveryByTracking).length,
    fixed_count: fixed.length,
    skipped_count: skipped.length,
    fixed,
    sample_skipped: skipped.slice(0, 5),
  });
});