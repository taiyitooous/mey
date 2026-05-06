import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, CirclePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const PRODUCTS = [
  "Produto A",
  "Produto B",
  "Produto C",
  "Produto D",
  "Outro",
];

function emptyItem() {
  return { product: "", qty: 1, unitPrice: 0 };
}

export default function RegisterSaleModal({ sellers, onClose }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("sale"); // sale | exit
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customerName, setCustomerName] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [paymentDone, setPaymentDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  function updateItem(idx, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  async function handleSubmit() {
    if (!sellerName) return;
    setSaving(true);
    await base44.entities.SaleRecord.create({
      date,
      seller_name: sellerName,
      customer_name: customerName,
      items: JSON.stringify(items),
      total,
      payment_done: paymentDone,
      type: tab,
    });
    queryClient.invalidateQueries({ queryKey: ["sale_records"] });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#121815] border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Registrar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Registre uma nova venda ou pagamento.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-4">
          <div className="flex rounded-lg bg-muted/30 p-1 gap-1">
            <button
              onClick={() => setTab("sale")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                tab === "sale" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Venda
            </button>
            <button
              onClick={() => setTab("exit")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                tab === "exit" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Saída
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 space-y-4 pb-2">
          {/* Data */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted-foreground w-20 shrink-0">Data</label>
            <div className="relative flex-1">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-muted/20 border-border text-foreground pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </span>
            </div>
          </div>

          {/* Cliente */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted-foreground w-20 shrink-0">Cliente</label>
            <Input
              placeholder="Nome do cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="flex-1 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Vendedor */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted-foreground w-20 shrink-0">Vendedor</label>
            <select
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              className="flex-1 h-9 rounded-md bg-muted/20 border border-border text-foreground text-sm px-3 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Selecione o vendedor</option>
              {sellers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Itens da Venda</p>
            {items.map((item, idx) => (
              <div key={idx} className="space-y-2 bg-muted/10 border border-border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={item.product}
                    onChange={(e) => updateItem(idx, "product", e.target.value)}
                    className="flex-1 h-9 rounded-md bg-muted/20 border border-border text-foreground text-sm px-3 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Selecione o produto</option>
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="text-destructive/70 hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Qtd</p>
                    <Input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value) || 1)}
                      className="bg-muted/20 border-border text-foreground text-sm h-9"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Preço Unit.</p>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="bg-muted/20 border-border text-foreground text-sm h-9 pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Total Item</p>
                    <div className="h-9 rounded-md bg-muted/10 border border-border flex items-center px-3 text-sm text-foreground font-medium">
                      R$ {(item.qty * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addItem}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
            >
              <CirclePlus className="w-4 h-4" />
              Adicionar Produto
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pt-3 pb-6 space-y-3 border-t border-border/50 mt-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-foreground">TOTAL</span>
            <span className="font-bold text-sm text-foreground">R$ {total.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="payment_done"
              checked={paymentDone}
              onChange={(e) => setPaymentDone(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="payment_done" className="text-xs text-muted-foreground cursor-pointer">
              Pagamento já realizado
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={onClose} className="flex-1 text-muted-foreground">
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !sellerName}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {saving ? "Salvando..." : "Registrar Venda"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}