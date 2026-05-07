import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Trophy, XCircle, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";

const LOSS_REASONS = [
  { value: "no_interest", label: "Sem interesse" },
  { value: "no_budget", label: "Sem orçamento" },
  { value: "competitor", label: "Concorrente" },
  { value: "no_contact", label: "Sem contato" },
  { value: "invalid", label: "Inválido" },
  { value: "other", label: "Outro" },
];

export default function LeadDetailDialog({ lead, open, onClose }) {
  const queryClient = useQueryClient();
  const [showLossForm, setShowLossForm] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const logEvent = async (eventType, payload = {}) => {
    await base44.entities.Event.create({
      entity_type: "lead",
      entity_id: lead.id,
      event_type: eventType,
      payload: JSON.stringify(payload),
    });
  };

  const moveStage = async (newStage) => {
    setSaving(true);
    await base44.entities.Lead.update(lead.id, {
      stage: newStage,
      last_stage_change_at: new Date().toISOString(),
    });
    await logEvent("lead.stage_changed", { from: lead.stage, to: newStage });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setSaving(false);
  };

  const markWon = async () => {
    setSaving(true);
    await base44.entities.Lead.update(lead.id, { status: "won" });
    await logEvent("lead.won", {});
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setSaving(false);
    onClose();
  };

  const markLost = async () => {
    if (!lossReason) return;
    setSaving(true);
    await base44.entities.Lead.update(lead.id, {
      status: "lost",
      loss_reason: lossReason,
    });
    await logEvent("lead.lost", { reason: lossReason });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lead.name || "Lead"}
            <Badge variant="outline" className="text-xs">
              Etapa {lead.stage}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {lead.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" /> {lead.phone}
              </div>
            )}
            {lead.value_expected && (
              <div className="text-muted-foreground">
                Valor: <span className="font-semibold text-foreground">R$ {lead.value_expected.toLocaleString("pt-BR")}</span>
              </div>
            )}
            {lead.source_campaign && (
              <div className="text-muted-foreground">Campanha: {lead.source_campaign}</div>
            )}
            {lead.seller_name && (
              <div className="text-muted-foreground">Vendedor: {lead.seller_name}</div>
            )}
            {lead.created_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {format(new Date(lead.created_date), "dd/MM/yyyy HH:mm")}
              </div>
            )}
          </div>

          {lead.notes && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{lead.notes}</p>
          )}

          {/* Actions */}
          {lead.status === "open" && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ações</p>

              {/* Move stage */}
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].filter((s) => s !== lead.stage).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    onClick={() => moveStage(s)}
                    disabled={saving}
                    className="gap-1"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Etapa {s === 5 ? "Final" : s}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={markWon} disabled={saving} className="bg-success hover:bg-success/90 text-success-foreground gap-1">
                  <Trophy className="w-3.5 h-3.5" /> Ganho
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowLossForm(!showLossForm)}
                  disabled={saving}
                  className="gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Perdido
                </Button>
              </div>

              {showLossForm && (
                <div className="flex gap-2 items-end">
                  <Select value={lossReason} onValueChange={setLossReason}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Motivo da perda" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOSS_REASONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="destructive" onClick={markLost} disabled={!lossReason || saving}>
                    Confirmar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}