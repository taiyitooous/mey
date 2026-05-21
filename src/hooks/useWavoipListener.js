import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Hook que conecta ao Wavoip via @wavoip/wavoip-api (WebSocket oficial)
// Escuta chamadas recebidas (offer) e registra eventos no banco via registerWavoipCall

export function useWavoipListener(devices = []) {
  const wavoipRef = useRef(null);
  const unsubsRef = useRef([]);
  const activeCallsRef = useRef({});   // call.id -> { phone, call_type, startedAt, device_token, ended }
  const registeredEventsRef = useRef(new Set()); // "callId_type" → impede disparo duplo no frontend

  useEffect(() => {
    const activeTokens = devices.filter((d) => d.active !== false).map((d) => d.device_token);
    if (!activeTokens.length) return;

    let destroyed = false;

    import("@wavoip/wavoip-api").then(({ Wavoip }) => {
      if (destroyed) return;

      console.log(`[Wavoip] Iniciando com ${activeTokens.length} dispositivo(s)...`);

      const wavoip = new Wavoip({ tokens: activeTokens });
      wavoipRef.current = wavoip;

      const registerOnce = (callId, type, payload) => {
        const key = `${callId}_${type}`;
        if (registeredEventsRef.current.has(key)) {
          console.log(`[Wavoip] Ignorando duplicata frontend: ${key}`);
          return;
        }
        registeredEventsRef.current.add(key);
        base44.functions.invoke("registerWavoipCall", payload)
          .catch((err) => console.error(`[Wavoip] Erro ao registrar ${type}:`, err.message));
      };

      // Listener de ofertas (chamadas recebidas)
      const unsubOffer = wavoip.on("offer", (offer) => {
        const { id, peer, device_token, type: call_type } = offer;
        const phone = peer?.phone || "";
        const startedAt = Date.now();

        console.log(`[Wavoip] 📞 Chamada | phone: ${phone} | device: ${device_token?.slice(-8)} | type: ${call_type}`);

        activeCallsRef.current[id] = { phone, call_type, startedAt, device_token, ended: false };

        registerOnce(id, "start", {
          device_token,
          phone,
          type: "start",
          call_type: call_type || "unknown",
          call_id: id,
          duration_seconds: 0,
        });

        const registerEnd = (type, duration) => {
          const active = activeCallsRef.current[id];
          if (!active || active.ended) return;
          active.ended = true;
          registerOnce(id, type, {
            device_token: active.device_token,
            phone: active.phone,
            type,
            call_type: active.call_type,
            call_id: id,
            duration_seconds: duration,
          });
          delete activeCallsRef.current[id];
        };

        const unsubEnded = offer.on("ended", () => {
          const duration = Math.round((Date.now() - (activeCallsRef.current[id]?.startedAt || Date.now())) / 1000);
          registerEnd("missed", duration);
        });

        const unsubUnanswered = offer.on("unanswered", () => {
          const duration = Math.round((Date.now() - (activeCallsRef.current[id]?.startedAt || Date.now())) / 1000);
          registerEnd("missed", duration);
        });

        const unsubAcceptedElsewhere = offer.on("acceptedElsewhere", () => {
          registerEnd("answered", 0);
        });

        unsubsRef.current.push(unsubEnded, unsubUnanswered, unsubAcceptedElsewhere);
      });

      unsubsRef.current.push(unsubOffer);

      // Log de status dos dispositivos
      wavoip.getDevices().forEach((device) => {
        const unsub = device.on("statusChanged", (status) => {
          console.log(`[Wavoip] Device ${device.token.slice(-8)} → ${status}`);
        });
        unsubsRef.current.push(unsub);
      });
    }).catch((err) => {
      console.error("[Wavoip] Erro ao importar @wavoip/wavoip-api:", err);
    });

    return () => {
      destroyed = true;
      unsubsRef.current.forEach((unsub) => { try { unsub(); } catch {} });
      unsubsRef.current = [];
      activeCallsRef.current = {};
      // Não limpa registeredEventsRef para manter dedup mesmo após re-mount
      wavoipRef.current = null;
    };
  }, [JSON.stringify(devices.filter(d => d.active !== false).map(d => d.device_token).sort())]);
}