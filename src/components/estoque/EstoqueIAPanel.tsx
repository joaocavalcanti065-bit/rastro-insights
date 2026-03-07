import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, ShoppingCart, TrendingUp, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pneus: any[];
}

type AnalysisType = "recomendacao_compra" | "analise_giro" | "alerta_pneu_parado";

const ANALYSIS_OPTIONS = [
  {
    type: "recomendacao_compra" as AnalysisType,
    icon: ShoppingCart,
    title: "Recomendação de Compra",
    description: "IA analisa cobertura e sugere reposição",
    color: "text-emerald-500",
  },
  {
    type: "analise_giro" as AnalysisType,
    icon: TrendingUp,
    title: "Análise de Giro",
    description: "Identifica alto/baixo giro e otimizações",
    color: "text-blue-500",
  },
  {
    type: "alerta_pneu_parado" as AnalysisType,
    icon: Clock,
    title: "Pneus Parados",
    description: "Recomendações para itens sem movimentação",
    color: "text-amber-500",
  },
];

export function EstoqueIAPanel({ pneus }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultTitle, setResultTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const buildStockData = (type: AnalysisType) => {
    const now = Date.now();
    const byMedida: Record<string, any> = {};

    pneus.forEach((p) => {
      const key = p.medida || "Sem medida";
      if (!byMedida[key]) {
        byMedida[key] = { medida: key, total: 0, novos: 0, recapados: 0, valor_total: 0, dias_parados: [], pneus_detalhe: [] };
      }
      const dias = p.updated_at ? Math.floor((now - new Date(p.updated_at).getTime()) / 86400000) : 0;
      byMedida[key].total++;
      if (p.tipo_pneu === "novo") byMedida[key].novos++;
      else byMedida[key].recapados++;
      byMedida[key].valor_total += Number(p.custo_aquisicao || 0);
      byMedida[key].dias_parados.push(dias);

      if (type === "alerta_pneu_parado" && dias > 30) {
        byMedida[key].pneus_detalhe.push({
          rg: p.rg_code || p.id_unico,
          marca: p.marca,
          condicao: p.tipo_pneu,
          custo: p.custo_aquisicao,
          dias_parado: dias,
          sulco: p.sulco_atual,
          status: p.status,
        });
      }
    });

    Object.values(byMedida).forEach((g: any) => {
      g.dias_medio_parado = g.dias_parados.length
        ? Math.round(g.dias_parados.reduce((a: number, b: number) => a + b, 0) / g.dias_parados.length)
        : 0;
      g.custo_medio = g.total > 0 ? Math.round(g.valor_total / g.total) : 0;
      g.cobertura_dias = g.total * 15; // estimate
      delete g.dias_parados;
    });

    return {
      resumo: {
        total_pneus: pneus.length,
        valor_total: pneus.reduce((a, p) => a + Number(p.custo_aquisicao || 0), 0),
        data_analise: new Date().toISOString().split("T")[0],
      },
      por_medida: Object.values(byMedida),
    };
  };

  const runAnalysis = async (type: AnalysisType, title: string) => {
    setLoading(true);
    setResultTitle(title);
    try {
      const dados = buildStockData(type);
      const { data, error } = await supabase.functions.invoke("analise-rastro", {
        body: { tipo: type, dados },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Limite")) toast.error(data.error);
        else if (data.error.includes("Créditos")) toast.error(data.error);
        else throw new Error(data.error);
        return;
      }

      setResult(data.analise);
      setDialogOpen(true);

      // Save analysis
      await supabase.from("analises_ia").insert({
        tipo: type,
        conteudo: data.analise,
        dados_entrada: dados as any,
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar análise");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-primary" />
            Inteligência do Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ANALYSIS_OPTIONS.map((opt) => (
              <Button
                key={opt.type}
                variant="outline"
                className="h-auto py-3 flex flex-col items-start gap-1 text-left"
                disabled={loading}
                onClick={() => runAnalysis(opt.type, opt.title)}
              >
                <div className="flex items-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <opt.icon className={`h-4 w-4 ${opt.color}`} />}
                  <span className="font-medium text-sm">{opt.title}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{opt.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {resultTitle}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {result}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
