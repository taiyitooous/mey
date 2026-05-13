import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Busca TODOS os pedidos com logistics_status = 'delivered'
    const allDelivered = await db.Order.filter({ logistics_status: 'delivered' }, '-created_date', 1000);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');

    // Separa em dois grupos:
    // 1. Com delivered_at hoje
    const withDeliveryDateToday = allDelivered.filter(o => {
      if (!o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate === todayStr;
    });

    // 2. Sem delivered_at (data faltando)
    const missingDeliveryDate = allDelivered.filter(o => !o.delivered_at);

    // 3. Com delivered_at mas em data diferente
    const withDeliveryDateOtherDays = allDelivered.filter(o => {
      if (!o.delivered_at) return false;
      const deliveryDate = format(new Date(o.delivered_at), 'yyyy-MM-dd');
      return deliveryDate !== todayStr;
    });

    return Response.json({
      total_delivered_status: allDelivered.length,
      with_delivery_date_today: withDeliveryDateToday.length,
      missing_delivery_date: missingDeliveryDate.length,
      with_delivery_date_other_days: withDeliveryDateOtherDays.length,
      
      missing_list: missingDeliveryDate.map(o => ({
        order_id: o.order_id,
        amount: o.amount,
        created_date: o.created_date,
        customer_name: o.customer_name,
        payment_status: o.payment_status,
      })).slice(0, 30),

      expected_from_mey: 31,
      difference: 31 - withDeliveryDateToday.length,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});