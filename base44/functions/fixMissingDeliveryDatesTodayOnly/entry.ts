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

    // Busca pedidos com logistics_status = 'delivered' mas SEM delivered_at
    const allDelivered = await db.Order.filter({ logistics_status: 'delivered' }, '-created_date', 1000);
    const missingDeliveryDate = allDelivered.filter(o => !o.delivered_at);

    // Filtra apenas os que foram CRIADOS hoje
    const toUpdateTodayOnly = missingDeliveryDate.filter(o => {
      if (!o.created_date) return false;
      const createdDate = format(new Date(o.created_date), 'yyyy-MM-dd');
      return createdDate === todayStr;
    });

    console.log(`Found ${toUpdateTodayOnly.length} orders created today without delivered_at`);

    let updated = 0;
    for (const order of toUpdateTodayOnly) {
      const deliveryDate = order.created_date ? new Date(order.created_date).toISOString() : new Date().toISOString();
      await db.Order.update(order.id, {
        delivered_at: deliveryDate,
      });
      updated++;
    }

    // Agora contar quantos estão "delivered" hoje
    const allDeliveredAfterUpdate = await db.Order.filter({ logistics_status: 'delivered' }, '-created_date', 1000);
    const deliveredToday = allDeliveredAfterUpdate.filter(o => {
      if (!o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate === todayStr;
    });

    const totalToday = deliveredToday.reduce((s, o) => s + (o.amount || 0), 0);

    return Response.json({
      message: `Updated ${updated} orders from today with missing delivered_at`,
      updated_count: updated,
      today: todayStr,
      delivered_today_count: deliveredToday.length,
      delivered_today_total: totalToday,
      expected_from_mey: 31,
      difference: 31 - deliveredToday.length,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});