import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { csvData } = await req.json();
    if (!csvData) {
      return Response.json({ error: 'Missing csvData' }, { status: 400 });
    }

    // Parse CSV data - expecting array of call records
    const calls = Array.isArray(csvData) ? csvData : [csvData];

    let createdCount = 0;
    const processedAgents = new Set();

    for (const call of calls) {
      try {
        // Extract agent info
        const agentId = call.agent_id || '';
        const agentName = call.agent_name || 'Unknown';
        const callDate = call.call_date || new Date().toISOString();
        const phone = call.number || call.receptive_phone || '';
        const status = call.readable_status_text || call.status || 'unknown';
        const speakingTime = parseInt(call.speaking_with_agent_time || 0) || 0;

        if (!agentName || !phone) continue;

        processedAgents.add(agentName);

        // Determine event type based on status
        let eventType = 'call.attempt';
        if (status.toLowerCase().includes('atendida') || status.toLowerCase().includes('answered')) {
          eventType = 'call.answered';
        } else if (status.toLowerCase().includes('sem resposta') || status.toLowerCase().includes('no answer')) {
          eventType = 'call.no_answer';
        }

        // Create event record
        await base44.entities.Event.create({
          entity_type: 'lead',
          entity_id: phone,
          event_type: eventType,
          payload: JSON.stringify({
            agent_id: agentId,
            phone,
            status,
            speaking_time: speakingTime,
            call_date: callDate,
            source: '3c',
          }),
          user_name: agentName,
          user_email: `${agentName.toLowerCase().replace(/\s+/g, '.')}@ultravita.com`,
          source: '3c',
        });

        createdCount++;
      } catch (err) {
        console.error('Error processing call:', err.message);
        continue;
      }
    }

    return Response.json({
      success: true,
      created: createdCount,
      agents: Array.from(processedAgents),
      message: `Importadas ${createdCount} chamadas de ${processedAgents.size} agentes`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});