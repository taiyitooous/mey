import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Data de hoje em São Paulo
    const todayUTC = new Date();
    const todayBR = new Date(todayUTC.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    todayBR.setHours(0, 0, 0, 0);
    const todayStr = format(todayBR, 'yyyy-MM-dd');

    console.log(`[DEBUG] Checking Skale events from today: ${todayStr}`);

    // Busca eventos brutos do Skale
    const allEvents = await db.Event.filter({ source: 'five_delivery', event_type: 'skale.raw_payload' }, '-created_date', 1000);

    // Filtra de hoje
    const eventsToday = allEvents.filter(e => {
      if (!e.created_date) return false;
      const createdDate = format(new Date(e.created_date), 'yyyy-MM-dd');
      return createdDate === todayStr;
    });

    console.log(`[DEBUG] Found ${eventsToday.length} Skale events from today`);

    // Parse payloads e extrai transaction_ids
    const transactionIds = new Set();
    const eventsSummary = [];

    for (const event of eventsToday) {
      try {
        const payload = JSON.parse(event.payload);
        const txId = payload.transaction_id || payload.order_id;
        if (txId) {
          transactionIds.add(txId);
          eventsSummary.push({
            entity_id: event.entity_id,
            transaction_id: txId,
            payment_status: payload.skaletracking?.status_pagamento || 'unknown',
            delivery_status: payload.skaletracking?.status_entrega || 'unknown',
            created_date: event.created_date,
          });
        }
      } catch (e) {
        console.log(`[ERROR] Failed to parse event ${event.id}: ${e.message}`);
      }
    }

    console.log(`[DEBUG] Extracted ${transactionIds.size} unique transaction_ids from events`);

    // Agora busca os Orders com esses transaction_ids
    const allOrders = await db.Order.list('-created_date', 1000);
    const ordersFromWebhookToday = allOrders.filter(o => transactionIds.has(o.order_id));

    const deliveredCount = ordersFromWebhookToday.filter(o => o.logistics_status === 'delivered').length;
    const deliveredTotal = ordersFromWebhookToday
      .filter(o => o.logistics_status === 'delivered')
      .reduce((s, o) => s + (o.amount || 0), 0);

    // Identificar duplicatas ou inconsistências
    const ordersByStatus = {};
    for (const order of ordersFromWebhookToday) {
      const key = `${order.logistics_status}_${order.payment_status}`;
      if (!ordersByStatus[key]) ordersByStatus[key] = 0;
      ordersByStatus[key]++;
    }

    return Response.json({
      today: todayStr,
      webhook_events_today: eventsToday.length,
      unique_transaction_ids: transactionIds.size,
      orders_from_webhook: ordersFromWebhookToday.length,
      delivered_count: deliveredCount,
      delivered_total: deliveredTotal,
      orders_by_status: ordersByStatus,
      events_sample: eventsSummary.slice(0, 10),
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});