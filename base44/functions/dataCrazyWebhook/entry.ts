import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Webhook recebido da DataCrazy quando um lead é criado ou atualizado
// Payload esperado baseado na API DataCrazy: { id, name, phone, rawPhone, email, source, attendant: { name, email }, ... }

Deno.serve(async (req) => {
  // Responde GET com status (usado pela DataCrazy para verificar o endpoint)
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', message: 'DataCrazy webhook endpoint active' });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const rawBody = await req.text();
    console.log('[DataCrazy] Raw body:', rawBody.substring(0, 500));

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[DataCrazy] Body não é JSON válido:', rawBody);
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // A DataCrazy pode enviar o lead diretamente ou dentro de um wrapper
    // Tenta ambos os formatos: { lead: {...} } ou direto { id, name, phone, ... }
    const leadData = body.lead || body.data || body;

    console.log('[DataCrazy] Lead recebido:', JSON.stringify(leadData).substring(0, 300));

    const datacrazyId = leadData.id;
    const name = leadData.name || 'Sem nome';
    const phone = leadData.rawPhone || leadData.phone || '';
    const source = leadData.source || 'datacrazy';
    const sourceCampaign = leadData.sourceReferral?.sourceId || leadData.campaignName || '';

    // Vendedor/atendente da DataCrazy
    const sellerName = leadData.attendant?.name || leadData.seller?.name || '';
    const sellerEmail = leadData.attendant?.email || leadData.seller?.email || '';

    if (!name && !phone) {
      console.warn('[DataCrazy] Lead sem nome e sem telefone, ignorando');
      return Response.json({ success: true, ignored: true, reason: 'no_name_or_phone' });
    }

    // Verifica se já existe um lead com esse ID DataCrazy para evitar duplicatas
    let existingLeads = [];
    if (datacrazyId) {
      existingLeads = await base44.asServiceRole.entities.Lead.filter({ lead_id: datacrazyId });
    }

    let lead;
    if (existingLeads.length > 0) {
      // Atualiza o lead existente
      lead = existingLeads[0];
      await base44.asServiceRole.entities.Lead.update(lead.id, {
        name,
        phone,
        source: 'datacrazy',
        source_campaign: sourceCampaign,
        seller_name: sellerName || lead.seller_name,
      });
      console.log('[DataCrazy] Lead atualizado:', lead.id, name);

      // Registra evento de atualização
      await base44.asServiceRole.entities.Event.create({
        entity_type: 'lead',
        entity_id: lead.id,
        event_type: 'lead.updated',
        user_name: sellerName || 'DataCrazy',
        user_email: sellerEmail || '',
        source: 'datacrazy',
        payload: JSON.stringify({ datacrazyId, source, phone }),
      });

    } else {
      // Cria novo lead
      lead = await base44.asServiceRole.entities.Lead.create({
        lead_id: datacrazyId || '',
        name,
        phone,
        source: 'datacrazy',
        source_campaign: sourceCampaign,
        seller_name: sellerName,
        stage: 1,
        status: 'open',
      });
      console.log('[DataCrazy] Lead criado:', lead.id, name);

      // Registra evento de criação
      await base44.asServiceRole.entities.Event.create({
        entity_type: 'lead',
        entity_id: lead.id,
        event_type: 'lead.created',
        user_name: sellerName || 'DataCrazy',
        user_email: sellerEmail || '',
        source: 'datacrazy',
        payload: JSON.stringify({ datacrazyId, source, phone }),
      });
    }

    return Response.json({
      success: true,
      action: existingLeads.length > 0 ? 'updated' : 'created',
      lead_id: lead.id,
      name,
    });

  } catch (error) {
    console.error('[DataCrazy] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});