import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Webhook da Skale — recebe eventos de pedido, pagamento e entrega
// IMPORTANTE: NÃO bloquear por body.test — Skale envia test=true em eventos reais também

const STATUS_LOGISTICA = {
  "pending": "created",
  "processing": "created",
  "shipped": "shipped",
  "in_transit": "in_transit",
  "delivered": "delivered",
  "failed": "failed",
  "returned": "failed",
  "canceled": "failed",
};

const STATUS_PAGAMENTO = {
  "paid": "paid",
  "approved": "paid",
  "Pago": "paid",
  "pago": "paid",
  "refunded": "refunded",
  "canceled": "canceled",
  "Cancelado": "canceled",
  "cancelado": "canceled",
  "pending": "pending",
  "Aguardando Pagamento": "pending",
  "aguardando pagamento": "pending",
};

function mapLogisticsStatus(skaleStatus, deliveryStatus) {
  if (deliveryStatus) {
    const lower = deliveryStatus.toLowerCase();
    if (lower.includes("entregue")) return "delivered";
    if (lower.includes("trânsito") || lower.includes("transito")) return "in_transit";
    if (lower.includes("enviado") || lower.includes("expedido")) return "shipped";
    if (lower.includes("devolvido") || lower.includes("falhou") || lower.includes("falha")) return "failed";
    if (lower.includes("cancelado")) return "failed";
  }
  if (skaleStatus) {
    return STATUS_LOGISTICA[skaleStatus] || "created";
  }
  return "created";
}

function mapPaymentStatus(paymentStatus) {
  if (!paymentStatus) return "pending";
  const key = paymentStatus.toLowerCase().trim();
  if (key === "pago" || key === "paid" || key === "approved" || key === "aprovado") return "paid";
  if (key === "cancelado" || key === "canceled" || key === "refunded") return "canceled";
  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', message: 'Skale webhook endpoint active' });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const rawBody = await req.text();
    console.log('[Skale] Raw body recebido (600 chars):', rawBody.substring(0, 600));

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.log('[Skale] ERRO: JSON inválido');
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Log diagnóstico — NÃO bloquear por test=true pois a Skale usa isso em eventos reais
    console.log(`[Skale] test=${body.test} | type=${body.type} | status=${body.status} | transaction_id=${body.transaction_id}`);

    const skale = body.skaletracking || {};
    const customer = body.customer || {};
    const transaction = body.transaction || {};
    const shipping = body.shipping || {};
    const product = body.product || {};

    const transactionId = String(body.transaction_id || skale.id_venda || '');

    if (!transactionId) {
      console.log('[Skale] AVISO: sem transaction_id, ignorando');
      return Response.json({ success: true, ignored: true, reason: 'no_transaction_id' });
    }

    const eventType  = skale.event || body.type || 'order_updated';
    const sellerName = skale.usuario_responsavel || skale.src_usuario || '';
    const sellerSrc  = skale.src_usuario || '';

    console.log(`[Skale] Processando event=${eventType} transaction_id=${transactionId}`);

    const logisticsStatus = mapLogisticsStatus(body.status, skale.status_entrega);
    const paymentStatus   = mapPaymentStatus(skale.status_pagamento || transaction.payment_status);
    const amount = product.price
      ? product.price / 100
      : (transaction.total_price ? transaction.total_price / 100 : null);

    const existingOrders = await db.Order.filter({ order_id: transactionId });
    let order = null;

    if (existingOrders.length > 0) {
      order = existingOrders[0];
      const updateData = {
        logistics_status: logisticsStatus,
        payment_status: paymentStatus,
      };
      if (transaction.payment_method)  updateData.payment_method = transaction.payment_method;
      if (shipping.tracking_code)      updateData.tracking_code  = shipping.tracking_code;
      if (shipping.service)            updateData.carrier         = shipping.service;
      if (logisticsStatus === 'delivered' && !order.delivered_at) updateData.delivered_at = new Date().toISOString();
      if (logisticsStatus === 'shipped'   && !order.shipped_at)   updateData.shipped_at   = new Date().toISOString();
      if (paymentStatus   === 'paid'      && !order.paid_at)      updateData.paid_at      = new Date().toISOString();

      await db.Order.update(order.id, updateData);
      console.log('[Skale] Pedido ATUALIZADO:', order.id, '| logistics:', logisticsStatus, '| payment:', paymentStatus);
    } else {
      const createData = {
        order_id: transactionId,
        customer_name: customer.name || '',
        customer_phone: customer.phone || '',
        logistics_status: logisticsStatus,
        payment_status: paymentStatus,
        amount,
        city:  customer.address?.city  || '',
        state: customer.address?.state || '',
        carrier:       shipping.service        || '',
        tracking_code: shipping.tracking_code  || '',
        payment_method: transaction.payment_method || null,
      };
      if (logisticsStatus === 'shipped')   createData.shipped_at   = new Date().toISOString();
      if (logisticsStatus === 'delivered') createData.delivered_at = new Date().toISOString();
      if (paymentStatus   === 'paid')      createData.paid_at      = new Date().toISOString();

      order = await db.Order.create(createData);
      console.log('[Skale] Pedido CRIADO:', order.id, '| logistics:', logisticsStatus, '| payment:', paymentStatus);
    }

    await db.Event.create({
      entity_type: 'order',
      entity_id:   order.id,
      event_type:  `order.${eventType.replace(/^order_?/, '')}`,
      user_name:   sellerName || 'Skale',
      user_email:  '',
      source:      'five_delivery',
      payload: JSON.stringify({
        transaction_id:   transactionId,
        status:           body.status,
        logistics_status: logisticsStatus,
        payment_status:   paymentStatus,
        tracking_code:    shipping.tracking_code,
        seller:           sellerName,
        seller_src:       sellerSrc,
        product:          product.name,
        observacao:       skale.observacao,
        is_test_flag:     body.test,
      }),
    });

    return Response.json({
      success:          true,
      action:           existingOrders.length > 0 ? 'updated' : 'created',
      order_id:         order.id,
      transaction_id:   transactionId,
      logistics_status: logisticsStatus,
      payment_status:   paymentStatus,
    });

  } catch (error) {
    console.error('[Skale] ERRO:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});