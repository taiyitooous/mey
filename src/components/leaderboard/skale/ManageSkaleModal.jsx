import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ManageSkaleModal({ onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  const { data: records = [] } = useQuery({
    queryKey: ["skale_records_manage"],
    queryFn: () => base44.entities.SkaleRecord.list("-date", 1000),
  });

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
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-card/30 text-sm"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="font-semibold text-xs w-28 truncate">{r.seller_name}</span>
                  <span className="text-muted-foreground text-xs w-36 truncate">{r.customer_name || "—"}</span>
                  <span className="text-muted-foreground text-xs">{r.date}</span>
                  <span className="text-xs font-medium">{r.scheduled_count ?? 1} agend.</span>
                  <span className="text-xs text-primary font-semibold">
                    {r.revenue > 0 ? `R$ ${Number(r.revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-3"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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