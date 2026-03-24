import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Zap, CheckCircle2, Circle, Smartphone, Database, Copy, Check } from "lucide-react";

function AgentRow({ agent, users, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    agent_id: agent.agent_id || "",
    agent_name_3c: agent.agent_name_3c || "",
    user_name: agent.user_name || "",
    user_email: agent.user_email || "",
    active: agent.active !== false,
  });

  const handleSave = async () => {
    await onSave(agent.id, form);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        <button onClick={() => onSave(agent.id, { active: !form.active })} className="shrink-0">
          {form.active
            ? <CheckCircle2 className="w-4 h-4 text-success" />
            : <Circle className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
          <div>
            <p className="text-xs text-muted-foreground">Agent ID / Ramal</p>
            <p className="text-sm font-mono font-semibold">{agent.agent_id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nome na 3C</p>
            <p className="text-sm">{agent.agent_name_3c || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usuário MEY</p>
            <p className="text-sm font-medium">{agent.user_name}</p>
            {agent.user_email && <p className="text-xs text-muted-foreground">{agent.user_email}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Editar</Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(agent.id)}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border bg-accent/20 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Agent ID / Ramal *</label>
          <Input
            value={form.agent_id}
            onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
            placeholder="ex: 1001 ou uuid"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome na 3C</label>
          <Input
            value={form.agent_name_3c}
            onChange={(e) => setForm({ ...form, agent_name_3c: e.target.value })}
            placeholder="ex: João 3C"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome usuário MEY *</label>
          <Input
            value={form.user_name}
            onChange={(e) => setForm({ ...form, user_name: e.target.value })}
            placeholder="Nome completo"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email usuário MEY</label>
          <Input
            value={form.user_email}
            onChange={(e) => setForm({ ...form, user_email: e.target.value })}
            placeholder="email@empresa.com"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="w-3.5 h-3.5 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

function WavoipDeviceRow({ device, users, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    device_name: device.device_name || "",
    device_token: device.device_token || "",
    user_name: device.user_name || "",
    user_email: device.user_email || "",
    active: device.active !== false,
  });

  const handleSave = async () => {
    await onSave(device.id, form);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        <button onClick={() => onSave(device.id, { active: !form.active })} className="shrink-0">
          {form.active
            ? <CheckCircle2 className="w-4 h-4 text-success" />
            : <Circle className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
          <div>
            <p className="text-xs text-muted-foreground">Nome do dispositivo</p>
            <p className="text-sm font-semibold">{device.device_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Token (últimos 8 chars)</p>
            <p className="text-sm font-mono">...{device.device_token.slice(-8)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usuário MEY</p>
            <p className="text-sm font-medium">{device.user_name}</p>
            {device.user_email && <p className="text-xs text-muted-foreground">{device.user_email}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Editar</Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(device.id)}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border bg-accent/20 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome do dispositivo</label>
          <Input
            value={form.device_name}
            onChange={(e) => setForm({ ...form, device_name: e.target.value })}
            placeholder="ex: WhatsApp 1"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Token *</label>
          <Input
            value={form.device_token}
            onChange={(e) => setForm({ ...form, device_token: e.target.value })}
            placeholder="Cole o token do dispositivo"
            className="h-8 text-sm font-mono"
            type="password"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome usuário MEY *</label>
          <Input
            value={form.user_name}
            onChange={(e) => setForm({ ...form, user_name: e.target.value })}
            placeholder="Nome completo"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email usuário MEY</label>
          <Input
            value={form.user_email}
            onChange={(e) => setForm({ ...form, user_email: e.target.value })}
            placeholder="email@empresa.com"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="w-3.5 h-3.5 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

function NewAgentRow({ users, onAdd }) {
  const [form, setForm] = useState({ agent_id: "", agent_name_3c: "", user_name: "", user_email: "", active: true });

  const handleAdd = async () => {
    if (!form.agent_id || !form.user_name) return;
    await onAdd(form);
    setForm({ agent_id: "", agent_name_3c: "", user_name: "", user_email: "", active: true });
  };

  return (
    <div className="p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 space-y-3">
      <p className="text-xs font-semibold text-primary">Novo agente</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Agent ID / Ramal *</label>
          <Input
            value={form.agent_id}
            onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
            placeholder="ex: 1001"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome na 3C</label>
          <Input
            value={form.agent_name_3c}
            onChange={(e) => setForm({ ...form, agent_name_3c: e.target.value })}
            placeholder="ex: João 3C"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome usuário MEY *</label>
          <Input
            value={form.user_name}
            onChange={(e) => setForm({ ...form, user_name: e.target.value })}
            placeholder="Nome completo"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email usuário MEY</label>
          <Input
            value={form.user_email}
            onChange={(e) => setForm({ ...form, user_email: e.target.value })}
            placeholder="email@empresa.com"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd} disabled={!form.agent_id || !form.user_name}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

function NewWavoipDeviceRow({ users, onAdd }) {
  const [form, setForm] = useState({ device_name: "", device_token: "", user_name: "", user_email: "", active: true });

  const handleAdd = async () => {
    if (!form.device_token || !form.user_name) return;
    await onAdd(form);
    setForm({ device_name: "", device_token: "", user_name: "", user_email: "", active: true });
  };

  return (
    <div className="p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 space-y-3">
      <p className="text-xs font-semibold text-primary">Novo dispositivo</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome do dispositivo</label>
          <Input
            value={form.device_name}
            onChange={(e) => setForm({ ...form, device_name: e.target.value })}
            placeholder="ex: WhatsApp 1"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Token *</label>
          <Input
            value={form.device_token}
            onChange={(e) => setForm({ ...form, device_token: e.target.value })}
            placeholder="Cole o token aqui"
            className="h-8 text-sm font-mono"
            type="password"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome usuário MEY *</label>
          <Input
            value={form.user_name}
            onChange={(e) => setForm({ ...form, user_name: e.target.value })}
            placeholder="Nome completo"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email usuário MEY</label>
          <Input
            value={form.user_email}
            onChange={(e) => setForm({ ...form, user_email: e.target.value })}
            placeholder="email@empresa.com"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd} disabled={!form.device_token || !form.user_name}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

function CopyableUrl({ url }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
      <code className="text-xs text-foreground flex-1 break-all font-mono">{url}</code>
      <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

const DATACRAZY_WEBHOOK_URL = `${appParams.appBaseUrl || 'https://api.base44.com'}/api/apps/${appParams.appId}/functions/dataCrazyWebhook`;

export default function Integracoes() {
  const queryClient = useQueryClient();
  const [showNew3C, setShowNew3C] = useState(false);
  const [showNewWavoip, setShowNewWavoip] = useState(false);

  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ["threec_agents"],
    queryFn: () => base44.entities.ThreecAgent.list(),
  });

  const { data: wavoipDevices = [], isLoading: loadingWavoip } = useQuery({
    queryKey: ["wavoip_config"],
    queryFn: () => base44.entities.WavoipConfig.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users_all"],
    queryFn: () => base44.entities.User.list(),
  });

  const refetch3C = () => queryClient.invalidateQueries({ queryKey: ["threec_agents"] });
  const refetchWavoip = () => queryClient.invalidateQueries({ queryKey: ["wavoip_config"] });

  const handleSave3C = async (id, data) => {
    await base44.entities.ThreecAgent.update(id, data);
    refetch3C();
  };

  const handleDelete3C = async (id) => {
    await base44.entities.ThreecAgent.delete(id);
    refetch3C();
  };

  const handleAdd3C = async (data) => {
    await base44.entities.ThreecAgent.create(data);
    setShowNew3C(false);
    refetch3C();
  };

  const handleSaveWavoip = async (id, data) => {
    await base44.entities.WavoipConfig.update(id, data);
    refetchWavoip();
  };

  const handleDeleteWavoip = async (id) => {
    await base44.entities.WavoipConfig.delete(id);
    refetchWavoip();
  };

  const handleAddWavoip = async (data) => {
    await base44.entities.WavoipConfig.create(data);
    setShowNewWavoip(false);
    refetchWavoip();
  };

  const activeCount3C = agents.filter((a) => a.active !== false).length;
  const activeCountWavoip = wavoipDevices.filter((d) => d.active !== false).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure as integrações externas da plataforma</p>
      </div>

      {/* 3C Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">3C Plus — Mapeamento de Agentes</h2>
              <p className="text-xs text-muted-foreground">Vincula Agent ID da 3C ao usuário MEY correspondente</p>
            </div>
          </div>
          <Badge className={activeCount3C > 0 ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
            {activeCount3C} ativo{activeCount3C !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Info box */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">💡 Como descobrir o Agent ID:</p>
          <p>1. Faça uma ligação teste na 3C</p>
          <p>2. Acesse <strong>Eventos</strong> no MEY e veja o campo <code className="bg-muted px-1 rounded">user_name</code> do evento recebido</p>
          <p>3. Cadastre esse valor aqui como "Agent ID / Ramal"</p>
        </div>

        {/* Agent list */}
        <div className="space-y-2">
          {loadingAgents && <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>}
          {!loadingAgents && agents.length === 0 && !showNew3C && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum agente mapeado ainda</p>
          )}
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} users={users} onSave={handleSave3C} onDelete={handleDelete3C} />
          ))}
          {showNew3C && <NewAgentRow users={users} onAdd={handleAdd3C} />}
        </div>

        <div className="flex justify-between items-center pt-1">
          <p className="text-xs text-muted-foreground">{agents.length} mapeamento{agents.length !== 1 ? "s" : ""} cadastrado{agents.length !== 1 ? "s" : ""}</p>
          <Button variant="outline" size="sm" onClick={() => setShowNew3C((v) => !v)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            {showNew3C ? "Cancelar" : "Adicionar agente"}
          </Button>
        </div>
      </Card>

      {/* DataCrazy Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold">DataCrazy CRM — Webhook de Leads</h2>
              <p className="text-xs text-muted-foreground">Recebe leads automaticamente do CRM DataCrazy</p>
            </div>
          </div>
          <Badge className="bg-success/10 text-success border-0">Ativo</Badge>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">🔗 Como configurar no DataCrazy:</p>
          <p>1. Acesse o DataCrazy CRM → <strong>Integrações</strong> → <strong>Webhooks</strong></p>
          <p>2. Adicione um novo webhook com a URL abaixo</p>
          <p>3. Selecione o evento <strong>Lead Criado</strong> (e opcionalmente <strong>Lead Atualizado</strong>)</p>
          <p>4. Salve — os leads novos chegarão automaticamente no MEY</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URL do Webhook</p>
          <CopyableUrl url={DATACRAZY_WEBHOOK_URL} />
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">📋 O que é sincronizado:</p>
          <p>• Lead criado → aparece automaticamente no Funil (Etapa 1)</p>
          <p>• Lead atualizado → dados de nome, telefone e campanha são atualizados</p>
          <p>• Evento <code className="bg-muted px-1 rounded">lead.created</code> registrado na timeline de Atividades</p>
        </div>
      </Card>

      {/* Wavoip Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold">Wavoip — Dispositivos WhatsApp</h2>
              <p className="text-xs text-muted-foreground">Conecta dispositivos Wavoip para capturar chamadas WhatsApp</p>
            </div>
          </div>
          <Badge className={activeCountWavoip > 0 ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
            {activeCountWavoip} ativo{activeCountWavoip !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Info box */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">🔑 Como obter o token:</p>
          <p>1. Acesse a plataforma Wavoip</p>
          <p>2. Vá em Dispositivos e copie o token do dispositivo</p>
          <p>3. Cole o token aqui e associe ao usuário MEY responsável</p>
        </div>

        {/* Device list */}
        <div className="space-y-2">
          {loadingWavoip && <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>}
          {!loadingWavoip && wavoipDevices.length === 0 && !showNewWavoip && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dispositivo conectado ainda</p>
          )}
          {wavoipDevices.map((device) => (
            <WavoipDeviceRow key={device.id} device={device} users={users} onSave={handleSaveWavoip} onDelete={handleDeleteWavoip} />
          ))}
          {showNewWavoip && <NewWavoipDeviceRow users={users} onAdd={handleAddWavoip} />}
        </div>

        <div className="flex justify-between items-center pt-1">
          <p className="text-xs text-muted-foreground">{wavoipDevices.length} dispositivo{wavoipDevices.length !== 1 ? "s" : ""} cadastrado{wavoipDevices.length !== 1 ? "s" : ""}</p>
          <Button variant="outline" size="sm" onClick={() => setShowNewWavoip((v) => !v)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            {showNewWavoip ? "Cancelar" : "Adicionar dispositivo"}
          </Button>
        </div>
      </Card>
    </div>
  );
}