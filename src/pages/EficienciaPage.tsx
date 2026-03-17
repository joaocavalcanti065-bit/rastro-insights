import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, Legend } from "recharts";
import { Trophy, Medal, Award, TrendingDown, TrendingUp, Target, Gauge, DollarSign, Route, BarChart3, ShieldAlert, Loader2, Zap, CheckCircle2, AlertTriangle, Fuel } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import CpkTrendPanel from "@/components/eficiencia/CpkTrendPanel";

interface PneuRow {
  id: string;
  id_unico: string;
  rg_code: string | null;
  marca: string;
  modelo_pneu: string | null;
  medida: string | null;
  km_atual: number | null;
  km_inicial: number | null;
  custo_aquisicao: number | null;
  custo_acumulado: number | null;
  sulco_inicial: number | null;
  sulco_atual: number | null;
  status: string;
  vida_atual: number | null;
  qtd_recapagens: number | null;
  tipo_pneu: string | null;
}

interface GroupData {
  key: string;
  marca: string;
  modelo: string | null;
  medida: string | null;
  qtd: number;
  kmTotal: number;
  kmMedio: number;
  custoTotal: number;
  custoMedio: number;
  cpkMedio: number;
  cpkMin: number;
  cpkMax: number;
  sulcoMedioRestante: number;
  vidaMedia: number;
  pneus: Array<PneuRow & { km: number; custo: number; cpk: number }>;
}

export default function EficienciaPage() {
  const [groupBy, setGroupBy] = useState<"marca" | "modelo" | "medida">("marca");
  const [filterMedida, setFilterMedida] = useState<string>("all");
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [autoCalcResult, setAutoCalcResult] = useState<any>(null);

  const handleCheckCpkAlerts = async () => {
    setCheckingAlerts(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-cpk-alerts");
      if (error) throw error;
      if (data?.alerts_created > 0) {
        toast.warning(`${data.alerts_created} alerta(s) de CPK elevado criado(s)! Threshold: R$ ${data.threshold}/km`);
      } else {
        toast.success(`Nenhuma marca com CPK acima do dobro da média (R$ ${data?.threshold}/km).`);
      }
    } catch (err: any) {
      toast.error("Erro ao verificar alertas: " + (err.message || "erro desconhecido"));
    } finally {
      setCheckingAlerts(false);
    }
  };

  const handleAutoCalculate = async () => {
    setCalculando(true);
    setAutoCalcResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("auto-calculate-mvp");
      if (error) throw error;
      setAutoCalcResult(data);
      if (data?.total_alerts > 0) {
        toast.warning(`${data.total_alerts} alerta(s) gerado(s) para ${data.vehicles_processed} veículo(s).`);
      } else {
        toast.success(`Cálculos concluídos para ${data?.vehicles_processed || 0} veículo(s). Sem alertas.`);
      }
    } catch (err: any) {
      toast.error("Erro nos cálculos: " + (err.message || "erro desconhecido"));
    } finally {
      setCalculando(false);
    }
  };

  const { data: pneus, isLoading } = useQuery({
    queryKey: ["eficiencia-pneus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pneus")
        .select("id, id_unico, rg_code, marca, modelo_pneu, medida, km_atual, km_inicial, custo_aquisicao, custo_acumulado, sulco_inicial, sulco_atual, status, vida_atual, qtd_recapagens, tipo_pneu")
        .neq("status", "sucata")
        .neq("status", "extraviado");
      if (error) throw error;
      return (data || []) as PneuRow[];
    },
  });

  const medidas = useMemo(() => {
    if (!pneus) return [];
    return [...new Set(pneus.map(p => p.medida).filter(Boolean))].sort() as string[];
  }, [pneus]);

  const enriched = useMemo(() => {
    if (!pneus) return [];
    return pneus
      .filter(p => filterMedida === "all" || p.medida === filterMedida)
      .map(p => {
        const km = Math.max(0, (p.km_atual || 0) - (p.km_inicial || 0));
        const custo = Number(p.custo_aquisicao || 0) + Number(p.custo_acumulado || 0);
        const cpk = km > 0 ? custo / km : 0;
        return { ...p, km, custo, cpk };
      });
  }, [pneus, filterMedida]);

  const groups = useMemo(() => {
    const map = new Map<string, GroupData>();
    enriched.forEach(p => {
      let key: string;
      if (groupBy === "marca") key = p.marca || "Sem marca";
      else if (groupBy === "modelo") key = `${p.marca} ${p.modelo_pneu || "S/M"}`;
      else key = p.medida || "Sem medida";

      if (!map.has(key)) {
        map.set(key, {
          key,
          marca: p.marca,
          modelo: p.modelo_pneu,
          medida: p.medida,
          qtd: 0,
          kmTotal: 0,
          kmMedio: 0,
          custoTotal: 0,
          custoMedio: 0,
          cpkMedio: 0,
          cpkMin: Infinity,
          cpkMax: 0,
          sulcoMedioRestante: 0,
          vidaMedia: 0,
          pneus: [],
        });
      }
      const g = map.get(key)!;
      g.qtd++;
      g.kmTotal += p.km;
      g.custoTotal += p.custo;
      if (p.cpk > 0) {
        g.cpkMin = Math.min(g.cpkMin, p.cpk);
        g.cpkMax = Math.max(g.cpkMax, p.cpk);
      }
      g.sulcoMedioRestante += Number(p.sulco_atual || 0);
      g.vidaMedia += Number(p.vida_atual || 1);
      g.pneus.push(p);
    });

    const result = Array.from(map.values()).map(g => {
      const withCpk = g.pneus.filter(p => p.cpk > 0);
      g.kmMedio = g.qtd > 0 ? g.kmTotal / g.qtd : 0;
      g.custoMedio = g.qtd > 0 ? g.custoTotal / g.qtd : 0;
      g.cpkMedio = withCpk.length > 0 ? withCpk.reduce((s, p) => s + p.cpk, 0) / withCpk.length : 0;
      if (g.cpkMin === Infinity) g.cpkMin = 0;
      g.sulcoMedioRestante = g.qtd > 0 ? g.sulcoMedioRestante / g.qtd : 0;
      g.vidaMedia = g.qtd > 0 ? g.vidaMedia / g.qtd : 0;
      return g;
    });

    return result.sort((a, b) => {
      if (a.cpkMedio === 0 && b.cpkMedio === 0) return b.qtd - a.qtd;
      if (a.cpkMedio === 0) return 1;
      if (b.cpkMedio === 0) return -1;
      return a.cpkMedio - b.cpkMedio;
    });
  }, [enriched, groupBy]);

  // Global KPIs
  const totalPneus = enriched.length;
  const totalKm = enriched.reduce((s, p) => s + p.km, 0);
  const totalCusto = enriched.reduce((s, p) => s + p.custo, 0);
  const withCpk = enriched.filter(p => p.cpk > 0);
  const cpkGlobal = withCpk.length > 0 ? withCpk.reduce((s, p) => s + p.cpk, 0) / withCpk.length : 0;
  const bestGroup = groups.find(g => g.cpkMedio > 0);
  const worstGroup = [...groups].filter(g => g.cpkMedio > 0).pop();

  // Chart data
  const chartData = groups.filter(g => g.cpkMedio > 0).slice(0, 12).map(g => ({
    name: g.key.length > 18 ? g.key.substring(0, 18) + "…" : g.key,
    cpk: Number(g.cpkMedio.toFixed(3)),
    qtd: g.qtd,
  }));

  const scatterData = groups.filter(g => g.cpkMedio > 0 && g.kmMedio > 0).map(g => ({
    name: g.key,
    x: g.kmMedio,
    y: g.cpkMedio,
    z: g.qtd,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Eficiência por Marca/Modelo
          </h1>
          <p className="text-sm text-muted-foreground">Análise estratégica de custo/km para decisão de compras</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterMedida} onValueChange={setFilterMedida}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filtrar medida" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as medidas</SelectItem>
              {medidas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="marca">Por Marca</SelectItem>
              <SelectItem value="modelo">Por Modelo</SelectItem>
              <SelectItem value="medida">Por Medida</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleCheckCpkAlerts} disabled={checkingAlerts} className="gap-2">
            {checkingAlerts ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Verificar alertas CPK
          </Button>
          <Button size="sm" onClick={handleAutoCalculate} disabled={calculando} className="gap-2">
            {calculando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Calcular KPIs Automático
          </Button>
        </div>
      </div>

      {/* Auto-Calculation Results */}
      {autoCalcResult && autoCalcResult.results && autoCalcResult.results.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Resultado dos Cálculos Automatizados
            </CardTitle>
            <CardDescription className="text-xs">
              {autoCalcResult.vehicles_processed} veículo(s) processado(s) · {autoCalcResult.total_alerts} alerta(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {autoCalcResult.results.map((r: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg border bg-card space-y-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <Fuel className="h-4 w-4 text-primary" />
                    {r.veiculo.placa} — {r.veiculo.modelo || "N/A"}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-[10px] text-muted-foreground">Consumo Médio</p>
                      <p className="font-bold font-mono">{r.fuel_kpis.consolidated.avg_km_per_liter} km/L</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-[10px] text-muted-foreground">Custo/km (Comb.)</p>
                      <p className="font-bold font-mono">R$ {r.fuel_kpis.consolidated.avg_cost_per_km}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-[10px] text-muted-foreground">Sulco Médio</p>
                      <p className="font-bold font-mono">{r.tire_kpis.tread_avg_mm} mm</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-[10px] text-muted-foreground">Vida Restante</p>
                      <p className="font-bold font-mono">{r.tire_kpis.tread_life_remaining_pct}%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {["conservador", "base", "agressivo"].map((cenario) => (
                      <div key={cenario} className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-[10px] text-muted-foreground capitalize">{cenario}</p>
                        <p className="font-bold font-mono">
                          {(r.tire_kpis.wear_projection[cenario].km_remaining / 1000).toFixed(1)}k km
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {r.tire_kpis.wear_projection[cenario].rate_mm_per_1000km} mm/1000km
                        </p>
                      </div>
                    ))}
                  </div>
                  {r.alerts && r.alerts.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        {r.alerts.length} alerta(s)
                      </p>
                      {r.alerts.map((a: any, i: number) => (
                        <div key={i} className="text-xs p-2 rounded bg-muted/50 flex items-start gap-2">
                          <Badge variant={a.gravidade === "critica" ? "destructive" : "secondary"} className="text-[9px] shrink-0">
                            {a.gravidade}
                          </Badge>
                          <span>{a.mensagem}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Target} label="Pneus analisados" value={String(totalPneus)} />
        <KpiCard icon={Route} label="Km total rodado" value={totalKm.toLocaleString("pt-BR")} />
        <KpiCard icon={DollarSign} label="Investimento total" value={`R$ ${totalCusto.toLocaleString("pt-BR")}`} />
        <KpiCard icon={Gauge} label="CPK médio global" value={cpkGlobal > 0 ? `R$ ${cpkGlobal.toFixed(3)}` : "—"} highlight />
      </div>

      {/* Best vs Worst */}
      {bestGroup && worstGroup && bestGroup.key !== worstGroup.key && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-full p-2.5 bg-emerald-500/15">
                <TrendingDown className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mais eficiente</p>
                <p className="font-bold">{bestGroup.key}</p>
                <p className="text-sm font-mono text-emerald-600">R$ {bestGroup.cpkMedio.toFixed(3)}/km · {bestGroup.qtd} pneus</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-full p-2.5 bg-destructive/15">
                <TrendingUp className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Menos eficiente</p>
                <p className="font-bold">{worstGroup.key}</p>
                <p className="text-sm font-mono text-destructive">R$ {worstGroup.cpkMedio.toFixed(3)}/km · {worstGroup.qtd} pneus</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ranking CPK por {groupBy === "marca" ? "Marca" : groupBy === "modelo" ? "Modelo" : "Medida"}</CardTitle>
            <CardDescription className="text-xs">Menor = mais eficiente</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(val: number) => [`R$ ${val.toFixed(3)}`, "CPK"]}
                  />
                  <Bar dataKey="cpk" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(var(--chart-2))" : i < 3 ? "hsl(var(--chart-1))" : "hsl(var(--chart-4))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados de CPK</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Km Médio × Custo/Km</CardTitle>
            <CardDescription className="text-xs">Ideal: alto km, baixo custo (canto inferior direito)</CardDescription>
          </CardHeader>
          <CardContent>
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="x" name="Km Médio" type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="y" name="CPK" type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ZAxis dataKey="z" name="Qtd" range={[60, 400]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(val: number, name: string) => {
                      if (name === "Km Médio") return [val.toLocaleString("pt-BR"), "Km Médio"];
                      if (name === "CPK") return [`R$ ${val.toFixed(3)}`, "CPK"];
                      return [val, name];
                    }}
                  />
                  <Scatter data={scatterData} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados suficientes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CPK Trend */}
      <CpkTrendPanel />

      {/* Ranking Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Tabela Comparativa Detalhada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[28rem]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{groupBy === "marca" ? "Marca" : groupBy === "modelo" ? "Marca/Modelo" : "Medida"}</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Km Médio</TableHead>
                  <TableHead className="text-right">Custo Médio</TableHead>
                  <TableHead className="text-right">CPK Médio</TableHead>
                  <TableHead className="text-right">CPK Min</TableHead>
                  <TableHead className="text-right">CPK Max</TableHead>
                  <TableHead className="text-right">Sulco Méd.</TableHead>
                  <TableHead className="text-right">Vida Méd.</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g, idx) => {
                  const RankIcon = idx === 0 ? Trophy : idx === 1 ? Medal : idx === 2 ? Award : null;
                  const best = groups[0]?.cpkMedio || 1;
                  const score = g.cpkMedio > 0 && best > 0 ? Math.round((best / g.cpkMedio) * 100) : 0;
                  return (
                    <TableRow key={g.key}>
                      <TableCell>
                        {RankIcon ? (
                          <RankIcon className={`h-4 w-4 ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : "text-amber-700"}`} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{idx + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{g.key}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{g.qtd}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{g.kmMedio > 0 ? g.kmMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">R$ {g.custoMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {g.cpkMedio > 0 ? `R$ ${g.cpkMedio.toFixed(3)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{g.cpkMin > 0 ? `R$ ${g.cpkMin.toFixed(3)}` : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{g.cpkMax > 0 ? `R$ ${g.cpkMax.toFixed(3)}` : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{g.sulcoMedioRestante.toFixed(1)}mm</TableCell>
                      <TableCell className="text-right font-mono text-xs">{g.vidaMedia.toFixed(1)}ª</TableCell>
                      <TableCell className="text-right">
                        {score > 0 ? (
                          <Badge variant={score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive"} className="text-[10px]">
                            {score}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Insight */}
      {bestGroup && bestGroup.cpkMedio > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">💡 Insight Estratégico</p>
            <p className="text-sm leading-relaxed">
              A marca <strong>{bestGroup.key}</strong> apresenta o menor custo por km (R$ {bestGroup.cpkMedio.toFixed(3)}) 
              com base em {bestGroup.qtd} pneus e {bestGroup.kmTotal.toLocaleString("pt-BR")} km rodados.
              {worstGroup && worstGroup.key !== bestGroup.key && worstGroup.cpkMedio > 0 && (
                <> Comparado com <strong>{worstGroup.key}</strong> (R$ {worstGroup.cpkMedio.toFixed(3)}/km), 
                representa uma economia de <strong className="text-primary">
                  {((1 - bestGroup.cpkMedio / worstGroup.cpkMedio) * 100).toFixed(0)}%
                </strong> por km rodado. Considere priorizar esta marca nas próximas aquisições.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary" : ""}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2 ${highlight ? "bg-primary" : "bg-muted"}`}>
          <Icon className={`h-4 w-4 ${highlight ? "text-primary-foreground" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold text-sm font-mono">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
