import React from "react";
import { Trophy, Medal, Star } from "lucide-react";
import { getCriteriaValue } from "@/lib/leaderboardUtils";

const GOLD   = "#F5C842";
const SILVER = "#9BADB7";
const BRONZE = "#CD7F54";

const PODIUM_CONFIG = [
  {
    // 2nd place
    rank: 2,
    barHeight: 96,
    avatarSize: "w-14 h-14 text-base",
    ringColor: SILVER,
    barGrad: `linear-gradient(180deg, #9BADB733 0%, #9BADB710 100%)`,
    barBorder: `${SILVER}50`,
    shadow: `0 0 20px ${SILVER}22`,
    icon: <Medal className="w-4 h-4" style={{ color: SILVER }} />,
    label: "#2",
    labelColor: SILVER,
  },
  {
    // 1st place
    rank: 1,
    barHeight: 140,
    avatarSize: "w-16 h-16 text-xl",
    ringColor: GOLD,
    barGrad: `linear-gradient(180deg, #F5C84233 0%, #F5C84210 100%)`,
    barBorder: `${GOLD}60`,
    shadow: `0 0 32px ${GOLD}33`,
    icon: <Trophy className="w-5 h-5" style={{ color: GOLD }} />,
    label: "#1",
    labelColor: GOLD,
    crown: true,
  },
  {
    // 3rd place
    rank: 3,
    barHeight: 64,
    avatarSize: "w-12 h-12 text-sm",
    ringColor: BRONZE,
    barGrad: `linear-gradient(180deg, #CD7F5433 0%, #CD7F5410 100%)`,
    barBorder: `${BRONZE}40`,
    shadow: `0 0 16px ${BRONZE}18`,
    icon: <Medal className="w-4 h-4" style={{ color: BRONZE }} />,
    label: "#3",
    labelColor: BRONZE,
  },
];

// Display order: 2nd (index 1), 1st (index 0), 3rd (index 2)
const DISPLAY_ORDER = [1, 0, 2];

export default function LeaderboardPodium({ data, criteria, type }) {
  const top3 = data.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" /> Pódio
      </h2>

      <div
        className="rounded-2xl border border-border p-6"
        style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
      >
        <div className="flex items-end justify-center gap-4">
          {DISPLAY_ORDER.map((idx) => {
            const person = top3[idx];
            const cfg = PODIUM_CONFIG[idx];
            if (!person) return <div key={idx} className="w-28 sm:w-36" />;

            return (
              <div key={idx} className="flex flex-col items-center gap-2 w-28 sm:w-36">
                {/* Crown for 1st */}
                {cfg.crown && (
                  <Star className="w-5 h-5 mb-0.5" style={{ color: GOLD, fill: GOLD }} />
                )}

                {/* Avatar */}
                <div
                  className={`relative ${cfg.avatarSize} rounded-full flex items-center justify-center font-extrabold text-foreground`}
                  style={{
                    border: `2.5px solid ${cfg.ringColor}`,
                    background: `radial-gradient(circle, ${cfg.ringColor}22, ${cfg.ringColor}08)`,
                    boxShadow: cfg.shadow,
                  }}
                >
                  {person.name.charAt(0).toUpperCase()}
                  {/* rank badge */}
                  <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: cfg.ringColor + "25",
                      border: `1px solid ${cfg.ringColor}60`,
                      color: cfg.ringColor,
                    }}
                  >
                    {cfg.label}
                  </div>
                </div>

                {/* Name + score */}
                <div className="text-center mt-2">
                  <p className="font-semibold text-sm text-foreground truncate max-w-[110px]">{person.name}</p>
                  <div
                    className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background: cfg.ringColor + "20",
                      color: cfg.ringColor,
                      border: `1px solid ${cfg.ringColor}40`,
                    }}
                  >
                    {cfg.icon}
                    {getCriteriaValue(person, criteria, type)}
                  </div>
                </div>

                {/* Podium bar */}
                <div
                  className="w-full rounded-t-xl flex items-end justify-center pb-3 transition-all duration-700"
                  style={{
                    height: cfg.barHeight,
                    background: cfg.barGrad,
                    border: `1px solid ${cfg.barBorder}`,
                    borderBottom: "none",
                    boxShadow: cfg.shadow,
                  }}
                >
                  <span
                    className="text-xs font-extrabold tracking-wider"
                    style={{ color: cfg.labelColor }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}