const DC_API = 'https://api.g1.datacrazy.io/api/v1';
const DC_TOKEN = Deno.env.get('DATACRAZY');

const headers = () => ({ Authorization: `Bearer ${DC_TOKEN}` });

async function dcGet(path) {
  const res = await fetch(`${DC_API}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`DC API ${res.status}: ${path}`);
  return res.json();
}

// Busca apenas o count de negócios por stageId (take=1 = mínimo de dados)
async function countBusinessesByStage(stageId) {
  const data = await dcGet(`/businesses?take=1&skip=0&filter[stageId]=${stageId}&filter[status]=in_process`);
  return data.count || 0;
}

// Busca todos os negócios em_processo de um stage (paginado) para agregar por attendant
async function fetchBusinessesByStage(stageId) {
  const pageSize = 100;
  let skip = 0;
  let all = [];
  while (true) {
    const data = await dcGet(`/businesses?take=${pageSize}&skip=${skip}&filter[stageId]=${stageId}&filter[status]=in_process`);
    all = all.concat(data.data || []);
    if (all.length >= data.count || (data.data || []).length === 0) break;
    skip += pageSize;
  }
  return all;
}

// Leads aguardando atendimento = sem attendant atribuído
async function countLeadsWaiting() {
  const data = await dcGet(`/leads?take=1&skip=0&filter[attendantId]=null`);
  return data.count || 0;
}

// Leads por attendant = busca o count de leads por attendantId
async function countLeadsByAttendant(attendantId) {
  const data = await dcGet(`/leads?take=1&skip=0&filter[attendantId]=${attendantId}`);
  return data.count || 0;
}

Deno.serve(async (req) => {
  try {
    if (!DC_TOKEN) {
      return Response.json({ error: 'DATACRAZY secret não configurada' }, { status: 500 });
    }

    // 1. Busca pipelines
    console.log('[DC Stats] Buscando pipelines...');
    const pipelinesData = await dcGet('/pipelines');
    const pipelines = pipelinesData.data || [];
    console.log(`[DC Stats] ${pipelines.length} pipeline(s) encontrada(s)`);

    // 2. Busca etapas de todos os pipelines em paralelo
    const allStages = [];
    await Promise.all(
      pipelines.map(async (pipeline) => {
        const stagesData = await dcGet(`/pipelines/${pipeline.id}/stages`);
        (stagesData.data || []).forEach((stage) => {
          allStages.push({ ...stage, pipelineName: pipeline.name, pipelineId: pipeline.id });
        });
      })
    );
    // Ordena por índice dentro de cada pipeline
    allStages.sort((a, b) => a.index - b.index);
    console.log(`[DC Stats] ${allStages.length} etapa(s) encontrada(s)`);

    // 3. Conta negócios por etapa em paralelo
    const stageCountResults = await Promise.all(
      allStages.map(async (stage) => {
        const count = await countBusinessesByStage(stage.id);
        return {
          stageId: stage.id,
          stageName: stage.name,
          stageIndex: stage.index,
          stageColor: stage.color,
          pipelineName: stage.pipelineName,
          pipelineId: stage.pipelineId,
          count,
        };
      })
    );

    // 4. Leads aguardando atendimento
    console.log('[DC Stats] Contando leads aguardando...');
    let waitingCount = 0;
    try {
      waitingCount = await countLeadsWaiting();
    } catch (e) {
      console.warn('[DC Stats] Não foi possível contar aguardando:', e.message);
    }

    // 5. Atendentes e leads por atendente
    console.log('[DC Stats] Buscando atendentes...');
    const attendantsData = await dcGet('/attendants/crm');
    const attendants = attendantsData.data || [];
    console.log(`[DC Stats] ${attendants.length} atendente(s)`);

    const sellerCounts = await Promise.all(
      attendants.map(async (att) => {
        const count = await countLeadsByAttendant(att.id);
        return { name: att.name, attendantId: att.id, email: att.email, count };
      })
    );

    // Ordena por quantidade decrescente
    sellerCounts.sort((a, b) => b.count - a.count);

    // Total geral
    const totalBusinesses = stageCountResults.reduce((s, r) => s + r.count, 0);

    return Response.json({
      total: totalBusinesses,
      waitingCount,
      byStage: stageCountResults,
      bySeller: sellerCounts,
      pipelines: pipelines.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (error) {
    console.error('[DC Stats] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});