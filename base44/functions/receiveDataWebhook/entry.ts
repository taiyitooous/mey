import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  // Health check
  if (req.method === 'GET') {
    return Response.json({ status: 'ok' });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Validar tipo de dados
    const dataType = payload.type; // 'lead' | 'order' | 'payment' | 'event'
    const data = payload.data;

    if (!dataType || !data) {
      return Response.json({ error: 'Missing type or data' }, { status: 400 });
    }

    let result;

    switch (dataType) {
      case 'lead':
        result = await base44.asServiceRole.entities.Lead.create({
          name: data.name,
          phone: data.phone,
          source: data.source || 'manual',
          source_campaign: data.source_campaign,
          seller_id: data.seller_id,
          seller_name: data.seller_name,
          stage: data.stage || 1,
          status: data.status || 'open',
          value_expected: data.value_expected,
          notes: data.notes,
        });
        break;

      case 'order':
        result = await base44.asServiceRole.entities.Order.create({
          order_id: data.order_id,
          lead_id: data.lead_id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          logistics_status: data.logistics_status || 'created',
          city: data.city,
          state: data.state,
          carrier: data.carrier,
          tracking_code: data.tracking_code,
          amount: data.amount,
          payment_method: data.payment_method,
          payment_status: data.payment_status || 'pending',
        });
        break;

      case 'payment':
        result = await base44.asServiceRole.entities.Order.update(data.order_id, {
          payment_status: data.payment_status || 'paid',
          payment_method: data.payment_method,
          paid_at: new Date().toISOString(),
        });
        break;

      case 'event':
        result = await base44.asServiceRole.entities.Event.create({
          entity_type: data.entity_type, // 'lead' | 'order' | 'payment'
          entity_id: data.entity_id,
          event_type: data.event_type,
          payload: typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload || {}),
          user_name: data.user_name,
          user_email: data.user_email,
          source: data.source || 'manual',
        });
        break;

      default:
        return Response.json({ error: `Unknown type: ${dataType}` }, { status: 400 });
    }

    return Response.json({ success: true, id: result.id, type: dataType });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});