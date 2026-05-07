import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function RegisterLeadsModal({ sellers, onClose }) {
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [entries, setEntries] = useState(
    sellers.map((s) => ({ seller: s, count: "" }))
  );
  const [saving, setSaving] = useState(false);

  function updateCount(idx, value) {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], count: value };
      return next;
    });
  }

  async function handleSubmit() {
    const toSave = entries.filter((e) => e.count !== "" && parseInt(e.count) > 0);
    if (toSave.length === 0) return;
    setSaving(true);

    // For each seller, upsert the daily count (delete existing + create new)
    const existing = await base44.entities.LeadDailyCount.filter({ date: today });

    for (const entry of toSave) {
      const existingRecord = existing.find((r) => r.seller_name === entry.seller);
      if (existingRecord) {
        await base44.entities.LeadDailyCount.update(existingRecord.id, {
          lead_count: parseInt(entry.count),
        });
      } else {
        await base44.entities.LeadDailyCount.create({
          date: today,
          seller_name: entry.seller,
          lead_count: parseInt(entry.count),
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["lead_daily_counts"] });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#121815] border border-border rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Registrar Leads do Dia</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Quantidade de leads recebidos hoje — {format(new Date(), "dd/MM/yyyy")}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 space-y-3 max-h-80 overflow-y-auto">
          {entries.map((entry, idx) => (
            <div key={entry.seller} className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {entry.seller.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-foreground truncate">{entry.seller}</span>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={entry.count}
                  onChange={(e) => updateCount(idx, e.target.value)}
                  className="bg-muted/20 border-border text-foreground text-sm h-9 text-center"
                />
              </div>
            </div>
          ))}

          {sellers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum vendedor cadastrado ainda.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-border/50">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-muted-foreground">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || sellers.length === 0}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}