import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse semicolon-separated with quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '"') {
        inQuotes = !inQuotes;
      } else if (line[c] === ';' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += line[c];
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// Determine if a call was answered based on readable_status_text and speaking_with_agent_time
function wasAnswered(row) {
  const status = (row['readable_status_text'] || '').toLowerCase();
  const speakingTime = row['speaking_with_agent_time'] || '00:00:00';
  
  // Not answered statuses
  if (status === 'não atendida' || status === 'falha') return false;
  
  // Answered if "finalizada" and had speaking time > 0
  if (status === 'finalizada') {
    const parts = speakingTime.split(':').map(Number);
    const seconds = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    return seconds > 0;
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { csvText } = await req.json();
    if (!csvText) {
      return Response.json({ error: 'Missing csvText' }, { status: 400 });
    }

    const calls = parseCSV(csvText);
    let createdCount = 0;
    const agentStats = {};

    for (const call of calls) {
      const agentName = call['agent_name'] || '';
      const phone = call['number'] || call['receptive_phone'] || '';
      const callDate = call['call_date'] || '';
      const sid = call['sid'] || call['telephony_id'] || '';
      
      if (!agentName || !phone) continue;

      if (!agentStats[agentName]) agentStats[agentName] = { total: 0, answered: 0 };
      agentStats[agentName].total++;

      const answered = wasAnswered(call);
      if (answered) agentStats[agentName].answered++;

      // Parse date from "23/03/2026 09:22:41" format to ISO
      let isoDate = new Date().toISOString();
      if (callDate) {
        try {
          const [datePart, timePart] = callDate.split(' ');
          const [day, month, year] = datePart.split('/');
          isoDate = new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}-03:00`).toISOString();
        } catch (_) {}
      }

      const eventType = answered ? 'call.answered' : 'call.ended';

      await base44.asServiceRole.entities.Event.create({
        entity_type: 'lead',
        entity_id: phone,
        event_type: eventType,
        payload: JSON.stringify({
          call_id: sid,
          agent_id: call['agent_id'],
          phone,
          result: answered ? 'answered' : 'no_answer',
          speaking_time: call['speaking_with_agent_time'],
          qualification: call['qualification_name'],
          campaign: call['campaign_name'],
          source: '3c',
        }),
        user_name: agentName,
        user_email: '',
        source: '3c',
        created_date: isoDate,
      });

      createdCount++;
    }

    return Response.json({
      success: true,
      created: createdCount,
      agentStats,
      message: `Importadas ${createdCount} chamadas de ${Object.keys(agentStats).length} agentes`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});