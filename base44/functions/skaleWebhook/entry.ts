import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method === 'GET') {
    return Response.json({ status: 'ok', message: 'Skale webhook endpoint active' }, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS_HEADERS });
  }

  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const rawBody = await req.text();
    const receivedAt = new Date().toISOString();

    console.log('[Skale] Payload recebido:', rawBody.substring(0, 500));

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = {};
    }

    // ── 123Log postback ──────────────────────────────────────────────────────
    if (body.type === 'TRACKING_STATUS_CHANGED') {
      const expectedKey = Deno.env.get('FIVEDELIVERY_WEBHOOK_SECRET');
      if (body.integration_key !== expectedKey) {
        console.log('[123Log] integration_key inválida');
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
      }

      const orderNumber = body.sale_order?.order_number || body.sale_order?.id;
      if (!orderNumber) {
        console.log('[123Log] Sem order_number, ignorando');
        return Response.json({ success: true, note: 'no_order_number' }, { headers: CORS_HEADERS });
      }

      // Salva evento bruto 123Log
      await db.Event.create({
        entity_type: 'order',
        entity_id: orderNumber,
        event_type: '123log.tracking',
        user_name: '123Log',
        user_email: '',
        source: 'five_delivery',
        payload: rawBody.substring(0, 10000),
      });

      // Mapear delivery.status → logistics_status
      const deliveryStatus = body.delivery?.status || '';
      let logisticsStatus = null;
      let deliveredAt = null;

      if (deliveryStatus === 'delivered') {
        logisticsStatus = 'delivered';
        deliveredAt = body.delivery?.last_event?.date
          ? new Date(body.delivery.last_event.date).toISOString()
          : receivedAt;
      } else if (deliveryStatus === 'out_for_delivery') {
        logisticsStatus = 'in_transit';
      } else if (['posted', 'object_in_transit', 'delivery_programmed'].includes(deliveryStatus)) {
        logisticsStatus = 'in_transit';
      } else if (['returned_to_sender', 'returned'].includes(deliveryStatus)) {
        logisticsStatus = 'failed';
      } else if (deliveryStatus === 'preparation' || body.sale_order?.status?.code === 'done') {
        logisticsStatus = 'shipped';
      }

      // Atualiza pedido se encontrar pelo order_id
      const existing = await db.Order.filter({ order_id: orderNumber });
      if (existing.length > 0) {
        const updateData = {};
        if (logisticsStatus) updateData.logistics_status = logisticsStatus;
        if (deliveredAt) updateData.delivered_at = deliveredAt;
        if (body.delivery?.tracking_code) updateData.tracking_code = body.delivery.tracking_code;
        if (body.delivery?.carrier) updateData.carrier = body.delivery.carrier;
        if (body.sale_order?.customer?.name) updateData.customer_name = body.sale_order.customer.name;
        if (body.sale_order?.customer?.phone) updateData.customer_phone = body.sale_order.customer.phone;

        if (Object.keys(updateData).length > 0) {
          await db.Order.update(existing[0].id, updateData);
          console.log('[123Log] Order atualizado:', orderNumber, '→', logisticsStatus, 'Campos:', Object.keys(updateData));
        }
      } else {
        console.log('[123Log] Pedido não encontrado no banco:', orderNumber);
      }

      return Response.json({ success: true, received: true, order_number: orderNumber, logistics_status: logisticsStatus }, { headers: CORS_HEADERS });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Salva evento bruto para auditoria
    await db.Event.create({
      entity_type: 'order',
      entity_id: body.transaction_id || 'skale-raw',
      event_type: 'skale.raw_payload',
      user_name: 'Skale',
      user_email: '',
      source: 'five_delivery',
      payload: rawBody.substring(0, 10000),
    });

    // Processar apenas eventos reais (não testes)
    if (body.test === true) {
      console.log('[Skale] Evento de teste ignorado para processamento de Order');
      return Response.json({ success: true, received: true, note: 'test_ignored' }, { headers: CORS_HEADERS });
    }

    const transactionId = body.transaction_id || body.order_id;
    if (!transactionId) {
      console.log('[Skale] Sem transaction_id, ignorando criação de Order');
      return Response.json({ success: true, received: true, note: 'no_transaction_id' }, { headers: CORS_HEADERS });
    }

    // Mapear status por tipo de evento específico da Skale
    const evento = body.skaletracking?.event || body.event || '';
    let paymentStatus = 'pending';
    let logisticsStatus = 'created';
    let paidAt = null;
    let deliveredAt = null;

    console.log('[Skale] Evento:', evento);

    // Status de pagamento vem de skaletracking.status_pagamento
    const skalePaymentStatus = body.skaletracking?.status_pagamento || body.transaction?.payment_status || '';
    const isAfterPay = skalePaymentStatus.toLowerCase().includes('after pay') || skalePaymentStatus.toLowerCase().includes('afterpay');

    if (isAfterPay) {
      // After Pay é modalidade separada na Skale — fica pending até confirmação real
      paymentStatus = 'pending';
    } else if (skalePaymentStatus.toLowerCase().includes('pago') || skalePaymentStatus.toLowerCase().includes('paid')) {
      paymentStatus = 'paid';
      paidAt = body.transaction?.paid_at || receivedAt;
      if (paidAt && typeof paidAt === 'string') paidAt = new Date(paidAt).toISOString();
    } else if (skalePaymentStatus.toLowerCase().includes('estornado') || skalePaymentStatus.toLowerCase().includes('refunded')) {
      paymentStatus = 'refunded';
    } else if (skalePaymentStatus.toLowerCase().includes('cancelado') || skalePaymentStatus.toLowerCase().includes('canceled')) {
      paymentStatus = 'canceled';
    }

    // Status de entrega vem de skaletracking.status_entrega
    const skaleDeliveryStatus = body.skaletracking?.status_entrega || body.status || '';
    if (skaleDeliveryStatus.toLowerCase().includes('entregue')) {
      logisticsStatus = 'delivered';
      deliveredAt = body.updated_at || receivedAt;
      if (deliveredAt && typeof deliveredAt === 'string') deliveredAt = new Date(deliveredAt).toISOString();
    } else if (skaleDeliveryStatus.toLowerCase().includes('trânsito') || skaleDeliveryStatus.toLowerCase().includes('transito')) {
      logisticsStatus = 'in_transit';
    } else if (skaleDeliveryStatus.toLowerCase().includes('postag') || skaleDeliveryStatus.toLowerCase().includes('enviado') || skaleDeliveryStatus.toLowerCase().includes('shipped')) {
      logisticsStatus = 'shipped';
    }

    // Valor já está em centavos na Skale
    const amount = (body.transaction?.total_price || body.product?.price || 0) / 100;

    // Mapear método de pagamento
    let paymentMethod = 'other';
    const method = (body.transaction?.payment_method || '').toLowerCase();
    if (method.includes('crédito') || method.includes('credit')) paymentMethod = 'card';
    else if (method.includes('pix')) paymentMethod = 'pix';
    else if (method.includes('boleto')) paymentMethod = 'boleto';

    // Quantidade de itens (usar transaction.quantity ou product.quantity)
    const quantity = body.transaction?.quantity || body.product?.quantity || 0;

    // Se o status é "delivered" mas não tem delivered_at, usa created_date como fallback
    let finalDeliveredAt = deliveredAt;
    if (logisticsStatus === 'delivered' && !finalDeliveredAt) {
      finalDeliveredAt = receivedAt;
    }

    // Data de criação do pedido na Skale (fonte da verdade para agrupamento por dia)
    let skaleCreatedAt = null;
    const rawSkaleCreated = body.transaction?.created_at || body.started_at;
    if (rawSkaleCreated) {
      skaleCreatedAt = new Date(rawSkaleCreated).toISOString();
    }

    const orderData = {
      order_id: transactionId,
      customer_name: body.customer?.name || '',
      customer_phone: body.customer?.phone || '',
      city: body.customer?.address?.city || '',
      state: body.customer?.address?.state || '',
      carrier: body.shipping?.service || '',
      tracking_code: body.shipping?.tracking_code || '',
      amount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      paid_at: paidAt,
      delivered_at: finalDeliveredAt,
      logistics_status: logisticsStatus,
      skale_created_at: skaleCreatedAt,
    };

    // Upsert — atualiza se já existe, cria se não existe
    // Apenas atualiza campos que realmente mudam por evento
    const existing = await db.Order.filter({ order_id: transactionId });
    if (existing.length > 0) {
      const updateData = {};
      
      // Atualizar apenas campos relevantes para este evento
      if (paymentStatus !== 'pending' || paidAt) {
        updateData.payment_status = paymentStatus;
        if (paidAt) updateData.paid_at = paidAt;
      }
      if (logisticsStatus !== 'created') {
        updateData.logistics_status = logisticsStatus;
        // Só grava delivered_at se ainda não existe — evita sobrescrever data real com evento posterior
        if (finalDeliveredAt && !existing[0].delivered_at) updateData.delivered_at = finalDeliveredAt;
      }
      if (paymentMethod !== 'other') updateData.payment_method = paymentMethod;
      if (body.tracking_code) updateData.tracking_code = body.tracking_code;
      // Salva skale_created_at se ainda não está preenchido (só na primeira vez)
      if (skaleCreatedAt && !existing[0].skale_created_at) updateData.skale_created_at = skaleCreatedAt;
      if (Object.keys(updateData).length > 0) {
        await db.Order.update(existing[0].id, updateData);
        console.log('[Skale] Order atualizado:', transactionId, 'Campos:', Object.keys(updateData));
      }
    } else {
      await db.Order.create(orderData);
      console.log('[Skale] Order criado:', transactionId);
    }

    return Response.json({
      success: true,
      received: true,
      timestamp: receivedAt,
      transaction_id: transactionId,
      payment_status: paymentStatus,
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('[Skale] ERRO:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
});