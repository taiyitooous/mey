import { createClient } from 'npm:@base44/sdk@0.8.23';

const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID"), serviceRoleKey: "service_role" });

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Logar body bruto para debug
    const rawBody = await req.text();
    console.log('[Wavoip] Raw body:', rawBody);
    console.log('[Wavoip] Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[Wavoip] Body não é JSON válido');
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[Wavoip] Parsed body keys:', Object.keys(body));

    // Extrair device_token de qualquer campo possível
    const device_token = body.device_token || body.deviceToken || body.token || body.device?.token;
    // Extrair evento de qualquer campo possível
    const event = body.event || body.event_type || body.type || body.call_event;
    // Extrair telefone
    const phone = body.phone || body.number || body.caller || body.callee || body.contact?.phone;
    // Extrair nome
    const contact_name = body.contact_name || body.contactName || body.name || body.contact?.name;
    // Extrair duração
    const duration = body.duration || body.call_duration || 0;
    const timestamp = body.timestamp || new Date().toISOString();

    if (!device_token) {
      console.error('[Wavoip] device_token não encontrado no payload:', JSON.stringify(body));
      return Response.json({ error: 'Missing device_token', body_keys: Object.keys(body) }, { status: 400 });
    }

    if (!event) {
      console.error('[Wavoip] event não encontrado no payload:', JSON.stringify(body));
      return Response.json({ error: 'Missing event', body_keys: Object.keys(body) }, { status: 400 });
    }

    // Buscar configuração do dispositivo Wavoip
    const configs = await base44.asServiceRole.entities.WavoipConfig.filter({ device_token });
    if (configs.length === 0) {
      console.error('[Wavoip] Device não encontrado para token:', device_token);
      return Response.json({ error: 'Device not configured', device_token }, { status: 404 });
    }

    const config = configs[0];
    const user_name = config.user_name;
    const user_email = config.user_email;

    // Mapear tipo de evento (aceita vários formatos)
    const eventLower = String(event).toLowerCase();
    let event_type = 'whatsapp_call_initiated';
    if (eventLower.includes('answer')) event_type = 'whatsapp_call_answered';
    if (eventLower.includes('end') || eventLower.includes('finish') || eventLower.includes('hangup')) event_type = 'whatsapp_call_ended';

    console.log(`[Wavoip] Criando evento: ${event_type} para ${user_name} (${phone})`);

    const eventData = {
      entity_type: 'lead',
      entity_id: `wavoip_${device_token}_${timestamp}`,
      event_type,
      user_name,
      user_email,
      source: 'whatsapp',
      payload: JSON.stringify({
        phone,
        contact_name,
        duration: duration || 0,
        timestamp,
        device_token,
        raw_event: event,
      }),
    };

    await base44.asServiceRole.entities.Event.create(eventData);

    console.log('[Wavoip] Evento criado com sucesso:', event_type);
    return Response.json({ success: true, event_type, user_name }, { status: 200 });
  } catch (error) {
    console.error('[Wavoip] Erro:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});