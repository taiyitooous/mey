import React from "react";
import { Trophy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERIOD_OPTIONS } from "@/lib/leaderboardUtils";

export default function LeaderboardHeader({ period, setPeriod, customStart, customEnd, setCustomStart, setCustomEnd }) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Ranking de desempenho dos times</p>
        </div>
      </div>

      {/* Period filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        {PERIOD_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={period === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(opt.value)}
            className={period === opt.value ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}
          >
            {opt.label}
          </Button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 w-36 text-xs bg-card border-border"
            />
            <span className="text-muted-foreground text-xs">até</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 w-36 text-xs bg-card border-border"
            />
          </div>
        )}
      </div>
    </div>
  );
}