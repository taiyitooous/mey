import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Busca pedidos com logistics_status = 'delivered' mas SEM delivered_at
    const missingDeliveryDate = await db.Order.filter({ logistics_status: 'delivered' }, '-created_date', 1000);
    const toUpdate = missingDeliveryDate.filter(o => !o.delivered_at);

    let updated = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');

    for (const order of toUpdate) {
      // Usa created_date ou data de hoje como fallback
      const deliveryDate = order.created_date ? new Date(order.created_date).toISOString() : new Date().toISOString();
      
      await db.Order.update(order.id, {
        delivered_at: deliveryDate,
      });
      updated++;
    }

    return Response.json({
      message: `Updated ${updated} orders with missing delivered_at`,
      updated_count: updated,
      today: todayStr,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});