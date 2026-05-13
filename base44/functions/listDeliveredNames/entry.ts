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

    const allOrders = await db.Order.list('-created_date', 1000);
    const deliveredToday = allOrders.filter(o => {
      if (o.logistics_status !== 'delivered' || !o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate === todayStr;
    });

    const names = deliveredToday
      .sort((a, b) => new Date(a.delivered_at) - new Date(b.delivered_at))
      .map((o, i) => `${i + 1}. ${o.customer_name}`);

    return Response.json({
      count: deliveredToday.length,
      names,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});