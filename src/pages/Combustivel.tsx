import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Fuel, TrendingUp, DollarSign, AlertTriangle, Plus, Trash2, RefreshCw, Gauge } from "lucide-react";
import { RetroactiveDatePicker } from "@/components/RetroactiveDatePicker";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface Cliente {
  id: string;
  nome: string;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string | null;
  cliente_id: string;
}

interface AbastecimentoForm {
  cliente_id: string;
  veiculo_id: string;
  data_abastecimento: string;
  km_atual: string;
  km_anterior: string;
  litros_abastecidos: string;
  valor_total_pago: string;
  tipo_combustivel: string;
  posto: string;
  observacoes: string;
}

interface Abastecimento {
  id: string;
  cliente_id: string;
  veiculo_id: string;
  data_abastecimento: string;
  km_atual: number;
  km_anterior: number | null;
  km_rodado: number | null;
  litros_abastecidos: number;
  valor_total_pago: number;
  preco_litro: number | null;
  consumo_km_por_litro: number | null;
  custo_por_km: number | null;
  tipo_combustivel: string;
  posto: string | null;
  observacoes: string | null;
  status_eficiencia: string | null;
  created_at: string;
}

const Combustivel = () => {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCliente, setFilterCliente] = useState("");

  const [form, setForm] = useState<AbastecimentoForm>({
    cliente_id: "",
    veiculo_id: "",
    data_abastecimento: new Date().toISOString().split("T")[0],
    km_atual: "",
    km_anterior: "",
    litros_abastecidos: "",
    valor_total_pago: "",
    tipo_combustivel: "Diesel S10",
    posto: "",
    observacoes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientesRes, veiculosRes, abastecimentosRes] = await Promise.all([
        supabase.from("clientes").select("*").order("nome"),
        supabase.from("veiculos").select("*").order("placa"),
        supabase.from("coleta_manual_combustivel").select("*").order("data_abastecimento", { ascending: false }),
      ]);

      if (clientesRes.data) setClientes(clientesRes.data);
      if (veiculosRes.data) setVeiculos(veiculosRes.data);
      if (abastecimentosRes.data) setAbastecimentos(abastecimentosRes.data as Abastecimento[]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter veiculos by selected cliente
  const filteredVeiculos = useMemo(() => {
    if (!form.cliente_id) return [];
    return veiculos.filter((v) => v.cliente_id === form.cliente_id);
  }, [veiculos, form.cliente_id]);

  // Get last km for selected vehicle
  useEffect(() => {
    if (form.veiculo_id) {
      const veiculoAbastecimentos = abastecimentos
        .filter((a) => a.veiculo_id === form.veiculo_id)
        .sort((a, b) => new Date(b.data_abastecimento).getTime() - new Date(a.data_abastecimento).getTime());
      
      if (veiculoAbastecimentos.length > 0) {
        setForm((prev) => ({
          ...prev,
          km_anterior: veiculoAbastecimentos[0].km_atual.toString(),
        }));
      } else {
        setForm((prev) => ({ ...prev, km_anterior: "" }));
      }
    }
  }, [form.veiculo_id, abastecimentos]);

  // Classify efficiency based on km/l
  const classifyEfficiency = (consumo: number): { status: string; color: string } => {
    if (consumo >= 2.6) return { status: "Excelente", color: "bg-green-500" };
    if (consumo >= 2.2) return { status: "Bom", color: "bg-yellow-500" };
    if (consumo >= 1.8) return { status: "Atenção", color: "bg-orange-500" };
    return { status: "Crítico", color: "bg-red-500" };
  };

  // Validate form
  const validateForm = (): { valid: boolean; message: string } => {
    const kmAtual = parseFloat(form.km_atual);
    const kmAnterior = parseFloat(form.km_anterior) || 0;
    const litros = parseFloat(form.litros_abastecidos);
    const valor = parseFloat(form.valor_total_pago);

    if (!form.km_atual || isNaN(kmAtual)) {
      return { valid: false, message: "Km Atual deve ser preenchido." };
    }
    if (form.km_anterior && kmAtual <= kmAnterior) {
      return { valid: false, message: "Km Atual deve ser maior que Km Anterior." };
    }
    if (!form.litros_abastecidos || litros <= 0) {
      return { valid: false, message: "Litros Abastecidos deve ser maior que 0." };
    }
    if (!form.valor_total_pago || valor <= 0) {
      return { valid: false, message: "Valor Total Pago deve ser maior que 0." };
    }
    if (!form.cliente_id || !form.veiculo_id) {
      return { valid: false, message: "Cliente e Veículo são obrigatórios." };
    }

    return { valid: true, message: "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.valid) {
      toast({
        title: "Dados inválidos",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    const kmAtual = parseFloat(form.km_atual);
    const kmAnterior = parseFloat(form.km_anterior) || 0;
    const litros = parseFloat(form.litros_abastecidos);
    const valor = parseFloat(form.valor_total_pago);

    // Calculations
    const kmRodado = kmAnterior > 0 ? kmAtual - kmAnterior : 0;
    const precoLitro = valor / litros;
    const consumoKmPorLitro = kmRodado > 0 ? kmRodado / litros : 0;
    const custoPorKm = kmRodado > 0 ? valor / kmRodado : 0;
    const efficiency = consumoKmPorLitro > 0 ? classifyEfficiency(consumoKmPorLitro) : { status: "Sem dados", color: "" };

    try {
      const { error } = await supabase.from("coleta_manual_combustivel").insert({
        cliente_id: form.cliente_id,
        veiculo_id: form.veiculo_id,
        data_abastecimento: form.data_abastecimento,
        km_atual: kmAtual,
        km_anterior: kmAnterior > 0 ? kmAnterior : null,
        km_rodado: kmRodado > 0 ? kmRodado : null,
        litros_abastecidos: litros,
        valor_total_pago: valor,
        preco_litro: precoLitro,
        consumo_km_por_litro: consumoKmPorLitro > 0 ? consumoKmPorLitro : null,
        custo_por_km: custoPorKm > 0 ? custoPorKm : null,
        tipo_combustivel: form.tipo_combustivel,
        posto: form.posto || null,
        observacoes: form.observacoes || null,
        status_eficiencia: efficiency.status,
      });

      if (error) throw error;

      toast({
        title: "Abastecimento salvo!",
        description: `Consumo: ${consumoKmPorLitro.toFixed(2)} km/l - ${efficiency.status}`,
      });

      // Reset form
      setForm({
        cliente_id: "",
        veiculo_id: "",
        data_abastecimento: new Date().toISOString().split("T")[0],
        km_atual: "",
        km_anterior: "",
        litros_abastecidos: "",
        valor_total_pago: "",
        tipo_combustivel: "Diesel S10",
        posto: "",
        observacoes: "",
      });

      fetchData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o abastecimento.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("coleta_manual_combustivel").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Registro excluído com sucesso!" });
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  // Dashboard calculations
  const dashboardData = useMemo(() => {
    const filtered = filterCliente
      ? abastecimentos.filter((a) => a.cliente_id === filterCliente)
      : abastecimentos;

    const withConsumo = filtered.filter((a) => a.consumo_km_por_litro && a.consumo_km_por_litro > 0);
    const avgConsumo = withConsumo.length > 0
      ? withConsumo.reduce((sum, a) => sum + (a.consumo_km_por_litro || 0), 0) / withConsumo.length
      : 0;

    const withCusto = filtered.filter((a) => a.custo_por_km && a.custo_por_km > 0);
    const avgCustoPorKm = withCusto.length > 0
      ? withCusto.reduce((sum, a) => sum + (a.custo_por_km || 0), 0) / withCusto.length
      : 0;

    const totalGasto = filtered.reduce((sum, a) => sum + (a.valor_total_pago || 0), 0);
    const totalLitros = filtered.reduce((sum, a) => sum + (a.litros_abastecidos || 0), 0);

    // Status distribution
    const statusCount = {
      Excelente: filtered.filter((a) => a.status_eficiencia === "Excelente").length,
      Bom: filtered.filter((a) => a.status_eficiencia === "Bom").length,
      Atenção: filtered.filter((a) => a.status_eficiencia === "Atenção").length,
      Crítico: filtered.filter((a) => a.status_eficiencia === "Crítico").length,
    };

    // Vehicle ranking
    const veiculoStats: Record<string, { litros: number; km: number; valor: number }> = {};
    filtered.forEach((a) => {
      if (!veiculoStats[a.veiculo_id]) {
        veiculoStats[a.veiculo_id] = { litros: 0, km: 0, valor: 0 };
      }
      veiculoStats[a.veiculo_id].litros += a.litros_abastecidos || 0;
      veiculoStats[a.veiculo_id].km += a.km_rodado || 0;
      veiculoStats[a.veiculo_id].valor += a.valor_total_pago || 0;
    });

    const ranking = Object.entries(veiculoStats)
      .map(([veiculoId, stats]) => {
        const veiculo = veiculos.find((v) => v.id === veiculoId);
        const consumo = stats.km > 0 ? stats.km / stats.litros : 0;
        return {
          placa: veiculo?.placa || "N/A",
          consumo,
          custoTotal: stats.valor,
        };
      })
      .sort((a, b) => b.consumo - a.consumo)
      .slice(0, 5);

    // Alerts
    const alerts: string[] = [];
    filtered.forEach((a) => {
      const veiculo = veiculos.find((v) => v.id === a.veiculo_id);
      if (a.consumo_km_por_litro && a.consumo_km_por_litro < 1.8) {
        alerts.push(`${veiculo?.placa || "Veículo"}: Consumo crítico (${a.consumo_km_por_litro.toFixed(2)} km/l)`);
      }
      if (a.custo_por_km && avgCustoPorKm > 0 && a.custo_por_km > avgCustoPorKm * 1.15) {
        alerts.push(`${veiculo?.placa || "Veículo"}: Custo/km acima da média da frota`);
      }
    });

    return { avgConsumo, avgCustoPorKm, totalGasto, totalLitros, statusCount, ranking, alerts: alerts.slice(0, 5), filtered };
  }, [abastecimentos, filterCliente, veiculos]);

  const pieData = [
    { name: "Excelente", value: dashboardData.statusCount.Excelente, color: "#22c55e" },
    { name: "Bom", value: dashboardData.statusCount.Bom, color: "#eab308" },
    { name: "Atenção", value: dashboardData.statusCount.Atenção, color: "#f97316" },
    { name: "Crítico", value: dashboardData.statusCount.Crítico, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const getClienteName = (id: string) => clientes.find((c) => c.id === id)?.nome || "N/A";
  const getVeiculoPlaca = (id: string) => veiculos.find((v) => v.id === id)?.placa || "N/A";
  const getEfficiencyBadge = (status: string | null) => {
    const colors: Record<string, string> = {
      Excelente: "bg-green-500",
      Bom: "bg-yellow-500",
      Atenção: "bg-orange-500",
      Crítico: "bg-red-500",
    };
    return <Badge className={colors[status || ""] || "bg-gray-500"}>{status || "N/A"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle Manual de Combustível</h1>
          <p className="text-muted-foreground">
            Registre abastecimentos e monitore consumo da frota
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Dashboard KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Consumo Médio</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.avgConsumo.toFixed(2)} km/l</div>
            <p className="text-xs text-muted-foreground">Média da frota</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Médio/Km</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {dashboardData.avgCustoPorKm.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Por quilômetro</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {dashboardData.totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{dashboardData.totalLitros.toFixed(0)} litros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abastecimentos</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.filtered.length}</div>
            <p className="text-xs text-muted-foreground">Registros no período</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {dashboardData.alerts.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alertas Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {dashboardData.alerts.map((alert, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {alert}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Abastecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={form.cliente_id}
                    onValueChange={(value) => setForm({ ...form, cliente_id: value, veiculo_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.filter(c => c.id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Veículo (Placa) *</Label>
                  <Select
                    value={form.veiculo_id}
                    onValueChange={(value) => setForm({ ...form, veiculo_id: value })}
                    disabled={!form.cliente_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredVeiculos.filter(v => v.id).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} {v.modelo && `- ${v.modelo}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <RetroactiveDatePicker
                  date={form.data_abastecimento ? new Date(form.data_abastecimento + "T12:00:00") : new Date()}
                  onDateChange={(d) => setForm({ ...form, data_abastecimento: format(d, "yyyy-MM-dd") })}
                  label="Data do Abastecimento *"
                />

                <div className="space-y-2">
                  <Label>Tipo de Combustível</Label>
                  <Select
                    value={form.tipo_combustivel}
                    onValueChange={(value) => setForm({ ...form, tipo_combustivel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diesel S10">Diesel S10</SelectItem>
                      <SelectItem value="Diesel S500">Diesel S500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Km Atual (Hodômetro) *</Label>
                  <Input
                    type="number"
                    value={form.km_atual}
                    onChange={(e) => setForm({ ...form, km_atual: e.target.value })}
                    placeholder="Ex: 150000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Km Anterior</Label>
                  <Input
                    type="number"
                    value={form.km_anterior}
                    onChange={(e) => setForm({ ...form, km_anterior: e.target.value })}
                    placeholder="Preenchido automaticamente"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Litros Abastecidos *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.litros_abastecidos}
                    onChange={(e) => setForm({ ...form, litros_abastecidos: e.target.value })}
                    placeholder="Ex: 250"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Total Pago (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor_total_pago}
                    onChange={(e) => setForm({ ...form, valor_total_pago: e.target.value })}
                    placeholder="Ex: 1500.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Posto (Opcional)</Label>
                  <Input
                    value={form.posto}
                    onChange={(e) => setForm({ ...form, posto: e.target.value })}
                    placeholder="Nome do posto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full">
                <Fuel className="h-4 w-4 mr-2" />
                Salvar Abastecimento
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Distribuição por Eficiência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ranking de Veículos (Consumo km/l)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {dashboardData.ranking.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.ranking} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="placa" type="category" width={80} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)} km/l`} />
                      <Bar dataKey="consumo" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Abastecimentos</CardTitle>
            <Select
              value={filterCliente || "all"}
              onValueChange={(value) => setFilterCliente(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clientes.filter(c => c.id).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Km Rodado</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead>Custo/Km</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum abastecimento registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  dashboardData.filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.data_abastecimento).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{getClienteName(a.cliente_id)}</TableCell>
                      <TableCell className="font-medium">{getVeiculoPlaca(a.veiculo_id)}</TableCell>
                      <TableCell>{a.litros_abastecidos.toFixed(1)} L</TableCell>
                      <TableCell>R$ {a.valor_total_pago.toFixed(2)}</TableCell>
                      <TableCell>{a.km_rodado ? `${a.km_rodado.toLocaleString()} km` : "-"}</TableCell>
                      <TableCell>{a.consumo_km_por_litro ? `${a.consumo_km_por_litro.toFixed(2)} km/l` : "-"}</TableCell>
                      <TableCell>{a.custo_por_km ? `R$ ${a.custo_por_km.toFixed(2)}` : "-"}</TableCell>
                      <TableCell>{getEfficiencyBadge(a.status_eficiencia)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(a.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Technical Note */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">📝 Observação Técnica do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Consumo abaixo do esperado pode indicar excesso de carga, condução agressiva, pressão incorreta dos pneus ou rota severa.
            Verifique a correlação entre combustível e pneus nas inspeções manuais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Combustivel;
