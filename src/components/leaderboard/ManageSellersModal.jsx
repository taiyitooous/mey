import React, { useState } from "react";
import { X, Plus, Trash2, Pencil, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function SellerRow({ seller, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(seller.name);

  async function save() {
    if (!name.trim()) return;
    await onUpdate(seller.id, { name: name.trim() });
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/10 border border-border rounded-xl">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
        {seller.name.charAt(0).toUpperCase()}
      </div>

      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="flex-1 h-8 text-sm bg-muted/20 border-border"
            placeholder="Nome do vendedor"
            autoFocus
          />
          <button onClick={save} className="text-primary hover:text-primary/80 transition-colors">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditing(false); setName(seller.name); }} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-foreground">{seller.name}</span>
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(seller.id)} className="text-destructive/60 hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

export default function ManageSellersModal({ onClose }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ["sellers"],
    queryFn: () => base44.entities.Seller.list("name", 200),
  });

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    await base44.entities.Seller.create({ name: newName.trim(), active: true });
    queryClient.invalidateQueries({ queryKey: ["sellers"] });
    setNewName("");
    setAdding(false);
  }

  async function handleDelete(id) {
    await base44.entities.Seller.delete(id);
    queryClient.invalidateQueries({ queryKey: ["sellers"] });
  }

  async function handleUpdate(id, data) {
    await base44.entities.Seller.update(id, data);
    queryClient.invalidateQueries({ queryKey: ["sellers"] });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#121815] border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Vendedores</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cadastre os vendedores do time.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add new */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome do vendedor"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 h-9 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground/50"
              autoFocus
            />
            <Button
              size="icon"
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="h-9 w-9 bg-primary hover:bg-primary/90 shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-10">
              <UserPlus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum vendedor cadastrado ainda.</p>
            </div>
          ) : (
            sellers.map((s) => (
              <SellerRow key={s.id} seller={s} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))
          )}
        </div>

        {sellers.length > 0 && (
          <div className="px-6 pb-4 text-xs text-muted-foreground border-t border-border/50 pt-3">
            {sellers.length} vendedor{sellers.length !== 1 ? "es" : ""} cadastrado{sellers.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}