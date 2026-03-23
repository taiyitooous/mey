import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const { body } = await req.json();

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

      console.log(`[3C] call-history: agent=${agentId}/${agentName} status=${status} speaking=${speakingTime} => ${eventType}`);

      const { userName, userEmail } = await resolveAgent(db, agentId, agentName);
      console.log(`[3C] resolved: ${userName}`);

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

    else {
      console.log("[3C] unknown event:", Object.keys(body)[0]);
    }
  } catch (err) {
    console.error("[3C] error:", err.message);
    errors.push({ error: err.message });
  }

  return Response.json({ saved: saved.length, errors, items: saved });
});