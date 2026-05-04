import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Polling automático da API DataCrazy para sincronizar leads
// Ajuste as variáveis abaixo com os detalhes reais da API

const DATACRAZY_API_URL = "https://api.datacrazy.com.br/v1"; // ALTERE COM A URL REAL
const DATACRAZY_API_KEY = Deno.env.get("DATACRAZY") || ""; // Agora está em Segredos
const DATACRAZY_LEADS_ENDPOINT = "/leads"; // ALTERE SE NECESSÁRIO

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', message: 'DataCrazy poller endpoint active' });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    console.log('[DataCrazy] Iniciando polling...');

    // 1. Buscar leads da API DataCrazy
    const apiUrl = `${DATACRAZY_API_URL}${DATACRAZY_LEADS_ENDPOINT}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DATACRAZY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[DataCrazy] Erro na API: ${response.status} ${response.statusText}`);
      return Response.json(
        { error: `DataCrazy API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const apiData = await response.json();
    console.log(`[DataCrazy] Recebidos ${Array.isArray(apiData) ? apiData.length : apiData.data?.length || 0} leads`);

    // 2. Normalizar resposta (pode ser array ou {data: array})
    const leads = Array.isArray(apiData) ? apiData : apiData.data || [];

    let created = 0;
    let updated = 0;

    // 3. Processar cada lead
    for (const leadData of leads) {
      try {
        // Mapeamento de campos DataCrazy para estrutura Lead
        const lead_id = leadData.id || leadData.lead_id || '';
        if (!lead_id) {
          console.log('[DataCrazy] Lead sem ID, ignorando');
          continue;
        }

        // Buscar lead existente
        const existing = await db.Lead.filter({ lead_id });

        const mappedLead = {
          lead_id,
          name: leadData.name || leadData.full_name || 'Sem nome',
          phone: leadData.phone || leadData.phone_number || '',
          source: 'datacrazy',
          source_campaign: leadData.campaign || leadData.source_campaign || '',
          seller_id: leadData.seller_id || '',
          seller_name: leadData.seller_name || '',
          stage: leadData.stage ? Number(leadData.stage) : 1,
          status: leadData.status?.toLowerCase() === 'won' ? 'won' 
                  : leadData.status?.toLowerCase() === 'lost' ? 'lost' 
                  : 'open',
          loss_reason: leadData.loss_reason || null,
          value_expected: leadData.value || leadData.value_expected || 0,
          last_contact_at: leadData.last_contact_at || null,
          last_stage_change_at: leadData.last_stage_change_at || null,
          notes: leadData.notes || '',
        };

        if (existing.length > 0) {
          // Atualizar lead existente
          await db.Lead.update(existing[0].id, mappedLead);
          updated++;
          console.log(`[DataCrazy] Lead atualizado: ${lead_id}`);
        } else {
          // Criar novo lead
          await db.Lead.create(mappedLead);
          created++;
          console.log(`[DataCrazy] Lead criado: ${lead_id}`);
        }

        // Registrar evento
        await db.Event.create({
          entity_type: 'lead',
          entity_id: existing.length > 0 ? existing[0].id : '',
          event_type: existing.length > 0 ? 'lead.updated' : 'lead.created',
          user_name: 'DataCrazy',
          user_email: '',
          source: 'datacrazy',
          payload: JSON.stringify({
            datacrazy_id: lead_id,
            stage: mappedLead.stage,
            status: mappedLead.status,
          }),
        });

      } catch (error) {
        console.error(`[DataCrazy] Erro ao processar lead:`, error.message);
        continue;
      }
    }

    console.log(`[DataCrazy] Polling concluído: ${created} criados, ${updated} atualizados`);

    return Response.json({
      success: true,
      summary: {
        total_processed: leads.length,
        created,
        updated,
      },
    });

  } catch (error) {
    console.error('[DataCrazy] Erro geral:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});