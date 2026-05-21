import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

// Endpoint chamado pelo frontend quando detecta evento device:contact via WebSocket da Wavoip
// Payload: { device_token, phone, type, call_type }
// type: "start" | "end" | "missed"
// call_type: "official" | "unofficial"

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = base44.asServiceRole.entities;
  const body = await req.json();
  const { device_token, phone, type, call_type, call_id, duration_seconds } = body;

  if (!device_token || !phone) {
    return Response.json({ error: 'device_token e phone são obrigatórios' }, { status: 400 });
  }

  // Buscar configuração do dispositivo
  const configs = await db.WavoipConfig.filter({ device_token, active: true });
  if (!configs.length) {
    return Response.json({ error: 'Dispositivo não encontrado ou inativo' }, { status: 404 });
  }

  const config = configs[0];
  const user_name = config.user_name;
  const user_email = config.user_email || '';

  // ID único por chamada + tipo — impede duplicatas do mesmo evento para a mesma chamada
  const uniqueId = call_id || `${device_token}_${phone}`;
  const entity_id = `wavoip_ws_${type}_${uniqueId}`;

  // Verificar duplicata pelo entity_id (mesmo type + mesmo call_id = duplicata)
  const existing = await db.Event.filter({ source: 'whatsapp', entity_id });
  if (existing.length > 0) {
    console.log(`[Wavoip WS] Duplicata ignorada: ${entity_id}`);
    return Response.json({ success: true, duplicate: true });
  }

  // Mapear tipo do evento
  let event_type;
  if (type === 'start') {
    event_type = 'whatsapp_call_started';
  } else if (type === 'answered') {
    event_type = 'whatsapp_call_received'; // atendida
  } else if (type === 'missed') {
    event_type = 'whatsapp_call_missed'; // não atendida / recusada
  } else {
    event_type = 'whatsapp_call_received';
  }

  await db.Event.create({
    entity_type: 'lead',
    entity_id,
    event_type,
    user_name,
    user_email,
    source: 'whatsapp',
    payload: JSON.stringify({
      phone,
      call_id: uniqueId,
      call_type: call_type || 'unknown',
      type,
      duration_seconds: duration_seconds || 0,
      device_token,
      device_name: config.device_name || '',
      registered_by: user.email,
    }),
  });

  console.log(`[Wavoip WS] Evento criado: ${event_type} | user: ${user_name} | phone: ${phone} | type: ${type}`);
  return Response.json({ success: true, event_type, user_name, phone });
});