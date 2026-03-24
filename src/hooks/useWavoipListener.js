import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Hook que conecta via Socket.IO ao Wavoip e registra chamadas em tempo real
// O evento "device:contact" é disparado quando uma chamada começa ou termina
// contact = { phone } quando chamada ativa, contact = null quando termina

export function useWavoipListener(devices = []) {
  const socketsRef = useRef({});
  const activeCallsRef = useRef({}); // token -> { phone, call_type, startedAt }

  useEffect(() => {
    if (!devices.length) return;

    // Carregar socket.io-client dinamicamente
    import("https://cdn.socket.io/4.7.5/socket.io.esm.min.js").then(({ io }) => {
      devices.forEach((device) => {
        const token = device.device_token;
        if (!token || socketsRef.current[token]) return;

        console.log(`[Wavoip] Conectando WebSocket para ${device.device_name || token.slice(-8)}...`);

        const socket = io("https://devices.wavoip.com", {
          transports: ["websocket"],
          path: `/${token}/websocket`,
          autoConnect: true,
          auth: { version: "official" },
        });

        socket.on("connect", () => {
          console.log(`[Wavoip] ✓ Conectado: ${device.device_name || token.slice(-8)}`);
        });

        socket.on("disconnect", () => {
          console.log(`[Wavoip] ✗ Desconectado: ${device.device_name || token.slice(-8)}`);
        });

        // device:contact é disparado quando uma chamada começa (contact = { phone })
        // e quando termina (contact = null)
        socket.on("device:contact", async (call_type, contact) => {
          const deviceLabel = device.device_name || token.slice(-8);
          console.log(`[Wavoip] device:contact | ${deviceLabel} | call_type: ${call_type} | contact:`, contact);

          if (contact && contact.phone) {
            // Chamada iniciada — salvar referência e registrar início
            const startedAt = Date.now();
            activeCallsRef.current[token] = {
              phone: contact.phone,
              call_type,
              startedAt,
            };
            console.log(`[Wavoip] Chamada iniciada: ${contact.phone} (${call_type})`);

            const call_id = `${token}_${contact.phone}_${startedAt}`;
            base44.functions.invoke("registerWavoipCall", {
              device_token: token,
              phone: contact.phone,
              type: "start",
              call_type,
              call_id,
              duration_seconds: 0,
            }).then((res) => {
              console.log(`[Wavoip] Início registrado:`, res.data);
            }).catch((err) => {
              console.error(`[Wavoip] Erro ao registrar início:`, err.message);
            });

          } else {
            // Chamada encerrada (contact = null)
            const activeCall = activeCallsRef.current[token];
            if (!activeCall) return;

            const duration = Math.round((Date.now() - activeCall.startedAt) / 1000);
            const call_id = `${token}_${activeCall.phone}_${activeCall.startedAt}`;

            console.log(`[Wavoip] Chamada encerrada: ${activeCall.phone} | duração: ${duration}s`);

            // Registrar fim da chamada — "answered" se durou mais de 5s, senão "missed"
            const endType = duration > 5 ? "answered" : "missed";
            base44.functions.invoke("registerWavoipCall", {
              device_token: token,
              phone: activeCall.phone,
              type: endType,
              call_type: activeCall.call_type,
              call_id,
              duration_seconds: duration,
            }).then((res) => {
              console.log(`[Wavoip] Fim registrado:`, res.data);
            }).catch((err) => {
              console.error(`[Wavoip] Erro ao registrar fim:`, err.message);
            });

            delete activeCallsRef.current[token];
          }
        });

        socketsRef.current[token] = socket;
      });
    });

    return () => {
      Object.values(socketsRef.current).forEach((socket) => socket.disconnect());
      socketsRef.current = {};
    };
  }, [JSON.stringify(devices.map(d => d.device_token))]);
}