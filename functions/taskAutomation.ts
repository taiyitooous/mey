import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const { event, data, old_data } = body;

    // Lead enters Stage 4 → create task to call in 10 minutes
    if (event.entity_name === 'Lead' && event.type === 'update') {
      if (data?.stage === 4 && old_data?.stage !== 4) {
        const scheduledAt = new Date(Date.now() + 10 * 60 * 1000);
        await base44.asServiceRole.entities.Task.create({
          entity_type: 'lead',
          entity_id: event.entity_id,
          action_type: 'call',
          scheduled_at: scheduledAt.toISOString(),
          assignee_name: data.seller_name || 'Equipe',
          status: 'pending',
          notes: 'Auto: Lead entrou na Etapa 4 — ligar em 10 min',
        });
        await base44.asServiceRole.entities.Event.create({
          entity_type: 'lead',
          entity_id: event.entity_id,
          event_type: 'task.auto_created',
          payload: JSON.stringify({ reason: 'lead_stage_4', action: 'call' }),
        });
      }
    }

    // Order becomes delivered → create collection task immediately
    if (event.entity_name === 'Order' && event.type === 'update') {
      if (
        data?.logistics_status === 'delivered' &&
        old_data?.logistics_status !== 'delivered'
      ) {
        await base44.asServiceRole.entities.Task.create({
          entity_type: 'order',
          entity_id: event.entity_id,
          action_type: 'call',
          scheduled_at: new Date().toISOString(),
          status: 'pending',
          notes: `Auto: Pedido ${data.order_id || event.entity_id} entregue — iniciar cobrança agora`,
        });
        await base44.asServiceRole.entities.Event.create({
          entity_type: 'order',
          entity_id: event.entity_id,
          event_type: 'task.auto_created',
          payload: JSON.stringify({ reason: 'order_delivered', action: 'call' }),
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});