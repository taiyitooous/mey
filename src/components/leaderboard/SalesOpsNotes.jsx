import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StickyNote, Plus, Trash2, Save } from "lucide-react";

function NoteCard({ note, onDelete }) {
  const [text, setText] = useState(note.content || "");
  const [dirty, setDirty] = useState(false);
  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: () => base44.entities.SalesOpsNote.update(note.id, { content: text }),
    onSuccess: () => { setDirty(false); qc.invalidateQueries({ queryKey: ["sales_ops_notes"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: () => base44.entities.SalesOpsNote.delete(note.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales_ops_notes"] }); onDelete(); },
  });

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden min-h-[180px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
        <span className="text-xs text-muted-foreground">
          {new Date(note.created_date).toLocaleDateString("pt-BR")} — {note.created_by?.split("@")[0] || "Sales Ops"}
        </span>
        <div className="flex items-center gap-1">
          {dirty && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 text-primary" onClick={() => saveMut.mutate()}>
              <Save className="w-3 h-3" />
              Salvar
            </Button>
          )}
          <button
            onClick={() => deleteMut.mutate()}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <textarea
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 p-3 resize-none focus:outline-none"
        placeholder="Escreva sua anotação aqui..."
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        onBlur={() => { if (dirty) saveMut.mutate(); }}
      />
    </div>
  );
}

export default function SalesOpsNotes() {
  const qc = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ["sales_ops_notes"],
    queryFn: () => base44.entities.SalesOpsNote.list("-created_date", 50),
  });

  const createMut = useMutation({
    mutationFn: () => base44.entities.SalesOpsNote.create({ content: "" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales_ops_notes"] }),
  });

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Anotações — Sales Ops</h3>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{notes.length}</span>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => createMut.mutate()}>
          <Plus className="w-3.5 h-3.5" />
          Nova nota
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Nenhuma anotação ainda. Clique em "Nova nota" para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={() => {}} />
          ))}
        </div>
      )}
    </Card>
  );
}