import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const allDelivered = await db.Order.filter({ logistics_status: 'delivered' }, '-delivered_at', 2000);

  // Agrupa por skale_created_at
  const bySkaleCreated = allDelivered.filter(o => {
    const ref = o.skale_created_at || o.created_date;
    return new Date(ref).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === todayStr;
  });

  const sum = arr => arr.reduce((s, o) => s + (o.amount || 0), 0);
  const pending = arr => arr.filter(o => o.payment_status !== 'paid').reduce((s, o) => s + (o.amount || 0), 0);
  const paid = arr => arr.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.amount || 0), 0);

  // Amostra dos primeiros 5
  const sample = bySkaleCreated.slice(0, 5).map(o => ({
    order_id: o.order_id,
    customer_name: o.customer_name,
    amount: o.amount,
    payment_status: o.payment_status,
    skale_created_at: o.skale_created_at?.substring(0, 10),
    created_date: o.created_date?.substring(0, 10),
    delivered_at: o.delivered_at?.substring(0, 10),
  }));

  // Conta quantos têm skale_created_at vs não têm
  const withSkaleDate = allDelivered.filter(o => !!o.skale_created_at).length;
  const withoutSkaleDate = allDelivered.filter(o => !o.skale_created_at).length;

  return Response.json({
    today: todayStr,
    total_delivered: allDelivered.length,
    with_skale_created_at: withSkaleDate,
    without_skale_created_at: withoutSkaleDate,
    delivered_with_skale_created_today: {
      count: bySkaleCreated.length,
      total: sum(bySkaleCreated),
      pending: pending(bySkaleCreated),
      paid: paid(bySkaleCreated),
    },
    sample,
  });
});