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
import { Truck, Circle, Package, RefreshCw, Bell, DollarSign, TrendingDown, BarChart3, CalendarIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
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

const COLORS = ["hsl(239,84%,67%)", "hsl(142,76%,36%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(280,60%,50%)"];

type DetailType = "veiculos" | "pneus" | "operacao" | "estoque" | "recapagem" | "sucata" | "alertas" | "custo" | null;

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

  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Reset filter when dialog closes
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
      if (!val || typeof val !== "string") return dateFilter === "all";
      const d = new Date(val as string);
      if (start && isBefore(d, start)) return false;
      if (end && isAfter(d, end)) return false;
      return true;
    });
  };

  // Filtered datasets
  const fVeiculos = useMemo(() => filterByDate(veiculos), [veiculos, dateFilter, dateFrom, dateTo]);
  const fPneus = useMemo(() => filterByDate(pneus), [pneus, dateFilter, dateFrom, dateTo]);
  const fAlertas = useMemo(() => filterByDate(alertas), [alertas, dateFilter, dateFrom, dateTo]);
  const fRecapagens = useMemo(() => filterByDate(recapagens), [recapagens, dateFilter, dateFrom, dateTo]);
  const fMovimentacoes = useMemo(() => filterByDateField(movimentacoes, "data_movimentacao" as any), [movimentacoes, dateFilter, dateFrom, dateTo]);

  const statusDistribution = [
    { name: "Em operação", value: emOperacao },
    { name: "Em estoque", value: emEstoque },
    { name: "Recapagem", value: emRecapagem },
    { name: "Sucata", value: sucateados },
  ].filter(d => d.value > 0);

  const hasData = totalVeiculos > 0 || totalPneus > 0;

  // --- Derived data for detail dialogs (use filtered data) ---

  const veiculosPorTipo = fVeiculos.reduce((acc, v) => {
    const tipo = v.tipo_veiculo || "Outros";
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const veiculosTipoData = Object.entries(veiculosPorTipo).map(([name, value]) => ({ name, value }));

  const veiculosPorStatus = veiculos?.reduce((acc, v) => {
    const s = v.status || "ativo";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const veiculosStatusData = Object.entries(veiculosPorStatus).map(([name, value]) => ({ name, value }));

  const pneusPorMarca = pneus?.reduce((acc, p) => {
    const m = p.marca || "Outros";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const pneusMarcaData = Object.entries(pneusPorMarca).map(([name, value]) => ({ name, value }));

  const pneusOperacaoPorVeiculo = pneus?.filter(p => p.localizacao === "veiculo").reduce((acc, p) => {
    const vid = p.veiculo_id || "Sem veículo";
    const placa = veiculos?.find(v => v.id === vid)?.placa || vid;
    acc[placa] = (acc[placa] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const operacaoData = Object.entries(pneusOperacaoPorVeiculo).map(([name, value]) => ({ name, value }));

  const alertasPorGravidade = alertas?.reduce((acc, a) => {
    const g = a.gravidade || "informativo";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const alertasGravData = Object.entries(alertasPorGravidade).map(([name, value]) => ({ name, value }));

  const alertasPorTipo = alertas?.reduce((acc, a) => {
    acc[a.tipo_alerta] = (acc[a.tipo_alerta] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const alertasTipoData = Object.entries(alertasPorTipo).map(([name, value]) => ({ name, value }));

  const custoPorMarca = pneus?.reduce((acc, p) => {
    const m = p.marca || "Outros";
    acc[m] = (acc[m] || 0) + Number(p.custo_acumulado || p.custo_aquisicao || 0);
    return acc;
  }, {} as Record<string, number>) || {};
  const custoMarcaData = Object.entries(custoPorMarca).map(([name, value]) => ({ name, value: Math.round(value) }));

  const recapagensPorStatus = recapagens?.reduce((acc, r) => {
    const s = r.status || "aguardando";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const recapStatusData = Object.entries(recapagensPorStatus).map(([name, value]) => ({ name, value }));

  const movPorMes = movimentacoes?.reduce((acc, m) => {
    const month = m.data_movimentacao ? format(new Date(m.data_movimentacao), "MMM/yy", { locale: ptBR }) : "N/A";
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const movMesData = Object.entries(movPorMes).map(([name, value]) => ({ name, value }));

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
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total</span><p className="text-xl font-bold">{totalVeiculos}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Ativos</span><p className="text-xl font-bold">{veiculosPorStatus["ativo"] || 0}</p></div>
            </div>
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
            <DetailTable headers={["Placa", "Tipo", "Marca", "Status", "Cadastro"]} rows={veiculos?.slice(0, 20).map(v => [v.placa, v.tipo_veiculo || "-", v.marca || "-", v.status || "-", format(new Date(v.created_at), "dd/MM/yyyy")]) || []} />
          </div>
        );

      case "pneus":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total</span><p className="text-xl font-bold">{totalPneus}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Marcas</span><p className="text-xl font-bold">{Object.keys(pneusPorMarca).length}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Vida média</span><p className="text-xl font-bold">{pneus?.length ? (pneus.reduce((a, p) => a + (p.vida_atual || 1), 0) / pneus.length).toFixed(1) : 0}</p></div>
            </div>
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
            <DetailTable headers={["ID Único", "Marca", "Medida", "Localização", "Sulco"]} rows={pneus?.slice(0, 20).map(p => [p.id_unico, p.marca, p.medida || "-", p.localizacao, `${p.sulco_atual || "-"} mm`]) || []} />
          </div>
        );

      case "operacao":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Em Operação</span><p className="text-xl font-bold">{emOperacao}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Veículos c/ pneus</span><p className="text-xl font-bold">{Object.keys(pneusOperacaoPorVeiculo).length}</p></div>
            </div>
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
            {movMesData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Movimentações por Mês</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={movMesData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <DetailTable headers={["Pneu", "Marca", "Veículo", "Posição", "Sulco"]} rows={pneus?.filter(p => p.localizacao === "veiculo").slice(0, 20).map(p => {
              const placa = veiculos?.find(v => v.id === p.veiculo_id)?.placa || "-";
              return [p.id_unico, p.marca, placa, p.posicao_atual || "-", `${p.sulco_atual || "-"} mm`];
            }) || []} />
          </div>
        );

      case "estoque":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Em Estoque</span><p className="text-xl font-bold">{emEstoque}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Valor em estoque</span><p className="text-xl font-bold">R$ {pneus?.filter(p => p.localizacao === "estoque").reduce((a, p) => a + Number(p.custo_aquisicao || 0), 0).toLocaleString("pt-BR")}</p></div>
            </div>
            {(() => {
              const estoqueMarca = pneus?.filter(p => p.localizacao === "estoque").reduce((acc, p) => {
                const m = p.marca || "Outros";
                acc[m] = (acc[m] || 0) + 1;
                return acc;
              }, {} as Record<string, number>) || {};
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
            <DetailTable headers={["Pneu", "Marca", "Medida", "Sulco", "Custo"]} rows={pneus?.filter(p => p.localizacao === "estoque").slice(0, 20).map(p => [p.id_unico, p.marca, p.medida || "-", `${p.sulco_atual || "-"} mm`, `R$ ${Number(p.custo_aquisicao || 0).toLocaleString("pt-BR")}`]) || []} />
          </div>
        );

      case "recapagem":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Em Recapagem</span><p className="text-xl font-bold">{emRecapagem}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total Recapagens</span><p className="text-xl font-bold">{recapagens?.length || 0}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Retornados</span><p className="text-xl font-bold">{recapagens?.filter(r => r.status === "retornado").length || 0}</p></div>
            </div>
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
            <DetailTable headers={["Pneu", "Status", "Ciclo", "Envio", "Custo"]} rows={recapagens?.slice(0, 20).map(r => {
              const pneu = pneus?.find(p => p.id === r.pneu_id);
              return [pneu?.id_unico || "-", r.status || "-", String(r.numero_ciclo || 1), r.data_envio ? format(new Date(r.data_envio), "dd/MM/yyyy") : "-", `R$ ${Number(r.custo_recapagem || 0).toLocaleString("pt-BR")}`];
            }) || []} />
          </div>
        );

      case "sucata":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Sucateados</span><p className="text-xl font-bold">{sucateados}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">% do total</span><p className="text-xl font-bold">{totalPneus ? ((sucateados / totalPneus) * 100).toFixed(1) : 0}%</p></div>
            </div>
            <DetailTable headers={["Pneu", "Marca", "Medida", "Vida", "Recapagens"]} rows={pneus?.filter(p => p.status === "sucata").slice(0, 20).map(p => [p.id_unico, p.marca, p.medida || "-", String(p.vida_atual || 1), String(p.qtd_recapagens || 0)]) || []} />
          </div>
        );

      case "alertas":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Total Ativos</span><p className="text-xl font-bold">{alertas?.length || 0}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Críticos</span><p className="text-xl font-bold text-destructive">{alertasCriticos}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Tipos</span><p className="text-xl font-bold">{Object.keys(alertasPorTipo).length}</p></div>
            </div>
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
            <DetailTable headers={["Tipo", "Gravidade", "Mensagem", "Data"]} rows={alertas?.slice(0, 20).map(a => [a.tipo_alerta, a.gravidade || "-", a.mensagem.substring(0, 50), format(new Date(a.created_at), "dd/MM/yyyy HH:mm")]) || []} />
          </div>
        );

      case "custo":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Custo Total</span><p className="text-xl font-bold">R$ {custoTotal.toLocaleString("pt-BR")}</p></div>
              <div className="rounded-lg bg-muted p-3"><span className="text-muted-foreground">Custo Médio/Pneu</span><p className="text-xl font-bold">R$ {totalPneus ? Math.round(custoTotal / totalPneus).toLocaleString("pt-BR") : 0}</p></div>
            </div>
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
            {economiaRecapagem > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <TrendingDown className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Economia estimada com recapagem</p>
                  <p className="text-2xl font-bold text-success">R$ {economiaRecapagem.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            )}
            <DetailTable headers={["Pneu", "Marca", "Aquisição", "Acumulado", "Data"]} rows={pneus?.slice(0, 20).map(p => [p.id_unico, p.marca, `R$ ${Number(p.custo_aquisicao || 0).toLocaleString("pt-BR")}`, `R$ ${Number(p.custo_acumulado || 0).toLocaleString("pt-BR")}`, p.data_aquisicao ? format(new Date(p.data_aquisicao), "dd/MM/yyyy") : "-"]) || []} />
          </div>
        );

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

      <Dialog open={openDetail !== null} onOpenChange={(open) => !open && setOpenDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openDetail ? detailTitles[openDetail] : ""}</DialogTitle>
            <p className="text-xs text-muted-foreground">Atualizado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </DialogHeader>
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
