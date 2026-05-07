import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";

export default function ImportarCSV() {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setResults([]);
    setError(null);
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    
    setImporting(true);
    setResults([]);
    setError(null);
    
    const allResults = [];
    
    for (const file of files) {
      try {
        const csvText = await file.text();
        const response = await base44.functions.invoke('importThreecCalls', { csvText });
        allResults.push({ file: file.name, ...response.data });
      } catch (err) {
        allResults.push({ file: file.name, success: false, error: err.message });
      }
    }
    
    setResults(allResults);
    setImporting(false);
  };

  const totalCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);
  const allAgentStats = results.reduce((acc, r) => {
    if (r.agentStats) {
      Object.entries(r.agentStats).forEach(([agent, stats]) => {
        if (!acc[agent]) acc[agent] = { total: 0, answered: 0 };
        acc[agent].total += stats.total;
        acc[agent].answered += stats.answered;
      });
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Importar Chamadas 3C</h1>
        <p className="text-sm text-muted-foreground mt-1">Importe CSVs exportados da 3C Plus para contabilizar as ligações por agente</p>
      </div>

      <Card className="p-6 space-y-4">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-sm font-medium">Selecionar arquivos CSV</span>
          <span className="text-xs text-muted-foreground mt-1">Você pode selecionar múltiplos arquivos</span>
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {files.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">{files.length} arquivo(s) selecionado(s):</p>
            {files.map((f, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {f.name} ({(f.size / 1024).toFixed(0)}KB)</p>
            ))}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={files.length === 0 || importing}
          className="w-full"
        >
          {importing ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Importar Chamadas
            </>
          )}
        </Button>
      </Card>

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <Card className="p-4 border-success/50 bg-success/5 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success">{totalCreated} chamadas importadas</p>
              <p className="text-xs text-muted-foreground">{Object.keys(allAgentStats).length} agentes contabilizados</p>
            </div>
          </Card>

          {/* Per-file results */}
          {results.map((r, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              <span className="font-medium">{r.file}:</span> {r.created || 0} chamadas importadas
              {r.error && <span className="text-destructive"> — Erro: {r.error}</span>}
            </div>
          ))}

          {/* Agent stats */}
          {Object.keys(allAgentStats).length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Resumo por Agente</h3>
              <div className="space-y-2">
                {Object.entries(allAgentStats)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([agent, stats]) => (
                    <div key={agent} className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate flex-1">{agent}</span>
                      <div className="flex gap-4 text-muted-foreground shrink-0 ml-4">
                        <span>{stats.total} ligações</span>
                        <span className="text-success">{stats.answered} atendidas</span>
                        <span>{stats.total > 0 ? Math.round(stats.answered / stats.total * 100) : 0}% contato</span>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}