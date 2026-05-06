import React, { useState, useMemo } from "react";
import { X, Trash2, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ManageLeadsModal({ onClose }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editCount, setEditCount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["lead_daily_counts_all"],
    queryFn: () => base44.entities.LeadDailyCount.list("-date", 500),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) => r.seller_name?.toLowerCase().includes(q) || r.date?.includes(q)
    );
  }, [records, search]);

  async function handleSave(record) {
    const count = parseInt(editCount);
    if (isNaN(count) || count < 0) return;
    await base44.entities.LeadDailyCount.update(record.id, { lead_count: count, date: editDate });
    queryClient.invalidateQueries({ queryKey: ["lead_daily_counts_all"] });
    queryClient.invalidateQueries({ queryKey: ["lead_daily_counts"] });
    setEditingId(null);
  }

  async function handleDelete(id) {
    await base44.entities.LeadDailyCount.delete(id);
    queryClient.invalidateQueries({ queryKey: ["lead_daily_counts_all"] });
    queryClient.invalidateQueries({ queryKey: ["lead_daily_counts"] });
    setDeletingId(null);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#121815] border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Gerenciar Leads</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Edite ou exclua registros de leads por dia.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border">
          <Input
            placeholder="Buscar por vendedor ou data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted/20 border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-muted/20 animate-pulse" />)}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-10">Nenhum registro encontrado.</p>
          )}

          {filtered.map((record) => (
            <div key={record.id} className="flex items-center gap-3 bg-muted/10 border border-border rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {record.seller_name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate">{record.seller_name}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-8">{record.date}</span>
              </div>

              {editingId === record.id ? (
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-36 h-8 bg-muted/20 border-border text-foreground text-sm"
                    autoFocus
                  />
                  <Input
                    type="number"
                    min={0}
                    value={editCount}
                    onChange={(e) => setEditCount(e.target.value)}
                    className="w-20 h-8 bg-muted/20 border-border text-foreground text-sm text-center"
                  />
                  <Button size="sm" className="h-8 w-8 p-0 bg-primary" onClick={() => handleSave(record)}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-foreground w-12 text-right">
                    {record.lead_count} leads
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => { setEditingId(record.id); setEditCount(record.lead_count); setEditDate(record.date); setDeletingId(null); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>

                  {deletingId === record.id ? (
                    <>
                      <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={() => handleDelete(record.id)}>
                        Confirmar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setDeletingId(null)}>
                        Não
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => { setDeletingId(record.id); setEditingId(null); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">{filtered.length} registro(s) encontrado(s)</p>
        </div>
      </div>
    </div>
  );
}