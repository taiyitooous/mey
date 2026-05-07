import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  bom: { label: "Bom", className: "bg-success/10 text-success border-success/20" },
  atencao: { label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  ruim: { label: "Ruim", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function HealthCard({ value, label, meta, status = "bom", icon: Icon, onAction, actionLabel = "Ver lista" }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.bom;
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${s.className}`}>
          {s.label}
        </span>
        {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
      </div>
      <div>
        <div className="text-4xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-sm font-semibold text-foreground mt-1.5">{label}</div>
        {meta && <div className="text-xs text-muted-foreground mt-0.5">{meta}</div>}
      </div>
      {onAction && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2 text-primary w-fit -ml-1 mt-auto"
          onClick={onAction}
        >
          {actionLabel} →
        </Button>
      )}
    </Card>
  );
}