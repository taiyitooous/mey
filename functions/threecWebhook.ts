import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function mapEventType(threecEvent, result) {
  const ev = (threecEvent || "").toLowerCase();
  if (ev.includes("call_started") || ev.includes("discagem") || ev.includes("dial")) return "call.attempt";
  if (ev.includes("call_ended") || ev.includes("hangup") || ev.includes("encerrada")) {
    if (!result) return "call.ended";
    const r = result.toLowerCase();
    if (r.includes("answered") || r.includes("atendida") || r.includes("success")) return "call.answered";
    if (r.includes("no_answer") || r.includes("nao_atendida") || r.includes("noanswer")) return "call.no_answer";
    if (r.includes("voicemail") || r.includes("caixa")) return "call.voicemail";
    if (r.includes("invalid") || r.includes("invalido") || r.includes("busy")) return "call.invalid";
    return "call.ended";
  }
  if (ev.includes("agent_login") || ev.includes("login")) return "agent.login";
  if (ev.includes("agent_logout") || ev.includes("logout")) return "agent.logout";
  if (ev.includes("agent_pause") || ev.includes("pausa")) return "agent.pause";
  if (ev.includes("agent_ready") || ev.includes("pronto")) return "agent.ready";
  return ev || "call.attempt";
}

Deno.serve(async (req) => {
  // Validar token de segurança
  const secret = Deno.env.get("THREEC_WEBHOOK_SECRET");
  const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  const token = authHeader?.replace("Bearer ", "") || queryToken;

  if (secret && token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const base44 = createClientFromRequest(req);

  // Carregar mapeamento de agentes (3C agent_id → usuário MEY)
  const agentMappings = await base44.asServiceRole.entities.ThreecAgent.list();
  const agentMap = {};
  for (const m of agentMappings) {
    if (m.active !== false) {
      agentMap[String(m.agent_id).toLowerCase()] = m;
    }
  }

  const events = Array.isArray(body) ? body : [body];
  const saved = [];
  const errors = [];

  for (const ev of events) {
    try {
      // Identificar o agente nos possíveis campos do payload da 3C
      const rawAgentId = String(
        ev.agent_id || ev.agente_id || ev.extension || ev.ramal || ev.agent || ev.operator_id || ""
      ).toLowerCase();

      const rawAgentName = ev.agent_name || ev.agente || ev.user_name || ev.operator || ev.nome_agente || "";

      // Tentar resolver pelo ID, depois pelo nome
      const mapping =
        agentMap[rawAgentId] ||
        Object.values(agentMap).find(
          (m) => m.agent_name_3c?.toLowerCase() === rawAgentName.toLowerCase()
        );

      const userName = mapping?.user_name || rawAgentName || "3C Desconhecido";
      const userEmail = mapping?.user_email || ev.agent_email || ev.email || "";

      const result = ev.result || ev.resultado || ev.disposition || ev.status || "";
      const eventTypeRaw = ev.event || ev.evento || ev.type || ev.event_type || "call.attempt";
      const eventType = mapEventType(eventTypeRaw, result);

      const phone = ev.phone || ev.numero || ev.destination || ev.called_number || "";
      const duration = ev.duration || ev.duracao || ev.call_duration || null;
      const campaignId = ev.campaign_id || ev.lista || ev.campanha || "";
      const leadIdExternal = ev.lead_id || ev.contact_id || ev.registro_id || null;

      const payload = JSON.stringify({
        result,
        duration,
        phone,
        campaign_id: campaignId,
        raw_event: eventTypeRaw,
        raw_agent_id: rawAgentId,
        mapped: !!mapping,
        ...(ev.notes ? { notes: ev.notes } : {}),
      });

      await base44.asServiceRole.entities.Event.create({
        entity_type: "lead",
        entity_id: leadIdExternal || "3c_unknown",
        event_type: eventType,
        payload,
        user_name: userName,
        user_email: userEmail,
        source: "3c",
      });

      saved.push({ event_type: eventType, agent: userName, mapped: !!mapping });
    } catch (err) {
      errors.push({ error: err.message, raw: ev });
    }
  }

  return Response.json({
    received: events.length,
    saved: saved.length,
    errors,
    items: saved,
  });
});