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

    console.log('[Skale] ===== PAYLOAD RECEBIDO =====');
    console.log('[Skale] Timestamp:', receivedAt);
    console.log('[Skale] Headers Content-Type:', req.headers.get('content-type'));
    console.log('[Skale] Body completo:', rawBody);
    console.log('[Skale] ================================');

    // Salva o evento bruto para análise
    await db.Event.create({
      entity_type: 'order',
      entity_id: 'skale-raw',
      event_type: 'skale.raw_payload',
      user_name: 'Skale',
      user_email: '',
      source: 'five_delivery',
      payload: rawBody.substring(0, 10000), // salva até 10kb
    });

    return Response.json({
      success: true,
      received: true,
      timestamp: receivedAt,
      body_length: rawBody.length,
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('[Skale] ERRO:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
});