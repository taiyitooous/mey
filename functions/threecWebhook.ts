import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Status 3C: 1=waiting, 2=dialing, 3=connected, 4=acw, 5=no_answer/cancelled
function mapStatus(status, speakingTime) {
  if (speakingTime > 0) return "call.answered";
  if (status === 3) return "call.answered";
  if (status === 5) return "call.no_answer";
  return "call.attempt";
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("THREEC_WEBHOOK_SECRET");
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || queryToken;

  if (secret && token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const base44 = createClientFromRequest(req);

  const saved = [];
  const errors = [];

  try {
    // call-history-was-created: ligação finalizada
    if (body["call-history-was-created"]) {
      const data = body["call-history-was-created"];
      const ch = data.callHistory || {};
      const agent = ch.agent || {};
      const campaign = ch.campaign || {};
      const mailingData = ch.mailing_data || {};
      const contactData = mailingData.data || {};

      const agentName = agent.name || "Desconhecido";
      const agentId = String(agent.id || "");
      const phone = ch.number || mailingData.phone || "";
      const status = ch.status || 0;
      const speakingTime = ch.speaking_with_agent_time || ch.speaking_time || 0;
      const eventType = mapStatus(status, speakingTime);
      const contactName = contactData.Nome || contactData.nome || "";
      const qualification = ch.qualification?.name || "";
      const callMode = ch.call_mode || "";

      // Tentar resolver agente pelo ID
      const agentMappings = await base44.entities.ThreecAgent.list();
      const mapping = agentMappings.find(
        (m) => m.active !== false && (String(m.agent_id) === agentId || m.agent_name_3c?.toLowerCase() === agentName.toLowerCase())
      );

      const userName = mapping?.user_name || agentName;
      const userEmail = mapping?.user_email || "";

      const payload = JSON.stringify({
        result: eventType.split(".")[1],
        duration: ch.calling_time || 0,
        speaking_time: speakingTime,
        phone,
        contact_name: contactName,
        campaign: campaign.name || "",
        call_mode: callMode,
        qualification,
        raw_status: status,
        agent_id: agentId,
        mapped: !!mapping,
      });

      await base44.entities.Event.create({
        entity_type: "lead",
        entity_id: mailingData.identifier || ch._id || "3c_unknown",
        event_type: eventType,
        payload,
        user_name: userName,
        user_email: userEmail,
        source: "3c",
      });

      saved.push({ event_type: eventType, agent: userName });
    }

    // call-was-connected: agente atendeu / conectou
    else if (body["call-was-connected"]) {
      const data = body["call-was-connected"];
      const agent = data.agent || {};
      const call = data.call || {};

      const agentName = agent.name || "Desconhecido";
      const agentId = String(agent.id || agent.extension_number || "");
      const phone = call.phone || "";
      const callMode = call.call_mode || "";

      const agentMappings = await base44.entities.ThreecAgent.list();
      const mapping = agentMappings.find(
        (m) => m.active !== false && (String(m.agent_id) === agentId || m.agent_name_3c?.toLowerCase() === agentName.toLowerCase())
      );

      const userName = mapping?.user_name || agentName;
      const userEmail = mapping?.user_email || "";

      const payload = JSON.stringify({
        result: "connected",
        phone,
        call_mode: callMode,
        agent_id: agentId,
        mapped: !!mapping,
      });

      await base44.entities.Event.create({
        entity_type: "lead",
        entity_id: call.id || "3c_unknown",
        event_type: "call.answered",
        payload,
        user_name: userName,
        user_email: userEmail,
        source: "3c",
      });

      saved.push({ event_type: "call.answered", agent: userName });
    }

    else {
      // Evento desconhecido — salvar genérico para diagnóstico
      const keys = Object.keys(body);
      console.log("[3C UNKNOWN EVENT]", keys[0], JSON.stringify(body).slice(0, 300));
    }
  } catch (err) {
    console.error("[ERROR]", err.message);
    errors.push({ error: err.message });
  }

  return Response.json({ received: 1, saved: saved.length, errors, items: saved });
});