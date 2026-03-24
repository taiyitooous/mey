import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Validate payload
    if (!body.phone || !body.device_token || !body.direction) {
      return Response.json({ error: 'Missing required fields: phone, device_token, direction' }, { status: 400 });
    }

    // Fetch device config
    const devices = await base44.asServiceRole.entities.WavoipConfig.filter({ device_token: body.device_token, active: true });

    if (devices.length === 0) {
      return Response.json({ error: 'Device not found or inactive' }, { status: 404 });
    }

    const device = devices[0];

    // Create event
    const eventData = {
      entity_type: 'lead',
      entity_id: body.phone,
      event_type: body.event_type || 'whatsapp_call_received',
      payload: JSON.stringify({
        phone: body.phone,
        display_name: body.display_name || null,
        direction: body.direction,
        status: body.status || 'active',
        duration_seconds: body.duration_seconds || 0,
      }),
      user_name: device.user_name,
      user_email: device.user_email,
      source: 'wavoip',
    };

    const event = await base44.asServiceRole.entities.Event.create(eventData);

    return Response.json({
      success: true,
      event_id: event.id,
      message: 'Event logged successfully',
    });
  } catch (error) {
    console.error('Wavoip listener error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});