import React from "react";
import { Trophy, Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCriteriaValue } from "@/lib/leaderboardUtils";

const PODIUM_STYLES = [
  { // 2nd
    order: 2,
    height: "h-24",
    bg: "bg-gradient-to-b from-muted to-card",
    border: "border-muted-foreground/30",
    icon: <Medal className="w-5 h-5 text-muted-foreground" />,
    badge: "bg-muted-foreground/20 text-muted-foreground",
    label: "#2",
    size: "text-base",
  },
  { // 1st
    order: 1,
    height: "h-32",
    bg: "bg-gradient-to-b from-primary/20 to-card",
    border: "border-primary/50",
    icon: <Trophy className="w-6 h-6 text-primary" />,
    badge: "bg-primary/20 text-primary",
    label: "#1",
    size: "text-lg",
    glow: true,
  },
  { // 3rd
    order: 3,
    height: "h-16",
    bg: "bg-gradient-to-b from-muted/50 to-card",
    border: "border-muted/40",
    icon: <Medal className="w-4 h-4 text-muted-foreground/60" />,
    badge: "bg-muted/30 text-muted-foreground/70",
    label: "#3",
    size: "text-sm",
  },
];

// Display order: 2nd, 1st, 3rd
const DISPLAY_ORDER = [1, 0, 2];

export default function LeaderboardPodium({ data, criteria, type }) {
  const top3 = data.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" /> Pódio
      </h2>

      <div className="flex items-end justify-center gap-3 py-4">
        {DISPLAY_ORDER.map((idx) => {
          const person = top3[idx];
          if (!person) return <div key={idx} className="w-32" />;
          const style = PODIUM_STYLES[idx];

          return (
            <div key={idx} className="flex flex-col items-center gap-2 w-32 sm:w-40">
              {/* Avatar */}
              <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 ${style.border} ${style.bg}`}>
                <span className={`font-bold ${style.size} text-foreground`}>
                  {person.name.charAt(0).toUpperCase()}
                </span>
                {style.glow && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                    <Trophy className="w-2.5 h-2.5 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="text-center">
                <p className={`font-semibold ${style.size} truncate w-full max-w-[120px]`}>{person.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${style.badge}`}>
                  {getCriteriaValue(person, criteria, type)}
                </span>
              </div>

              {/* Podium bar */}
              <Card className={`w-full ${style.height} ${style.bg} border ${style.border} flex flex-col items-center justify-end pb-2`}>
                <div className={`text-xs font-bold ${style.badge} px-2 py-0.5 rounded-full`}>{style.label}</div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}