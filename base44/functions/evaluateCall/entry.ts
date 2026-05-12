import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SYSTEM_PROMPT = `Você é um especialista em análise de ligações de vendas para uma empresa brasileira.
Avalie o conjunto de ligações com base nas informações fornecidas.
Seja direto, construtivo e objetivo. Use português brasileiro.`;

function buildConsolidatedPrompt({ agentName, contactName, phone, calls }) {
  const totalCalls = calls.length;
  const totalSpeaking = calls.reduce((s, c) => s + (c.speaking_time || 0), 0);
  const mins = Math.floor(totalSpeaking / 60);
  const secs = totalSpeaking % 60;

  let context = `
Vendedor: ${agentName}
Contato: ${contactName || phone}
Total de ligações com este contato: ${totalCalls}
Tempo total de fala: ${mins}min ${secs}s

Detalhes de cada ligação:
`;

  calls.forEach((c, i) => {
    const cm = Math.floor((c.speaking_time || 0) / 60);
    const cs = (c.speaking_time || 0) % 60;
    context += `\nLigação ${i + 1}:
  - Duração: ${cm}min ${cs}s
  - Qualificação: ${c.qualification || "Não qualificado"}
  - Campanha: ${c.campaign || "Não informada"}`;
    if (c.transcript) {
      context += `\n  - Transcrição: ${c.transcript.substring(0, 800)}`;
    }
  });

  context += `\n\n(Se não houver transcrições, avalie com base nos padrões das ligações: duração, qualificações, número de tentativas e boas práticas de vendas)`;

  return `${context}

Avalie o conjunto de ligações deste vendedor com este contato específico e retorne um JSON:
{
  "score": <número 0-10, pontuação geral consolidada>,
  "score_tone": <número 0-10>,
  "score_objections": <número 0-10>,
  "score_pitch": <número 0-10>,
  "feedback_tone": "<feedback sobre tom, postura e abordagem ao longo das ligações>",
  "feedback_objections": "<feedback sobre como tratou objeções ao longo das interações>",
  "feedback_pitch": "<feedback sobre o pitch de vendas considerando todas as ligações>",
  "feedback_summary": "<resumo geral em 2-3 frases considerando toda a jornada com este contato>",
  "strengths": ["<ponto forte 1>", "<ponto forte 2>"],
  "improvements": ["<melhoria 1>", "<melhoria 2>", "<melhoria 3>"]
}

Considere:
- Tom/abordagem: cordialidade, confiança, clareza, escuta ativa
- Objeções: identificação e tratamento de resistências ao longo das ligações
- Pitch: apresentação do produto/oferta, criação de valor, chamada para ação
- Se houve evolução positiva entre as ligações, valorize isso
- Se o contato nunca foi convertido apesar de múltiplas tentativas, analise o porquê`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  const body = await req.json();
  const { evaluation_id } = body;

  if (!evaluation_id) {
    return Response.json({ error: "evaluation_id required" }, { status: 400 });
  }

  // Buscar o registro de avaliação pelo id
  const all = await db.CallEvaluation.list("-created_date", 500);
  const evaluation = all.find(e => e.id === evaluation_id);

  if (!evaluation) {
    return Response.json({ error: "evaluation not found" }, { status: 404 });
  }

  // Ignorar se não há tempo real de fala
  if (!evaluation.total_speaking_time || evaluation.total_speaking_time < 5) {
    await db.CallEvaluation.update(evaluation.id, { evaluation_status: "error" });
    return Response.json({ error: "No speaking time — cannot evaluate" }, { status: 422 });
  }

  // Marcar como processing
  await db.CallEvaluation.update(evaluation.id, { evaluation_status: "processing" });

  const calls = (() => { try { return JSON.parse(evaluation.calls_data || "[]"); } catch { return []; } })();

  const prompt = buildConsolidatedPrompt({
    agentName: evaluation.agent_name,
    contactName: evaluation.contact_name,
    phone: evaluation.phone,
    calls,
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