import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const secret = Deno.env.get("THREEC_WEBHOOK_SECRET");
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || queryToken;

  // Also accept token from body for testing purposes
  const bodyForToken = bodyText ? (() => { try { return JSON.parse(bodyText || "{}"); } catch { return {}; } })() : null;
  const bodyToken = bodyForToken?.token;
  const effectiveToken = token || bodyToken;

  if (secret && effectiveToken !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyText = await req.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[3C] Webhook received, event keys:", Object.keys(body).join(", "));

  // Use asServiceRole to invoke the processor function with proper auth context
  const base44 = createClientFromRequest(req);
  const result = await base44.asServiceRole.functions.invoke("threecWebhookProcessor", { body });

  return Response.json({ received: 1, ...result });
});