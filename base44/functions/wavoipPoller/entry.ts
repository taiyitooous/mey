import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Polling da REST API da Wavoip para capturar chamadas recentes
// GET https://devices.wavoip.com/{token}/whatsapp/all_info
// Retorna: { result: { calls: [{ id, caller, receiver, direction, duration_seconds, statistics: { call_accepted, transport_open } }] } }
// direction: "OUTGOING" = feita pelo vendedor, "INCOMING" = recebida
// call_accepted em statistics = chamada foi atendida (se não existe = não atendida)

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const devices = await db.WavoipConfig.filter({ active: true });

  if (!devices.length) {
    return Response.json({ message: 'Nenhum dispositivo ativo', processed: 0 });
  }

  const results = [];
  const errors = [];

  for (const device of devices) {
    const token = device.device_token;
    const user_name = device.user_name;
    const user_email = device.user_email || '';
    const deviceLabel = device.device_name || token.slice(-8);

    try {
      const res = await fetch(`https://devices.wavoip.com/${token}/whatsapp/all_info`);
      if (!res.ok) {
        errors.push({ device: deviceLabel, error: `HTTP ${res.status}` });
        continue;
      }

      const data = await res.json();
      const calls = data?.result?.calls || [];

      console.log(`[Wavoip] ${deviceLabel}: ${calls.length} chamada(s) no buffer`);

      for (const call of calls) {
        const callId = call.id;
        if (!callId) continue;

        // Verificar se já registramos esse call_id para esse usuário
        const existing = await db.Event.filter({
          source: 'whatsapp',
          entity_id: `wavoip_${callId}`,
        });

        if (existing.length > 0) {
          console.log(`[Wavoip] call_id ${callId} já registrado`);
          continue;
        }

        const direction = call.direction === 'OUTGOING' ? 'outgoing' : 'incoming';
        const phone = direction === 'outgoing' ? (call.receiver || '') : (call.caller || '');
        const duration = call.duration_seconds || 0;
        // call_accepted em statistics indica que a chamada foi atendida
        const answered = !!(call.statistics?.call_accepted);
        const callDate = call.statistics?.transport_open || call.statistics?.call_accepted || new Date().toISOString();

        const event_type = answered ? 'whatsapp_call_received' : 'whatsapp_call_missed';

        await db.Event.create({
          entity_type: 'lead',
          entity_id: `wavoip_${callId}`,
          event_type,
          user_name,
          user_email,
          source: 'whatsapp',
          payload: JSON.stringify({
            phone,
            call_id: callId,
            direction,
            answered,
            duration_seconds: duration,
            call_active_date: callDate,
            device_name: device.device_name || '',
          }),
        });

        console.log(`[Wavoip] Evento criado: ${event_type} | user: ${user_name} | phone: ${phone} | duration: ${duration}s`);
        results.push({ device: deviceLabel, event_type, phone, user_name, duration });
      }

    } catch (err) {
      console.error(`[Wavoip] Erro no dispositivo ${deviceLabel}:`, err.message);
      errors.push({ device: deviceLabel, error: err.message });
    }
  }

  return Response.json({
    processed: devices.length,
    registered: results.length,
    errors,
    items: results,
  });
});