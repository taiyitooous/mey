import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Pega últimos eventos Skale brutos
    const events = await db.Event.filter({ event_type: 'skale.raw_payload' }, '-created_date', 50);
    
    const results = [];
    
    for (const event of events) {
      try {
        const payload = JSON.parse(event.payload || '{}');
        const transactionId = payload.transaction_id;
        
        if (!transactionId) continue;
        
        // Valor no payload da Skale
        const skaleValue = payload.transaction?.total_price || payload.product?.price || 0;
        const expectedAmount = skaleValue / 100;
        
        // Busca no banco
        const order = await db.Order.filter({ order_id: transactionId });
        const dbAmount = order.length > 0 ? order[0].amount : null;
        
        results.push({
          transaction_id: transactionId,
          skale_raw_value: skaleValue,
          expected_amount: expectedAmount,
          db_stored_amount: dbAmount,
          match: dbAmount === expectedAmount,
        });
      } catch (e) {
        console.error('Erro processando evento:', e.message);
      }
    }

    return Response.json({ results }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});