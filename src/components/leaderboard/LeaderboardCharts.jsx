import React from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function LeaderboardCharts({ data, type }) {
  if (data.length === 0) return null;

  const shortName = (name) => name.split(" ")[0];

  if (type === "sales") {
    const chartData = data.map((d) => ({
      name: shortName(d.name),
      Leads: d.leads,
      Vendas: d.wins,
      Ligações: d.calls,
      "Atendidas": d.callsAnswered,
    }));

    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Gráficos comparativos — Vendas</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Leads e Vendas */}
          <Card className="p-4 bg-card border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-4">Leads × Vendas por colaborador</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Leads" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Vendas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Ligações */}
          <Card className="p-4 bg-card border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-4">Ligações × Atendidas por colaborador</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Ligações" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Atendidas" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  }

  if (type === "collection") {
    const chartData = data.map((d) => ({
      name: shortName(d.name),
      Pedidos: d.orders,
      Tentativas: d.attempts,
      Pagamentos: d.payments,
      Promessas: d.promises,
    }));

    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Gráficos comparativos — Cobrança</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pedidos e Pagamentos */}
          <Card className="p-4 bg-card border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-4">Carteira × Pagamentos por cobrador</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Pedidos" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Pagamentos" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tentativas e Promessas */}
          <Card className="p-4 bg-card border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-4">Tentativas × Promessas por cobrador</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Tentativas" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Promessas" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}