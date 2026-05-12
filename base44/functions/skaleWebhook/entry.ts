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

    // Mapear status da Skale para o sistema
    // O status real do pagamento vem em transaction.payment_status ou skaletracking.status_pagamento
    const skalePaymentStatus = body.transaction?.payment_status || body.skaletracking?.status_pagamento || '';
    let paymentStatus = 'pending';
    const ps = skalePaymentStatus.toLowerCase();
    if (ps === 'pago' || ps === 'paid') paymentStatus = 'paid';
    else if (ps === 'estornado' || ps === 'refunded') paymentStatus = 'refunded';
    else if (ps === 'cancelado' || ps === 'canceled') paymentStatus = 'canceled';

    console.log('[Skale] payment_status mapeado:', skalePaymentStatus, '->', paymentStatus);

    let logisticsStatus = 'created';
    const deliveryStatus = body.skaletracking?.status_entrega || '';
    if (deliveryStatus.toLowerCase().includes('entregue')) logisticsStatus = 'delivered';
    else if (deliveryStatus.toLowerCase().includes('trânsito') || deliveryStatus.toLowerCase().includes('transito')) logisticsStatus = 'in_transit';
    else if (deliveryStatus.toLowerCase().includes('postag') || deliveryStatus.toLowerCase().includes('enviado')) logisticsStatus = 'shipped';

    const amount = (body.transaction?.total_price || body.product?.price || 0) / 100;
    const paidAt = body.transaction?.paid_at ? new Date(body.transaction.paid_at).toISOString() : (paymentStatus === 'paid' ? receivedAt : null);

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
      payment_method: body.transaction?.payment_method?.toLowerCase().includes('crédito') ? 'card'
        : body.transaction?.payment_method?.toLowerCase().includes('pix') ? 'pix'
        : body.transaction?.payment_method?.toLowerCase().includes('boleto') ? 'boleto'
        : 'other',
      paid_at: paidAt,
      logistics_status: logisticsStatus,
    };

    // Upsert — atualiza se já existe, cria se não existe
    const existing = await db.Order.filter({ order_id: transactionId });
    if (existing.length > 0) {
      await db.Order.update(existing[0].id, orderData);
      console.log('[Skale] Order atualizado:', transactionId);
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