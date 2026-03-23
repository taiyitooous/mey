import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Get all call events from 3C
  const events = await base44.asServiceRole.entities.Event.filter({ source: "3c", event_type: { $regex: "call" } }, '-created_date', 1000);
  
  // Count by agent_id (from payload)
  const agentCounts = {};
  const agentMapping = {}; // agent_id -> user_name mapping
  
  events.forEach(event => {
    try {
      const payload = JSON.parse(event.payload || '{}');
      const agentId = payload.agent_id || 'unknown';
      const userName = event.user_name || 'unmapped';
      
      if (!agentCounts[agentId]) {
        agentCounts[agentId] = 0;
        agentMapping[agentId] = userName;
      }
      agentCounts[agentId]++;
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
  
  // Get the mapping config
  const mappings = await base44.asServiceRole.entities.ThreecAgent.list();
  const mappingsByAgentId = {};
  mappings.forEach(m => {
    mappingsByAgentId[m.agent_id] = m;
  });
  
  // Compare
  const result = Object.entries(agentCounts).map(([agentId, count]) => ({
    agent_id: agentId,
    count,
    current_user_name: agentMapping[agentId],
    mapped_config: mappingsByAgentId[agentId] || null
  }));
  
  return Response.json(result.sort((a, b) => b.count - a.count));
});