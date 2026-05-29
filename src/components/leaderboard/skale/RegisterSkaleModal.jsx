import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function RegisterSkaleModal({ sellers, onClose }) {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const [rows, setRows] = useState([
    { seller_name: sellers[0] || "", customer_name: "", date: today, scheduled_count: 1, revenue: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { seller_name: sellers[0] || "", customer_name: "", date: today, scheduled_count: 1, revenue: "" },
    ]);

  const updateRow = (i, field, value) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const removeRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    for (const row of rows) {
      if (!row.seller_name || !row.date) continue;
      await base44.entities.SkaleRecord.create({
        seller_name: row.seller_name,
        customer_name: row.customer_name || "",
        date: row.date,
        scheduled_count: Number(row.scheduled_count) || 1,
        revenue: Number(row.revenue) || 0,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["skale_records"] });
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
              <div className="col-span-3">
                <Input
                  placeholder="Cliente"
                  value={row.customer_name}
                  onChange={(e) => updateRow(i, "customer_name", e.target.value)}
                  className="h-9 text-xs bg-card border-border"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(i, "date", e.target.value)}
                  className="h-9 text-xs bg-card border-border"
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  min={1}
                  placeholder="Qtd"
                  value={row.scheduled_count}
                  onChange={(e) => updateRow(i, "scheduled_count", e.target.value)}
                  className="h-9 text-xs bg-card border-border"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="R$ valor"
                  value={row.revenue}
                  onChange={(e) => updateRow(i, "revenue", e.target.value)}
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

          <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-0.5">
            <div className="col-span-3">Vendedor</div>
            <div className="col-span-3">Cliente</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-1">Qtd</div>
            <div className="col-span-2">Faturamento</div>
          </div>

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