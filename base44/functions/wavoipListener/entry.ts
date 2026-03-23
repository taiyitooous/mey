import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { Wavoip } from 'npm:@wavoip/wavoip-api';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active Wavoip devices
    const devices = await base44.asServiceRole.entities.WavoipConfig.filter({ active: true });

    if (devices.length === 0) {
      return Response.json({ message: 'No active Wavoip devices configured' });
    }

    // Initialize Wavoip with device tokens
    const tokens = devices.map((d) => d.device_token);
    const wavoip = new Wavoip({ tokens });

    // Map device_token to user info
    const deviceMap = {};
    devices.forEach((d) => {
      deviceMap[d.device_token] = {
        user_name: d.user_name,
        user_email: d.user_email,
        device_name: d.device_name,
      };
    });

    // Listen for incoming offers
    wavoip.onOffer((offer) => {
      const userInfo = deviceMap[offer.device_token];
      if (!userInfo) return;

      // Accept the call
      offer.accept().then(async ({ call, err }) => {
        if (err) {
          console.error('Error accepting call:', err);
          return;
        }

        // Log call event
        const payload = {
          phone: call.peer.phone,
          display_name: call.peer.displayName,
          direction: call.direction,
          status: call.status,
        };

        const eventData = {
          entity_type: 'lead',
          entity_id: call.peer.phone, // Use phone as entity reference
          event_type: 'whatsapp_call_received',
          payload: JSON.stringify(payload),
          user_name: userInfo.user_name,
          user_email: userInfo.user_email,
          source: 'wavoip',
        };

        try {
          await base44.asServiceRole.entities.Event.create(eventData);
        } catch (e) {
          console.error('Error creating event:', e);
        }
      });

      // Listen for call end
      offer.onEnd(() => {
        const endPayload = {
          phone: offer.peer.phone,
          status: 'ended',
          result: offer.status,
        };

        base44.asServiceRole.entities.Event.create({
          entity_type: 'lead',
          entity_id: offer.peer.phone,
          event_type: 'whatsapp_call_ended',
          payload: JSON.stringify(endPayload),
          user_name: userInfo.user_name,
          user_email: userInfo.user_email,
          source: 'wavoip',
        }).catch((e) => console.error('Error logging call end:', e));
      });
    });

    return Response.json({
      message: 'Wavoip listener started',
      devices_active: devices.length,
    });
  } catch (error) {
    console.error('Wavoip listener error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});