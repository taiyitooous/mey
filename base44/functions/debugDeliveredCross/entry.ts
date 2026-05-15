import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // Busca todos os pedidos entregues
  const deliveredOrders = await db.Order.filter({ logistics_status: 'delivered' }, '-delivered_at', 500);

  // Busca eventos 123Log
  const events123Log = await db.Event.filter({ event_type: '123log.tracking' }, '-created_date', 500);

  // Mapa: order_id -> 123Log status
  const order123LogMap = {};
  for (const ev of events123Log) {
    try {
      const payload = JSON.parse(ev.payload || '{}');
      const orderNum = payload.sale_order?.order_number || payload.sale_order?.id || ev.entity_id;
      if (!order123LogMap[orderNum]) {
        order123LogMap[orderNum] = {
          status: payload.delivery?.status,
          tracking_code: payload.delivery?.tracking_code,
          carrier: payload.delivery?.carrier,
          event_created_at: ev.created_date,
        };
      }
    } catch {}
  }

  // Classify pedidos
  const skaleOnly = [];
  const skaleAnd123Log = [];
  const totalValue = { skale: 0, both: 0 };

  for (const order of deliveredOrders) {
    const has123Log = !!order123LogMap[order.order_id];
    const value = order.amount || 0;

    if (has123Log) {
      skaleAnd123Log.push({
        order_id: order.order_id,
        customer: order.customer_name,
        value,
        payment_status: order.payment_status,
        delivered_at: order.delivered_at?.substring(0, 10),
        tracking_code: order.tracking_code,
      });
      totalValue.both += value;
    } else {
      skaleOnly.push({
        order_id: order.order_id,
        customer: order.customer_name,
        value,
        payment_status: order.payment_status,
        delivered_at: order.delivered_at?.substring(0, 10),
      });
      totalValue.skale += value;
    }
  }

  const paidFromBoth = skaleAnd123Log.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.value, 0);
  const paidFromSkaleOnly = skaleOnly.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.value, 0);

  return Response.json({
    total_delivered: deliveredOrders.length,
    from_skale_only: skaleOnly.length,
    from_skale_and_123log: skaleAnd123Log.length,
    total_value: {
      skale_only: totalValue.skale,
      skale_and_123log: totalValue.both,
      grand_total: totalValue.skale + totalValue.both,
    },
    paid_value: {
      skale_only: paidFromSkaleOnly,
      skale_and_123log: paidFromBoth,
      grand_total: paidFromSkaleOnly + paidFromBoth,
    },
    sample_skale_and_123log: skaleAnd123Log.slice(0, 5),
    sample_skale_only: skaleOnly.slice(0, 5),
  });
});