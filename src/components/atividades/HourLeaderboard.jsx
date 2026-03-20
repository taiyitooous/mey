import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getHours } from "date-fns";

export default function HourLeaderboard({ events }) {
  const hourly = {};
  for (let h = 7; h <= 20; h++) {
    hourly[h] = { total: 0, wins: 0, payments: 0, calls: 0 };
  }

  events.forEach((e) => {
    const h = getHours(new Date(e.created_date));
    if (!hourly[h]) hourly[h] = { total: 0, wins: 0, payments: 0, calls: 0 };
    hourly[h].total++;
    if (e.event_type === "lead.won") hourly[h].wins++;
    if (e.event_type === "payment.paid") hourly[h].payments++;
    if (e.event_type?.includes("call")) hourly[h].calls++;
  });

  const hours = Object.keys(hourly).map(Number).sort((a, b) => a - b);
  const maxTotal = Math.max(...hours.map((h) => hourly[h].total), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Ritmo por hora</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
          {hours.map((h) => {
            const data = hourly[h];
            const pct = (data.total / maxTotal) * 100;
            const winPct = (data.wins / maxTotal) * 100;
            return (
              <div key={h} className="flex flex-col items-center gap-1 min-w-[36px]">
                {data.total > 0 && (
                  <span className="text-[10px] font-semibold text-foreground">{data.total}</span>
                )}
                <div className="w-7 rounded-t relative bg-muted" style={{ height: "56px" }}>
                  {data.total > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary/30 rounded-t transition-all"
                      style={{ height: `${pct}%` }}
                    />
                  )}
                  {data.wins > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-success/60 rounded-t"
                      style={{ height: `${winPct}%` }}
                    />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{h}h</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-primary/30 inline-block" /> Ações
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-success/60 inline-block" /> Ganhos
          </span>
        </div>
      </CardContent>
    </Card>
  );
}