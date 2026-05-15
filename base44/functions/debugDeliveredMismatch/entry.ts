import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  const allOrders = await db.Order.filter({ logistics_status: 'delivered' }, '-delivered_at', 2000);

  const todayDelivered = allOrders.filter(o => {
    if (!o.delivered_at) return false;
    return new Date(o.delivered_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === todayStr;
  });

  // Agrupa: criados hoje vs criados em outros dias
  const createdToday = todayDelivered.filter(o =>
    new Date(o.created_date).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === todayStr
  );
  const createdOtherDays = todayDelivered.filter(o =>
    new Date(o.created_date).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) !== todayStr
  );

  const sum = arr => arr.reduce((s, o) => s + (o.amount || 0), 0);
  const sumPending = arr => arr.filter(o => o.payment_status !== 'paid').reduce((s, o) => s + (o.amount || 0), 0);
  const sumPaid = arr => arr.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.amount || 0), 0);

  // Detalha os criados em outros dias
  const otherDaysDetails = createdOtherDays.map(o => ({
    order_id: o.order_id,
    customer_name: o.customer_name,
    amount: o.amount,
    payment_status: o.payment_status,
    created_date: o.created_date?.substring(0, 10),
    delivered_at: o.delivered_at?.substring(0, 10),
  }));

  return Response.json({
    today: todayStr,
    total_delivered_today_by_delivered_at: todayDelivered.length,
    total_amount: sum(todayDelivered),
    pending_amount: sumPending(todayDelivered),
    paid_amount: sumPaid(todayDelivered),
    created_today: {
      count: createdToday.length,
      total: sum(createdToday),
      pending: sumPending(createdToday),
      paid: sumPaid(createdToday),
    },
    created_other_days: {
      count: createdOtherDays.length,
      total: sum(createdOtherDays),
      pending: sumPending(createdOtherDays),
      paid: sumPaid(createdOtherDays),
      details: otherDaysDetails,
    },
    // O que a Skale provavelmente mostra: só pedidos criados hoje
    skale_equivalent_pending: sumPending(createdToday),
    skale_equivalent_paid: sumPaid(createdToday),
    skale_equivalent_total: sum(createdToday),
  });
});