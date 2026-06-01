import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, Search, Edit2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ManageSkaleModal({ onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  const { data: records = [] } = useQuery({
    queryKey: ["skale_records_manage"],
    queryFn: () => base44.entities.SkaleRecord.list("-date", 1000),
  });

  const { data: leadCounts = [] } = useQuery({
    queryKey: ["lead_daily_counts"],
    queryFn: () => base44.entities.LeadDailyCount.list("-date", 5000),
  });

  // Monta mapa seller+date -> LeadDailyCount record
  const leadCountMap = React.useMemo(() => {
    const map = {};
    leadCounts.forEach((lc) => {
      const k = `${lc.seller_name?.trim().toLowerCase()}|${lc.date}`;
      map[k] = lc;
    });
    return map;
  }, [leadCounts]);

  const filtered = records.filter(
    (r) =>
      r.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    setDeleting(id);
    await base44.entities.SkaleRecord.delete(id);
    queryClient.invalidateQueries({ queryKey: ["skale_records"] });
    queryClient.invalidateQueries({ queryKey: ["skale_records_manage"] });
    setDeleting(null);
  };

  const startEditing = (record) => {
    setEditing(record.id);
    const k = `${record.seller_name?.trim().toLowerCase()}|${record.date}`;
    const lc = leadCountMap[k];
    setEditData({
      scheduled_count: record.scheduled_count || 0,
      revenue: record.revenue || 0,
      leads: lc ? lc.lead_count : "",
      leads_record_id: lc ? lc.id : null,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const rec = records.find(r => r.id === editing);
    await base44.entities.SkaleRecord.update(editing, {
      scheduled_count: Number(editData.scheduled_count) || 0,
      revenue: Number(editData.revenue) || 0,
    });
    // Atualiza ou cria LeadDailyCount
    const leadsNum = Number(editData.leads) || 0;
    if (leadsNum > 0) {
      if (editData.leads_record_id) {
        await base44.entities.LeadDailyCount.update(editData.leads_record_id, { lead_count: leadsNum });
      } else {
        await base44.entities.LeadDailyCount.create({
          seller_name: rec.seller_name,
          date: rec.date,
          lead_count: leadsNum,
        });
      }
    } else if (editData.leads_record_id) {
      await base44.entities.LeadDailyCount.delete(editData.leads_record_id);
    }
    queryClient.invalidateQueries({ queryKey: ["skale_records"] });
    queryClient.invalidateQueries({ queryKey: ["skale_records_manage"] });
    queryClient.invalidateQueries({ queryKey: ["lead_daily_counts"] });
    setEditing(null);
    setEditData({});
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div
        className="w-full max-w-3xl rounded-2xl border border-border overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold">Gerenciar Registros Skale</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar vendedor ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-card border-border"
            />
          </div>
        </div>

        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado</p>
          ) : editing ? (
            <div className="space-y-3">
              <div className="px-3 py-3 rounded-lg border border-border bg-card/50">
                <p className="text-xs text-muted-foreground mb-3">
                  <span className="font-semibold text-foreground">{records.find(r => r.id === editing)?.seller_name}</span> — {records.find(r => r.id === editing)?.date}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Qtd. Agendamentos</label>
                    <Input
                      type="number"
                      min={0}
                      value={editData.scheduled_count}
                      onChange={(e) => setEditData({ ...editData, scheduled_count: e.target.value })}
                      className="h-8 text-xs bg-card border-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Faturamento (R$)</label>
                    <Input
                      type="number"
                      min={0}
                      value={editData.revenue}
                      onChange={(e) => setEditData({ ...editData, revenue: e.target.value })}
                      className="h-8 text-xs bg-card border-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Leads Recebidos</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={editData.leads}
                      onChange={(e) => setEditData({ ...editData, leads: e.target.value })}
                      className="h-8 text-xs bg-card border-border"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} className="flex-1 bg-primary hover:bg-primary/90">
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-card/30 text-sm"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="font-semibold text-xs w-28 truncate">{r.seller_name}</span>
                  <span className="text-muted-foreground text-xs w-24">{r.date}</span>
                  <span className="text-xs font-medium">{r.scheduled_count ?? 1} agend.</span>
                  <span className="text-xs text-primary font-semibold">
                    {r.revenue > 0 ? `R$ ${Number(r.revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => startEditing(r)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}