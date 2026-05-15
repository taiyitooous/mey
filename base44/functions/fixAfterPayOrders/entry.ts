import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Corrige pedidos "After Pay" que foram salvos como "paid" incorretamente
// After Pay na Skale = pagamento pendente até confirmação real
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // Busca todos os eventos com After Pay + status de entrega Entregue
  const events = await db.Event.filter({ source: 'five_delivery' }, '-created_date', 5000);

  // Mapa: transaction_id -> ultimo skale payment status
  const skaleStatusMap = {};
  for (const ev of events) {
    try {
      const payload = JSON.parse(ev.payload || '{}');
      const tid = payload.transaction_id || payload.order_id;
      if (!tid) continue;
      const skalePayment = payload.skaletracking?.status_pagamento || '';
      // Guarda o mais recente (eventos já vêm ordenados por -created_date)
      if (!skaleStatusMap[tid]) {
        skaleStatusMap[tid] = skalePayment;
      }
    } catch {}
  }

  // IDs que são After Pay
  const afterPayIds = Object.entries(skaleStatusMap)
    .filter(([, status]) => status.toLowerCase().includes('after pay') || status.toLowerCase().includes('afterpay'))
    .map(([tid]) => tid);

  console.log(`[fixAfterPay] After Pay transaction IDs encontrados: ${afterPayIds.length}`);

  // Busca TODOS os pedidos pagos de uma vez
  const allPaidOrders = await db.Order.filter({ payment_status: 'paid' }, '-created_date', 2000);
  console.log(`[fixAfterPay] Pedidos pagos no banco: ${allPaidOrders.length}`);

  const afterPaySet = new Set(afterPayIds);
  let fixed = 0;
  let skipped = 0;

  for (const order of allPaidOrders) {
    if (afterPaySet.has(order.order_id)) {
      await db.Order.update(order.id, { payment_status: 'pending', paid_at: null });
      fixed++;
      console.log(`[fixAfterPay] Corrigido: ${order.order_id} (${order.customer_name})`);
    } else {
      skipped++;
    }
  }

  return Response.json({
    after_pay_ids_found: afterPayIds.length,
    fixed,
    skipped,
    message: `${fixed} pedidos After Pay corrigidos de paid -> pending`,
  });
});