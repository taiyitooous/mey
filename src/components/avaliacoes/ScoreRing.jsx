import React from "react";

const colorForScore = (s) => {
  if (s >= 8) return "#4F8F63";
  if (s >= 6) return "#C8A94D";
  if (s >= 4) return "#B97A56";
  return "#B85C5C";
};

export default function ScoreRing({ score, size = 80, label }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, (score || 0) / 10));
  const dash = pct * circ;
  const color = colorForScore(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A342D" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text
          x={size / 2} y={size / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fill: color, fontSize: size * 0.26, fontWeight: 800, transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}
        >
          {score != null ? score.toFixed(1) : "—"}
        </text>
      </svg>
      {label && <p className="text-[10px] font-medium text-center" style={{ color: "#6F7A72" }}>{label}</p>}
    </div>
  );
}