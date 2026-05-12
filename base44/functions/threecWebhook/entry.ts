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

      // Se a ligação foi atendida, fazer upsert no registro de avaliação por telefone
      if (eventType === "call.answered" && speakingTime > 30 && phone) {
        const callId = ch._id || ch.id || entityId;
        const audioUrl = ch.recording_url || ch.audio_url || ch.record_url || "";
        const transcript = ch.transcript || ch.transcription || "";
        const contactName = contactData.Nome || contactData.nome || "";
        const now = new Date().toISOString();

        const newCallEntry = {
          call_id: callId,
          speaking_time: speakingTime,
          qualification: qualificationName,
          campaign: campaign.name || "",
          called_at: now,
          transcript,
          audio_url: audioUrl,
        };

        // Buscar registro existente para este telefone + agente
        const existing = await db.CallEvaluation.filter({ phone, agent_name: userName });
        let evalRecord;

        if (existing.length > 0) {
          // Acumular ligação no registro existente
          const prev = existing[0];
          const prevCalls = (() => { try { return JSON.parse(prev.calls_data || "[]"); } catch { return []; } })();
          prevCalls.push(newCallEntry);

          evalRecord = await db.CallEvaluation.update(prev.id, {
            calls_data: JSON.stringify(prevCalls),
            total_calls: prevCalls.length,
            total_speaking_time: prevCalls.reduce((s, c) => s + (c.speaking_time || 0), 0),
            last_called_at: now,
            last_qualification: qualificationName,
            contact_name: contactName || prev.contact_name,
            evaluation_status: "pending",
            // Limpa scores antigos para reavaliação
            score: null,
            score_tone: null,
            score_objections: null,
            score_pitch: null,
            feedback_summary: null,
          });
          evalRecord = { ...prev, ...evalRecord, id: prev.id };
          console.log(`[3C] evaluation updated (${prevCalls.length} calls) for ${userName} / ${phone}`);
        } else {
          // Criar novo registro para este contato
          evalRecord = await db.CallEvaluation.create({
            agent_name: userName,
            agent_id: agentId,
            phone,
            contact_name: contactName,
            calls_data: JSON.stringify([newCallEntry]),
            total_calls: 1,
            total_speaking_time: speakingTime,
            last_called_at: now,
            last_qualification: qualificationName,
            evaluation_status: "pending",
          });
          console.log(`[3C] evaluation created for ${userName} / ${phone}`);
        }

        // Disparar avaliação consolidada assíncrona
        try {
          base44.asServiceRole.functions.invoke("evaluateCall", { evaluation_id: evalRecord.id });
        } catch (e) {
          console.log("[3C] could not trigger evaluation:", e.message);
        }

        saved.push({ event_type: "call.evaluation_upserted", agent: userName, eval_id: evalRecord.id });
      }

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