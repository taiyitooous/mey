import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Coordenadores() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ user_email: "", user_name: "" });
  const [invitingId, setInvitingId] = useState(null);
  const [inviteInForm, setInviteInForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: coordinators = [] } = useQuery({
    queryKey: ["coordinators"],
    queryFn: () => base44.entities.Coordinator.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Coordinator.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinators"] });
      setFormData({ user_email: "", user_name: "" });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Coordinator.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinators"] });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_email || !formData.user_name) return;
    createMutation.mutate(formData);
    if (inviteInForm) {
      try {
        await base44.users.inviteUser(formData.user_email, "user");
        toast({ title: "Convite enviado!", description: `${formData.user_email} foi convidado para o app.` });
      } catch {
        toast({ title: "Coordenador criado", description: "Não foi possível enviar o convite agora.", variant: "destructive" });
      }
    }
  };

  const handleInvite = async (coord) => {
    setInvitingId(coord.id);
    try {
      await base44.users.inviteUser(coord.user_email, "user");
      toast({ title: "Convite enviado!", description: `${coord.user_email} recebeu o convite para o app.` });
    } catch {
      toast({ title: "Erro ao convidar", description: "Não foi possível enviar o convite.", variant: "destructive" });
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Coordenadores</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerenciar coordenadores da equipe</p>
      </div>

      <Button onClick={() => setShowForm(!showForm)} className="gap-2">
        <Plus className="w-4 h-4" />
        Novo coordenador
      </Button>

      {showForm && (
        <Card className="p-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold">Email</label>
              <Input
                type="email"
                placeholder="coordenador@email.com"
                value={formData.user_email}
                onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Nome</label>
              <Input
                placeholder="Nome do coordenador"
                value={formData.user_name}
                onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteInForm}
                  onChange={(e) => setInviteInForm(e.target.checked)}
                  className="rounded"
                />
                Convidar para o app ao adicionar
              </label>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  <Check className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {coordinators.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum coordenador cadastrado</p>
          </div>
        ) : (
          coordinators.map((coord) => (
            <Card key={coord.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{coord.user_name}</p>
                <p className="text-xs text-muted-foreground">{coord.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                {coord.active && <Badge className="bg-success/10 text-success">Ativo</Badge>}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleInvite(coord)}
                  disabled={invitingId === coord.id}
                  className="gap-1 text-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {invitingId === coord.id ? "Enviando..." : "Convidar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(coord.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}