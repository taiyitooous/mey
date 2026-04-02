import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', message: 'Wavoip webhook endpoint active' });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const rawBody = await req.text();
    console.log('[Wavoip] Raw body:', rawBody);

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[Wavoip] Body não é JSON válido:', rawBody);
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Formato Evolution API:
    // { "event": "CALL", "instance": "nome_instancia", "data": { "from": "55...", "id": "...", "status": "offer|accepted|rejected|timeout" }, "apikey": "..." }
    // O Wavoip usa o campo apikey como device_token
    console.log('[Wavoip] Event:', body.event, '| Instance:', body.instance);
    console.log('[Wavoip] Data:', JSON.stringify(body.data));

    const event = body.event; // ex: "CALL", "MESSAGES_UPSERT", etc.
    const instance = body.instance;
    const apikey = body.apikey || body.api_key;
    const data = body.data || {};

    // Buscar config pelo device_token (apikey) ou instance name
    let configs = [];
    if (apikey) {
      configs = await base44.asServiceRole.entities.WavoipConfig.filter({ device_token: apikey });
    }
    if (configs.length === 0 && instance) {
      configs = await base44.asServiceRole.entities.WavoipConfig.filter({ device_name: instance });
    }

    if (configs.length === 0) {
      console.error('[Wavoip] Dispositivo não encontrado. apikey:', apikey, '| instance:', instance);
      // Logar mesmo sem config para debug
      return Response.json({ error: 'Device not configured', apikey, instance }, { status: 404 });
    }

    const config = configs[0];
    const user_name = config.user_name;
    const user_email = config.user_email;
    const device_token = config.device_token;

    // Processar apenas eventos de CALL
    if (event !== 'CALL') {
      console.log('[Wavoip] Evento ignorado (não é CALL):', event);
      return Response.json({ success: true, ignored: true, event });
    }

    // status da chamada: "offer" = iniciada, "accepted" = atendida, "rejected"/"timeout" = encerrada
    const callStatus = data.status || '';
    let event_type = 'whatsapp_call_initiated';
    if (callStatus === 'accepted') event_type = 'whatsapp_call_answered';
    if (callStatus === 'rejected' || callStatus === 'timeout') event_type = 'whatsapp_call_ended';

    const phone = data.from || data.to || '';
    const callId = data.id || `${device_token}_${Date.now()}`;

    console.log(`[Wavoip] Criando evento: ${event_type} | phone: ${phone} | user: ${user_name}`);

    await base44.asServiceRole.entities.Event.create({
      entity_type: 'lead',
      entity_id: `wavoip_${callId}`,
      event_type,
      user_name,
      user_email,
      source: 'whatsapp',
      payload: JSON.stringify({
        phone,
        call_id: callId,
        call_status: callStatus,
        duration: data.duration || 0,
        instance,
        device_token,
      }),
    });

    console.log('[Wavoip] Evento criado com sucesso:', event_type);
    return Response.json({ success: true, event_type, user_name });

  } catch (error) {
    console.error('[Wavoip] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});