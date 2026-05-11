const DC_API = 'https://api.g1.datacrazy.io/api/v1';
const DC_TOKEN = Deno.env.get('DATACRAZY');

const dc = async (path) => {
  const res = await fetch(`${DC_API}${path}`, {
    headers: { Authorization: `Bearer ${DC_TOKEN}` },
  });
  if (!res.ok) throw new Error(`DC API ${res.status}: ${path}`);
  return res.json();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    if (!DC_TOKEN) return Response.json({ error: 'DATACRAZY secret não configurada' }, { status: 500 });

    let body = {};
    try { body = await req.json(); } catch (_) {}

    // Debug: explorar qualquer endpoint
    if (body._explore) {
      const data = await dc(body._explore);
      return Response.json(data);
    }

    // Busca pipelines + atendentes em paralelo
    console.log('[DC Stats] Buscando estrutura...');
    const [pipelinesData, attendantsData] = await Promise.all([
      dc('/pipelines'),
      dc('/attendants/crm'),
    ]);
    const pipelines = pipelinesData.data || [];
    const attendants = attendantsData.data || [];

    // Busca etapas de todos os pipelines sequencialmente
    const allStages = [];
    for (const pipeline of pipelines) {
      await sleep(300);
      const stagesData = await dc(`/pipelines/${pipeline.id}/stages`);
      (stagesData.data || []).forEach((stage) => {
        allStages.push({ ...stage, pipelineName: pipeline.name, pipelineId: pipeline.id });
      });
    }
    allStages.sort((a, b) => a.pipelineName.localeCompare(b.pipelineName) || a.index - b.index);
    console.log(`[DC Stats] ${pipelines.length} pipelines, ${allStages.length} etapas, ${attendants.length} atendentes`);

    // Total de leads (sem filtros)
    await sleep(300);
    const leadsTotal = await dc('/leads?take=1&skip=0');
    const totalLeads = leadsTotal.count || 0;

    // Businesses por etapa — sequencial com delay para evitar 429
    console.log('[DC Stats] Contando negócios por etapa...');
    const byStage = [];
    for (const stage of allStages) {
      await sleep(500);
      try {
        const data = await dc(`/businesses?take=1&skip=0&filter[stageId]=${stage.id}&filter[status]=in_process`);
        byStage.push({
          stageId: stage.id, stageName: stage.name, stageIndex: stage.index,
          stageColor: stage.color, pipelineName: stage.pipelineName, pipelineId: stage.pipelineId,
          count: data.count || 0,
        });
      } catch (e) {
        console.warn(`[DC Stats] Erro etapa ${stage.name}:`, e.message);
        byStage.push({
          stageId: stage.id, stageName: stage.name, stageIndex: stage.index,
          stageColor: stage.color, pipelineName: stage.pipelineName, pipelineId: stage.pipelineId,
          count: 0,
        });
      }
    }

    // Leads por atendente — sequencial com delay
    console.log('[DC Stats] Contando leads por atendente...');
    const sellerResults = [];
    for (const att of attendants) {
      await sleep(500);
      try {
        const data = await dc(`/leads?take=1&skip=0&filter[attendantId]=${att.id}`);
        sellerResults.push({ name: att.name, attendantId: att.id, email: att.email || '', count: data.count || 0 });
      } catch (e) {
        console.warn(`[DC Stats] Erro atendente ${att.name}:`, e.message);
        sellerResults.push({ name: att.name, attendantId: att.id, email: att.email || '', count: 0 });
      }
    }
    sellerResults.sort((a, b) => b.count - a.count);

    return Response.json({
      totalLeads,
      byStage,
      bySeller: sellerResults,
      pipelines: pipelines.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (error) {
    console.error('[DC Stats] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});