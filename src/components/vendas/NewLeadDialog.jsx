import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function NewLeadDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    value_expected: "",
    source_campaign: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const lead = await base44.entities.Lead.create({
      ...form,
      value_expected: form.value_expected ? parseFloat(form.value_expected) : undefined,
      source: "manual",
      stage: 1,
      status: "open",
      last_stage_change_at: new Date().toISOString(),
    });
    await base44.entities.Event.create({
      entity_type: "lead",
      entity_id: lead.id,
      event_type: "lead.created",
      payload: JSON.stringify({ source: "manual" }),
    });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setSaving(false);
    setForm({ name: "", phone: "", value_expected: "", source_campaign: "", notes: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do lead"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>
          <div className="space-y-2">
            <Label>Valor esperado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.value_expected}
              onChange={(e) => setForm({ ...form, value_expected: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Campanha</Label>
            <Input
              value={form.source_campaign}
              onChange={(e) => setForm({ ...form, source_campaign: e.target.value })}
              placeholder="Nome da campanha"
            />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.name}>
              {saving ? "Salvando..." : "Criar Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}