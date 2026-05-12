import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Prompts de avaliação
const SYSTEM_PROMPT = `Você é um especialista em análise de ligações de vendas para uma empresa brasileira.
Avalie a ligação com base nas informações fornecidas (duração, qualificação, dados do contexto).
Seja direto, construtivo e objetivo. Use português brasileiro.`;

function buildEvalPrompt({ agentName, contactName, campaign, speakingTime, qualification, transcript }) {
  const mins = Math.floor(speakingTime / 60);
  const secs = speakingTime % 60;
  const durStr = `${mins}min ${secs}s`;

  let context = `
Vendedor: ${agentName}
Contato: ${contactName || "Não identificado"}
Campanha: ${campaign || "Não informada"}
Duração da fala: ${durStr}
Qualificação registrada: ${qualification || "Não qualificado"}
`;

  if (transcript) {
    context += `\nTranscrição da ligação:\n${transcript}`;
  } else {
    context += `\n(Transcrição não disponível — avalie com base nos dados acima e nas boas práticas de vendas)`;
  }

  return `${context}

Avalie esta ligação de vendas e retorne um JSON com a seguinte estrutura:
{
  "score": <número 0-10, pontuação geral>,
  "score_tone": <número 0-10>,
  "score_objections": <número 0-10>,
  "score_pitch": <número 0-10>,
  "feedback_tone": "<feedback sobre tom, postura e abordagem>",
  "feedback_objections": "<feedback sobre como tratou ou deveria tratar objeções>",
  "feedback_pitch": "<feedback sobre o pitch de vendas, apresentação do produto/oferta>",
  "feedback_summary": "<resumo geral da avaliação em 2-3 frases>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>"],
  "improvements": ["<melhoria 1>", "<melhoria 2>", "<melhoria 3>"]
}

Considere:
- Tom/abordagem: cordialidade, confiança, clareza, escuta ativa
- Objeções: identificação e tratamento de resistências do cliente
- Pitch: apresentação do produto/oferta, criação de valor, chamada para ação
- Se a qualificação foi positiva (venda), pontue mais alto onde faz sentido
- Se a duração foi muito curta (< 60s), penalize levemente pois pode indicar pouco engajamento`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const body = await req.json();
  const { evaluation_id } = body;

  if (!evaluation_id) {
    return Response.json({ error: "evaluation_id required" }, { status: 400 });
  }

  // Buscar a avaliação
  const evaluations = await db.CallEvaluation.filter({ call_id: evaluation_id });
  let evaluation = evaluations[0];

  // Fallback: buscar por id direto
  if (!evaluation) {
    try {
      const all = await db.CallEvaluation.list("-created_date", 500);
      evaluation = all.find(e => e.id === evaluation_id || e.call_id === evaluation_id);
    } catch (_) { /* ignore */ }
  }

  if (!evaluation) {
    return Response.json({ error: "evaluation not found" }, { status: 404 });
  }

  // Marcar como processing
  await db.CallEvaluation.update(evaluation.id, { evaluation_status: "processing" });

  const prompt = buildEvalPrompt({
    agentName: evaluation.agent_name,
    contactName: evaluation.contact_name,
    campaign: evaluation.campaign,
    speakingTime: evaluation.speaking_time || 0,
    qualification: evaluation.qualification,
    transcript: evaluation.transcript,
  });

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        score: { type: "number" },
        score_tone: { type: "number" },
        score_objections: { type: "number" },
        score_pitch: { type: "number" },
        feedback_tone: { type: "string" },
        feedback_objections: { type: "string" },
        feedback_pitch: { type: "string" },
        feedback_summary: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        improvements: { type: "array", items: { type: "string" } },
      },
    },
  });

  await db.CallEvaluation.update(evaluation.id, {
    score: result.score,
    score_tone: result.score_tone,
    score_objections: result.score_objections,
    score_pitch: result.score_pitch,
    feedback_tone: result.feedback_tone,
    feedback_objections: result.feedback_objections,
    feedback_pitch: result.feedback_pitch,
    feedback_summary: result.feedback_summary,
    strengths: JSON.stringify(result.strengths || []),
    improvements: JSON.stringify(result.improvements || []),
    evaluation_status: "done",
  });

  return Response.json({ success: true, score: result.score, evaluation_id: evaluation.id });
});