import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Data de hoje em São Paulo
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');

    // Busca todos os pedidos com logistics_status = 'delivered'
    const allDelivered = await db.Order.filter({ logistics_status: 'delivered' }, '-created_date', 500);

    // Filtra apenas os entregues HOJE
    const deliveredToday = allDelivered.filter(o => {
      if (!o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate === todayStr;
    });

    const total = deliveredToday.reduce((sum, o) => sum + (o.amount || 0), 0);
    const count = deliveredToday.length;

    return Response.json({
      today_date: todayStr,
      delivered_count: count,
      delivered_total: total,
      delivered_orders: deliveredToday.map(o => ({
        order_id: o.order_id,
        amount: o.amount,
        delivered_at: o.delivered_at,
        customer_name: o.customer_name,
        payment_status: o.payment_status,
      })),
      mey_expected: 14360,
      difference: total - 14360,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});