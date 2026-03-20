import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Package,
  Flag,
  Phone,
  MapPin,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { isToday, isPast, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_LABELS = {
  call: "Ligar",
  whatsapp: "WhatsApp",
  meeting: "Reunião",
  wait: "Aguardar",
  follow_up: "Follow-up",
  other: "Outro",
};

function Section({ icon: Icon, title, colorClass, borderClass, bgClass, items, renderItem }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => renderItem(item, borderClass, bgClass))}
      </div>
    </div>
  );
}

export default function Hoje() {
  const navigate = useNavigate();

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.filter({ status: "pending" }),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const isLoading = loadingTasks || loadingOrders || loadingLeads;

  const overdueTasks = tasks.filter(
    (t) => t.scheduled_at && isPast(new Date(t.scheduled_at)) && !isToday(new Date(t.scheduled_at))
  );
  const todayTasks = tasks.filter(
    (t) => t.scheduled_at && isToday(new Date(t.scheduled_at))
  );
  const deliveredToday = orders.filter(
    (o) => o.delivered_at && isToday(new Date(o.delivered_at)) && o.payment_status !== "paid"
  );
  const finalFunnel = leads.filter((l) => l.stage === 5 && l.status === "open");
  const aging9plus = orders.filter((o) => {
    if (o.logistics_status !== "delivered" || o.payment_status === "paid" || !o.delivered_at)
      return false;
    return differenceInDays(new Date(), new Date(o.delivered_at)) >= 9;
  });
  const pickupWaiting = orders.filter((o) => o.logistics_status === "pickup_waiting");
  const failedDelivery = orders.filter((o) => o.logistics_status === "failed");

  const getLeadForTask = (task) => leads.find((l) => l.id === task.entity_id);

  const totalItems =
    overdueTasks.length + todayTasks.length + deliveredToday.length +
    finalFunnel.length + aging9plus.length + pickupWaiting.length + failedDelivery.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(4).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const renderTaskItem = (task, borderClass, bgClass) => {
    const lead = getLeadForTask(task);
    return (
      <Card key={task.id} className={`p-3 ${borderClass} ${bgClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {ACTION_LABELS[task.action_type]} · {lead?.name || task.entity_id}
            </p>
            {task.assignee_name && (
              <p className="text-xs text-muted-foreground">{task.assignee_name}</p>
            )}
            {task.notes && (
              <p className="text-xs text-muted-foreground truncate">{task.notes}</p>
            )}
          </div>
          {task.entity_type === "lead" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/lead/${task.entity_id}`)}
              className="gap-1 shrink-0"
            >
              Abrir <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hoje</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalItems === 0
            ? "Tudo em dia! ✅"
            : `${totalItems} item${totalItems !== 1 ? "s" : ""} precisam de atenção`}
        </p>
      </div>

      {totalItems === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-medium">Nenhuma pendência para hoje!</p>
          <p className="text-sm mt-1">Aproveite para prospectar ou treinar a equipe.</p>
        </Card>
      )}

      <div className="space-y-6">
        <Section
          icon={AlertTriangle}
          title="Ações Atrasadas"
          colorClass="text-destructive"
          borderClass="border-destructive/20"
          bgClass="bg-destructive/5"
          items={overdueTasks}
          renderItem={renderTaskItem}
        />

        <Section
          icon={Clock}
          title="Vence Hoje"
          colorClass="text-warning"
          borderClass="border-warning/20"
          bgClass="bg-warning/5"
          items={todayTasks}
          renderItem={renderTaskItem}
        />

        <Section
          icon={Package}
          title="Entregue Hoje — Cobrar Agora"
          colorClass="text-primary"
          borderClass=""
          bgClass=""
          items={deliveredToday}
          renderItem={(order, borderClass, bgClass) => (
            <Card key={order.id} className={`p-3 ${borderClass} ${bgClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{order.customer_name || order.order_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.order_id} · R$ {order.amount?.toLocaleString("pt-BR") || "—"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate("/cobranca")} className="gap-1 shrink-0">
                  Cobrar <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          )}
        />

        <Section
          icon={Flag}
          title="Final do Funil — Fechar Agora"
          colorClass="text-success"
          borderClass=""
          bgClass=""
          items={finalFunnel}
          renderItem={(lead, borderClass, bgClass) => (
            <Card key={lead.id} className={`p-3 ${borderClass} ${bgClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  {lead.value_expected && (
                    <p className="text-xs text-muted-foreground">
                      R$ {lead.value_expected.toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/lead/${lead.id}`)} className="gap-1 shrink-0">
                  Abrir <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          )}
        />

        <Section
          icon={Phone}
          title="9+ dias — Cobrança Urgente"
          colorClass="text-destructive"
          borderClass="border-destructive/20"
          bgClass=""
          items={aging9plus}
          renderItem={(order, borderClass, bgClass) => {
            const days = order.delivered_at
              ? differenceInDays(new Date(), new Date(order.delivered_at))
              : 0;
            return (
              <Card key={order.id} className={`p-3 ${borderClass} ${bgClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{order.customer_name || order.order_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {days} dias · R$ {order.amount?.toLocaleString("pt-BR") || "—"}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate("/cobranca")} className="gap-1 shrink-0">
                    Cobrar <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          }}
        />

        <Section
          icon={MapPin}
          title="Aguardando Retirada"
          colorClass="text-warning"
          borderClass=""
          bgClass=""
          items={pickupWaiting}
          renderItem={(order, borderClass, bgClass) => (
            <Card key={order.id} className={`p-3 ${borderClass} ${bgClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{order.customer_name || order.order_id}</p>
                  <p className="text-xs text-muted-foreground">{order.city}/{order.state}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate("/logistica")} className="gap-1 shrink-0">
                  Ver <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          )}
        />

        <Section
          icon={XCircle}
          title="Falha na Entrega"
          colorClass="text-destructive"
          borderClass="border-destructive/20"
          bgClass=""
          items={failedDelivery}
          renderItem={(order, borderClass, bgClass) => (
            <Card key={order.id} className={`p-3 ${borderClass} ${bgClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{order.customer_name || order.order_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.carrier} · {order.city}/{order.state}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate("/logistica")} className="gap-1 shrink-0">
                  Ver <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          )}
        />
      </div>
    </div>
  );
}