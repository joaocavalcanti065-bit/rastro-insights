import { useState, useEffect, useRef } from "react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Plus, TrendingDown, Gauge, DollarSign, AlertTriangle, Download, AlertCircle, XCircle, Fuel } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Cliente {
  id: string;
  nome: string;
  contato: string | null;
}

interface Veiculo {
  id: string;
  cliente_id: string;
  placa: string;
  modelo: string | null;
}

interface Coleta {
  id: string;
  cliente_id: string;
  veiculo_id: string;
  data_medicao: string;
  posicao_pneu: string;
  sulco_atual: number;
  sulco_anterior: number | null;
  sulco_variacao: number | null;
  pressao_atual: number;
  pressao_recomendada: number;
  pressao_diferenca: number | null;
  km_atual: number;
  km_anterior: number | null;
  km_periodo: number | null;
  km_por_mm: number | null;
  observacoes: string | null;
  clientes?: { nome: string };
  veiculos?: { placa: string };
}

const posicoesPneu = [
  "Dianteiro E",
  "Dianteiro D",
  "Traseiro 1E",
  "Traseiro 1D",
  "Traseiro 2E",
  "Traseiro 2D",
];

export default function MvpManual() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [coletas, setColetas] = useState<Coleta[]>([]);
  const [filteredVeiculos, setFilteredVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Form state
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedVeiculo, setSelectedVeiculo] = useState("");
  const [dataMedicao, setDataMedicao] = useState(new Date().toISOString().split("T")[0]);
  const [posicaoPneu, setPosicaoPneu] = useState("");
  const [sulcoAtual, setSulcoAtual] = useState("");
  const [sulcoAnterior, setSulcoAnterior] = useState("");
  const [pressaoAtual, setPressaoAtual] = useState("");
  const [pressaoRecomendada, setPressaoRecomendada] = useState("100");
  const [kmAtual, setKmAtual] = useState("");
  const [kmAnterior, setKmAnterior] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // New client/vehicle form
  const [novoCliente, setNovoCliente] = useState("");
  const [novoVeiculo, setNovoVeiculo] = useState({ placa: "", modelo: "" });

  useEffect(() => {
    fetchData();
    setupRealtime();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      setFilteredVeiculos(veiculos.filter(v => v.cliente_id === selectedCliente));
    } else {
      setFilteredVeiculos([]);
    }
  }, [selectedCliente, veiculos]);

  useEffect(() => {
    if (selectedVeiculo && posicaoPneu) {
      fetchLastMeasurement();
    }
  }, [selectedVeiculo, posicaoPneu]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('coleta-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coleta_manual_pneus' }, () => {
        fetchColetas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    await Promise.all([fetchClientes(), fetchVeiculos(), fetchColetas()]);
  };

  const fetchClientes = async () => {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    if (data) setClientes(data);
  };

  const fetchVeiculos = async () => {
    const { data } = await supabase.from("veiculos").select("*").order("placa");
    if (data) setVeiculos(data);
  };

  const fetchColetas = async () => {
    const { data } = await supabase
      .from("coleta_manual_pneus")
      .select("*, clientes(nome), veiculos(placa)")
      .order("created_at", { ascending: false });
    if (data) setColetas(data as Coleta[]);
  };

  const fetchLastMeasurement = async () => {
    const { data } = await supabase
      .from("coleta_manual_pneus")
      .select("sulco_atual, km_atual")
      .eq("veiculo_id", selectedVeiculo)
      .eq("posicao_pneu", posicaoPneu)
      .order("data_medicao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSulcoAnterior(data.sulco_atual?.toString() || "");
      setKmAnterior(data.km_atual?.toString() || "");
    } else {
      setSulcoAnterior("");
      setKmAnterior("");
    }
  };

  const handleAddCliente = async () => {
    if (!novoCliente.trim()) return;
    const { error } = await supabase.from("clientes").insert({ nome: novoCliente.trim() });
    if (!error) {
      toast({ title: "Cliente adicionado com sucesso!" });
      setNovoCliente("");
      fetchClientes();
    }
  };

  const handleAddVeiculo = async () => {
    if (!novoVeiculo.placa.trim() || !selectedCliente) return;
    const { error } = await supabase.from("veiculos").insert({
      cliente_id: selectedCliente,
      placa: novoVeiculo.placa.trim(),
      modelo: novoVeiculo.modelo.trim() || null,
    });
    if (!error) {
      toast({ title: "Veículo adicionado com sucesso!" });
      setNovoVeiculo({ placa: "", modelo: "" });
      fetchVeiculos();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const sulcoAtualNum = parseFloat(sulcoAtual);
    const sulcoAnteriorNum = sulcoAnterior ? parseFloat(sulcoAnterior) : null;
    const pressaoAtualNum = parseFloat(pressaoAtual);
    const pressaoRecomendadaNum = parseFloat(pressaoRecomendada);
    const kmAtualNum = parseInt(kmAtual);
    const kmAnteriorNum = kmAnterior ? parseInt(kmAnterior) : null;

    const sulcoVariacao = sulcoAnteriorNum ? sulcoAnteriorNum - sulcoAtualNum : null;
    const pressaoDiferenca = pressaoAtualNum - pressaoRecomendadaNum;
    const kmPeriodo = kmAnteriorNum ? kmAtualNum - kmAnteriorNum : null;
    const kmPorMm = sulcoVariacao && kmPeriodo && sulcoVariacao > 0 ? kmPeriodo / sulcoVariacao : null;

    const { error } = await supabase.from("coleta_manual_pneus").insert({
      cliente_id: selectedCliente,
      veiculo_id: selectedVeiculo,
      data_medicao: dataMedicao,
      posicao_pneu: posicaoPneu,
      sulco_atual: sulcoAtualNum,
      sulco_anterior: sulcoAnteriorNum,
      sulco_variacao: sulcoVariacao,
      pressao_atual: pressaoAtualNum,
      pressao_recomendada: pressaoRecomendadaNum,
      pressao_diferenca: pressaoDiferenca,
      km_atual: kmAtualNum,
      km_anterior: kmAnteriorNum,
      km_periodo: kmPeriodo,
      km_por_mm: kmPorMm,
      observacoes: observacoes || null,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Medição salva com sucesso!" });
      // Reset form
      setPosicaoPneu("");
      setSulcoAtual("");
      setSulcoAnterior("");
      setPressaoAtual("");
      setKmAtual("");
      setKmAnterior("");
      setObservacoes("");
    }
  };

  // KPIs calculations
  const desgasteMedio = coletas.length > 0
    ? (coletas.reduce((acc, c) => acc + (c.sulco_variacao || 0), 0) / coletas.filter(c => c.sulco_variacao).length || 0).toFixed(2)
    : "0";

  const kmPorMmMedio = coletas.length > 0
    ? (coletas.reduce((acc, c) => acc + (c.km_por_mm || 0), 0) / coletas.filter(c => c.km_por_mm).length || 0).toFixed(0)
    : "0";

  const pressaoForaPadrao = coletas.length > 0
    ? ((coletas.filter(c => Math.abs(c.pressao_diferenca || 0) > 10).length / coletas.length) * 100).toFixed(1)
    : "0";

  const kmPorMmIdeal = 1000;
  const valorPneu = 1500;
  const economiaEstimada = coletas.length > 0
    ? coletas.reduce((acc, c) => {
        if (c.km_por_mm && c.km_por_mm < kmPorMmIdeal) {
          return acc + ((kmPorMmIdeal - c.km_por_mm) / kmPorMmIdeal) * valorPneu;
        }
        return acc;
      }, 0).toFixed(2)
    : "0";

  // Chart data
  const sulcoChartData = coletas.slice(0, 20).reverse().map(c => ({
    data: new Date(c.data_medicao).toLocaleDateString("pt-BR"),
    veiculo: c.veiculos?.placa || "",
    sulco: c.sulco_atual,
  }));

  const pressaoChartData = coletas.slice(0, 10).map(c => ({
    veiculo: `${c.veiculos?.placa} - ${c.posicao_pneu}`,
    atual: c.pressao_atual,
    recomendada: c.pressao_recomendada,
  }));

  // Alertas
  const alertas = coletas.reduce((acc: { tipo: string; nivel: 'critico' | 'atencao'; mensagem: string; veiculo: string; posicao: string; valor: number; data: string }[], c) => {
    // Alerta de desgaste crítico (sulco < 3mm)
    if (c.sulco_atual < 3) {
      acc.push({
        tipo: 'desgaste',
        nivel: 'critico',
        mensagem: `Sulco crítico: ${c.sulco_atual}mm (mín. 3mm)`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        valor: c.sulco_atual,
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    } else if (c.sulco_atual < 5) {
      acc.push({
        tipo: 'desgaste',
        nivel: 'atencao',
        mensagem: `Sulco baixo: ${c.sulco_atual}mm (recomendado > 5mm)`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        valor: c.sulco_atual,
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    // Alerta de pressão fora do padrão (> 10% de diferença)
    const diferencaPercentual = Math.abs((c.pressao_diferenca || 0) / c.pressao_recomendada) * 100;
    if (diferencaPercentual > 15) {
      acc.push({
        tipo: 'pressao',
        nivel: 'critico',
        mensagem: `Pressão ${c.pressao_atual > c.pressao_recomendada ? 'alta' : 'baixa'}: ${c.pressao_atual}psi (rec: ${c.pressao_recomendada}psi)`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        valor: c.pressao_atual,
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    } else if (diferencaPercentual > 10) {
      acc.push({
        tipo: 'pressao',
        nivel: 'atencao',
        mensagem: `Pressão fora do padrão: ${c.pressao_atual}psi (rec: ${c.pressao_recomendada}psi)`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        valor: c.pressao_atual,
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    // Alerta de km/mm baixo (< 500)
    if (c.km_por_mm && c.km_por_mm < 500) {
      acc.push({
        tipo: 'eficiencia',
        nivel: 'critico',
        mensagem: `Eficiência crítica: ${c.km_por_mm?.toFixed(0)} km/mm`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        valor: c.km_por_mm,
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    return acc;
  }, []);

  const alertasCriticos = alertas.filter(a => a.nivel === 'critico');
  const alertasAtencao = alertas.filter(a => a.nivel === 'atencao');

  const getStatusBadge = (kmPorMm: number | null) => {
    if (!kmPorMm) return <Badge variant="outline">N/A</Badge>;
    if (kmPorMm < 500) return <Badge variant="destructive">Crítico</Badge>;
    if (kmPorMm < 900) return <Badge className="bg-yellow-500">Atenção</Badge>;
    return <Badge className="bg-green-500">Bom</Badge>;
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    
    setExporting(true);
    toast({ title: "Gerando PDF...", description: "Aguarde enquanto o relatório é preparado." });

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.setFontSize(18);
      pdf.text("Relatório MVP Manual Rastro", pdfWidth / 2, 8, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pdfWidth / 2, 14, { align: "center" });

      pdf.addImage(imgData, "PNG", imgX, imgY + 10, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`relatorio-rastro-${new Date().toISOString().split("T")[0]}.pdf`);

      toast({ title: "PDF exportado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">MVP Manual Rastro</h1>
        <p className="text-muted-foreground">Coleta manual de dados de pneus e análise de desempenho</p>
      </div>

      {/* Formulário de Coleta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Formulário de Coleta Manual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cliente e Veículo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Novo Cliente</Label>
                <div className="flex gap-2">
                  <Input value={novoCliente} onChange={e => setNovoCliente(e.target.value)} placeholder="Nome" />
                  <Button type="button" variant="outline" onClick={handleAddCliente}>+</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select value={selectedVeiculo} onValueChange={setSelectedVeiculo} disabled={!selectedCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVeiculos.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.placa} - {v.modelo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Novo Veículo</Label>
                <div className="flex gap-2">
                  <Input value={novoVeiculo.placa} onChange={e => setNovoVeiculo(p => ({ ...p, placa: e.target.value }))} placeholder="Placa" className="w-24" />
                  <Input value={novoVeiculo.modelo} onChange={e => setNovoVeiculo(p => ({ ...p, modelo: e.target.value }))} placeholder="Modelo" />
                  <Button type="button" variant="outline" onClick={handleAddVeiculo} disabled={!selectedCliente}>+</Button>
                </div>
              </div>
            </div>

            {/* Dados da Medição */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={dataMedicao} onChange={e => setDataMedicao(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Posição Pneu *</Label>
                <Select value={posicaoPneu} onValueChange={setPosicaoPneu}>
                  <SelectTrigger>
                    <SelectValue placeholder="Posição" />
                  </SelectTrigger>
                  <SelectContent>
                    {posicoesPneu.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sulco Atual (mm) *</Label>
                <Input type="number" step="0.1" value={sulcoAtual} onChange={e => setSulcoAtual(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Sulco Anterior (mm)</Label>
                <Input type="number" step="0.1" value={sulcoAnterior} onChange={e => setSulcoAnterior(e.target.value)} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>Pressão Atual (psi) *</Label>
                <Input type="number" step="0.1" value={pressaoAtual} onChange={e => setPressaoAtual(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Pressão Recom. (psi)</Label>
                <Input type="number" step="0.1" value={pressaoRecomendada} onChange={e => setPressaoRecomendada(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Km Atual *</Label>
                <Input type="number" value={kmAtual} onChange={e => setKmAtual(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Km Anterior</Label>
                <Input type="number" value={kmAnterior} onChange={e => setKmAnterior(e.target.value)} disabled className="bg-muted" />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações sobre o pneu..." />
              </div>
            </div>

            <Button type="submit" disabled={loading || !selectedCliente || !selectedVeiculo || !posicaoPneu}>
              {loading ? "Salvando..." : "Salvar Medição"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dashboard MVP */}
      <div ref={dashboardRef} className="bg-background p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Dashboard MVP</h2>
          <Button onClick={handleExportPDF} disabled={exporting} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Desgaste Médio</p>
                  <p className="text-2xl font-bold">{desgasteMedio} mm</p>
                </div>
                <TrendingDown className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Km/mm Médio</p>
                  <p className="text-2xl font-bold">{kmPorMmMedio}</p>
                </div>
                <Gauge className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pressão Fora Padrão</p>
                  <p className="text-2xl font-bold">{pressaoForaPadrao}%</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Economia Potencial</p>
                  <p className="text-2xl font-bold">R$ {economiaEstimada}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Alertas */}
        {alertas.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Relatório de Alertas ({alertas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Alertas Críticos */}
                <div>
                  <h4 className="font-semibold text-destructive flex items-center gap-2 mb-3">
                    <XCircle className="h-4 w-4" />
                    Críticos ({alertasCriticos.length})
                  </h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {alertasCriticos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum alerta crítico</p>
                      ) : (
                        alertasCriticos.map((alerta, idx) => (
                          <div key={idx} className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {alerta.tipo === 'desgaste' && <TrendingDown className="h-4 w-4 text-destructive" />}
                                {alerta.tipo === 'pressao' && <Gauge className="h-4 w-4 text-destructive" />}
                                {alerta.tipo === 'eficiencia' && <Fuel className="h-4 w-4 text-destructive" />}
                                <span className="font-medium text-sm">{alerta.veiculo}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{alerta.posicao}</Badge>
                            </div>
                            <p className="text-sm mt-1">{alerta.mensagem}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alerta.data}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Alertas de Atenção */}
                <div>
                  <h4 className="font-semibold text-yellow-600 flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    Atenção ({alertasAtencao.length})
                  </h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {alertasAtencao.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum alerta de atenção</p>
                      ) : (
                        alertasAtencao.map((alerta, idx) => (
                          <div key={idx} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {alerta.tipo === 'desgaste' && <TrendingDown className="h-4 w-4 text-yellow-600" />}
                                {alerta.tipo === 'pressao' && <Gauge className="h-4 w-4 text-yellow-600" />}
                                {alerta.tipo === 'eficiencia' && <Fuel className="h-4 w-4 text-yellow-600" />}
                                <span className="font-medium text-sm">{alerta.veiculo}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{alerta.posicao}</Badge>
                            </div>
                            <p className="text-sm mt-1">{alerta.mensagem}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alerta.data}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Sulco por Veículo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sulcoChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis domain={[0, 16]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sulco" stroke="hsl(var(--primary))" name="Sulco (mm)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pressão: Atual vs Recomendada</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pressaoChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="veiculo" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[80, 120]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="atual" fill="hsl(var(--primary))" name="Atual (psi)" />
                  <Bar dataKey="recomendada" fill="hsl(var(--muted-foreground))" name="Recomendada (psi)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Coletas */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Medições</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Sulco Atual</TableHead>
                  <TableHead>Sulco Anterior</TableHead>
                  <TableHead>Pressão Atual</TableHead>
                  <TableHead>Km/mm</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coletas.slice(0, 20).map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.clientes?.nome}</TableCell>
                    <TableCell>{c.veiculos?.placa}</TableCell>
                    <TableCell>{c.posicao_pneu}</TableCell>
                    <TableCell>{c.sulco_atual} mm</TableCell>
                    <TableCell>{c.sulco_anterior ? `${c.sulco_anterior} mm` : "-"}</TableCell>
                    <TableCell>{c.pressao_atual} psi</TableCell>
                    <TableCell>{c.km_por_mm?.toFixed(0) || "-"}</TableCell>
                    <TableCell>{getStatusBadge(c.km_por_mm)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
