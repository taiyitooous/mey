import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MessageCircle,
  Users,
  Clock,
  RefreshCw,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";

const ACTION_ICONS = {
  call: Phone,
  whatsapp: MessageCircle,
  meeting: Users,
  wait: Clock,
  follow_up: RefreshCw,
  other: FileText,
};

const ACTION_LABELS = {
  call: "Ligar",
  whatsapp: "WhatsApp",
  meeting: "Reunião",
  wait: "Aguardar",
  follow_up: "Follow-up",
  other: "Outro",
};

export default function TasksSection({ tasks, entityId, entityType, onTasksChanged }) {
  const pendingTasks = [...tasks]
    .filter((t) => t.status === "pending")
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const handleDone = async (task) => {
    await base44.entities.Task.update(task.id, { status: "done" });
    await base44.entities.Event.create({
      entity_type: entityType,
      entity_id: entityId,
      event_type: `task.done.${task.action_type}`,
      payload: JSON.stringify({ action_type: task.action_type }),
    });
    onTasksChanged?.();
  };

  if (pendingTasks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Nenhuma ação pendente
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {pendingTasks.map((task) => {
        const dt = new Date(task.scheduled_at);
        const overdue = isPast(dt) && !isToday(dt);
        const today = isToday(dt);
        const Icon = ACTION_ICONS[task.action_type] || FileText;

        return (
          <div
            key={task.id}
            className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border ${
              overdue
                ? "border-destructive/30 bg-destructive/5"
                : today
                ? "border-warning/30 bg-warning/5"
                : "border-border bg-muted/30"
            }`}
          >
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Icon
                className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  overdue
                    ? "text-destructive"
                    : today
                    ? "text-warning"
                    : "text-muted-foreground"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium">{ACTION_LABELS[task.action_type]}</p>
                <p
                  className={`text-xs ${
                    overdue ? "text-destructive font-medium" : today ? "text-warning" : "text-muted-foreground"
                  }`}
                >
                  {format(dt, "dd/MM HH:mm")}
                  {overdue && " · ATRASADO"}
                  {today && " · Hoje"}
                </p>
                {task.assignee_name && (
                  <p className="text-xs text-muted-foreground truncate">{task.assignee_name}</p>
                )}
                {task.notes && (
                  <p className="text-xs text-muted-foreground truncate">{task.notes}</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDone(task)}
              className="h-6 w-6 p-0 shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 text-success" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}