import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Ruler, AlertTriangle, CheckCircle, TrendingDown, Calendar, Route } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const DESGASTE_MAP: Record<string, { label: string; desc: string }> = {
  uniforme: { label: "Uniforme", desc: "Desgaste normal" },
  central: { label: "Central", desc: "Possível excesso de pressão" },
  lateral: { label: "Lateral", desc: "Possível pressão baixa" },
  irregular: { label: "Irregular / Ziguezague", desc: "Desalinhamento ou balanceamento" },
  unilateral: { label: "Unilateral", desc: "Problema de geometria" },
  calombo: { label: "Calombo / Deformação", desc: "Dano estrutural" },
  corte: { label: "Corte / Furo", desc: "Dano mecânico" },
};

const SULCO_LIMITE = 3; // mm - limite de segurança

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

  // Projection calculations
  const kmRodado = Math.max(0, (pneu.km_atual || 0) - (pneu.km_inicial || 0));
  const sulcoGasto = Math.max(0, sulcoInicial - sulcoAtual);
  const sulcoRestante = Math.max(0, sulcoAtual - SULCO_LIMITE);
  const diasVida = Math.floor((Date.now() - new Date(pneu.created_at).getTime()) / (1000 * 60 * 60 * 24));

  // Rate: mm per 1000km
  const taxaDesgaste = kmRodado > 0 && sulcoGasto > 0 ? (sulcoGasto / kmRodado) * 1000 : 0;
  // Rate: mm per day
  const taxaDiaria = diasVida > 0 && sulcoGasto > 0 ? sulcoGasto / diasVida : 0;

  const kmRestante = taxaDesgaste > 0 ? Math.round((sulcoRestante / taxaDesgaste) * 1000) : null;
  const diasRestantes = taxaDiaria > 0 ? Math.round(sulcoRestante / taxaDiaria) : null;
  const dataProjetada = diasRestantes != null ? new Date(Date.now() + diasRestantes * 86400000) : null;

  const urgencia = diasRestantes != null
    ? diasRestantes <= 30 ? "critico" : diasRestantes <= 60 ? "atencao" : diasRestantes <= 90 ? "moderado" : "ok"
    : "unknown";

  const urgenciaConfig = {
    critico: { label: "Crítico", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", progress: "bg-destructive" },
    atencao: { label: "Atenção", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", progress: "bg-yellow-500" },
    moderado: { label: "Moderado", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", progress: "bg-orange-400" },
    ok: { label: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", progress: "bg-emerald-500" },
    unknown: { label: "Sem dados", color: "text-muted-foreground", bg: "bg-muted border-border", progress: "bg-muted-foreground" },
  };

  const urg = urgenciaConfig[urgencia];

  return (
    <div className="space-y-6 mt-4">
      {/* Projection Card */}
      <Card className={`border ${urg.bg}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Projeção de Vida Útil
            <Badge variant="outline" className={`ml-auto ${urg.color}`}>{urg.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taxaDesgaste > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa de desgaste</p>
                  <p className="text-lg font-bold font-mono">{taxaDesgaste.toFixed(2)}<span className="text-xs text-muted-foreground"> mm/1.000km</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sulco restante útil</p>
                  <p className="text-lg font-bold font-mono">{sulcoRestante.toFixed(1)}<span className="text-xs text-muted-foreground"> mm</span></p>
                  <p className="text-xs text-muted-foreground">até limite de {SULCO_LIMITE}mm</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Km restantes estimados</p>
                  <div className="flex items-center gap-1">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <p className={`text-lg font-bold font-mono ${urg.color}`}>
                      {kmRestante != null ? kmRestante.toLocaleString("pt-BR") : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data projetada de troca</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className={`text-lg font-bold ${urg.color}`}>
                      {dataProjetada ? dataProjetada.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  {diasRestantes != null && (
                    <p className="text-xs text-muted-foreground">~{diasRestantes} dias</p>
                  )}
                </div>
              </div>

              {/* Visual progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Vida consumida</span>
                  <span>{sulcoGasto.toFixed(1)}mm de {(sulcoInicial - SULCO_LIMITE).toFixed(1)}mm úteis</span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${urg.progress}`}
                    style={{ width: `${Math.min(100, ((sulcoGasto) / (sulcoInicial - SULCO_LIMITE)) * 100)}%` }}
                  />
                </div>
              </div>

              {urgencia === "critico" && (
                <div className="flex items-center gap-2 text-destructive text-sm p-2 rounded-md bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Pneu projetado para atingir limite de segurança em menos de 30 dias. Programe a substituição.</span>
                </div>
              )}
              {urgencia === "atencao" && (
                <div className="flex items-center gap-2 text-yellow-500 text-sm p-2 rounded-md bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Pneu projetado para atingir limite em menos de 60 dias. Monitore com frequência.</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Dados insuficientes para projeção. Registre medições de sulco e km rodado para habilitar a projeção automática.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

      {/* Desgaste */}
      <Card>
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
