import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const todayUTC = new Date();
    const todayBR = new Date(todayUTC.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    todayBR.setHours(0, 0, 0, 0);
    const todayStr = format(todayBR, 'yyyy-MM-dd');

    // ===== Do webhook: quais foram entregues hoje =====
    const allEvents = await db.Event.filter({ source: 'five_delivery', event_type: 'skale.raw_payload' }, '-created_date', 1000);
    const eventsToday = allEvents.filter(e => {
      if (!e.created_date) return false;
      const createdDate = format(new Date(e.created_date), 'yyyy-MM-dd');
      return createdDate === todayStr;
    });

    const webhookDelivered = new Set();
    for (const event of eventsToday) {
      try {
        const payload = JSON.parse(event.payload);
        const deliveryStatus = payload.skaletracking?.status_entrega || '';
        if (deliveryStatus.toLowerCase().includes('entregue')) {
          const txId = payload.transaction_id || payload.order_id;
          if (txId) webhookDelivered.add(txId);
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    console.log(`[Webhook] ${webhookDelivered.size} delivered today`);

    // ===== Do DB: quais estão marcados como delivered com delivered_at today =====
    const allOrders = await db.Order.list('-created_date', 1000);
    const dbDelivered = allOrders.filter(o => {
      if (o.logistics_status !== 'delivered' || !o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate === todayStr;
    });

    const dbDeliveredSet = new Set(dbDelivered.map(o => o.order_id));

    console.log(`[DB] ${dbDeliveredSet.size} delivered today`);

    // ===== Comparar =====
    const onlyInWebhook = Array.from(webhookDelivered).filter(id => !dbDeliveredSet.has(id));
    const onlyInDB = Array.from(dbDeliveredSet).filter(id => !webhookDelivered.has(id));

    const ordersInWebhookOnly = onlyInWebhook.length > 0 
      ? allOrders.filter(o => onlyInWebhook.includes(o.order_id)).slice(0, 10)
      : [];

    const ordersInDBOnly = onlyInDB.length > 0
      ? allOrders.filter(o => onlyInDB.includes(o.order_id)).slice(0, 10)
      : [];

    return Response.json({
      today: todayStr,
      webhook_delivered: webhookDelivered.size,
      db_delivered: dbDeliveredSet.size,
      only_in_webhook: onlyInWebhook.length,
      only_in_db: onlyInDB.length,
      webhook_only_sample: onlyInWebhook.slice(0, 5),
      db_only_sample: onlyInDB.slice(0, 5),
      orders_in_webhook_only: ordersInWebhookOnly,
      orders_in_db_only: ordersInDBOnly,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});