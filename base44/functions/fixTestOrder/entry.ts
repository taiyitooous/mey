import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // Busca o pedido de teste
    const testOrder = await db.Order.filter({ order_id: 'ven_test_4171' });

    if (testOrder.length === 0) {
      return Response.json({ error: 'Test order not found' }, { status: 404 });
    }

    const order = testOrder[0];
    console.log(`[BEFORE] Order ${order.order_id}: delivered_at = ${order.delivered_at}, logistics_status = ${order.logistics_status}`);

    // Opção 1: Remover o status "delivered" (revert para "created")
    // Opção 2: Atualizar delivered_at para hoje
    // Vou escolher revert para evitar contar como entregue

    await db.Order.update(order.id, {
      logistics_status: 'created',
      delivered_at: null,
    });

    console.log(`[AFTER] Order ${order.order_id} reverted to created status`);

    return Response.json({
      message: 'Test order reverted',
      order_id: order.order_id,
      old_status: 'delivered',
      new_status: 'created',
      old_delivered_at: order.delivered_at,
      new_delivered_at: null,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});