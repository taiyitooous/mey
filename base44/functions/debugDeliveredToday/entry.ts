import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  // Busca todos os pedidos entregues
  const allOrders = await db.Order.filter({ logistics_status: 'delivered' }, '-delivered_at', 2000);

  // Filtra por delivered_at hoje
  const byDeliveredAt = allOrders.filter(o => {
    if (!o.delivered_at) return false;
    const d = new Date(o.delivered_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return d === todayStr;
  });

  // Filtra por created_date hoje
  const byCreatedDate = allOrders.filter(o => {
    if (!o.created_date) return false;
    const d = new Date(o.created_date).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return d === todayStr;
  });

  const sumAmount = (arr) => arr.reduce((s, o) => s + (o.amount || 0), 0);
  const sumPaid = (arr) => arr.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.amount || 0), 0);

  // Pedidos sem delivered_at mas entregues
  const noDeliveredAt = allOrders.filter(o => !o.delivered_at);

  // Detalhes dos entregues hoje por delivered_at
  const details = byDeliveredAt.map(o => ({
    order_id: o.order_id,
    customer_name: o.customer_name,
    amount: o.amount,
    payment_status: o.payment_status,
    delivered_at: o.delivered_at,
    created_date: o.created_date,
  }));

  return Response.json({
    today: todayStr,
    total_delivered_all_time: allOrders.length,
    by_delivered_at_today: {
      count: byDeliveredAt.length,
      total_amount: sumAmount(byDeliveredAt),
      paid_amount: sumPaid(byDeliveredAt),
      pending_amount: sumAmount(byDeliveredAt) - sumPaid(byDeliveredAt),
    },
    by_created_date_today: {
      count: byCreatedDate.length,
      total_amount: sumAmount(byCreatedDate),
      paid_amount: sumPaid(byCreatedDate),
    },
    orders_without_delivered_at: noDeliveredAt.length,
    details_by_delivered_at: details,
  });
});