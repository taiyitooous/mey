import { createClient } from 'npm:@base44/sdk@0.8.21';

function mapStatus(status, speakingTime) {
  if (speakingTime > 0) return "call.answered";
  if (status === 3) return "call.answered";
  if (status === 5) return "call.no_answer";
  return "call.attempt";
}

async function resolveAgent(db, agentId, agentName) {
  const isValid = agentId && agentId !== "0" && agentName && agentName !== "null" && agentName !== "";
  if (!isValid) return { userName: "Sistema", userEmail: "" };

  const mappings = await db.ThreecAgent.list();
  const found = mappings.find(
    (m) => m.active !== false && (String(m.agent_id) === agentId || m.agent_name_3c?.toLowerCase() === agentName.toLowerCase())
  );

  if (!found) {
    await db.ThreecAgent.create({ agent_id: agentId, agent_name_3c: agentName, user_name: agentName, active: true });
    return { userName: agentName, userEmail: "" };
  }

  return { userName: found.user_name || agentName, userEmail: found.user_email || "" };
}

Deno.serve(async (req) => {
  // Validação do secret (bypass apenas para teste interno via test_backend_function)
  const secret = Deno.env.get("THREEC_WEBHOOK_SECRET");
  if (secret) {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || queryToken;
    if (token !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json();

  // Webhook externo sem usuário: cria client com appId diretamente
  const base44 = createClient({ appId: Deno.env.get("BASE44_APP_ID") });
  const db = base44.asServiceRole.entities;

  const saved = [];
  const errors = [];

  try {
    if (body["call-history-was-created"]) {
      const data = body["call-history-was-created"];
      const ch = data.callHistory || {};
      const agent = ch.agent || {};
      const campaign = ch.campaign || {};
      const mailingData = ch.mailing_data || {};
      const contactData = mailingData.data || {};

      const agentId = String(agent.id || "");
      const agentName = agent.name || "";
      const phone = ch.number || mailingData.phone || "";
      const status = ch.status || 0;
      const speakingTime = ch.speaking_with_agent_time || ch.speaking_time || 0;
      const eventType = mapStatus(status, speakingTime);

      const { userName, userEmail } = await resolveAgent(db, agentId, agentName);

      const payload = JSON.stringify({
        result: eventType.split(".")[1],
        duration: ch.calling_time || 0,
        speaking_time: speakingTime,
        phone,
        contact_name: contactData.Nome || contactData.nome || "",
        campaign: campaign.name || "",
        call_mode: ch.call_mode || "",
        qualification: ch.qualification?.name || "",
        raw_status: status,
        agent_id: agentId,
      });

      await db.Event.create({
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

    else if (body["call-was-connected"]) {
      const data = body["call-was-connected"];
      const agent = data.agent || {};
      const call = data.call || {};

      const agentId = String(agent.id || agent.extension_number || "");
      const agentName = agent.name || "";

      const { userName, userEmail } = await resolveAgent(db, agentId, agentName);

      const payload = JSON.stringify({
        result: "connected",
        phone: call.phone || "",
        call_mode: call.call_mode || "",
        agent_id: agentId,
      });

      await db.Event.create({
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
      const keys = Object.keys(body);
      console.log("[3C UNKNOWN EVENT]", keys[0], JSON.stringify(body).slice(0, 300));
    }
  } catch (err) {
    console.error("[ERROR]", err.message);
    errors.push({ error: err.message });
  }

  return Response.json({ received: 1, saved: saved.length, errors, items: saved });
});