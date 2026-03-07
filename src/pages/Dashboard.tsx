import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Truck, Circle, Package, RefreshCw, Bell, DollarSign, TrendingDown, TrendingUp, BarChart3, CalendarIcon, ShieldAlert, Lightbulb, ArrowUp, ArrowDown, Fuel, Droplets } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, Area, AreaChart, ReferenceLine } from "recharts";
import { format, subDays, subMonths, isAfter, isBefore, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type DateFilterType = "7d" | "30d" | "custom" | "all";

function DateFilterBar({ filter, setFilter, dateFrom, dateTo, setDateFrom, setDateTo }: {
  filter: DateFilterType; setFilter: (f: DateFilterType) => void;
  dateFrom: Date | undefined; dateTo: Date | undefined;
  setDateFrom: (d: Date | undefined) => void; setDateTo: (d: Date | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-2 border-b mb-4">
      {([["all", "Tudo"], ["7d", "7 dias"], ["30d", "30 dias"], ["custom", "Personalizado"]] as [DateFilterType, string][]).map(([key, label]) => (
        <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)} className="text-xs h-7">
          {label}
        </Button>
      ))}
      {filter === "custom" && (
        <div className="flex items-center gap-1 ml-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {dateFrom ? format(dateFrom, "dd/MM/yy") : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">—</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {dateTo ? format(dateTo, "dd/MM/yy") : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

// --- Timeline helper: group items by month for the last 6 months ---
function buildTimeline<T>(items: T[], dateField: keyof T, months = 6): { name: string; value: number }[] {
  const now = new Date();
  const buckets: Record<string, number> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = format(startOfMonth(d), "MMM/yy", { locale: ptBR });
    buckets[key] = 0;
  }
  const cutoff = startOfMonth(subMonths(now, months - 1));
  items.forEach(item => {
    const val = item[dateField];
    if (!val || typeof val !== "string") return;
    const d = new Date(val as string);
    if (isBefore(d, cutoff)) return;
    const key = format(startOfMonth(d), "MMM/yy", { locale: ptBR });
    if (key in buckets) buckets[key]++;
  });
  return Object.entries(buckets).map(([name, value]) => ({ name, value }));
}

// --- Predictive Insights Component ---
function PredictiveInsights({ pneus, recapagens }: {
  pneus: any[];
  recapagens: any[];
}) {
  const avgSulco = pneus.length ? pneus.reduce((a: number, p: any) => a + Number(p.sulco_atual || 0), 0) / pneus.length : 0;
  const avgSulcoInicial = pneus.length ? pneus.reduce((a: number, p: any) => a + Number(p.sulco_inicial || 16), 0) / pneus.length : 16;
  const avgVida = pneus.length ? pneus.reduce((a: number, p: any) => a + Number(p.vida_atual || 1), 0) / pneus.length : 1;
  const avgPressao = pneus.filter(p => p.pressao_atual).length
    ? pneus.filter(p => p.pressao_atual).reduce((a: number, p: any) => a + Number(p.pressao_atual), 0) / pneus.filter(p => p.pressao_atual).length
    : 0;
  const avgPressaoIdeal = pneus.length ? pneus.reduce((a: number, p: any) => a + Number(p.pressao_ideal || 110), 0) / pneus.length : 110;

  const desgastePercentual = avgSulcoInicial > 0 ? ((avgSulcoInicial - avgSulco) / avgSulcoInicial) * 100 : 0;
  const pressaoDesvio = avgPressaoIdeal > 0 && avgPressao > 0 ? Math.abs(((avgPressao - avgPressaoIdeal) / avgPressaoIdeal) * 100) : 0;

  // Estimate months remaining based on wear rate
  const vidaRestanteComRecomendacoes = avgSulco > 3 ? Math.round((avgSulco - 3) / 0.8) : 0; // 0.8mm/month with good practices
  const vidaRestanteSemRecomendacoes = avgSulco > 3 ? Math.round((avgSulco - 3) / 1.5) : 0; // 1.5mm/month without

  // Build projection data for chart
  const projectionData = [];
  let sulcoComRec = avgSulco;
  let sulcoSemRec = avgSulco;
  for (let i = 0; i <= 12; i++) {
    const d = subMonths(new Date(), -i);
    projectionData.push({
      name: format(d, "MMM/yy", { locale: ptBR }),
      comRecomendacoes: Math.max(0, Number(sulcoComRec.toFixed(1))),
      semRecomendacoes: Math.max(0, Number(sulcoSemRec.toFixed(1))),
      limiteMinimo: 3,
    });
    sulcoComRec = Math.max(0, sulcoComRec - 0.8);
    sulcoSemRec = Math.max(0, sulcoSemRec - 1.5);
  }

  const recapTaxa = pneus.length ? (recapagens.filter(r => r.status === "retornado").length / Math.max(pneus.length, 1)) * 100 : 0;

  const recommendations = [];
  if (pressaoDesvio > 5) {
    recommendations.push({
      icon: ShieldAlert,
      color: "text-destructive",
      bg: "bg-destructive/10",
      title: "Pressão fora do ideal",
      desc: `Desvio médio de ${pressaoDesvio.toFixed(0)}% — calibrar semanalmente pode aumentar a vida do pneu em até 20%.`,
    });
  }
  if (desgastePercentual > 60) {
    recommendations.push({
      icon: ArrowDown,
      color: "text-warning",
      bg: "bg-warning/10",
      title: "Desgaste elevado na frota",
      desc: `${desgastePercentual.toFixed(0)}% do sulco já foi consumido. Programe rodízio e inspeções quinzenais.`,
    });
  }
  if (recapTaxa < 30 && pneus.length > 5) {
    recommendations.push({
      icon: RefreshCw,
      color: "text-primary",
      bg: "bg-primary/10",
      title: "Aproveite mais a recapagem",
      desc: `Apenas ${recapTaxa.toFixed(0)}% dos pneus foram recapados. Recapar carcaças A/B pode economizar até 50% vs. pneu novo.`,
    });
  }
  recommendations.push({
    icon: Lightbulb,
    color: "text-success",
    bg: "bg-success/10",
    title: "Alinhamento e balanceamento",
    desc: "Manter alinhamento a cada 10.000 km pode aumentar a vida útil em até 30% e reduzir consumo de combustível.",
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Análise Preditiva — Vida Útil dos Pneus</h4>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-success/10 border border-success/20 p-3">
          <span className="text-muted-foreground flex items-center gap-1"><ArrowUp className="h-3 w-3 text-success" /> Com recomendações</span>
          <p className="text-xl font-bold text-success">{vidaRestanteComRecomendacoes} meses</p>
          <p className="text-xs text-muted-foreground">Desgaste ~0,8 mm/mês</p>
        </div>
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <span className="text-muted-foreground flex items-center gap-1"><ArrowDown className="h-3 w-3 text-destructive" /> Sem recomendações</span>
          <p className="text-xl font-bold text-destructive">{vidaRestanteSemRecomendacoes} meses</p>
          <p className="text-xs text-muted-foreground">Desgaste ~1,5 mm/mês</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Projeção de Sulco — Próximos 12 meses</h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis unit=" mm" />
              <Tooltip formatter={(v: number, name: string) => [`${v} mm`, name === "comRecomendacoes" ? "Com recomendações" : name === "semRecomendacoes" ? "Sem recomendações" : "Limite mínimo"]} />
              <ReferenceLine y={3} stroke="hsl(0,84%,60%)" strokeDasharray="5 5" label={{ value: "Mín. 3mm", position: "right", fill: "hsl(0,84%,60%)", fontSize: 11 }} />
              <Area type="monotone" dataKey="comRecomendacoes" stroke="hsl(142,76%,36%)" fill="hsl(142,76%,36%)" fillOpacity={0.15} strokeWidth={2} name="Com recomendações" />
              <Area type="monotone" dataKey="semRecomendacoes" stroke="hsl(0,84%,60%)" fill="hsl(0,84%,60%)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" name="Sem recomendações" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Recomendações para Aumentar a Vida Útil</h4>
        {recommendations.map((rec, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${rec.bg} border`}>
            <rec.icon className={`h-5 w-5 mt-0.5 ${rec.color} shrink-0`} />
            <div>
              <p className="text-sm font-medium">{rec.title}</p>
              <p className="text-xs text-muted-foreground">{rec.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Timeline Chart Component ---
function TimelineChart({ data, label, color = "hsl(var(--primary))" }: { data: { name: string; value: number }[]; label: string; color?: string }) {
  if (data.every(d => d.value === 0)) return null;
  return (
    <div>
      <h4 className="text-sm font-medium mb-2 text-muted-foreground">{label}</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} name="Quantidade" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const COLORS = ["hsl(239,84%,67%)", "hsl(142,76%,36%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(280,60%,50%)"];

type DetailType = "veiculos" | "pneus" | "operacao" | "estoque" | "recapagem" | "sucata" | "alertas" | "custo" | "combustivel" | null;

function StatCard({ title, value, icon: Icon, color, onClick }: { title: string; value: string | number; icon: any; color: string; onClick?: () => void }) {
  return (
    <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" onClick={onClick}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [openDetail, setOpenDetail] = useState<DetailType>(null);

  const { data: veiculos, isLoading: loadingV } = useQuery({
    queryKey: ["veiculos-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("*");
      return data || [];
    },
  });

  const { data: pneus, isLoading: loadingP } = useQuery({
    queryKey: ["pneus-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("*");
      return data || [];
    },
  });

  const { data: alertas } = useQuery({
    queryKey: ["alertas-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("alertas").select("*").eq("ativo", true);
      return data || [];
    },
  });

  const { data: recapagens } = useQuery({
    queryKey: ["recapagens-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("recapagens").select("*");
      return data || [];
    },
  });

  const { data: movimentacoes } = useQuery({
    queryKey: ["movimentacoes-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("movimentacoes_pneus").select("*");
      return data || [];
    },
  });

  const { data: manutencoes } = useQuery({
    queryKey: ["manutencoes-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("manutencoes").select("*");
      return data || [];
    },
  });

  const { data: combustivel } = useQuery({
    queryKey: ["combustivel-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("coleta_manual_combustivel").select("*");
      return data || [];
    },
  });

  const isLoading = loadingV || loadingP;
  const totalVeiculos = veiculos?.length || 0;
  const totalPneus = pneus?.length || 0;
  const emOperacao = pneus?.filter(p => p.localizacao === "veiculo").length || 0;
  const emEstoque = pneus?.filter(p => p.localizacao === "estoque").length || 0;
  const emRecapagem = pneus?.filter(p => p.status === "em_recapagem" || p.status === "aguardando_recapagem").length || 0;
  const sucateados = pneus?.filter(p => p.status === "sucata").length || 0;
  const alertasCriticos = alertas?.filter(a => a.gravidade === "critico").length || 0;
  const custoTotal = pneus?.reduce((acc, p) => acc + Number(p.custo_acumulado || p.custo_aquisicao || 0), 0) || 0;
  const economiaRecapagem = (recapagens?.filter(r => r.status === "retornado").length || 0) * 1800;

  // Fuel stats
  const totalAbastecimentos = combustivel?.length || 0;
  const totalLitros = combustivel?.reduce((a, c) => a + Number(c.litros_abastecidos || 0), 0) || 0;
  const totalGastoCombustivel = combustivel?.reduce((a, c) => a + Number(c.valor_total_pago || 0), 0) || 0;
  const avgConsumo = combustivel?.filter(c => c.consumo_km_por_litro && c.consumo_km_por_litro > 0);
  const mediaKmPorLitro = avgConsumo && avgConsumo.length > 0
    ? avgConsumo.reduce((a, c) => a + Number(c.consumo_km_por_litro || 0), 0) / avgConsumo.length
    : 0;
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setOpenDetail(null);
      setDateFilter("all");
      setDateFrom(undefined);
      setDateTo(undefined);
    }
  };

  const filterByDate = <T extends { created_at: string }>(items: T[] | undefined | null): T[] => {
    if (!items) return [];
    if (dateFilter === "all") return items;
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;
    if (dateFilter === "7d") { start = startOfDay(subDays(now, 7)); end = endOfDay(now); }
    else if (dateFilter === "30d") { start = startOfDay(subDays(now, 30)); end = endOfDay(now); }
    else if (dateFilter === "custom") { start = dateFrom ? startOfDay(dateFrom) : undefined; end = dateTo ? endOfDay(dateTo) : undefined; }
    return items.filter(item => {
      const d = new Date(item.created_at);
      if (start && isBefore(d, start)) return false;
      if (end && isAfter(d, end)) return false;
      return true;
    });
  };

  const filterByDateField = <T,>(items: T[] | undefined | null, field: keyof T): T[] => {
    if (!items) return [];
    if (dateFilter === "all") return items;
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;
    if (dateFilter === "7d") { start = startOfDay(subDays(now, 7)); end = endOfDay(now); }
    else if (dateFilter === "30d") { start = startOfDay(subDays(now, 30)); end = endOfDay(now); }
    else if (dateFilter === "custom") { start = dateFrom ? startOfDay(dateFrom) : undefined; end = dateTo ? endOfDay(dateTo) : undefined; }
    return items.filter(item => {
      const val = item[field];
      if (!val || typeof val !== "string") return false;
      const d = new Date(val as string);
      if (start && isBefore(d, start)) return false;
      if (end && isAfter(d, end)) return false;
      return true;
    });
  };

  const fVeiculos = useMemo(() => filterByDate(veiculos), [veiculos, dateFilter, dateFrom, dateTo]);
  const fPneus = useMemo(() => filterByDate(pneus), [pneus, dateFilter, dateFrom, dateTo]);
  const fAlertas = useMemo(() => filterByDate(alertas), [alertas, dateFilter, dateFrom, dateTo]);
  const fRecapagens = useMemo(() => filterByDate(recapagens), [recapagens, dateFilter, dateFrom, dateTo]);
  const fMovimentacoes = useMemo(() => filterByDateField(movimentacoes, "data_movimentacao" as any), [movimentacoes, dateFilter, dateFrom, dateTo]);
  const fManutencoes = useMemo(() => filterByDate(manutencoes), [manutencoes, dateFilter, dateFrom, dateTo]);
  const fCombustivel = useMemo(() => filterByDateField(combustivel, "data_abastecimento" as any), [combustivel, dateFilter, dateFrom, dateTo]);

  // Timeline data (always full 6 months, not filtered)
  const veiculosTimeline = useMemo(() => buildTimeline(veiculos || [], "created_at" as any), [veiculos]);
  const pneusTimeline = useMemo(() => buildTimeline(pneus || [], "created_at" as any), [pneus]);
  const alertasTimeline = useMemo(() => buildTimeline(alertas || [], "created_at" as any), [alertas]);
  const recapagensTimeline = useMemo(() => buildTimeline(recapagens || [], "created_at" as any), [recapagens]);
  const movTimeline = useMemo(() => buildTimeline(movimentacoes || [], "data_movimentacao" as any), [movimentacoes]);
  const manutencoesTimeline = useMemo(() => buildTimeline(manutencoes || [], "created_at" as any), [manutencoes]);
  const combustivelTimeline = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      buckets[format(startOfMonth(d), "MMM/yy", { locale: ptBR })] = 0;
    }
    const cutoff = startOfMonth(subMonths(now, 5));
    (combustivel || []).forEach(c => {
      const val = c.data_abastecimento;
      if (!val) return;
      const d = new Date(val);
      if (isBefore(d, cutoff)) return;
      const key = format(startOfMonth(d), "MMM/yy", { locale: ptBR });
      if (key in buckets) buckets[key] += Number(c.valor_total_pago || 0);
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [combustivel]);
  const custoTimeline = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      buckets[format(startOfMonth(d), "MMM/yy", { locale: ptBR })] = 0;
    }
    const cutoff = startOfMonth(subMonths(now, 5));
    (pneus || []).forEach(p => {
      const val = p.data_aquisicao || p.created_at;
      if (!val) return;
      const d = new Date(val);
      if (isBefore(d, cutoff)) return;
      const key = format(startOfMonth(d), "MMM/yy", { locale: ptBR });
      if (key in buckets) buckets[key] += Number(p.custo_aquisicao || 0);
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [pneus]);

  const statusDistribution = [
    { name: "Em operação", value: emOperacao },
    { name: "Em estoque", value: emEstoque },
    { name: "Recapagem", value: emRecapagem },
    { name: "Sucata", value: sucateados },
  ].filter(d => d.value > 0);

  

  // --- Derived data for detail dialogs ---
  const veiculosPorTipo = fVeiculos.reduce((acc, v) => { acc[v.tipo_veiculo || "Outros"] = (acc[v.tipo_veiculo || "Outros"] || 0) + 1; return acc; }, {} as Record<string, number>);
  const veiculosTipoData = Object.entries(veiculosPorTipo).map(([name, value]) => ({ name, value }));

  const veiculosPorStatus = fVeiculos.reduce((acc, v) => { const s = v.status || "ativo"; acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<string, number>);
  const veiculosStatusData = Object.entries(veiculosPorStatus).map(([name, value]) => ({ name, value }));

  const pneusPorMarca = fPneus.reduce((acc, p) => { const m = p.marca || "Outros"; acc[m] = (acc[m] || 0) + 1; return acc; }, {} as Record<string, number>);
  const pneusMarcaData = Object.entries(pneusPorMarca).map(([name, value]) => ({ name, value }));

  const pneusOperacaoPorVeiculo = fPneus.filter(p => p.localizacao === "veiculo").reduce((acc, p) => {
    const vid = p.veiculo_id || "Sem veículo";
    const placa = veiculos?.find(v => v.id === vid)?.placa || vid;
    acc[placa] = (acc[placa] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const operacaoData = Object.entries(pneusOperacaoPorVeiculo).map(([name, value]) => ({ name, value }));

  const alertasPorGravidade = fAlertas.reduce((acc, a) => { acc[a.gravidade || "informativo"] = (acc[a.gravidade || "informativo"] || 0) + 1; return acc; }, {} as Record<string, number>);
  const alertasGravData = Object.entries(alertasPorGravidade).map(([name, value]) => ({ name, value }));

  const alertasPorTipo = fAlertas.reduce((acc, a) => { acc[a.tipo_alerta] = (acc[a.tipo_alerta] || 0) + 1; return acc; }, {} as Record<string, number>);
  const alertasTipoData = Object.entries(alertasPorTipo).map(([name, value]) => ({ name, value }));

  const custoPorMarca = fPneus.reduce((acc, p) => { const m = p.marca || "Outros"; acc[m] = (acc[m] || 0) + Number(p.custo_acumulado || p.custo_aquisicao || 0); return acc; }, {} as Record<string, number>);
  const custoMarcaData = Object.entries(custoPorMarca).map(([name, value]) => ({ name, value: Math.round(value) }));

  const recapagensPorStatus = fRecapagens.reduce((acc, r) => { acc[r.status || "aguardando"] = (acc[r.status || "aguardando"] || 0) + 1; return acc; }, {} as Record<string, number>);
  const recapStatusData = Object.entries(recapagensPorStatus).map(([name, value]) => ({ name, value }));

  const gravColorMap: Record<string, string> = {
    critico: "hsl(0,84%,60%)",
    alto: "hsl(25,95%,53%)",
    medio: "hsl(38,92%,50%)",
    baixo: "hsl(142,76%,36%)",
    informativo: "hsl(239,84%,67%)",
  };

  const renderDetailContent = () => {
    switch (openDetail) {
      case "veiculos":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total</span><p className="text-xl font-bold">{fVeiculos.length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Ativos</span><p className="text-xl font-bold">{veiculosPorStatus["ativo"] || 0}</p></div>
            </div>
            <TimelineChart data={veiculosTimeline} label="Evolução — Cadastros de Veículos (6 meses)" />
            {veiculosTipoData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Por Tipo de Veículo</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={veiculosTipoData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" className="text-xs" /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {veiculosStatusData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Por Status</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={veiculosStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{veiculosStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <DetailTable headers={["Placa", "Tipo", "Marca", "Status", "Cadastro"]} rows={fVeiculos.slice(0, 20).map(v => [v.placa, v.tipo_veiculo || "-", v.marca || "-", v.status || "-", format(new Date(v.created_at), "dd/MM/yyyy")])} />
          </div>
        );

      case "pneus":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total</span><p className="text-xl font-bold">{fPneus.length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Marcas</span><p className="text-xl font-bold">{Object.keys(pneusPorMarca).length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Vida média</span><p className="text-xl font-bold">{fPneus.length ? (fPneus.reduce((a, p) => a + (p.vida_atual || 1), 0) / fPneus.length).toFixed(1) : 0}</p></div>
            </div>
            <TimelineChart data={pneusTimeline} label="Evolução — Cadastros de Pneus (6 meses)" />
            {pneusMarcaData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Distribuição por Marca</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pneusMarcaData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" className="text-xs" /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {statusDistribution.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Status dos Pneus</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{statusDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <PredictiveInsights pneus={fPneus} recapagens={fRecapagens} />
            <DetailTable headers={["ID Único", "Marca", "Medida", "Localização", "Sulco"]} rows={fPneus.slice(0, 20).map(p => [p.id_unico, p.marca, p.medida || "-", p.localizacao, `${p.sulco_atual || "-"} mm`])} />
          </div>
        );

      case "operacao":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Em Operação</span><p className="text-xl font-bold">{fPneus.filter(p => p.localizacao === "veiculo").length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Veículos c/ pneus</span><p className="text-xl font-bold">{Object.keys(pneusOperacaoPorVeiculo).length}</p></div>
            </div>
            <TimelineChart data={movTimeline} label="Evolução — Movimentações (6 meses)" color="hsl(142,76%,36%)" />
            {operacaoData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Pneus por Veículo</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operacaoData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" className="text-xs" angle={-30} textAnchor="end" height={60} /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(142,76%,36%)" radius={[4,4,0,0]} /></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <PredictiveInsights pneus={fPneus.filter(p => p.localizacao === "veiculo")} recapagens={fRecapagens} />
            <DetailTable headers={["Pneu", "Marca", "Veículo", "Posição", "Sulco"]} rows={fPneus.filter(p => p.localizacao === "veiculo").slice(0, 20).map(p => {
              const placa = veiculos?.find(v => v.id === p.veiculo_id)?.placa || "-";
              return [p.id_unico, p.marca, placa, p.posicao_atual || "-", `${p.sulco_atual || "-"} mm`];
            })} />
          </div>
        );

      case "estoque":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Em Estoque</span><p className="text-xl font-bold">{fPneus.filter(p => p.localizacao === "estoque").length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Valor em estoque</span><p className="text-xl font-bold">R$ {fPneus.filter(p => p.localizacao === "estoque").reduce((a, p) => a + Number(p.custo_aquisicao || 0), 0).toLocaleString("pt-BR")}</p></div>
            </div>
            <TimelineChart data={pneusTimeline} label="Evolução — Entradas em Estoque (6 meses)" color="hsl(38,92%,50%)" />
            {(() => {
              const estoqueMarca = fPneus.filter(p => p.localizacao === "estoque").reduce((acc, p) => {
                acc[p.marca || "Outros"] = (acc[p.marca || "Outros"] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const data = Object.entries(estoqueMarca).map(([name, value]) => ({ name, value }));
              return data.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Estoque por Marca</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null;
            })()}
            <DetailTable headers={["Pneu", "Marca", "Medida", "Sulco", "Custo"]} rows={fPneus.filter(p => p.localizacao === "estoque").slice(0, 20).map(p => [p.id_unico, p.marca, p.medida || "-", `${p.sulco_atual || "-"} mm`, `R$ ${Number(p.custo_aquisicao || 0).toLocaleString("pt-BR")}`])} />
          </div>
        );

      case "recapagem":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Em Recapagem</span><p className="text-xl font-bold">{fPneus.filter(p => p.status === "em_recapagem" || p.status === "aguardando_recapagem").length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total Recapagens</span><p className="text-xl font-bold">{fRecapagens.length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Retornados</span><p className="text-xl font-bold">{fRecapagens.filter(r => r.status === "retornado").length}</p></div>
            </div>
            <TimelineChart data={recapagensTimeline} label="Evolução — Recapagens (6 meses)" color="hsl(280,60%,50%)" />
            {recapStatusData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Recapagens por Status</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={recapStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{recapStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <PredictiveInsights pneus={fPneus} recapagens={fRecapagens} />
            <DetailTable headers={["Pneu", "Status", "Ciclo", "Envio", "Custo"]} rows={fRecapagens.slice(0, 20).map(r => {
              const pneu = pneus?.find(p => p.id === r.pneu_id);
              return [pneu?.id_unico || "-", r.status || "-", String(r.numero_ciclo || 1), r.data_envio ? format(new Date(r.data_envio), "dd/MM/yyyy") : "-", `R$ ${Number(r.custo_recapagem || 0).toLocaleString("pt-BR")}`];
            })} />
          </div>
        );

      case "sucata":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Sucateados</span><p className="text-xl font-bold">{fPneus.filter(p => p.status === "sucata").length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">% do total</span><p className="text-xl font-bold">{fPneus.length ? ((fPneus.filter(p => p.status === "sucata").length / fPneus.length) * 100).toFixed(1) : 0}%</p></div>
            </div>
            <TimelineChart data={manutencoesTimeline} label="Evolução — Manutenções/Descartes (6 meses)" color="hsl(0,84%,60%)" />
            <PredictiveInsights pneus={fPneus} recapagens={fRecapagens} />
            <DetailTable headers={["Pneu", "Marca", "Medida", "Vida", "Recapagens"]} rows={fPneus.filter(p => p.status === "sucata").slice(0, 20).map(p => [p.id_unico, p.marca, p.medida || "-", String(p.vida_atual || 1), String(p.qtd_recapagens || 0)])} />
          </div>
        );

      case "alertas":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total Ativos</span><p className="text-xl font-bold">{fAlertas.length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Críticos</span><p className="text-xl font-bold text-destructive">{fAlertas.filter(a => a.gravidade === "critico").length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Tipos</span><p className="text-xl font-bold">{Object.keys(alertasPorTipo).length}</p></div>
            </div>
            <TimelineChart data={alertasTimeline} label="Evolução — Alertas Gerados (6 meses)" color="hsl(0,84%,60%)" />
            {alertasGravData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Por Gravidade</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={alertasGravData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" radius={[4,4,0,0]}>{alertasGravData.map((d, i) => <Cell key={i} fill={gravColorMap[d.name] || COLORS[i % COLORS.length]} />)}</Bar></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {alertasTipoData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Por Tipo de Alerta</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={alertasTipoData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{alertasTipoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <DetailTable headers={["Tipo", "Gravidade", "Mensagem", "Data"]} rows={fAlertas.slice(0, 20).map(a => [a.tipo_alerta, a.gravidade || "-", a.mensagem.substring(0, 50), format(new Date(a.created_at), "dd/MM/yyyy HH:mm")])} />
          </div>
        );

      case "custo":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Custo Total</span><p className="text-xl font-bold">R$ {fPneus.reduce((a, p) => a + Number(p.custo_acumulado || p.custo_aquisicao || 0), 0).toLocaleString("pt-BR")}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Custo Médio/Pneu</span><p className="text-xl font-bold">R$ {fPneus.length ? Math.round(fPneus.reduce((a, p) => a + Number(p.custo_acumulado || p.custo_aquisicao || 0), 0) / fPneus.length).toLocaleString("pt-BR") : 0}</p></div>
            </div>
            <TimelineChart data={custoTimeline} label="Evolução — Investimento Mensal (6 meses)" color="hsl(239,84%,67%)" />
            {custoMarcaData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Custo por Marca</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={custoMarcaData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {(() => {
              const econ = (fRecapagens.filter(r => r.status === "retornado").length) * 1800;
              return econ > 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <TrendingDown className="h-8 w-8 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Economia estimada com recapagem</p>
                    <p className="text-2xl font-bold text-success">R$ {econ.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              ) : null;
            })()}
            <PredictiveInsights pneus={fPneus} recapagens={fRecapagens} />
            <DetailTable headers={["Pneu", "Marca", "Aquisição", "Acumulado", "Data"]} rows={fPneus.slice(0, 20).map(p => [p.id_unico, p.marca, `R$ ${Number(p.custo_aquisicao || 0).toLocaleString("pt-BR")}`, `R$ ${Number(p.custo_acumulado || 0).toLocaleString("pt-BR")}`, p.data_aquisicao ? format(new Date(p.data_aquisicao), "dd/MM/yyyy") : "-"])} />
          </div>
        );

      case "combustivel": {
        const fuelByType = fCombustivel.reduce((acc, c) => {
          const t = c.tipo_combustivel || "Diesel S10";
          if (!acc[t]) acc[t] = { litros: 0, gasto: 0, count: 0 };
          acc[t].litros += Number(c.litros_abastecidos || 0);
          acc[t].gasto += Number(c.valor_total_pago || 0);
          acc[t].count++;
          return acc;
        }, {} as Record<string, { litros: number; gasto: number; count: number }>);
        const fuelTypeData = Object.entries(fuelByType).map(([name, v]) => ({ name, litros: Math.round(v.litros), gasto: Math.round(v.gasto), count: v.count }));

        const fTotalLitros = fCombustivel.reduce((a, c) => a + Number(c.litros_abastecidos || 0), 0);
        const fTotalGasto = fCombustivel.reduce((a, c) => a + Number(c.valor_total_pago || 0), 0);
        const fAvgConsumo = fCombustivel.filter(c => c.consumo_km_por_litro && c.consumo_km_por_litro > 0);
        const fMediaKmL = fAvgConsumo.length > 0 ? fAvgConsumo.reduce((a, c) => a + Number(c.consumo_km_por_litro), 0) / fAvgConsumo.length : 0;
        const fAvgPrecoLitro = fCombustivel.length > 0 ? fCombustivel.reduce((a, c) => a + Number(c.preco_litro || 0), 0) / fCombustivel.length : 0;
        const fTotalKm = fCombustivel.reduce((a, c) => a + Number(c.km_rodado || 0), 0);
        const fCustoKm = fTotalKm > 0 ? fTotalGasto / fTotalKm : 0;

        // Efficiency by vehicle
        const byVehicle = fCombustivel.reduce((acc, c) => {
          const vid = c.veiculo_id;
          const placa = veiculos?.find(v => v.id === vid)?.placa || vid;
          if (!acc[placa]) acc[placa] = { litros: 0, km: 0, gasto: 0 };
          acc[placa].litros += Number(c.litros_abastecidos || 0);
          acc[placa].km += Number(c.km_rodado || 0);
          acc[placa].gasto += Number(c.valor_total_pago || 0);
          return acc;
        }, {} as Record<string, { litros: number; km: number; gasto: number }>);
        const vehicleEffData = Object.entries(byVehicle).map(([name, v]) => ({
          name,
          kmPorLitro: v.litros > 0 ? Number((v.km / v.litros).toFixed(2)) : 0,
          custoPorKm: v.km > 0 ? Number((v.gasto / v.km).toFixed(2)) : 0,
        }));

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Abastecimentos</span><p className="text-xl font-bold">{fCombustivel.length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total Litros</span><p className="text-xl font-bold">{fTotalLitros.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Gasto Total</span><p className="text-xl font-bold">R$ {fTotalGasto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Média km/L</span><p className="text-xl font-bold">{fMediaKmL > 0 ? fMediaKmL.toFixed(2) : "—"}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Preço Médio/L</span><p className="text-xl font-bold">R$ {fAvgPrecoLitro > 0 ? fAvgPrecoLitro.toFixed(2) : "—"}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Custo/km</span><p className="text-xl font-bold">R$ {fCustoKm > 0 ? fCustoKm.toFixed(2) : "—"}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">KM Rodados</span><p className="text-xl font-bold">{fTotalKm.toLocaleString("pt-BR")}</p></div>
            </div>

            <TimelineChart data={combustivelTimeline} label="Evolução — Gasto com Combustível (6 meses)" color="hsl(38,92%,50%)" />

            {fuelTypeData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Consumo por Tipo de Combustível</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fuelTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis />
                      <Tooltip formatter={(v: number, name: string) => [name === "litros" ? `${v} L` : name === "gasto" ? `R$ ${v.toLocaleString("pt-BR")}` : v, name === "litros" ? "Litros" : name === "gasto" ? "Gasto" : "Abastecimentos"]} />
                      <Bar dataKey="litros" fill="hsl(239,84%,67%)" radius={[4,4,0,0]} name="Litros" />
                      <Bar dataKey="gasto" fill="hsl(38,92%,50%)" radius={[4,4,0,0]} name="Gasto" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {vehicleEffData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Eficiência por Veículo (km/L)</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vehicleEffData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" angle={-20} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip formatter={(v: number, name: string) => [name === "kmPorLitro" ? `${v} km/L` : `R$ ${v}/km`, name === "kmPorLitro" ? "km/L" : "Custo/km"]} />
                      <Bar dataKey="kmPorLitro" fill="hsl(142,76%,36%)" radius={[4,4,0,0]} name="km/L" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <DetailTable
              headers={["Data", "Veículo", "Combustível", "Litros", "KM", "Preço/L", "Total", "km/L"]}
              rows={fCombustivel.slice(0, 30).map(c => {
                const placa = veiculos?.find(v => v.id === c.veiculo_id)?.placa || "-";
                return [
                  format(new Date(c.data_abastecimento), "dd/MM/yyyy"),
                  placa,
                  c.tipo_combustivel || "-",
                  `${Number(c.litros_abastecidos).toFixed(1)} L`,
                  c.km_atual?.toLocaleString("pt-BR") || "-",
                  c.preco_litro ? `R$ ${Number(c.preco_litro).toFixed(2)}` : "-",
                  `R$ ${Number(c.valor_total_pago).toFixed(2)}`,
                  c.consumo_km_por_litro ? `${Number(c.consumo_km_por_litro).toFixed(2)}` : "—",
                ];
              })}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  const detailTitles: Record<string, string> = {
    veiculos: "Detalhes — Veículos",
    pneus: "Detalhes — Pneus Cadastrados",
    operacao: "Detalhes — Em Operação",
    estoque: "Detalhes — Estoque",
    recapagem: "Detalhes — Recapagem",
    sucata: "Detalhes — Sucateados",
    alertas: "Detalhes — Alertas Críticos",
    custo: "Detalhes — Custo Acumulado",
    combustivel: "Detalhes — Combustível",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const hasData = totalVeiculos > 0 || totalPneus > 0 || totalAbastecimentos > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <EmptyState
          icon={BarChart3}
          title="Bem-vindo à Rastro"
          description="Comece cadastrando sua frota e seus pneus. Após o cadastro, seu dashboard será automaticamente preenchido com métricas e análises em tempo real."
          actionLabel="Cadastrar Veículo"
          onAction={() => window.location.href = "/frota"}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center">
              <Truck className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">1. Cadastre sua Frota</p>
              <p className="text-sm text-muted-foreground mt-1">Adicione seus veículos com tipo e placa</p>
            </CardContent>
          </Card>
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center">
              <Circle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">2. Cadastre seus Pneus</p>
              <p className="text-sm text-muted-foreground mt-1">Cada pneu recebe um QR Code único</p>
            </CardContent>
          </Card>
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">3. Acompanhe Aqui</p>
              <p className="text-sm text-muted-foreground mt-1">KPIs, alertas e economia em tempo real</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-muted-foreground -mt-4">Clique em qualquer card para ver o relatório detalhado</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Veículos" value={totalVeiculos} icon={Truck} color="bg-primary" onClick={() => setOpenDetail("veiculos")} />
        <StatCard title="Pneus Cadastrados" value={totalPneus} icon={Circle} color="bg-primary" onClick={() => setOpenDetail("pneus")} />
        <StatCard title="Em Operação" value={emOperacao} icon={Circle} color="bg-success" onClick={() => setOpenDetail("operacao")} />
        <StatCard title="Em Estoque" value={emEstoque} icon={Package} color="bg-muted" onClick={() => setOpenDetail("estoque")} />
        <StatCard title="Em Recapagem" value={emRecapagem} icon={RefreshCw} color="bg-warning" onClick={() => setOpenDetail("recapagem")} />
        <StatCard title="Sucateados" value={sucateados} icon={Circle} color="bg-destructive" onClick={() => setOpenDetail("sucata")} />
        <StatCard title="Alertas Críticos" value={alertasCriticos} icon={Bell} color="bg-destructive" onClick={() => setOpenDetail("alertas")} />
        <StatCard title="Custo Acumulado" value={`R$ ${custoTotal.toLocaleString("pt-BR")}`} icon={DollarSign} color="bg-primary" onClick={() => setOpenDetail("custo")} />
      </div>

      {/* Fuel Section */}
      <h2 className="text-lg font-semibold mt-2">Combustível</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Abastecimentos" value={totalAbastecimentos} icon={Fuel} color="bg-warning" onClick={() => setOpenDetail("combustivel")} />
        <StatCard title="Total Litros" value={`${totalLitros.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L`} icon={Droplets} color="bg-primary" onClick={() => setOpenDetail("combustivel")} />
        <StatCard title="Gasto Total" value={`R$ ${totalGastoCombustivel.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={DollarSign} color="bg-destructive" onClick={() => setOpenDetail("combustivel")} />
        <StatCard title="Média km/L" value={mediaKmPorLitro > 0 ? mediaKmPorLitro.toFixed(2) : "—"} icon={TrendingUp} color="bg-success" onClick={() => setOpenDetail("combustivel")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {statusDistribution.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição de Pneus</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        {economiaRecapagem > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Economia com Recapagem</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <TrendingDown className="h-12 w-12 text-success mb-4" />
              <p className="text-4xl font-bold text-success">R$ {economiaRecapagem.toLocaleString("pt-BR")}</p>
              <p className="text-sm text-muted-foreground mt-2">Estimativa vs. compra de pneus novos</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={openDetail !== null} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openDetail ? detailTitles[openDetail] : ""}</DialogTitle>
            <p className="text-xs text-muted-foreground">Atualizado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </DialogHeader>
          <DateFilterBar filter={dateFilter} setFilter={setDateFilter} dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />
          {renderDetailContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead><tr className="bg-muted">{headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-t">{row.map((cell, j) => <td key={j} className="px-3 py-2">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
