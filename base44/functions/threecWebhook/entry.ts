import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const WIN_QUALIFICATIONS = [
  "venda", "vendido", "pedido realizado", "pedido feito", "fechou", "ganho", "convertido",
  "venda realizada", "cliente comprou", "comprou", "negócio fechado"
];

function mapStatus(status, speakingTime) {
  if (speakingTime > 0) return "call.answered";
  if (status === 3 || status === 7) return "call.answered";
  if (status === 5) return "call.no_answer";
  return "call.attempt";
}

function isWinQualification(name) {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return WIN_QUALIFICATIONS.some((w) => lower.includes(w));
}

async function resolveAgent(db, agentId, agentName) {
  const isValid = agentId && agentId !== "0" && agentId !== "" && agentName && agentName !== "null" && agentName !== "";
  if (!isValid) return null;

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
  const bodyText = await req.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const secret = Deno.env.get("THREEC_WEBHOOK_SECRET");
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || queryToken || body.token;

  if (secret && token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  delete body.token;

  console.log("[3C] event keys:", Object.keys(body).join(", "));

  const base44 = createClientFromRequest(req);
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
      const qualificationName = ch.qualification?.name || "";
      const eventType = mapStatus(status, speakingTime);
      const entityId = mailingData.identifier || ch._id || "3c_unknown";

      console.log(`[3C] call-history: agent=${agentId}/${agentName} status=${status} speaking=${speakingTime} qual="${qualificationName}" => ${eventType}`);

      const agentInfo = await resolveAgent(db, agentId, agentName);

      if (!agentInfo) {
        console.log(`[3C] skipped: no agent resolved (agent_id="${agentId}", name="${agentName}")`);
        return Response.json({ saved: 0, skipped: 1, reason: "no_agent" });
      }

      const { userName, userEmail } = agentInfo;
      console.log(`[3C] resolved agent: ${userName}`);

      const payload = JSON.stringify({
        result: eventType.split(".")[1],
        duration: ch.calling_time || 0,
        speaking_time: speakingTime,
        phone,
        contact_name: contactData.Nome || contactData.nome || "",
        campaign: campaign.name || "",
        call_mode: ch.call_mode || "",
        qualification: qualificationName,
        raw_status: status,
        agent_id: agentId,
      });

      await db.Event.create({
        entity_type: "lead",
        entity_id: entityId,
        event_type: eventType,
        payload,
        user_name: userName,
        user_email: userEmail,
        source: "3c",
      });

      saved.push({ event_type: eventType, agent: userName });

      if (isWinQualification(qualificationName)) {
        console.log(`[3C] WIN detected: "${qualificationName}"`);
        await db.Event.create({
          entity_type: "lead",
          entity_id: entityId,
          event_type: "lead.won",
          payload: JSON.stringify({ source: "3c", qualification: qualificationName, phone }),
          user_name: userName,
          user_email: userEmail,
          source: "3c",
        });
        saved.push({ event_type: "lead.won", agent: userName });
      }
    } else {
      console.log("[3C] unknown event:", Object.keys(body)[0]);
    }
  } catch (err) {
    console.error("[3C] error:", err.message);
    errors.push({ error: err.message });
  }

  return Response.json({ received: 1, saved: saved.length, errors, items: saved });
});