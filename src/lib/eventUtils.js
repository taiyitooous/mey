export function getCategory(eventType) {
  if (!eventType) return "other";
  if (eventType.includes("whatsapp")) return "whatsapp";
  if (eventType.includes("call")) return "call";
  if (eventType.includes("stage_changed")) return "stage";
  if (eventType === "lead.won") return "won";
  if (eventType === "lead.lost") return "lost";
  if (eventType === "payment.paid") return "payment";
  if (eventType.startsWith("collection.")) return "collection";
  return "other";
}

export function isEffectiveContact(event) {
  const cat = getCategory(event.event_type);
  // Para 3C: conta ligações atendidas
  if (cat === "call") {
    try {
      const p = event.payload ? JSON.parse(event.payload) : {};
      return p.result === "answered";
    } catch { return false; }
  }
  // Para WhatsApp: conta interações de resposta
  if (event.event_type === "whatsapp_replied" || event.event_type === "lead.whatsapp_replied") return true;
  if (event.event_type === "whatsapp_call_received") return true;
  return false;
}

export function isCallAttempt(event) {
  // Conta apenas chamadas 3C
  if (event.source !== "3c") return false;
  const types = ["call.ended", "call-history-was-created", "call.answered", "call.no_answer", "call.attempt"];
  return types.includes(event.event_type);
}

export function deduplicateCallEvents(events) {
  // Dedup por call_id; se não tiver, por agent_id+phone+timestamp (60s janela)
  const seenCallIds = new Set();
  const seenCompositeKeys = new Set();
  const dedupedEvents = [];

  for (const event of events) {
    if (!isCallAttempt(event)) continue;

    try {
      const payload = event.payload ? JSON.parse(event.payload) : {};
      const callId = payload.call_id;

      if (callId) {
        if (seenCallIds.has(callId)) continue;
        seenCallIds.add(callId);
      } else {
        // Fallback: agent_id + phone + timestamp (60s window)
        const agentId = payload.agent_id || event.user_name;
        const phone = payload.phone;
        const timestamp = new Date(event.created_date).getTime();
        
        if (!agentId || !phone) continue;

        let isDuplicate = false;
        for (const key of seenCompositeKeys) {
          const [pAgentId, pPhone, pTimestamp] = key.split("|");
          if (pAgentId === agentId && pPhone === phone && Math.abs(timestamp - parseInt(pTimestamp)) <= 60000) {
            isDuplicate = true;
            break;
          }
        }

        if (isDuplicate) continue;
        seenCompositeKeys.add(`${agentId}|${phone}|${timestamp}`);
      }

      dedupedEvents.push(event);
    } catch {
      // Se falhar parse, inclui mesmo assim
      dedupedEvents.push(event);
    }
  }

  return dedupedEvents;
}

export const EVENT_LABELS = {
  "lead.created": "Lead criado",
  "lead.call_made": "Ligação 3C",
  "call_attempted": "Ligação 3C",
  "call_answered": "Ligação atendida ✓",
  "call.answered": "Ligação atendida ✓",
  "call.no_answer": "Ligação sem resposta",
  "call.attempt": "Tentativa de ligação",
  "lead.whatsapp_sent": "WhatsApp enviado",
  "whatsapp_sent": "WhatsApp enviado",
  "whatsapp_replied": "WhatsApp respondido ✓",
  "whatsapp_call_started": "WhatsApp Wavoip — iniciada",
  "whatsapp_call_received": "WhatsApp Wavoip — encerrada",
  "whatsapp_call_ended": "WhatsApp Wavoip encerrado",
  "whatsapp_call_missed": "WhatsApp Wavoip — perdida",
  "lead.stage_changed": "Etapa alterada",
  "stage_changed": "Etapa alterada",
  "lead.won": "Lead ganho 🏆",
  "lead.lost": "Lead perdido",
  "collection.call_attempted": "Cobrança — Ligação",
  "collection.whatsapp_sent": "Cobrança — WhatsApp",
  "collection.promise_made": "Promessa de pagamento",
  "collection.agreement_made": "Acordo",
  "payment.paid": "Pagamento confirmado",
  "task.done.call": "Tarefa — Ligação ✓",
  "task.done.whatsapp": "Tarefa — WhatsApp ✓",
};

export const RESULT_EVENTS = [
  "lead.won", "lead.lost", "payment.paid",
  "collection.promise_made", "collection.agreement_made",
  "call_answered", "whatsapp_replied",
];

export function buildHourlyData(events) {
  const hourly = {};
  for (let h = 7; h <= 20; h++) {
    hourly[h] = { hour: `${h}h`, calls: 0, callsAnswered: 0, whatsapp: 0, stage: 0, ganhos: 0, perdidos: 0 };
  }
  events.forEach((e) => {
    const raw = e.created_date;
    const iso = raw && !raw.endsWith("Z") && !raw.includes("+") ? raw + "Z" : raw;
    const d = new Date(iso);
    // Hora em SP (UTC-3)
    const h = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getHours();
    if (!hourly[h]) return;
    if (isCallAttempt(e)) {
      hourly[h].calls++;
      if (isEffectiveContact(e)) hourly[h].callsAnswered++;
    }
    if (getCategory(e.event_type) === "whatsapp") hourly[h].whatsapp++;
    if (getCategory(e.event_type) === "stage") hourly[h].stage++;
    if (e.event_type === "lead.won") hourly[h].ganhos++;
    if (e.event_type === "lead.lost") hourly[h].perdidos++;
  });
  return Object.values(hourly);
}