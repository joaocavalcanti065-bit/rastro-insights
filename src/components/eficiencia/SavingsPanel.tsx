import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Fuel, Droplets, CircleDollarSign, ShieldAlert, Gauge, Route } from "lucide-react";

interface FuelRecord {
  consumo_km_por_litro: number | null;
  custo_por_km: number | null;
  km_rodado: number | null;
  litros_abastecidos: number;
  valor_total_pago: number;
  preco_litro: number | null;
  data_abastecimento: string;
}

interface PneuRecord {
  sulco_atual: number | null;
  sulco_inicial: number | null;
  km_atual: number | null;
  km_inicial: number | null;
  custo_aquisicao: number | null;
  pressao_atual: number | null;
  pressao_ideal: number | null;
}

interface SavingsPanelProps {
  fuelData: FuelRecord[];
  pneus: PneuRecord[];
  compact?: boolean;
}

export function SavingsPanel({ fuelData, pneus, compact = false }: SavingsPanelProps) {
  const savings = useMemo(() => {
    // === FUEL SAVINGS (real calculation from data) ===
    const withConsumo = fuelData.filter(f => f.consumo_km_por_litro && f.consumo_km_por_litro > 0);
    
    let realMelhoriaPercent = 0;
    let realEconomiaLitros = 0;
    let realEconomiaReais = 0;
    let avgConsumoBefore = 0;
    let avgConsumoAfter = 0;

    if (withConsumo.length >= 2) {
      const half = Math.floor(withConsumo.length / 2);
      const firstHalf = withConsumo.slice(0, half);
      const secondHalf = withConsumo.slice(half);

      avgConsumoBefore = firstHalf.reduce((s, f) => s + Number(f.consumo_km_por_litro), 0) / firstHalf.length;
      avgConsumoAfter = secondHalf.reduce((s, f) => s + Number(f.consumo_km_por_litro), 0) / secondHalf.length;

      if (avgConsumoBefore > 0 && avgConsumoAfter > avgConsumoBefore) {
        realMelhoriaPercent = ((avgConsumoAfter - avgConsumoBefore) / avgConsumoBefore) * 100;

        const totalKmSecondHalf = secondHalf.reduce((s, f) => s + Number(f.km_rodado || 0), 0);
        const litrosSemMelhoria = avgConsumoBefore > 0 ? totalKmSecondHalf / avgConsumoBefore : 0;
        const litrosComMelhoria = avgConsumoAfter > 0 ? totalKmSecondHalf / avgConsumoAfter : 0;
        realEconomiaLitros = litrosSemMelhoria - litrosComMelhoria;

        const avgPrecoLitro = secondHalf.reduce((s, f) => s + Number(f.preco_litro || 0), 0) / secondHalf.length;
        realEconomiaReais = realEconomiaLitros * avgPrecoLitro;
      }
    }

    // === REFERENCE 17% PROJECTION (annual) ===
    const totalKmAll = fuelData.reduce((s, f) => s + Number(f.km_rodado || 0), 0);
    const totalLitrosAll = fuelData.reduce((s, f) => s + Number(f.litros_abastecidos || 0), 0);
    const totalGastoAll = fuelData.reduce((s, f) => s + Number(f.valor_total_pago || 0), 0);
    const avgPrecoGlobal = totalLitrosAll > 0 ? totalGastoAll / totalLitrosAll : 6.0;
    const avgConsumoGlobal = totalLitrosAll > 0 ? totalKmAll / totalLitrosAll : 0;

    // Project annual: extrapolate from data period
    const firstDate = fuelData.length > 0 ? new Date(fuelData[0].data_abastecimento) : new Date();
    const lastDate = fuelData.length > 0 ? new Date(fuelData[fuelData.length - 1].data_abastecimento) : new Date();
    const daysCovered = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const annualFactor = 365 / daysCovered;

    const litrosAnualSemTelemetria = totalLitrosAll * annualFactor;
    const litrosAnualComTelemetria = avgConsumoGlobal > 0
      ? (totalKmAll * annualFactor) / (avgConsumoGlobal * 1.17)
      : litrosAnualSemTelemetria;
    // Wait, we need to think about this differently.
    // Without telemetry: the "before" consumption rate applies
    // With telemetry (17% improvement): 17% better fuel efficiency
    const consumoSemTelemetria = avgConsumoBefore > 0 ? avgConsumoBefore : (avgConsumoGlobal > 0 ? avgConsumoGlobal / 1.085 : 8); // estimate baseline
    const consumoComTelemetria = consumoSemTelemetria * 1.17;

    const kmAnualEstimado = totalKmAll > 0 ? totalKmAll * annualFactor : 12000 * 12; // fallback 144k km/year for fleet
    const litrosSemRef = consumoSemTelemetria > 0 ? kmAnualEstimado / consumoSemTelemetria : 0;
    const litrosComRef = consumoComTelemetria > 0 ? kmAnualEstimado / consumoComTelemetria : 0;
    const economiaLitrosRef = litrosSemRef - litrosComRef;
    const economiaReaisRef = economiaLitrosRef * avgPrecoGlobal;
    const prejuizoAnualSemTelemetria = economiaReaisRef; // what they'd lose annually

    // === TIRE SAVINGS ===
    const pneusAtivos = pneus.filter(p => p.sulco_atual != null);
    const avgSulcoAtual = pneusAtivos.length > 0
      ? pneusAtivos.reduce((s, p) => s + Number(p.sulco_atual || 0), 0) / pneusAtivos.length
      : 0;
    const avgSulcoInicial = pneusAtivos.length > 0
      ? pneusAtivos.reduce((s, p) => s + Number(p.sulco_inicial || 16), 0) / pneusAtivos.length
      : 16;
    
    // With telemetry: 0.8mm/month wear. Without: 1.5mm/month
    const mesesComTelemetria = avgSulcoAtual > 3 ? (avgSulcoAtual - 3) / 0.8 : 0;
    const mesesSemTelemetria = avgSulcoAtual > 3 ? (avgSulcoAtual - 3) / 1.5 : 0;
    const mesesGanhosPneu = mesesComTelemetria - mesesSemTelemetria;

    // Cost of premature tire replacement
    const avgCustoPneu = pneusAtivos.length > 0
      ? pneusAtivos.reduce((s, p) => s + Number(p.custo_aquisicao || 3200), 0) / pneusAtivos.length
      : 3200;
    // If tires last X months longer, the annual savings is:
    // Without telemetry: need replacement sooner → more cost
    const vidaTotalCom = avgSulcoInicial > 3 ? (avgSulcoInicial - 3) / 0.8 : 16; // months
    const vidaTotalSem = avgSulcoInicial > 3 ? (avgSulcoInicial - 3) / 1.5 : 9; // months
    const custoAnualPneusCom = vidaTotalCom > 0 ? (pneusAtivos.length * avgCustoPneu * 12) / vidaTotalCom : 0;
    const custoAnualPneusSem = vidaTotalSem > 0 ? (pneusAtivos.length * avgCustoPneu * 12) / vidaTotalSem : 0;
    const economiaPneusAnual = custoAnualPneusSem - custoAnualPneusCom;

    // Pressure optimization: ~5% fuel savings from correct pressure
    const pneusComPressao = pneus.filter(p => p.pressao_atual && p.pressao_ideal);
    const avgDesvio = pneusComPressao.length > 0
      ? pneusComPressao.reduce((s, p) => s + Math.abs(Number(p.pressao_atual) - Number(p.pressao_ideal || 110)), 0) / pneusComPressao.length
      : 0;
    const pressaoOtimizada = avgDesvio < 5;

    // === TOTAL SAVINGS ===
    const economiaTotal = economiaReaisRef + economiaPneusAnual;
    const prejuizoTotal = economiaTotal; // what they'd lose without

    return {
      // Real data
      realMelhoriaPercent,
      realEconomiaLitros,
      realEconomiaReais,
      avgConsumoBefore,
      avgConsumoAfter,
      hasRealData: realMelhoriaPercent > 0,
      // Reference 17%
      economiaLitrosRef,
      economiaReaisRef,
      prejuizoAnualSemTelemetria,
      consumoSemTelemetria,
      consumoComTelemetria,
      kmAnualEstimado,
      avgPrecoGlobal,
      // Tire savings
      mesesGanhosPneu,
      economiaPneusAnual,
      mesesComTelemetria,
      mesesSemTelemetria,
      custoAnualPneusCom,
      custoAnualPneusSem,
      pneusAtivos: pneusAtivos.length,
      avgCustoPneu,
      pressaoOtimizada,
      // Totals
      economiaTotal,
      prejuizoTotal,
    };
  }, [fuelData, pneus]);

  if (fuelData.length === 0 && pneus.length === 0) return null;

  if (compact) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-full p-2 bg-emerald-500/15">
              <TrendingDown className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Economia estimada com telemetria</p>
              <p className="text-2xl font-bold text-emerald-500">
                R$ {savings.economiaTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}<span className="text-sm font-normal">/ano</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-muted">
              <p className="text-muted-foreground">Combustível</p>
              <p className="font-bold font-mono text-foreground">R$ {savings.economiaReaisRef.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <p className="text-muted-foreground">Pneus</p>
              <p className="font-bold font-mono text-foreground">R$ {savings.economiaPneusAnual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10">
              <p className="text-muted-foreground">Prejuízo s/ telemetria</p>
              <p className="font-bold font-mono text-destructive">R$ {savings.prejuizoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
          {savings.hasRealData && (
            <p className="text-[10px] text-muted-foreground">
              ✅ Melhoria real medida: +{savings.realMelhoriaPercent.toFixed(1)}% no consumo = R$ {savings.realEconomiaReais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} economizados
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-emerald-500" />
          Economia com Telemetria Rastro Insights
        </CardTitle>
        <CardDescription className="text-xs">
          Cálculo real + projeção de 17% de referência — impacto em combustível, desgaste de pneus e prejuízo evitado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Hero savings */}
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Economia Total Estimada</p>
          <p className="text-4xl font-bold text-emerald-500">
            R$ {savings.economiaTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">por ano com monitoramento ativo</p>
        </div>

        {/* Real vs projected */}
        {savings.hasRealData && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-emerald-500 text-xs">Dados Reais</Badge>
              <span className="text-sm font-semibold text-foreground">Melhoria medida nos abastecimentos</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Consumo antes</p>
                <p className="font-bold font-mono text-foreground">{savings.avgConsumoBefore.toFixed(2)} km/L</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Consumo depois</p>
                <p className="font-bold font-mono text-emerald-500">{savings.avgConsumoAfter.toFixed(2)} km/L</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Melhoria real</p>
                <p className="font-bold font-mono text-emerald-500">+{savings.realMelhoriaPercent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Economia real</p>
                <p className="font-bold font-mono text-emerald-500">R$ {savings.realEconomiaReais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fuel section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-foreground">Economia em Combustível (ref. 17%)</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground uppercase">Consumo base</p>
              <p className="font-bold font-mono text-sm text-foreground">{savings.consumoSemTelemetria.toFixed(2)} km/L</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground uppercase">Com telemetria (+17%)</p>
              <p className="font-bold font-mono text-sm text-emerald-500">{savings.consumoComTelemetria.toFixed(2)} km/L</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground uppercase">Litros economizados/ano</p>
              <p className="font-bold font-mono text-sm text-foreground">{savings.economiaLitrosRef.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">Economia anual</p>
              <p className="font-bold font-mono text-sm text-emerald-500">R$ {savings.economiaReaisRef.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        {/* Tire section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Economia em Pneus (vida útil estendida)</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground uppercase">Sem telemetria</p>
              <p className="font-bold font-mono text-sm text-destructive">{savings.mesesSemTelemetria.toFixed(0)} meses vida</p>
              <p className="text-[10px] text-muted-foreground">Desgaste ~1,5 mm/mês</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground uppercase">Com telemetria</p>
              <p className="font-bold font-mono text-sm text-emerald-500">{savings.mesesComTelemetria.toFixed(0)} meses vida</p>
              <p className="text-[10px] text-muted-foreground">Desgaste ~0,8 mm/mês</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground uppercase">Meses ganhos</p>
              <p className="font-bold font-mono text-sm text-emerald-500">+{savings.mesesGanhosPneu.toFixed(0)} meses</p>
              <p className="text-[10px] text-muted-foreground">{savings.pneusAtivos} pneu(s) ativo(s)</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">Economia anual pneus</p>
              <p className="font-bold font-mono text-sm text-emerald-500">R$ {savings.economiaPneusAnual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        {/* Without telemetry = loss */}
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <h4 className="text-sm font-bold text-destructive">Sem Telemetria — Prejuízo Projetado</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Se a frota operasse sem monitoramento de pressão, sulco e calibragem, o prejuízo estimado seria:
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-destructive/5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Combustível extra</p>
              <p className="text-lg font-bold font-mono text-destructive">R$ {savings.economiaReaisRef.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
              <p className="text-[9px] text-muted-foreground">+{savings.economiaLitrosRef.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} litros/ano</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Troca precoce pneus</p>
              <p className="text-lg font-bold font-mono text-destructive">R$ {savings.economiaPneusAnual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
              <p className="text-[9px] text-muted-foreground">-{savings.mesesGanhosPneu.toFixed(0)} meses de vida</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 text-center border border-destructive/30">
              <p className="text-[10px] text-muted-foreground uppercase">Prejuízo total/ano</p>
              <p className="text-xl font-bold font-mono text-destructive">R$ {savings.prejuizoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
              <p className="text-[9px] text-muted-foreground">desperdiçado sem gestão</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          * Projeção baseada em melhoria de 17% no consumo após calibragem/alinhamento, desgaste reduzido de 1,5→0,8 mm/mês com monitoramento ativo e preço médio de R$ {savings.avgPrecoGlobal.toFixed(2)}/L.
        </p>
      </CardContent>
    </Card>
  );
}