import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Ruler, AlertTriangle, CheckCircle } from "lucide-react";

const DESGASTE_MAP: Record<string, { label: string; desc: string }> = {
  uniforme: { label: "Uniforme", desc: "Desgaste normal" },
  central: { label: "Central", desc: "Possível excesso de pressão" },
  lateral: { label: "Lateral", desc: "Possível pressão baixa" },
  irregular: { label: "Irregular / Ziguezague", desc: "Desalinhamento ou balanceamento" },
  unilateral: { label: "Unilateral", desc: "Problema de geometria" },
  calombo: { label: "Calombo / Deformação", desc: "Dano estrutural" },
  corte: { label: "Corte / Furo", desc: "Dano mecânico" },
};

export function PneuMeasuresTab({ pneu }: { pneu: any }) {
  const sulcoInicial = Number(pneu.sulco_inicial || 16);
  const sulcoAtual = Number(pneu.sulco_atual || 0);
  const sulcoPercent = sulcoInicial > 0 ? (sulcoAtual / sulcoInicial) * 100 : 0;
  const sulcoColor = sulcoPercent > 50 ? "bg-emerald-500" : sulcoPercent > 20 ? "bg-yellow-500" : "bg-destructive";

  const pressaoIdeal = Number(pneu.pressao_ideal || 110);
  const pressaoAtual = Number(pneu.pressao_atual || 0);
  const pressaoDesvio = pressaoIdeal > 0 ? Math.abs(pressaoAtual - pressaoIdeal) / pressaoIdeal : 0;
  const pressaoStatus = pressaoAtual === 0 ? "unknown" : pressaoDesvio <= 0.05 ? "ok" : pressaoDesvio <= 0.15 ? "warn" : "critical";

  const desgaste = DESGASTE_MAP[pneu.desgaste_observado || "uniforme"] || DESGASTE_MAP.uniforme;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      {/* Sulco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Ruler className="h-5 w-5" />Sulco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-4xl font-bold font-mono">{sulcoAtual}<span className="text-lg text-muted-foreground">mm</span></p>
              <p className="text-sm text-muted-foreground">de {sulcoInicial}mm iniciais</p>
            </div>
            <p className="text-2xl font-bold">{sulcoPercent.toFixed(0)}%</p>
          </div>
          <div className="w-full h-4 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${sulcoColor} transition-all`} style={{ width: `${Math.min(sulcoPercent, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mínimo legal: 1.6mm</span>
            <span>Vida útil restante</span>
          </div>
          {sulcoAtual <= 3 && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Sulco crítico — substituição recomendada</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pressão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5" />Pressão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-4xl font-bold font-mono">
                {pressaoAtual > 0 ? pressaoAtual : "—"}
                <span className="text-lg text-muted-foreground"> PSI</span>
              </p>
              <p className="text-sm text-muted-foreground">Ideal: {pressaoIdeal} PSI</p>
            </div>
            {pressaoStatus === "ok" && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>}
            {pressaoStatus === "warn" && <Badge variant="outline" className="border-yellow-500/50 text-yellow-400"><AlertTriangle className="h-3 w-3 mr-1" />Atenção</Badge>}
            {pressaoStatus === "critical" && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Crítico</Badge>}
            {pressaoStatus === "unknown" && <Badge variant="outline">Sem leitura</Badge>}
          </div>
          {pressaoAtual > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Desvio: </span>
              <span className={pressaoDesvio > 0.15 ? "text-destructive" : pressaoDesvio > 0.05 ? "text-yellow-400" : "text-emerald-400"}>
                {pressaoDesvio > 0 ? `${(pressaoDesvio * 100).toFixed(1)}%` : "0%"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desgaste */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Padrão de Desgaste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">{desgaste.label}</Badge>
            <span className="text-sm text-muted-foreground">{desgaste.desc}</span>
          </div>
          {pneu.observacoes && (
            <div className="mt-4 p-3 rounded-lg bg-muted text-sm">
              <p className="text-xs text-muted-foreground mb-1">Observações técnicas</p>
              <p>{pneu.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
