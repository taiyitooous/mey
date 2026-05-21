export function getCategory(eventType) {
  if (!eventType) return "other";
  if (eventType.includes("whatsapp")) return "whatsapp";
  // Tipos 3C explícitos primeiro (evitar conflito com whatsapp_call)
  if (eventType === "call.answered" || eventType === "call.no_answer" || eventType === "call.attempt" ||
      eventType === "call.ended" || eventType === "call_answered" || eventType === "call_attempted" ||
      eventType === "call-history-was-created") return "call";
  if (eventType.startsWith("call.")) return "call";
  if (eventType.includes("stage_changed")) return "stage";
  if (eventType === "lead.won") return "won";
  if (eventType === "lead.lost") return "lost";
  if (eventType === "payment.paid") return "payment";
  if (eventType.startsWith("collection.")) return "collection";
  return "other";
}

export function isEffectiveContact(event) {
  const cat = getCategory(event.event_type);
  // Para 3C: ligação atendida pelo event_type OU pelo payload.result
  if (cat === "call") {
    if (event.event_type === "call.answered" || event.event_type === "call_answered") return true;
    try {
      const p = event.payload ? JSON.parse(event.payload) : {};
      return p.result === "answered";
    } catch { return false; }
  }
  // Para WhatsApp: conta interações de resposta e chamadas Wavoip atendidas
  if (event.event_type === "whatsapp_replied" || event.event_type === "lead.whatsapp_replied") return true;
  if (event.event_type === "whatsapp_call_received") return true; // atendida (duração > 5s)
  return false;
}

export function isWavoipCallAttempt(event) {
  return ["whatsapp_call_started", "whatsapp_call_received", "whatsapp_call_missed"].includes(event.event_type);
}

export function isWavoipCallAnswered(event) {
  return event.source === "whatsapp" && event.event_type === "whatsapp_call_received";
}

export function getCallQualification(event) {
  if (!isCallAttempt(event) || !event.payload) return null;
  try {
    const payload = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
    return payload.qualification || payload.result || null;
  } catch {
    return null;
  }
}

export function getQualificationLabel(qualification) {
  const labels = {
    answered: "Atendida",
    no_answer: "Sem resposta",
    no_interest: "Sem interesse",
    interested: "Interessado",
    callback: "Retorno",
    voicemail: "Caixa postal",
    busy: "Ocupado",
    error: "Erro",
  };
  return labels[qualification] || qualification;
}

export function isCallAttempt(event) {
  // Conta apenas chamadas 3C
  if (event.source !== "3c") return false;
  const types = ["call.ended", "call-history-was-created", "call.answered", "call.no_answer", "call.attempt", "call_answered", "call_attempted"];
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
  "whatsapp_call_started": "Ligação WhatsApp — iniciada",
  "whatsapp_call_received": "Ligação WhatsApp — atendida ✓",
  "whatsapp_call_ended": "Ligação WhatsApp encerrada",
  "whatsapp_call_missed": "Ligação WhatsApp — não atendida",
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

  // Deduplicar ligações 3C para consistência com o scorecard
  const dedupedCalls = deduplicateCallEvents(events);

  // Vendedores com pelo menos 1 ligação 3C
  const sellersWith3C = new Set(
    dedupedCalls
      .map((e) => e.user_name?.toLowerCase().trim())
  );

  // Processar ligações 3C dedupadas
  dedupedCalls.forEach((e) => {
    const raw = e.created_date;
    const iso = raw && !raw.endsWith("Z") && !raw.includes("+") ? raw + "Z" : raw;
    const d = new Date(iso);
    const h = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getHours();
    if (!hourly[h]) return;
    hourly[h].calls++;
    if (isEffectiveContact(e)) hourly[h].callsAnswered++;
  });

  // Processar outros eventos
  events.forEach((e) => {
    const raw = e.created_date;
    const iso = raw && !raw.endsWith("Z") && !raw.includes("+") ? raw + "Z" : raw;
    const d = new Date(iso);
    const h = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getHours();
    if (!hourly[h]) return;

    // WhatsApp Wavoip: apenas eventos com source === "whatsapp" (exclui eventos 3C)
    if (e.source === "whatsapp" && getCategory(e.event_type) === "whatsapp") {
      hourly[h].whatsapp++;
    }
    if (getCategory(e.event_type) === "stage") hourly[h].stage++;
    if (e.event_type === "lead.won") hourly[h].ganhos++;
    if (e.event_type === "lead.lost") hourly[h].perdidos++;
  });
  return Object.values(hourly);
}