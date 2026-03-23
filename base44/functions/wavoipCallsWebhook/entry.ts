import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Estrutura esperada do webhook Wavoip:
    // {
    //   "event": "call_initiated|call_answered|call_ended",
    //   "device_token": "token_do_dispositivo",
    //   "phone": "+5511999999999",
    //   "contact_name": "Nome do Contato",
    //   "duration": 120,
    //   "timestamp": "2026-03-23T10:30:00Z"
    // }

    const { event, device_token, phone, contact_name, duration, timestamp } = body;

    if (!event || !device_token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Buscar configuração do dispositivo Wavoip
    const configs = await base44.asServiceRole.entities.WavoipConfig.filter({ device_token });
    if (configs.length === 0) {
      return Response.json({ error: 'Device not configured' }, { status: 404 });
    }

    const config = configs[0];
    const user_name = config.user_name;
    const user_email = config.user_email;

    // Mapear tipo de evento
    let event_type = 'whatsapp_call_initiated';
    if (event === 'call_answered') event_type = 'whatsapp_call_answered';
    if (event === 'call_ended') event_type = 'whatsapp_call_ended';

    // Criar evento
    const eventData = {
      entity_type: 'call',
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
      }),
    };

    await base44.asServiceRole.entities.Event.create(eventData);

    return Response.json({ success: true, event_type }, { status: 200 });
  } catch (error) {
    console.error('Wavoip webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});