import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  // Busca todos os pedidos entregues
  const allOrders = await db.Order.filter({ logistics_status: 'delivered' }, '-delivered_at', 2000);

  // Filtra por delivered_at hoje
  const todayDelivered = allOrders.filter(o => {
    if (!o.delivered_at) return false;
    const d = new Date(o.delivered_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return d === todayStr;
  });

  // Busca eventos brutos de hoje para ver o payment_status original da Skale
  const events = await db.Event.filter({ source: 'five_delivery' }, '-created_date', 1000);
  const todayEvents = events.filter(e => {
    const d = new Date(e.created_date).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return d === todayStr;
  });

  // Mapa de transaction_id -> skale payment status
  const skaleStatusMap = {};
  for (const ev of todayEvents) {
    try {
      const payload = JSON.parse(ev.payload || '{}');
      const tid = payload.transaction_id || payload.order_id;
      const skalePayment = payload.skaletracking?.status_pagamento || '';
      const skaleDelivery = payload.skaletracking?.status_entrega || '';
      if (tid && (skaleDelivery.toLowerCase().includes('entregue') || skalePayment)) {
        skaleStatusMap[tid] = { skalePayment, skaleDelivery };
      }
    } catch {}
  }

  // Detalha pedidos entregues hoje com status Skale original
  const details = todayDelivered.map(o => ({
    order_id: o.order_id,
    amount: o.amount,
    payment_status_db: o.payment_status,
    skale_payment_status: skaleStatusMap[o.order_id]?.skalePayment || '(não encontrado)',
    skale_delivery_status: skaleStatusMap[o.order_id]?.skaleDelivery || '(não encontrado)',
  }));

  // Agrupa por skale_payment_status
  const bySkaleStatus = {};
  for (const d of details) {
    const k = d.skale_payment_status || 'unknown';
    if (!bySkaleStatus[k]) bySkaleStatus[k] = { count: 0, total: 0 };
    bySkaleStatus[k].count++;
    bySkaleStatus[k].total += d.amount || 0;
  }

  return Response.json({
    today: todayStr,
    total_delivered_today: todayDelivered.length,
    total_amount: todayDelivered.reduce((s, o) => s + (o.amount || 0), 0),
    breakdown_by_skale_payment_status: bySkaleStatus,
    details,
  });
});