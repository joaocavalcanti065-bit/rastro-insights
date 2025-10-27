import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { telemetryData } from "@/data/mockData";
import { Calculator, TrendingUp, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Analise() {
  const [custoNovo, setCustoNovo] = useState<number>(2500);
  const [custoReforma, setCustoReforma] = useState<number>(800);
  const [mesesProjecao, setMesesProjecao] = useState<number>(6);

  const pneusCriticos = telemetryData.filter(t => t.status === 'critical');
  const economiaCalculada = (custoNovo - custoReforma) * pneusCriticos.length;
  const economiaTotal = economiaCalculada;

  const handleGenerate = () => {
    toast.success('Pílula de Conhecimento gerada com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Análise Financeira</h1>
        <p className="text-muted-foreground">Geração de Pílulas de Conhecimento e insights financeiros</p>
      </div>

      {/* Configuration Panel */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Motor de Análise
          </CardTitle>
          <CardDescription>Configure os parâmetros para cálculo de economia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="custo-novo">Custo Médio Pneu Novo (R$)</Label>
              <Input
                id="custo-novo"
                type="number"
                value={custoNovo}
                onChange={(e) => setCustoNovo(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo-reforma">Custo Médio Reforma (R$)</Label>
              <Input
                id="custo-reforma"
                type="number"
                value={custoReforma}
                onChange={(e) => setCustoReforma(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meses">Projeção (meses)</Label>
              <Input
                id="meses"
                type="number"
                value={mesesProjecao}
                onChange={(e) => setMesesProjecao(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Pneus Identificados</p>
                <p className="text-2xl font-bold text-foreground">{pneusCriticos.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Economia por Pneu</p>
                <p className="text-2xl font-bold text-success">
                  R$ {(custoNovo - custoReforma).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Economia Total</p>
                <p className="text-2xl font-bold text-success">
                  R$ {economiaTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <Button className="mt-4" onClick={handleGenerate}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Gerar Pílula de Conhecimento
          </Button>
        </CardContent>
      </Card>

      {/* Knowledge Pill Display */}
      <Card className="shadow-lg border-2 border-primary">
        <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            💡 Pílula de Conhecimento
          </CardTitle>
          <CardDescription className="text-white/90">
            Insight financeiro acionável para tomada de decisão
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-lg leading-relaxed">
              <p className="mb-4">
                Ao realizar a <span className="font-bold text-primary">reforma dos {pneusCriticos.length} pneus</span> identificados 
                com desgaste crítico em vez de comprar novos, sua frota economizará 
                <span className="font-bold text-success text-xl"> R$ {economiaTotal.toLocaleString()}</span> nos 
                próximos <span className="font-bold">{mesesProjecao} meses</span>.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-1">Cenário Atual (Compra)</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {(custoNovo * pneusCriticos.length).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-success/10 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-1">Cenário Proposto (Reforma)</p>
                <p className="text-2xl font-bold text-success">
                  R$ {(custoReforma * pneusCriticos.length).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Pneus Identificados para Reforma:</h4>
              <div className="space-y-2">
                {pneusCriticos.map(tire => (
                  <div key={tire.id} className="flex justify-between items-center">
                    <span className="font-medium">{tire.id} - {tire.veiculo}</span>
                    <span className="text-sm text-muted-foreground">
                      Banda: {tire.profundidadeBanda}mm | Pressão: {tire.pressao} PSI
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Report */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório para o Cliente
          </CardTitle>
          <CardDescription>Versão limpa para apresentação ao cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-background p-6 border-2 border-border rounded-lg">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">Análise de Economia - Gestão de Pneus</h3>
              <p className="text-muted-foreground">Período: Próximos {mesesProjecao} meses</p>
            </div>

            <div className="bg-gradient-primary text-white p-6 rounded-lg mb-4">
              <p className="text-lg mb-2">
                💰 Economia Identificada: <span className="text-2xl font-bold">R$ {economiaTotal.toLocaleString()}</span>
              </p>
              <p className="text-sm opacity-90">
                Através da reforma de {pneusCriticos.length} pneus em vez da compra de novos
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Pneus Analisados</p>
                <p className="text-xl font-bold">{pneusCriticos.length}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Redução de Custo</p>
                <p className="text-xl font-bold text-success">
                  {Math.round(((custoNovo - custoReforma) / custoNovo) * 100)}%
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">ROI Projetado</p>
                <p className="text-xl font-bold text-primary">Alto</p>
              </div>
            </div>

            <Button className="w-full mt-6">
              <FileText className="mr-2 h-4 w-4" />
              Exportar Relatório PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
