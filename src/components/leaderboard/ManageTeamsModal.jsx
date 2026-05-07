import React, { useState } from "react";
import { X, Plus, Trash2, Pencil, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const TEAM_COLORS = ["#4F8F63", "#C8A94D", "#6E9FA3", "#B97A56", "#B85C5C", "#7B6EA8"];

function TeamRow({ team, sellers, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [leader, setLeader] = useState(team.leader_name);

  async function save() {
    if (!name.trim() || !leader.trim()) return;
    await onUpdate(team.id, { name: name.trim(), leader_name: leader.trim() });
    setEditing(false);
  }

  const teamSellers = sellers.filter((s) => s.team_id === team.id);

  return (
    <div className="bg-muted/10 border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: team.color || "#4F8F63" }} />
        {editing ? (
          <div className="flex-1 flex gap-2 flex-wrap">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da equipe" className="flex-1 h-8 text-sm bg-muted/20 border-border" autoFocus />
            <Input value={leader} onChange={(e) => setLeader(e.target.value)} placeholder="Nome da líder" className="flex-1 h-8 text-sm bg-muted/20 border-border" />
            <button onClick={save} className="text-primary hover:text-primary/80"><Check className="w-4 h-4" /></button>
            <button onClick={() => { setEditing(false); setName(team.name); setLeader(team.leader_name); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">{team.name}</span>
              <span className="text-xs text-muted-foreground ml-2">• Líder: {team.leader_name}</span>
            </div>
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(team.id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
      {teamSellers.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-5">
          {teamSellers.map((s) => (
            <span key={s.id} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">{s.name}</span>
          ))}
        </div>
      )}
      {teamSellers.length === 0 && (
        <p className="text-xs text-muted-foreground/50 ml-5">Nenhum vendedor vinculado</p>
      )}
    </div>
  );
}

function AssignSellerRow({ seller, teams, onUpdate }) {
  const currentTeam = teams.find((t) => t.id === seller.team_id);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
        {seller.name.charAt(0).toUpperCase()}
      </div>
      <span className="flex-1 text-sm text-foreground">{seller.name}</span>
      <Select
        value={seller.team_id || "none"}
        onValueChange={(val) => onUpdate(seller.id, { team_id: val === "none" ? null : val })}
      >
        <SelectTrigger className="w-40 h-7 text-xs bg-muted/20 border-border">
          <SelectValue placeholder="Sem equipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem equipe</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: t.color || "#4F8F63" }} />
                {t.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ManageTeamsModal({ onClose }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newLeader, setNewLeader] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState("teams");

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => base44.entities.Team.list("name", 50),
  });

  const { data: sellers = [], isLoading: loadingSellers } = useQuery({
    queryKey: ["sellers"],
    queryFn: () => base44.entities.Seller.list("name", 200),
  });

  async function handleAdd() {
    if (!newName.trim() || !newLeader.trim()) return;
    setAdding(true);
    await base44.entities.Team.create({ name: newName.trim(), leader_name: newLeader.trim(), color: TEAM_COLORS[colorIdx], active: true });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    setNewName("");
    setNewLeader("");
    setColorIdx((colorIdx + 1) % TEAM_COLORS.length);
    setAdding(false);
  }

  async function handleDeleteTeam(id) {
    await base44.entities.Team.delete(id);
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  async function handleUpdateTeam(id, data) {
    await base44.entities.Team.update(id, data);
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  async function handleUpdateSeller(id, data) {
    await base44.entities.Seller.update(id, data);
    queryClient.invalidateQueries({ queryKey: ["sellers"] });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#121815] border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Gerenciar Equipes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Crie equipes e vincule vendedores às líderes.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-2">
          <button onClick={() => setTab("teams")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === "teams" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Equipes
          </button>
          <button onClick={() => setTab("assign")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === "assign" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Vincular Vendedores
          </button>
        </div>

        {tab === "teams" && (
          <>
            {/* Add new team */}
            <div className="px-6 py-4 space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Nome da equipe" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 h-9 bg-muted/20 border-border text-sm" />
                <Input placeholder="Nome da líder" value={newLeader} onChange={(e) => setNewLeader(e.target.value)} className="flex-1 h-9 bg-muted/20 border-border text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Cor:</span>
                {TEAM_COLORS.map((c, i) => (
                  <button key={c} onClick={() => setColorIdx(i)} className={`w-5 h-5 rounded-full transition-all ${colorIdx === i ? "ring-2 ring-offset-2 ring-offset-card ring-foreground/50 scale-110" : ""}`} style={{ background: c }} />
                ))}
                <div className="flex-1" />
                <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim() || !newLeader.trim()} className="h-8 bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-1" /> Criar
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-2">
              {loadingTeams ? (
                [1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />)
              ) : teams.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma equipe criada.</p>
                </div>
              ) : (
                teams.map((t) => <TeamRow key={t.id} team={t} sellers={sellers} onDelete={handleDeleteTeam} onUpdate={handleUpdateTeam} />)
              )}
            </div>
          </>
        )}

        {tab === "assign" && (
          <div className="overflow-y-auto flex-1 px-6 py-4">
            {loadingSellers ? (
              [1, 2, 3].map((i) => <div key={i} className="h-10 rounded-xl bg-muted/20 animate-pulse mb-2" />)
            ) : sellers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">Nenhum vendedor cadastrado.</p>
            ) : (
              sellers.map((s) => <AssignSellerRow key={s.id} seller={s} teams={teams} onUpdate={handleUpdateSeller} />)
            )}
          </div>
        )}

        <div className="px-6 pb-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">{teams.length} equipe(s) • {sellers.filter((s) => s.team_id).length} vendedor(es) vinculado(s)</p>
        </div>
      </div>
    </div>
  );
}