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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  MessageCircle,
  Trophy,
  XCircle,
  DollarSign,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const ACTIONS = [
  {
    key: "call",
    icon: Phone,
    label: "Ligação 3C",
    desc: "Atendeu / Não atendeu / Caixa postal",
    color: "text-blue-600 bg-blue-500/10 border-blue-200 hover:bg-blue-500/20 dark:border-blue-900 dark:text-blue-400",
  },
  {
    key: "whatsapp",
    icon: MessageCircle,
    label: "WhatsApp enviado",
    desc: "Registrar mensagem enviada",
    color: "text-green-600 bg-green-500/10 border-green-200 hover:bg-green-500/20 dark:border-green-900 dark:text-green-400",
  },
  {
    key: "won",
    icon: Trophy,
    label: "Marcar Ganho",
    desc: "Lead convertido em venda",
    color: "text-success bg-success/10 border-success/30 hover:bg-success/20",
  },
  {
    key: "lost",
    icon: XCircle,
    label: "Marcar Perdido",
    desc: "Lead não convertido",
    color: "text-destructive bg-destructive/10 border-destructive/30 hover:bg-destructive/20",
  },
  {
    key: "payment",
    icon: DollarSign,
    label: "Marcar Pago",
    desc: "Confirmar pagamento recebido",
    color: "text-primary bg-primary/10 border-primary/30 hover:bg-primary/20",
  },
];

export default function QuickActionModal({ open, onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState("action");
  const [action, setAction] = useState(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadList, setShowLeadList] = useState(false);
  const [callResult, setCallResult] = useState("no_answer");
  const [lossReason, setLossReason] = useState("no_interest");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads_open_mini"],
    queryFn: () =>
      base44.entities.Lead.filter({ status: "open" }, "-updated_date", 200),
    enabled: open,
  });

  const matchedLeads =
    leadSearch.length > 1
      ? leads
          .filter(
            (l) =>
              l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
              l.phone?.includes(leadSearch)
          )
          .slice(0, 6)
      : [];

  const reset = () => {
    setStep("action");
    setAction(null);
    setLeadSearch("");
    setSelectedLead(null);
    setShowLeadList(false);
    setCallResult("no_answer");
    setLossReason("no_interest");
    setPaymentMethod("pix");
    setPaymentAmount("");
    setNotes("");
    setNextAt("");
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!selectedLead) return;
    setSaving(true);
    const user = await base44.auth.me();

    let eventType = "";
    let payload = {};

    if (action === "call") {
      eventType = "lead.call_made";
      payload = { result: callResult, notes };
    } else if (action === "whatsapp") {
      eventType = "lead.whatsapp_sent";
      payload = { notes };
    } else if (action === "won") {
      eventType = "lead.won";
      payload = { notes };
      await base44.entities.Lead.update(selectedLead.id, { status: "won" });
    } else if (action === "lost") {
      eventType = "lead.lost";
      payload = { reason: lossReason, notes };
      await base44.entities.Lead.update(selectedLead.id, {
        status: "lost",
        loss_reason: lossReason,
      });
    } else if (action === "payment") {
      eventType = "payment.paid";
      payload = { amount: paymentAmount, method: paymentMethod, notes };
    }

    await base44.entities.Event.create({
      entity_type: "lead",
      entity_id: selectedLead.id,
      event_type: eventType,
      payload: JSON.stringify(payload),
      user_name: user?.full_name || "",
      user_email: user?.email || "",
      source: "mey",
    });

    await base44.entities.Lead.update(selectedLead.id, {
      last_contact_at: new Date().toISOString(),
    });

    qc.invalidateQueries();
    setSaving(false);
    setStep("next");
  };

  const handleScheduleNext = async () => {
    if (nextAt && selectedLead) {
      const user = await base44.auth.me();
      await base44.entities.Task.create({
        entity_type: "lead",
        entity_id: selectedLead.id,
        action_type: "call",
        scheduled_at: new Date(nextAt).toISOString(),
        assignee_name: user?.full_name || "",
        assignee_email: user?.email || "",
        status: "pending",
      });
      qc.invalidateQueries();
    }
    handleClose();
  };

  const selectedAction = ACTIONS.find((a) => a.key === action);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "action" && "Ação Rápida"}
            {step === "details" && selectedAction?.label}
            {step === "next" && "Próxima Ação?"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose action */}
        {step === "action" && (
          <div className="grid gap-2">
            {ACTIONS.map((act) => (
              <button
                key={act.key}
                onClick={() => {
                  setAction(act.key);
                  setStep("details");
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors text-left ${act.color}`}
              >
                <act.icon className="w-5 h-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{act.label}</p>
                  <p className="text-xs opacity-70">{act.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 opacity-40 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div className="space-y-4">
            {/* Lead search */}
            <div className="relative">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Lead *</Label>
              {selectedLead ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/50">
                  <div>
                    <span className="text-sm font-medium">{selectedLead.name}</span>
                    {selectedLead.phone && (
                      <span className="text-xs text-muted-foreground ml-2">{selectedLead.phone}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedLead(null);
                      setLeadSearch("");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={leadSearch}
                    onChange={(e) => {
                      setLeadSearch(e.target.value);
                      setShowLeadList(true);
                    }}
                    onFocus={() => setShowLeadList(true)}
                    className="text-sm"
                  />
                  {showLeadList && matchedLeads.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                      {matchedLeads.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => {
                            setSelectedLead(l);
                            setLeadSearch(l.name);
                            setShowLeadList(false);
                          }}
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm hover:bg-muted text-left border-b border-border last:border-0"
                        >
                          <span className="font-medium">{l.name}</span>
                          <span className="text-xs text-muted-foreground">{l.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Call result */}
            {action === "call" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Resultado</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "answered", label: "Atendeu", active: "bg-success/15 text-success border-success/40", inactive: "border-border text-muted-foreground hover:bg-muted" },
                    { v: "no_answer", label: "Não atendeu", active: "bg-warning/15 text-warning border-warning/40", inactive: "border-border text-muted-foreground hover:bg-muted" },
                    { v: "voicemail", label: "Caixa postal", active: "bg-secondary text-foreground border-foreground/20", inactive: "border-border text-muted-foreground hover:bg-muted" },
                  ].map(({ v, label, active, inactive }) => (
                    <button
                      key={v}
                      onClick={() => setCallResult(v)}
                      className={`py-2 text-xs font-medium rounded-lg border transition-colors ${callResult === v ? active : inactive}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loss reason */}
            {action === "lost" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Motivo da perda *</Label>
                <Select value={lossReason} onValueChange={setLossReason}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_interest">Sem interesse</SelectItem>
                    <SelectItem value="no_budget">Sem budget</SelectItem>
                    <SelectItem value="competitor">Concorrente</SelectItem>
                    <SelectItem value="no_contact">Sem contato</SelectItem>
                    <SelectItem value="invalid">Inválido</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Payment fields */}
            {action === "payment" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Valor (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Forma</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Observação (opcional)</Label>
              <Input
                placeholder="Anotação rápida..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep("action")}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving || !selectedLead}
              >
                {saving ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Next action */}
        {step === "next" && (
          <div className="space-y-4">
            <div className="text-center py-3">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
              <p className="font-semibold text-lg">Registrado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Deseja agendar a próxima ação para <span className="font-medium text-foreground">{selectedLead?.name}</span>?
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data / hora</Label>
              <Input
                type="datetime-local"
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Não, fechar
              </Button>
              <Button className="flex-1" onClick={handleScheduleNext} disabled={!nextAt}>
                Agendar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}