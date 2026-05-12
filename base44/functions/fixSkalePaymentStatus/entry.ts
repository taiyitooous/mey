import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Função admin para re-processar payment_status de todos os pedidos Skale
// baseado nos eventos brutos já salvos
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;

    // Buscar todos os eventos brutos da Skale
    let skip = 0;
    const pageSize = 200;
    const latestByTransaction = {};

    while (true) {
      const events = await db.Event.filter({ event_type: 'skale.raw_payload' }, '-created_date', pageSize, skip);
      if (!events || events.length === 0) break;

      for (const ev of events) {
        const txId = ev.entity_id;
        if (!txId || txId === 'skale-raw') continue;
        // Guardar apenas o evento mais recente por transaction_id
        if (!latestByTransaction[txId]) {
          latestByTransaction[txId] = ev;
        }
      }

      if (events.length < pageSize) break;
      skip += pageSize;
    }

    console.log('[Fix] Total transações únicas encontradas:', Object.keys(latestByTransaction).length);

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const [txId, ev] of Object.entries(latestByTransaction)) {
      try {
        let body;
        try {
          body = JSON.parse(ev.payload || '{}');
        } catch {
          skipped++;
          continue;
        }

        const skalePaymentStatus = body.transaction?.payment_status || body.skaletracking?.status_pagamento || '';
        const ps = skalePaymentStatus.toLowerCase();
        let paymentStatus = 'pending';
        if (ps === 'pago' || ps === 'paid') paymentStatus = 'paid';
        else if (ps === 'estornado' || ps === 'refunded') paymentStatus = 'refunded';
        else if (ps === 'cancelado' || ps === 'canceled') paymentStatus = 'canceled';

        const paidAt = body.transaction?.paid_at ? new Date(body.transaction.paid_at).toISOString() : null;

        // Atualizar o Order correspondente
        const existing = await db.Order.filter({ order_id: txId });
        if (existing.length > 0) {
          const order = existing[0];
          if (order.payment_status !== paymentStatus || (paidAt && !order.paid_at)) {
            await db.Order.update(order.id, { payment_status: paymentStatus, paid_at: paidAt });
            updated++;
            console.log('[Fix] Atualizado', txId, ':', order.payment_status, '->', paymentStatus);
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push({ txId, error: err.message });
      }
    }

    return Response.json({
      success: true,
      total_transactions: Object.keys(latestByTransaction).length,
      updated,
      skipped,
      errors,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});