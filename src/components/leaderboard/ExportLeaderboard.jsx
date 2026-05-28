import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, CheckSquare, Square, FileText } from "lucide-react";

export default function ExportLeaderboard({ data, saleRecords, onClose, periodoLabel }) {
  const [selectedSellers, setSelectedSellers] = useState(
    new Set(data.map((r) => r.name))
  );
  const [includeCustomers, setIncludeCustomers] = useState(true);

  const allNames = data.map((r) => r.name);

  const toggleSeller = (name) => {
    setSelectedSellers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSellers.size === allNames.length) setSelectedSellers(new Set());
    else setSelectedSellers(new Set(allNames));
  };

  // Resumo: vendedores selecionados + KPIs
  const summaryRows = useMemo(() => {
    return data.filter((r) => selectedSellers.has(r.name));
  }, [data, selectedSellers]);

  // Clientes: filtrar saleRecords pelos vendedores selecionados
  const customerRows = useMemo(() => {
    if (!includeCustomers) return [];
    return saleRecords
      .filter((r) => r.seller_name && selectedSellers.has(r.seller_name) && r.type !== "exit")
      .map((r) => ({
        vendedor: r.seller_name,
        cliente: r.customer_name || "",
        data: r.date || "",
        valor: r.total ?? "",
        pagamento: r.payment_done ? "Sim" : "Não",
      }))
      .sort((a, b) => a.vendedor.localeCompare(b.vendedor) || a.data.localeCompare(b.data));
  }, [saleRecords, selectedSellers, includeCustomers]);

  const exportCSV = () => {
    const lines = [];

    // === Seção 1: Resumo do ranking ===
    lines.push(`LEADERBOARD - ${periodoLabel || "período selecionado"}`);
    lines.push("");
    lines.push("RESUMO POR VENDEDOR");
    lines.push("Posição,Vendedor,Leads,Vendas,Conversão %");
    summaryRows.forEach((r, i) => {
      lines.push(`${i + 1},"${r.name}",${r.leads},${r.wins},${r.conversion}%`);
    });

    // === Seção 2: Lista de clientes ===
    if (includeCustomers && customerRows.length > 0) {
      lines.push("");
      lines.push("LISTA DE CLIENTES");
      lines.push("Vendedor,Cliente,Data,Valor R$,Pago");
      customerRows.forEach((r) => {
        lines.push(`"${r.vendedor}","${r.cliente}","${r.data}","${r.valor}","${r.pagamento}"`);
      });
    }

    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard_${(periodoLabel || "export").replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl rounded-2xl border border-border overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(150 14% 9%), hsl(150 17% 7%))" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">Exportar Leaderboard</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Opções */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIncludeCustomers(!includeCustomers)}
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              {includeCustomers
                ? <CheckSquare className="w-4 h-4 text-primary" />
                : <Square className="w-4 h-4 text-muted-foreground" />}
              Incluir lista de clientes
            </button>
          </div>

          {/* Seleção de vendedores */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Vendedores ({selectedSellers.size}/{allNames.length} selecionados)
              </p>
              <button
                onClick={toggleAll}
                className="text-xs text-primary hover:opacity-80 font-medium"
              >
                {selectedSellers.size === allNames.length ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {allNames.map((name, i) => {
                const row = data.find((r) => r.name === name);
                const isSelected = selectedSellers.has(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleSeller(name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-all ${
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border bg-card/40 text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: isSelected ? "#4F8F63" : "#2A342D" }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate text-xs">{name}</p>
                      <p className="text-[10px] text-muted-foreground/70">{row?.wins ?? 0}v · {row?.leads ?? 0}l</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-border/60 bg-card/30 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-xs mb-2">Preview da exportação</p>
            <p>• {summaryRows.length} vendedores selecionados</p>
            {includeCustomers && (
              <p>• {customerRows.length} registros de clientes incluídos</p>
            )}
            <p className="text-[11px] opacity-70 pt-1">Formato: CSV com BOM (compatível Excel)</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={exportCSV}
            disabled={selectedSellers.size === 0}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>
    </div>
  );
}