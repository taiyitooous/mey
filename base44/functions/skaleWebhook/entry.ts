import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Webhook da Skale — recebe eventos de pedido, pagamento e entrega
// Payload: { type, status, transaction_id, customer, product, transaction, shipping, skaletracking, ... }

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
  "refunded": "refunded",
  "canceled": "canceled",
  "Cancelado": "canceled",
  "pending": "pending",
  "Aguardando Pagamento": "pending",
};

function mapLogisticsStatus(skaleStatus, deliveryStatus) {
  if (deliveryStatus) {
    const lower = deliveryStatus.toLowerCase();
    if (lower.includes("entregue")) return "delivered";
    if (lower.includes("tr\u00e2nsito") || lower.includes("transito")) return "in_transit";
    if (lower.includes("enviado") || lower.includes("expedido")) return "shipped";
    if (lower.includes("devolvido") || lower.includes("falhou")) return "failed";
  }
  return STATUS_LOGISTICA[skaleStatus] || "created";
}

function mapPaymentStatus(paymentStatus) {
  if (!paymentStatus) return "pending";
  return STATUS_PAGAMENTO[paymentStatus] || "pending";
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
    console.log('[Skale] Raw body:', rawBody.substring(0, 600));

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Ignora eventos de teste
    if (body.test === true) {
      console.log('[Skale] Evento de teste ignorado');
      return Response.json({ success: true, ignored: true, reason: 'test_event' });
    }

    const skale = body.skaletracking || {};
    const customer = body.customer || {};
    const transaction = body.transaction || {};
    const shipping = body.shipping || {};
    const product = body.product || {};

    const transactionId = body.transaction_id || String(skale.id_venda || '');
    const eventType = skale.event || body.type || 'order_updated';
    const sellerName = skale.usuario_responsavel || '';
    const sellerSrc = skale.src_usuario || '';

    console.log(`[Skale] event=${eventType} transaction_id=${transactionId} status=${body.status}`);

    // Monta campos do pedido
    const logisticsStatus = mapLogisticsStatus(body.status, skale.status_entrega);
    const paymentStatus = mapPaymentStatus(skale.status_pagamento || transaction.payment_status);
    const amount = product.price ? product.price / 100 : (transaction.total_price ? transaction.total_price / 100 : null);

    // Busca ou cria o pedido
    let order = null;
    const existingOrders = await db.Order.filter({ order_id: transactionId });

    if (existingOrders.length > 0) {
      order = existingOrders[0];
      await db.Order.update(order.id, {
        logistics_status: logisticsStatus,
        payment_status: paymentStatus,
        payment_method: transaction.payment_method || order.payment_method,
        tracking_code: shipping.tracking_code || order.tracking_code,
        carrier: shipping.service || order.carrier,
        ...(logisticsStatus === 'delivered' && !order.delivered_at ? { delivered_at: new Date().toISOString() } : {}),
        ...(logisticsStatus === 'shipped' && !order.shipped_at ? { shipped_at: new Date().toISOString() } : {}),
        ...(paymentStatus === 'paid' && !order.paid_at ? { paid_at: new Date().toISOString() } : {}),
      });
      console.log('[Skale] Pedido atualizado:', order.id);
    } else {
      order = await db.Order.create({
        order_id: transactionId,
        customer_name: customer.name || '',
        customer_phone: customer.phone || '',
        logistics_status: logisticsStatus,
        payment_status: paymentStatus,
        payment_method: transaction.payment_method || null,
        amount,
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        carrier: shipping.service || '',
        tracking_code: shipping.tracking_code || '',
        ...(logisticsStatus === 'shipped' ? { shipped_at: new Date().toISOString() } : {}),
        ...(logisticsStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
        ...(paymentStatus === 'paid' ? { paid_at: new Date().toISOString() } : {}),
      });
      console.log('[Skale] Pedido criado:', order.id);
    }

    // Registra evento
    await db.Event.create({
      entity_type: 'order',
      entity_id: order.id,
      event_type: `order.${eventType.replace('order_', '')}`,
      user_name: sellerName || 'Skale',
      user_email: '',
      source: 'five_delivery',
      payload: JSON.stringify({
        transaction_id: transactionId,
        status: body.status,
        logistics_status: logisticsStatus,
        payment_status: paymentStatus,
        tracking_code: shipping.tracking_code,
        seller: sellerName,
        seller_src: sellerSrc,
        product: product.name,
        observacao: skale.observacao,
      }),
    });

    return Response.json({
      success: true,
      action: existingOrders.length > 0 ? 'updated' : 'created',
      order_id: order.id,
      transaction_id: transactionId,
      logistics_status: logisticsStatus,
      payment_status: paymentStatus,
    });

  } catch (error) {
    console.error('[Skale] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});