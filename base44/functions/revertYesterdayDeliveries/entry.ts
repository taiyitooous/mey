import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format, subDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Data de hoje em São Paulo
    const todayUTC = new Date();
    const todayBR = new Date(todayUTC.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const yesterdayBR = subDays(todayBR, 1);
    yesterdayBR.setHours(0, 0, 0, 0);
    const yesterdayStr = format(yesterdayBR, 'yyyy-MM-dd');

    console.log(`Reverting deliveries from yesterday: ${yesterdayStr}`);

    // Busca pedidos com logistics_status = 'delivered' que foram CRIADOS ontem
    const allDelivered = await db.Order.filter({ logistics_status: 'delivered' }, '-created_date', 1000);
    const createdYesterday = allDelivered.filter(o => {
      if (!o.created_date) return false;
      const createdDate = format(new Date(o.created_date), 'yyyy-MM-dd');
      return createdDate === yesterdayStr;
    });

    console.log(`Found ${createdYesterday.length} orders created yesterday`);

    let reverted = 0;
    for (const order of createdYesterday) {
      // Reverte delivered_at para null
      await db.Order.update(order.id, {
        delivered_at: null,
      });
      reverted++;
    }

    // Recount
    const allDeliveredAfterRevert = await db.Order.filter({ logistics_status: 'delivered' }, '-created_date', 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');

    const deliveredToday = allDeliveredAfterRevert.filter(o => {
      if (!o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate === todayStr;
    });

    const totalToday = deliveredToday.reduce((s, o) => s + (o.amount || 0), 0);

    return Response.json({
      message: `Reverted ${reverted} orders from yesterday`,
      reverted_count: reverted,
      delivered_today_count: deliveredToday.length,
      delivered_today_total: totalToday,
      expected_from_mey: 31,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});