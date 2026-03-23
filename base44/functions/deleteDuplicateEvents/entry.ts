import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole.entities;

  // Find duplicates for Ana
  const all = await db.Event.filter({ user_name: "Ana Carolina da Silva Ponciano", source: "3c" });
  
  const groups = {};
  const duplicates = [];
  
  all.forEach((e) => {
    let payload = {};
    try { payload = JSON.parse(e.payload || "{}"); } catch {}
    const key = `${payload.phone}-${e.event_type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  
  // Find duplicates
  Object.entries(groups).forEach(([key, events]) => {
    if (events.length > 1) {
      const sorted = events.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      for (let i = 1; i < sorted.length; i++) {
        duplicates.push(sorted[i].id);
      }
    }
  });

  // Delete one by one
  let deleted = 0;
  for (const id of duplicates) {
    await db.Event.delete(id);
    deleted++;
  }

  return Response.json({ 
    deleted_count: deleted,
    ids: duplicates
  });
});