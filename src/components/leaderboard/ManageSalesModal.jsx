import React, { useState, useMemo } from "react";
import { X, Trash2, Pencil, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

function emptyItem() {
  return { product: "", qty: 1, unitPrice: 0 };
}

function parseItems(itemsStr) {
  try {
    return JSON.parse(itemsStr) || [emptyItem()];
  } catch {
    return [emptyItem()];
  }
}

function EditRow({ sale, products, sellers, onSave, onCancel }) {
  const [date, setDate] = useState(sale.date || "");
  const [sellerName, setSellerName] = useState(sale.seller_name || "");
  const [customerName, setCustomerName] = useState(sale.customer_name || "");
  const [items, setItems] = useState(parseItems(sale.items));
  const [paymentDone, setPaymentDone] = useState(sale.payment_done || false);
  const [saving, setSaving] = useState(false);

  const total = items.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0);

  function updateItem(idx, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function selectProduct(idx, productName) {
    const found = products.find((p) => p.name === productName);
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], product: productName, unitPrice: found ? found.default_price : 0 };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    await base44.entities.SaleRecord.update(sale.id, {
      date,
      seller_name: sellerName,
      customer_name: customerName,
      items: JSON.stringify(items),
      total,
      payment_done: paymentDone,
    });
    setSaving(false);
    onSave();
  }

  return (
    <div className="bg-muted/10 border border-primary/30 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Data</p>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-muted/20 border-border text-foreground h-8 text-sm" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Vendedor</p>
          <select
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            className="w-full h-8 rounded-md bg-muted/20 border border-border text-foreground text-sm px-2 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {sellers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Cliente</p>
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" className="bg-muted/20 border-border text-foreground h-8 text-sm" />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase">Itens</p>
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2 items-end">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Produto</p>
              <select
                value={item.product}
                onChange={(e) => selectProduct(idx, e.target.value)}
                className="w-full h-8 rounded-md bg-muted/20 border border-border text-foreground text-xs px-2 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Selecione</option>
                {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Qtd × Preço</p>
              <div className="flex gap-1">
                <Input type="number" min={1} value={item.qty} onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value) || 1)} className="bg-muted/20 border-border text-foreground h-8 text-xs w-14" />
                <Input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="bg-muted/20 border-border text-foreground h-8 text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-1 pb-0.5">
              <span className="text-xs text-muted-foreground">R$ {((item.qty || 0) * (item.unitPrice || 0)).toFixed(2)}</span>
              {items.length > 1 && (
                <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="text-destructive/70 hover:text-destructive ml-auto">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        <button onClick={() => setItems((prev) => [...prev, emptyItem()])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          + Adicionar item
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id={`pd_${sale.id}`} checked={paymentDone} onChange={(e) => setPaymentDone(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
        <label htmlFor={`pd_${sale.id}`} className="text-xs text-muted-foreground cursor-pointer">Pagamento realizado</label>
        <span className="ml-auto text-xs font-bold text-foreground">Total: R$ {total.toFixed(2)}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} className="flex-1 text-muted-foreground text-xs">Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground text-xs">
          {saving ? "Salvando..." : <><Check className="w-3 h-3 mr-1" />Salvar</>}
        </Button>
      </div>
    </div>
  );
}

export default function ManageSalesModal({ sellers, onClose }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: saleRecords = [], isLoading } = useQuery({
    queryKey: ["sale_records"],
    queryFn: () => base44.entities.SaleRecord.list("-date", 500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("name", 100),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return saleRecords;
    const q = search.toLowerCase();
    return saleRecords.filter(
      (r) =>
        r.seller_name?.toLowerCase().includes(q) ||
        r.customer_name?.toLowerCase().includes(q) ||
        r.date?.includes(q)
    );
  }, [saleRecords, search]);

  async function handleDelete(id) {
    await base44.entities.SaleRecord.delete(id);
    queryClient.invalidateQueries({ queryKey: ["sale_records"] });
    setDeletingId(null);
  }

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ["sale_records"] });
    setEditingId(null);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#121815] border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Gerenciar Vendas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Edite ou exclua vendas registradas.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border">
          <Input
            placeholder="Buscar por vendedor, cliente ou data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted/20 border-border text-foreground placeholder:text-muted-foreground/50 text-sm"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted/20 animate-pulse" />)}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-10">Nenhuma venda encontrada.</p>
          )}

          {filtered.map((sale) => (
            <div key={sale.id}>
              {editingId === sale.id ? (
                <EditRow
                  sale={sale}
                  products={products}
                  sellers={sellers}
                  onSave={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3 bg-muted/10 border border-border rounded-xl px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{sale.seller_name}</span>
                      {sale.customer_name && (
                        <span className="text-xs text-muted-foreground">• {sale.customer_name}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sale.type === "exit" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {sale.type === "exit" ? "Saída" : "Venda"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{sale.date}</span>
                      <span className="text-xs font-bold text-foreground">R$ {(sale.total || 0).toFixed(2)}</span>
                      {sale.payment_done && <span className="text-xs text-success">✓ Pago</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditingId(sale.id); setDeletingId(null); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    {deletingId === sale.id ? (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleDelete(sale.id)}
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => setDeletingId(null)}
                        >
                          Não
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => { setDeletingId(sale.id); setEditingId(null); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 pb-5 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">{filtered.length} venda(s) encontrada(s)</p>
        </div>
      </div>
    </div>
  );
}