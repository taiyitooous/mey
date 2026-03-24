import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Webhook recebido da DataCrazy para leads, pedidos, pagamentos e eventos
// Payload esperado: { type: 'lead'|'order'|'payment'|'event', data: {...} }
// ou para leads: { id, name, phone, rawPhone, email, source, attendant: { name, email }, ... }

Deno.serve(async (req) => {
  // Responde GET com status (usado pela DataCrazy para verificar o endpoint)
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', message: 'DataCrazy webhook endpoint active' });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const rawBody = await req.text();
    console.log('[DataCrazy] Raw body:', rawBody.substring(0, 500));

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[DataCrazy] Body não é JSON válido:', rawBody);
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Detecta tipo de dados (lead como padrão se não especificado)
    const dataType = body.type || 'lead';
    const data = body.lead || body.data || body;

    console.log('[DataCrazy] Tipo:', dataType, 'Data:', JSON.stringify(data).substring(0, 300));

    let result;

    if (dataType === 'lead') {
      // ===== PROCESSAMENTO DE LEADS =====
      const datacrazyId = data.id;
      const name = data.name || 'Sem nome';
      const phone = data.rawPhone || data.phone || '';
      const source = data.source || 'datacrazy';
      const sourceCampaign = data.sourceReferral?.sourceId || data.campaignName || '';
      const sellerName = data.attendant?.name || data.seller?.name || '';
      const sellerEmail = data.attendant?.email || data.seller?.email || '';

      if (!name && !phone) {
        console.warn('[DataCrazy] Lead sem nome e sem telefone, ignorando');
        return Response.json({ success: true, ignored: true, reason: 'no_name_or_phone' });
      }

      let existingLeads = [];
      if (datacrazyId) {
        existingLeads = await base44.asServiceRole.entities.Lead.filter({ lead_id: datacrazyId });
      }

      if (existingLeads.length > 0) {
        result = existingLeads[0];
        await base44.asServiceRole.entities.Lead.update(result.id, {
          name,
          phone,
          source: 'datacrazy',
          source_campaign: sourceCampaign,
          seller_name: sellerName || result.seller_name,
        });
        console.log('[DataCrazy] Lead atualizado:', result.id, name);

        await base44.asServiceRole.entities.Event.create({
          entity_type: 'lead',
          entity_id: result.id,
          event_type: 'lead.updated',
          user_name: sellerName || 'DataCrazy',
          user_email: sellerEmail || '',
          source: 'datacrazy',
          payload: JSON.stringify({ datacrazyId, source, phone }),
        });
      } else {
        result = await base44.asServiceRole.entities.Lead.create({
          lead_id: datacrazyId || '',
          name,
          phone,
          source: 'datacrazy',
          source_campaign: sourceCampaign,
          seller_name: sellerName,
          stage: 1,
          status: 'open',
        });
        console.log('[DataCrazy] Lead criado:', result.id, name);

        await base44.asServiceRole.entities.Event.create({
          entity_type: 'lead',
          entity_id: result.id,
          event_type: 'lead.created',
          user_name: sellerName || 'DataCrazy',
          user_email: sellerEmail || '',
          source: 'datacrazy',
          payload: JSON.stringify({ datacrazyId, source, phone }),
        });
      }

      return Response.json({
        success: true,
        action: existingLeads.length > 0 ? 'updated' : 'created',
        lead_id: result.id,
        name,
      });

    } else if (dataType === 'order') {
      // ===== PROCESSAMENTO DE PEDIDOS =====
      result = await base44.asServiceRole.entities.Order.create({
        order_id: data.order_id || data.id,
        lead_id: data.lead_id,
        customer_name: data.customer_name || data.name,
        customer_phone: data.customer_phone || data.phone,
        amount: data.amount,
        logistics_status: data.logistics_status || 'created',
        payment_status: data.payment_status || 'pending',
        payment_method: data.payment_method,
        city: data.city,
        state: data.state,
      });
      console.log('[DataCrazy] Pedido criado:', result.id);

      await base44.asServiceRole.entities.Event.create({
        entity_type: 'order',
        entity_id: result.id,
        event_type: 'order.created',
        user_name: data.seller_name || 'DataCrazy',
        user_email: data.seller_email || '',
        source: 'datacrazy',
        payload: JSON.stringify(data),
      });

      return Response.json({ success: true, order_id: result.id });

    } else if (dataType === 'payment') {
      // ===== PROCESSAMENTO DE PAGAMENTOS =====
      await base44.asServiceRole.entities.Order.update(data.order_id, {
        payment_status: data.payment_status || 'paid',
        payment_method: data.payment_method,
        paid_at: new Date().toISOString(),
      });
      console.log('[DataCrazy] Pagamento processado:', data.order_id);

      await base44.asServiceRole.entities.Event.create({
        entity_type: 'payment',
        entity_id: data.order_id,
        event_type: 'payment.paid',
        user_name: data.seller_name || 'DataCrazy',
        user_email: data.seller_email || '',
        source: 'datacrazy',
        payload: JSON.stringify(data),
      });

      return Response.json({ success: true, order_id: data.order_id });

    } else if (dataType === 'event') {
      // ===== PROCESSAMENTO DE EVENTOS =====
      result = await base44.asServiceRole.entities.Event.create({
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        event_type: data.event_type,
        user_name: data.user_name || 'DataCrazy',
        user_email: data.user_email || '',
        source: 'datacrazy',
        payload: JSON.stringify(data.payload || data),
      });
      console.log('[DataCrazy] Evento criado:', result.id);

      return Response.json({ success: true, event_id: result.id });

    } else {
      return Response.json({ error: `Tipo desconhecido: ${dataType}` }, { status: 400 });
    }

  } catch (error) {
    console.error('[DataCrazy] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});