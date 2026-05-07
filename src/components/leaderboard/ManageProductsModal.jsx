import React, { useState } from "react";
import { X, Plus, Trash2, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function ProductRow({ product, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.default_price);

  async function save() {
    await onUpdate(product.id, { name, default_price: parseFloat(price) || 0 });
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/10 border border-border rounded-xl">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 h-8 text-sm bg-muted/20 border-border"
            placeholder="Nome do produto"
          />
          <div className="relative w-32">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-8 text-sm bg-muted/20 border-border pl-7 w-full"
            />
          </div>
          <button onClick={save} className="text-primary hover:text-primary/80 transition-colors">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-foreground">{product.name}</span>
          <span className="text-sm text-muted-foreground w-28 text-right">
            R$ {product.default_price?.toFixed(2)}
          </span>
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(product.id)} className="text-destructive/60 hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

export default function ManageProductsModal({ onClose }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 100),
  });

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    await base44.entities.Product.create({
      name: newName.trim(),
      default_price: parseFloat(newPrice) || 0,
      active: true,
    });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setNewName("");
    setNewPrice("");
    setAdding(false);
  }

  async function handleDelete(id) {
    await base44.entities.Product.delete(id);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  async function handleUpdate(id, data) {
    await base44.entities.Product.update(id, data);
    queryClient.invalidateQueries({ queryKey: ["products"] });
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
            <h2 className="text-lg font-bold text-foreground">Produtos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Gerencie os produtos e seus valores padrão.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add new */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome do produto"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 h-9 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground/50"
            />
            <div className="relative w-32">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="h-9 bg-muted/20 border-border text-foreground pl-7 w-full"
              />
            </div>
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
                <div key={i} className="h-12 rounded-xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum produto cadastrado ainda.</p>
          ) : (
            products.map((p) => (
              <ProductRow key={p.id} product={p} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}