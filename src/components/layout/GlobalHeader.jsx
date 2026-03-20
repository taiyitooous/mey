import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalFilters, TIME_OPTIONS } from "@/lib/GlobalFilters";
import QuickActionModal from "./QuickActionModal";

export default function GlobalHeader() {
  const { timeFilter, setTimeFilter } = useGlobalFilters();
  const [showQuickAction, setShowQuickAction] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        {/* Time range filter */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTimeFilter(opt.key)}
              className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                timeFilter === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Quick action button */}
        <Button
          onClick={() => setShowQuickAction(true)}
          className="bg-primary text-primary-foreground font-semibold gap-2 shrink-0"
          size="default"
        >
          <Plus className="w-4 h-4" />
          Ação Rápida
        </Button>
      </header>

      <QuickActionModal
        open={showQuickAction}
        onClose={() => setShowQuickAction(false)}
      />
    </>
  );
}