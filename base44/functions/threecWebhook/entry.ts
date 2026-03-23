import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const bodyText = await req.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const secret = Deno.env.get("THREEC_WEBHOOK_SECRET");
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || queryToken || body.token;

  if (secret && token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  delete body.token;

  console.log("[3C] event:", Object.keys(body).join(", "));

  const base44 = createClientFromRequest(req);
  await base44.asServiceRole.functions.invoke("threecWebhookProcessor", { body });

  return Response.json({ received: 1 });
});