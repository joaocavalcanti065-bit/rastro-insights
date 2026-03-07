import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  aguardando: { label: "Aguardando", variant: "outline" },
  em_processo: { label: "Em Processo", variant: "secondary" },
  aprovada: { label: "Aprovada", variant: "default" },
  reprovada: { label: "Reprovada", variant: "destructive" },
  concluida: { label: "Concluída", variant: "default" },
};

interface Props {
  pneu: any;
  recapagens: any[];
}

export function PneuRetreadTab({ pneu, recapagens }: Props) {
  const navigate = useNavigate();
  const totalRecapagens = recapagens.length;
  const custoTotal = recapagens.reduce((acc, r) => acc + Number(r.custo_recapagem || 0), 0);

  return (
    <div className="space-y-6 mt-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Recapagens</p>
            <p className="text-2xl font-bold">{totalRecapagens}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Vida Atual</p>
            <p className="text-2xl font-bold">{pneu.vida_atual || 1}ª</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Custo Total Recapagens</p>
            <p className="text-2xl font-bold font-mono">R$ {custoTotal.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Viabilidade</p>
            <Badge variant={totalRecapagens < 3 ? "default" : "destructive"} className="mt-1">
              {totalRecapagens < 3 ? "Viável" : "Avaliar"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => navigate("/recapagem")}>
          <Plus className="h-4 w-4 mr-2" />Enviar para Recapagem
        </Button>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Recapagens</CardTitle>
        </CardHeader>
        <CardContent>
          {recapagens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma recapagem registrada.</p>
          ) : (
            <div className="space-y-4">
              {recapagens.map((r, i) => {
                const st = STATUS_MAP[r.status] || { label: r.status, variant: "outline" as const };
                return (
                  <div key={r.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-purple-400" />
                        <span className="font-bold">Ciclo {r.numero_ciclo || i + 1}</span>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Fornecedor</p>
                        <p>{(r as any).fornecedores?.nome || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data Envio</p>
                        <p>{r.data_envio ? format(new Date(r.data_envio), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data Retorno</p>
                        <p>{r.data_retorno_real ? format(new Date(r.data_retorno_real), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Custo</p>
                        <p className="font-mono">R$ {Number(r.custo_recapagem || 0).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    {r.classificacao_carcaca && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Carcaça: </span>
                        <Badge variant="outline" className="text-xs">{r.classificacao_carcaca}</Badge>
                      </div>
                    )}
                    {r.observacoes && <p className="text-xs text-muted-foreground">{r.observacoes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
