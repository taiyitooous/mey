import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check } from "lucide-react";

export default function Coordenadores() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ user_email: "", user_name: "" });
  const queryClient = useQueryClient();

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.user_email || !formData.user_name) return;
    createMutation.mutate(formData);
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Check className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
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
              <div className="flex items-center gap-3">
                {coord.active && <Badge className="bg-success/10 text-success">Ativo</Badge>}
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