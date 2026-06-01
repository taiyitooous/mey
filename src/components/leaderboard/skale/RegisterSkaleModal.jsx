import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function RegisterSkaleModal({ sellers, onClose }) {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7); // "yyyy-MM"

  const [rows, setRows] = useState([
    { seller_name: sellers[0] || "", month: today, scheduled_count: "", revenue: "", leads: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { seller_name: sellers[0] || "", month: today, scheduled_count: "", revenue: "", leads: "" },
    ]);

  const updateRow = (i, field, value) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    for (const row of rows) {
      if (!row.seller_name || !row.month) continue;
      const dateStr = row.month + "-01";
      await base44.entities.SkaleRecord.create({
        seller_name: row.seller_name,
        date: dateStr,
        scheduled_count: Number(row.scheduled_count) || 0,
        revenue: Number(row.revenue) || 0,
      });
      // Salva leads do mês no LeadDailyCount usando o primeiro dia como referência
      const leadsNum = Number(row.leads) || 0;
      if (leadsNum > 0) {
        // Remove registros anteriores do mesmo vendedor/mês para evitar duplicatas
        const existing = await base44.entities.LeadDailyCount.filter({
          seller_name: row.seller_name,
          date: dateStr,
        });
        for (const e of existing) {
          await base44.entities.LeadDailyCount.delete(e.id);
        }
        await base44.entities.LeadDailyCount.create({
          seller_name: row.seller_name,
          date: dateStr,
          lead_count: leadsNum,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["skale_records"] });
    queryClient.invalidateQueries({ queryKey: ["lead_daily_counts"] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl rounded-2xl border border-border overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold">Registrar Agendamentos Skale</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Labels */}
          <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-0.5">
            <div className="col-span-3">Vendedor</div>
            <div className="col-span-2">Mês</div>
            <div className="col-span-2">Agend.</div>
            <div className="col-span-2">Faturamento R$</div>
            <div className="col-span-2">Leads</div>
            <div className="col-span-1" />
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <select
                  value={row.seller_name}
                  onChange={(e) => updateRow(i, "seller_name", e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-card text-foreground text-xs px-2"
                >
                  {sellers.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Input
                  type="month"
                  value={row.month}
                  onChange={(e) => updateRow(i, "month", e.target.value)}
                  className="h-9 text-xs bg-card border-border"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={row.scheduled_count}
                  onChange={(e) => updateRow(i, "scheduled_count", e.target.value)}
                  className="h-9 text-xs bg-card border-border"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="0,00"
                  value={row.revenue}
                  onChange={(e) => updateRow(i, "revenue", e.target.value)}
                  className="h-9 text-xs bg-card border-border"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={row.leads}
                  onChange={(e) => updateRow(i, "leads", e.target.value)}
                  className="h-9 text-xs bg-card border-border"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 font-medium pt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar linha
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={saving} onClick={handleSave} className="bg-primary hover:bg-primary/90">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}