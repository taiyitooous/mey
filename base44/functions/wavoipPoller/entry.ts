import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Polling da REST API da Wavoip para capturar chamadas recentes
// GET https://devices.wavoip.com/{token}/whatsapp/all_info
// Retorna: { call: { call_id, peer_made_call, accepted_peer, call_direction, call_active_date, call_duration_in_seconds } }

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // Buscar todos os dispositivos ativos
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

    try {
      const res = await fetch(`https://devices.wavoip.com/${token}/whatsapp/all_info`);
      if (!res.ok) {
        errors.push({ device: device.device_name || token.slice(-8), error: `HTTP ${res.status}` });
        continue;
      }

      const data = await res.json();
      const callInfo = data?.result?.call;

      console.log(`[Wavoip] ${device.device_name || token.slice(-8)} call:`, JSON.stringify(callInfo));

      if (!callInfo || !callInfo.call_id) {
        console.log(`[Wavoip] ${device.device_name} sem chamada ativa`);
        continue;
      }

      const callId = String(callInfo.call_id);
      const callDate = callInfo.call_active_date || new Date().toISOString();
      const duration = callInfo.call_duration_in_seconds || 0;
      // peer_made_call=true = chamada recebida (contato ligou para nós)
      // peer_made_call=false = chamada feita por nós
      const direction = callInfo.peer_made_call ? 'incoming' : 'outgoing';
      // accepted_peer: número do contato que atendeu (ou que ligou)
      const phone = callInfo.accepted_peer ? String(callInfo.accepted_peer) : '';
      // Se accepted_peer existe → chamada foi atendida; se null e call_id existe → recusada/sem resposta
      const answered = !!callInfo.accepted_peer;

      // Verificar se já registramos esse call_id para esse dispositivo
      const existing = await db.Event.filter({
        source: 'whatsapp',
        entity_id: `wavoip_${callId}`,
        user_name,
      });

      if (existing.length > 0) {
        console.log(`[Wavoip] call_id ${callId} já registrado para ${user_name}`);
        continue;
      }

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

      console.log(`[Wavoip] Evento criado: ${event_type} | user: ${user_name} | phone: ${phone}`);
      results.push({ device: device.device_name, event_type, phone, user_name });

    } catch (err) {
      console.error(`[Wavoip] Erro no dispositivo ${device.device_name}:`, err.message);
      errors.push({ device: device.device_name || token.slice(-8), error: err.message });
    }
  }

  return Response.json({
    processed: devices.length,
    registered: results.length,
    errors,
    items: results,
  });
});