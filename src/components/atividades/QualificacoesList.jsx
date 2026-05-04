import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const QUALIFICATIONS = {
  "Caixa Postal": { color: "#0B0F0D", key: "caixa_postal" },
  "Promessa de Pagamento": { color: "#C8A94D", key: "promessa_pagamento" },
  "Mudo": { color: "#0B0F0D", key: "mudo" },
  "Vai Pagar Amanhã": { color: "#4F8F63", key: "vai_pagar_amanha" },
};

export default function QualificacoesList({ events = [], orders = [] }) {
  const stats = useMemo(() => {
    const counts = {
      caixa_postal: 0,
      promessa_pagamento: 0,
      mudo: 0,
      vai_pagar_amanha: 0,
    };

    // Contar qualificações em eventos (busca por payload com qualificação)
    events?.forEach((event) => {
      if (!event.payload) return;
      try {
        const payload = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
        const qual = payload.qualification?.toLowerCase() || "";
        
        if (qual.includes("caixa") || qual.includes("postal")) counts.caixa_postal++;
        else if (qual.includes("promessa")) counts.promessa_pagamento++;
        else if (qual.includes("mudo")) counts.mudo++;
        else if (qual.includes("pagar") && qual.includes("amanha")) counts.vai_pagar_amanha++;
      } catch {}
    });

    // Contar por collection_status em orders
    orders?.forEach((order) => {
      const status = order.collection_status?.toLowerCase() || "";
      if (status === "promise" || status === "agreement") counts.promessa_pagamento++;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      counts,
      total,
      data: Object.entries(QUALIFICATIONS).map(([name, config]) => ({
        name,
        ...config,
        total: counts[config.key],
        percentage: total > 0 ? Math.round((counts[config.key] / total) * 100) : 0,
      })),
    };
  }, [events, orders]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lista de Qualificações</h2>
        <Badge variant="outline" className="text-sm">{stats.total}</Badge>
      </div>

      <div className="space-y-3">
        {stats.data.map((item) => (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="text-muted-foreground text-xs">{item.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}