import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Pega todos os leads da DataCrazy
    const leads = await base44.asServiceRole.entities.Lead.filter({ source: "datacrazy" }, "-created_date", 1000);

    // Calcula hoje em São Paulo
    const now = new Date();
    const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const snapshotDate = spTime.toISOString().split('T')[0];

    // Contagems por etapa
    const stageCount = {};
    const sellerCount = {};
    const statusCount = { open: 0, won: 0, lost: 0 };
    
    let totalValue = 0;
    let newLeadsCount = 0;
    let wonLeadsCount = 0;
    let lostLeadsCount = 0;

    const today = new Date(snapshotDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    leads.forEach((lead) => {
      // Por etapa
      const stage = lead.stage || 1;
      stageCount[stage] = (stageCount[stage] || 0) + 1;

      // Por vendedor
      const seller = lead.seller_name?.trim() || "Sem vendedor";
      sellerCount[seller] = (sellerCount[seller] || 0) + 1;

      // Por status
      const status = lead.status || "open";
      statusCount[status] = (statusCount[status] || 0) + 1;

      // Valor esperado
      if (lead.value_expected) {
        totalValue += lead.value_expected;
      }

      // Leads criados hoje
      if (lead.created_date) {
        const createdDate = new Date(lead.created_date);
        if (createdDate >= today && createdDate < tomorrow) {
          newLeadsCount++;
        }
      }

      // Status mudou hoje
      if (status === "won" && lead.last_stage_change_at) {
        const changedDate = new Date(lead.last_stage_change_at);
        if (changedDate >= today && changedDate < tomorrow) {
          wonLeadsCount++;
        }
      }

      if (status === "lost" && lead.last_stage_change_at) {
        const changedDate = new Date(lead.last_stage_change_at);
        if (changedDate >= today && changedDate < tomorrow) {
          lostLeadsCount++;
        }
      }
    });

    // Verifica se já existe snapshot para hoje
    const existingSnapshots = await base44.asServiceRole.entities.LeadSnapshot.filter({ snapshot_date: snapshotDate });

    if (existingSnapshots.length > 0) {
      // Atualiza
      await base44.asServiceRole.entities.LeadSnapshot.update(existingSnapshots[0].id, {
        total_leads: leads.length,
        leads_by_stage: JSON.stringify(stageCount),
        leads_by_seller: JSON.stringify(sellerCount),
        leads_by_status: JSON.stringify(statusCount),
        total_expected_value: totalValue,
        new_leads_count: newLeadsCount,
        won_leads_count: wonLeadsCount,
        lost_leads_count: lostLeadsCount,
      });
      console.log(`[Snapshot] Snapshot de ${snapshotDate} atualizado`);
    } else {
      // Cria novo
      await base44.asServiceRole.entities.LeadSnapshot.create({
        snapshot_date: snapshotDate,
        total_leads: leads.length,
        leads_by_stage: JSON.stringify(stageCount),
        leads_by_seller: JSON.stringify(sellerCount),
        leads_by_status: JSON.stringify(statusCount),
        total_expected_value: totalValue,
        new_leads_count: newLeadsCount,
        won_leads_count: wonLeadsCount,
        lost_leads_count: lostLeadsCount,
      });
      console.log(`[Snapshot] Snapshot de ${snapshotDate} criado`);
    }

    return Response.json({
      success: true,
      snapshot_date: snapshotDate,
      total_leads: leads.length,
      new_leads: newLeadsCount,
      won_leads: wonLeadsCount,
      lost_leads: lostLeadsCount,
    });
  } catch (error) {
    console.error('[Snapshot] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});