import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  // Aceitar GET para teste de conectividade
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', message: 'Wavoip webhook endpoint active' });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const rawBody = await req.text();
    console.log('[Wavoip] Raw body recebido:', rawBody);
    console.log('[Wavoip] Content-Type:', req.headers.get('content-type'));

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[Wavoip] Body não é JSON:', rawBody);
      return Response.json({ error: 'Invalid JSON', received: rawBody }, { status: 400 });
    }

    console.log('[Wavoip] Parsed body:', JSON.stringify(body));

    // Extrair device_token de qualquer campo possível
    const device_token = body.device_token || body.deviceToken || body.token || body.device?.token || body.apiKey;
    const event = body.event || body.event_type || body.type || body.call_event || body.action;
    const phone = body.phone || body.number || body.caller || body.callee || body.contact?.phone || body.to || body.from;
    const contact_name = body.contact_name || body.contactName || body.name || body.contact?.name;
    const duration = body.duration || body.call_duration || 0;
    const timestamp = body.timestamp || new Date().toISOString();

    console.log(`[Wavoip] Extraído - device_token: ${device_token}, event: ${event}, phone: ${phone}`);

    if (!device_token) {
      console.error('[Wavoip] device_token ausente. Chaves recebidas:', Object.keys(body));
      return Response.json({ error: 'Missing device_token', received_keys: Object.keys(body), body }, { status: 400 });
    }

    if (!event) {
      console.error('[Wavoip] event ausente. Chaves recebidas:', Object.keys(body));
      return Response.json({ error: 'Missing event', received_keys: Object.keys(body), body }, { status: 400 });
    }

    // Buscar configuração do dispositivo
    const configs = await base44.asServiceRole.entities.WavoipConfig.filter({ device_token });
    if (configs.length === 0) {
      console.error('[Wavoip] Dispositivo não encontrado para token:', device_token);
      // Criar evento mesmo sem config para não perder dados
      return Response.json({ error: 'Device not configured', device_token }, { status: 404 });
    }

    const config = configs[0];
    const user_name = config.user_name;
    const user_email = config.user_email;

    // Mapear tipo de evento
    const eventLower = String(event).toLowerCase();
    let event_type = 'whatsapp_call_initiated';
    if (eventLower.includes('answer')) event_type = 'whatsapp_call_answered';
    if (eventLower.includes('end') || eventLower.includes('finish') || eventLower.includes('hangup')) event_type = 'whatsapp_call_ended';

    console.log(`[Wavoip] Criando evento ${event_type} para ${user_name}`);

    await base44.asServiceRole.entities.Event.create({
      entity_type: 'lead',
      entity_id: `wavoip_${device_token}_${timestamp}`,
      event_type,
      user_name,
      user_email,
      source: 'whatsapp',
      payload: JSON.stringify({ phone, contact_name, duration, timestamp, device_token, raw_event: event }),
    });

    console.log('[Wavoip] Evento criado com sucesso');
    return Response.json({ success: true, event_type, user_name });

  } catch (error) {
    console.error('[Wavoip] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});