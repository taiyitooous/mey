import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Truck, Plus } from "lucide-react";
import OrderStatusBadge from "@/components/logistica/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

function NewOrderDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    order_id: "",
    customer_name: "",
    customer_phone: "",
    amount: "",
    city: "",
    state: "",
    carrier: "",
    tracking_code: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const order = await base44.entities.Order.create({
      ...form,
      amount: form.amount ? parseFloat(form.amount) : undefined,
      logistics_status: "created",
      payment_status: "pending",
      collection_status: "none",
    });
    await base44.entities.Event.create({
      entity_type: "order",
      entity_id: order.id,
      event_type: "order.created",
      payload: JSON.stringify({ order_id: form.order_id }),
    });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    setSaving(false);
    setForm({ order_id: "", customer_name: "", customer_phone: "", amount: "", city: "", state: "", carrier: "", tracking_code: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ID do Pedido *</Label>
              <Input value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">UF</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Transportadora</Label>
              <Input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Código de Rastreio</Label>
            <Input value={form.tracking_code} onChange={(e) => setForm({ ...form, tracking_code: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.order_id}>{saving ? "Salvando..." : "Criar Pedido"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Logistica() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.tracking_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.logistics_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logística</h1>
          <p className="text-sm text-muted-foreground mt-1">{orders.length} pedidos</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-48" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="created">Criado</SelectItem>
              <SelectItem value="shipped">Enviado</SelectItem>
              <SelectItem value="in_transit">Em Trânsito</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
              <SelectItem value="pickup_waiting">Aguard. Retirada</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowNew(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Novo Pedido
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            const aging = order.delivered_at
              ? differenceInDays(new Date(), new Date(order.delivered_at))
              : null;
            return (
              <Card key={order.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{order.order_id}</span>
                        <OrderStatusBadge status={order.logistics_status} />
                        {order.payment_status === "paid" && (
                          <Badge className="bg-success/10 text-success border-0 text-xs">Pago</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {order.customer_name && <span>{order.customer_name}</span>}
                        {order.city && <span>{order.city}/{order.state}</span>}
                        {order.carrier && <span>{order.carrier}</span>}
                        {order.tracking_code && <span className="font-mono">{order.tracking_code}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {order.amount && (
                      <span className="font-semibold">R$ {order.amount.toLocaleString("pt-BR")}</span>
                    )}
                    {aging !== null && (
                      <Badge variant="outline" className="text-xs">
                        {aging}d após entrega
                      </Badge>
                    )}
                    {order.created_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.created_date), "dd/MM")}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhum pedido encontrado</div>
          )}
        </div>
      )}

      <NewOrderDialog open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}