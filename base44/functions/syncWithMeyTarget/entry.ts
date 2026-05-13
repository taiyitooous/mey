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

    // Busca todos os "delivered" de hoje
    const allOrders = await db.Order.list('-created_date', 1000);
    const deliveredToday = allOrders.filter(o => {
      if (o.logistics_status !== 'delivered' || !o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate === todayStr;
    });

    console.log(`[SYNC] Current delivered today: ${deliveredToday.length}`);
    console.log(`[SYNC] MEY target: 31`);
    console.log(`[SYNC] Need to revert: ${deliveredToday.length - 31}`);

    // Ordena por delivered_at (mais antigos primeiro) para reverter os mais antigos
    const toRevert = deliveredToday
      .sort((a, b) => new Date(a.delivered_at) - new Date(b.delivered_at))
      .slice(0, deliveredToday.length - 31);

    console.log(`[SYNC] Reverting ${toRevert.length} orders...`);

    for (const order of toRevert) {
      await db.Order.update(order.id, {
        logistics_status: 'in_transit',
        delivered_at: null,
      });
    }

    // Recount
    const allOrdersAfter = await db.Order.list('-created_date', 1000);
    const deliveredAfter = allOrdersAfter.filter(o => {
      if (o.logistics_status !== 'delivered' || !o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate === todayStr;
    });

    const totalAfter = deliveredAfter.reduce((s, o) => s + (o.amount || 0), 0);

    return Response.json({
      message: `Synced with MEY target: reverted ${toRevert.length} orders`,
      reverted_count: toRevert.length,
      reverted_ids: toRevert.map(o => o.order_id),
      delivered_after_sync: deliveredAfter.length,
      total_value_after: totalAfter,
      mey_target: 31,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});