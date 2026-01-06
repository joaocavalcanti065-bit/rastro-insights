import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Plus, TrendingDown, Gauge, DollarSign, AlertTriangle, Download, AlertCircle, XCircle, Fuel, Filter, X, CheckCircle, Truck, Circle } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInDays } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

// Interface para dados calculados do pneu
interface DadosPneuCalculado extends Coleta {
  desgaste_mm: number;
  km_rodado: number;
  taxa_desgaste: number; // mm por 1000km
  vida_restante_km: number;
  status_sulco: 'saudavel' | 'atencao' | 'retirar' | 'critico';
  status_pressao: 'ok' | 'atencao' | 'critico';
  desvio_pressao_percentual: number;
  risco: 'baixo' | 'medio' | 'alto';
  desgaste_anomalo: boolean;
}

const posicoesPneu = [
  "Dianteiro E",
  "Dianteiro D",
  "Traseiro 1E",
  "Traseiro 1D",
  "Traseiro 2E",
  "Traseiro 2D",
];

// Constantes técnicas
const SULCO_MINIMO_TWI = 1.6; // mm - limite técnico mínimo
const SULCO_IDEAL_REFORMA = 3.0; // mm - sulco ideal para retirada para reforma

export default function MvpManual() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [coletas, setColetas] = useState<Coleta[]>([]);
  const [filteredVeiculos, setFilteredVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Dashboard filters
  const [filterCliente, setFilterCliente] = useState<string>("");
  const [filterDataInicio, setFilterDataInicio] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterDataFim, setFilterDataFim] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterVeiculo, setFilterVeiculo] = useState<string>("");

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

  // Validação do Checklist Operacional
  const validarChecklist = (): { valido: boolean; erros: string[] } => {
    const erros: string[] = [];
    
    if (!sulcoAtual || parseFloat(sulcoAtual) <= 0) {
      erros.push("Sulco atual não informado");
    }
    if (!pressaoAtual || parseFloat(pressaoAtual) <= 0) {
      erros.push("Pressão atual não informada");
    }
    if (kmAnterior && parseInt(kmAtual) <= parseInt(kmAnterior)) {
      erros.push("Km atual deve ser maior que Km anterior");
    }
    if (!posicaoPneu) {
      erros.push("Posição do pneu não definida");
    }
    if (!pressaoRecomendada || parseFloat(pressaoRecomendada) <= 0) {
      erros.push("Pressão recomendada não definida");
    }

    return { valido: erros.length === 0, erros };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação do checklist
    const { valido, erros } = validarChecklist();
    if (!valido) {
      toast({ 
        title: "Medição incompleta ou inconsistente", 
        description: erros.join(". ") + ". Verifique os dados antes de salvar.",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);

    const sulcoAtualNum = parseFloat(sulcoAtual);
    const sulcoAnteriorNum = sulcoAnterior ? parseFloat(sulcoAnterior) : null;
    const pressaoAtualNum = parseFloat(pressaoAtual);
    const pressaoRecomendadaNum = parseFloat(pressaoRecomendada);
    const kmAtualNum = parseInt(kmAtual);
    const kmAnteriorNum = kmAnterior ? parseInt(kmAnterior) : null;

    // Cálculos conforme especificação
    const sulcoVariacao = sulcoAnteriorNum ? sulcoAnteriorNum - sulcoAtualNum : null;
    const pressaoDiferenca = pressaoAtualNum - pressaoRecomendadaNum;
    const kmPeriodo = kmAnteriorNum ? kmAtualNum - kmAnteriorNum : null;
    
    // Taxa de desgaste: km/mm (quanto maior, melhor)
    const kmPorMm = sulcoVariacao && sulcoVariacao > 0 && kmPeriodo && kmPeriodo > 0 
      ? kmPeriodo / sulcoVariacao 
      : null;

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
      setPosicaoPneu("");
      setSulcoAtual("");
      setSulcoAnterior("");
      setPressaoAtual("");
      setKmAtual("");
      setKmAnterior("");
      setObservacoes("");
    }
  };

  // Função para calcular dados do pneu conforme especificação
  const calcularDadosPneu = (coleta: Coleta, taxaMediaFrota: number): DadosPneuCalculado => {
    // 3.1 Desgaste de Sulco
    const desgaste_mm = coleta.sulco_anterior 
      ? coleta.sulco_anterior - coleta.sulco_atual 
      : 0;

    // 3.2 Km Rodado no Período
    const km_rodado = coleta.km_anterior 
      ? coleta.km_atual - coleta.km_anterior 
      : 0;

    // 3.3 Taxa de Desgaste (mm por 1.000 km)
    const taxa_desgaste = km_rodado > 0 && desgaste_mm > 0
      ? (desgaste_mm / km_rodado) * 1000
      : 0;

    // 3.4 Vida Útil Estimada (km)
    let vida_restante_km = 0;
    if (coleta.sulco_atual > SULCO_IDEAL_REFORMA && taxa_desgaste > 0) {
      vida_restante_km = ((coleta.sulco_atual - SULCO_IDEAL_REFORMA) / taxa_desgaste) * 1000;
    }

    // 3.5 Status do Pneu (Automático)
    let status_sulco: 'saudavel' | 'atencao' | 'retirar' | 'critico';
    if (coleta.sulco_atual <= SULCO_MINIMO_TWI) {
      status_sulco = 'critico';
    } else if (coleta.sulco_atual <= SULCO_IDEAL_REFORMA) {
      status_sulco = 'retirar';
    } else if (coleta.sulco_atual <= 6) {
      status_sulco = 'atencao';
    } else {
      status_sulco = 'saudavel';
    }

    // 3.6 Análise de Pressão
    const desvio_pressao_percentual = Math.abs((coleta.pressao_diferenca || 0) / coleta.pressao_recomendada) * 100;
    
    let status_pressao: 'ok' | 'atencao' | 'critico';
    if (desvio_pressao_percentual <= 5) {
      status_pressao = 'ok';
    } else if (desvio_pressao_percentual <= 10) {
      status_pressao = 'atencao';
    } else {
      status_pressao = 'critico';
    }

    // 4. Classificação de Risco
    let risco: 'baixo' | 'medio' | 'alto';
    if (status_sulco === 'critico' || status_sulco === 'retirar' || taxa_desgaste > taxaMediaFrota * 1.5) {
      risco = 'alto';
    } else if (status_pressao !== 'ok' || status_sulco === 'atencao') {
      risco = 'medio';
    } else {
      risco = 'baixo';
    }

    // Desgaste Anômalo
    const desgaste_anomalo = taxa_desgaste > 0 && taxaMediaFrota > 0 && taxa_desgaste > taxaMediaFrota;

    return {
      ...coleta,
      desgaste_mm,
      km_rodado,
      taxa_desgaste,
      vida_restante_km,
      status_sulco,
      status_pressao,
      desvio_pressao_percentual,
      risco,
      desgaste_anomalo,
    };
  };

  // Filtered coletas for dashboard
  const coletasFiltradas = coletas.filter(c => {
    const matchCliente = !filterCliente || c.cliente_id === filterCliente;
    const matchVeiculo = !filterVeiculo || c.veiculo_id === filterVeiculo;
    const dataColeta = parseISO(c.data_medicao);
    const matchPeriodo = isWithinInterval(dataColeta, {
      start: parseISO(filterDataInicio),
      end: parseISO(filterDataFim),
    });
    return matchCliente && matchVeiculo && matchPeriodo;
  });

  // Calcular taxa média da frota primeiro
  const taxasDesgaste = coletasFiltradas
    .filter(c => c.sulco_anterior && c.km_anterior)
    .map(c => {
      const desgaste = (c.sulco_anterior || 0) - c.sulco_atual;
      const km = c.km_atual - (c.km_anterior || 0);
      return km > 0 && desgaste > 0 ? (desgaste / km) * 1000 : 0;
    })
    .filter(t => t > 0);
  
  const taxaMediaFrota = taxasDesgaste.length > 0 
    ? taxasDesgaste.reduce((a, b) => a + b, 0) / taxasDesgaste.length 
    : 0;

  // Aplicar cálculos em todas as coletas
  const coletasCalculadas: DadosPneuCalculado[] = coletasFiltradas.map(c => calcularDadosPneu(c, taxaMediaFrota));

  const clearFilters = () => {
    setFilterCliente("");
    setFilterVeiculo("");
    setFilterDataInicio(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setFilterDataFim(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  // KPIs calculations
  const totalPneus = coletasCalculadas.length;
  
  const pneusSaudaveis = coletasCalculadas.filter(c => c.status_sulco === 'saudavel').length;
  const pneusAtencao = coletasCalculadas.filter(c => c.status_sulco === 'atencao').length;
  const pneusRetirar = coletasCalculadas.filter(c => c.status_sulco === 'retirar').length;
  const pneusCriticos = coletasCalculadas.filter(c => c.status_sulco === 'critico').length;

  const desgasteMedio = coletasCalculadas.length > 0
    ? (coletasCalculadas.reduce((acc, c) => acc + c.desgaste_mm, 0) / coletasCalculadas.filter(c => c.desgaste_mm > 0).length || 0).toFixed(2)
    : "0";

  const vidaMediaRestante = coletasCalculadas.filter(c => c.vida_restante_km > 0).length > 0
    ? Math.round(coletasCalculadas.filter(c => c.vida_restante_km > 0).reduce((acc, c) => acc + c.vida_restante_km, 0) / coletasCalculadas.filter(c => c.vida_restante_km > 0).length)
    : 0;

  const pressaoForaPadrao = totalPneus > 0
    ? ((coletasCalculadas.filter(c => c.status_pressao !== 'ok').length / totalPneus) * 100).toFixed(1)
    : "0";

  // Economia estimada baseada em vida útil
  const valorPneu = 1500;
  const economiaEstimada = coletasCalculadas.reduce((acc, c) => {
    if (c.desgaste_anomalo && c.km_por_mm) {
      const kmPorMmIdeal = 1000;
      return acc + ((kmPorMmIdeal - c.km_por_mm) / kmPorMmIdeal) * valorPneu * 0.1;
    }
    return acc;
  }, 0).toFixed(2);

  // Dados para gráfico de pizza (status dos pneus)
  const statusPieData = [
    { name: 'Saudável', value: pneusSaudaveis, color: '#22c55e' },
    { name: 'Atenção', value: pneusAtencao, color: '#eab308' },
    { name: 'Retirar para Reforma', value: pneusRetirar, color: '#f97316' },
    { name: 'Crítico', value: pneusCriticos, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Chart data
  const sulcoChartData = coletasCalculadas.slice(0, 20).reverse().map(c => ({
    data: new Date(c.data_medicao).toLocaleDateString("pt-BR"),
    veiculo: c.veiculos?.placa || "",
    sulco: c.sulco_atual,
    minimo: SULCO_IDEAL_REFORMA,
  }));

  const pressaoChartData = coletasCalculadas.slice(0, 10).map(c => ({
    veiculo: `${c.veiculos?.placa} - ${c.posicao_pneu}`,
    atual: c.pressao_atual,
    recomendada: c.pressao_recomendada,
  }));

  // Alertas automáticos
  const alertas = coletasCalculadas.reduce((acc: { 
    tipo: string; 
    nivel: 'critico' | 'atencao'; 
    mensagem: string; 
    veiculo: string; 
    posicao: string; 
    recomendacao: string;
    data: string 
  }[], c) => {
    // Alerta de sulco crítico
    if (c.status_sulco === 'critico') {
      acc.push({
        tipo: 'sulco',
        nivel: 'critico',
        mensagem: `⛔ Sulco crítico/irregular: ${c.sulco_atual}mm (mín. legal ${SULCO_MINIMO_TWI}mm)`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        recomendacao: 'Pneu deve ser retirado imediatamente de circulação.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    } else if (c.status_sulco === 'retirar') {
      acc.push({
        tipo: 'sulco',
        nivel: 'critico',
        mensagem: `🔴 Retirar para reforma: ${c.sulco_atual}mm (ideal > ${SULCO_IDEAL_REFORMA}mm)`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        recomendacao: 'Programar retirada para recapagem.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    } else if (c.status_sulco === 'atencao') {
      acc.push({
        tipo: 'sulco',
        nivel: 'atencao',
        mensagem: `🟡 Sulco em atenção: ${c.sulco_atual}mm`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        recomendacao: 'Monitorar próximas medições.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    // Alerta de pressão
    if (c.status_pressao === 'critico') {
      acc.push({
        tipo: 'pressao',
        nivel: 'critico',
        mensagem: `❌ Pressão crítica: ${c.pressao_atual}psi (desvio ${c.desvio_pressao_percentual.toFixed(1)}%)`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        recomendacao: 'Pressão fora do ideal impacta desgaste irregular, consumo de combustível e risco estrutural.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    } else if (c.status_pressao === 'atencao') {
      acc.push({
        tipo: 'pressao',
        nivel: 'atencao',
        mensagem: `⚠ Pressão fora do padrão: ${c.pressao_atual}psi (desvio ${c.desvio_pressao_percentual.toFixed(1)}%)`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        recomendacao: 'Ajustar pressão para valor recomendado.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    // Alerta de desgaste anômalo
    if (c.desgaste_anomalo && c.taxa_desgaste > 0) {
      acc.push({
        tipo: 'desgaste',
        nivel: 'atencao',
        mensagem: `🔔 Desgaste acima da média: ${c.taxa_desgaste.toFixed(2)} mm/1000km`,
        veiculo: c.veiculos?.placa || '',
        posicao: c.posicao_pneu,
        recomendacao: 'Recomenda-se inspeção de alinhamento e carga.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    return acc;
  }, []);

  const alertasCriticos = alertas.filter(a => a.nivel === 'critico');
  const alertasAtencao = alertas.filter(a => a.nivel === 'atencao');

  // Funções para badges de status
  const getStatusSulcoBadge = (status: 'saudavel' | 'atencao' | 'retirar' | 'critico') => {
    switch (status) {
      case 'saudavel':
        return <Badge className="bg-green-500 hover:bg-green-600">🟢 Saudável</Badge>;
      case 'atencao':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">🟡 Atenção</Badge>;
      case 'retirar':
        return <Badge className="bg-orange-500 hover:bg-orange-600">🔴 Retirar</Badge>;
      case 'critico':
        return <Badge variant="destructive">⛔ Crítico</Badge>;
    }
  };

  const getStatusPressaoBadge = (status: 'ok' | 'atencao' | 'critico') => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-500 hover:bg-green-600">✅ OK</Badge>;
      case 'atencao':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">⚠ Atenção</Badge>;
      case 'critico':
        return <Badge variant="destructive">❌ Crítico</Badge>;
    }
  };

  const getRiscoBadge = (risco: 'baixo' | 'medio' | 'alto') => {
    switch (risco) {
      case 'baixo':
        return <Badge className="bg-blue-500 hover:bg-blue-600">🔵 Baixo</Badge>;
      case 'medio':
        return <Badge className="bg-orange-500 hover:bg-orange-600">🟠 Médio</Badge>;
      case 'alto':
        return <Badge variant="destructive">🔴 Alto</Badge>;
    }
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

  // Veículos filtrados pelo cliente selecionado no filtro
  const veiculosDoCliente = filterCliente 
    ? veiculos.filter(v => v.cliente_id === filterCliente) 
    : veiculos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">MVP Manual Rastro</h1>
        <p className="text-muted-foreground">
          O operador mede • O sistema calcula • O gestor decide
        </p>
      </div>

      {/* Formulário de Coleta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Formulário de Coleta Manual
          </CardTitle>
          <CardDescription>
            Campos obrigatórios: Cliente, Veículo, Data, Posição, Sulco Atual, Pressão Atual, Km Atual
          </CardDescription>
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
                    {clientes.filter(c => c.id).map(c => (
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
                <Label>Veículo (Placa) *</Label>
                <Select value={selectedVeiculo} onValueChange={setSelectedVeiculo} disabled={!selectedCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredVeiculos.filter(v => v.id).map(v => (
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
                <Label>Posição do Pneu *</Label>
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
                <Input type="number" step="0.1" min="0" max="20" value={sulcoAtual} onChange={e => setSulcoAtual(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Sulco Anterior (mm)</Label>
                <Input type="number" step="0.1" value={sulcoAnterior} onChange={e => setSulcoAnterior(e.target.value)} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>Pressão Atual (psi) *</Label>
                <Input type="number" step="1" min="0" max="200" value={pressaoAtual} onChange={e => setPressaoAtual(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Pressão Recom. (psi)</Label>
                <Input type="number" step="1" value={pressaoRecomendada} onChange={e => setPressaoRecomendada(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Km Atual *</Label>
                <Input type="number" min="0" value={kmAtual} onChange={e => setKmAtual(e.target.value)} required />
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-foreground">Dashboard Geral</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterCliente || "all"} onValueChange={(value) => {
                setFilterCliente(value === "all" ? "" : value);
                setFilterVeiculo("");
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clientes.filter(c => c.id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={filterVeiculo || "all"} onValueChange={(value) => setFilterVeiculo(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos veículos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos veículos</SelectItem>
                {veiculosDoCliente.filter(v => v.id).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.placa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filterDataInicio}
                onChange={e => setFilterDataInicio(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="date"
                value={filterDataFim}
                onChange={e => setFilterDataFim(e.target.value)}
                className="w-[140px]"
              />
            </div>
            {(filterCliente || filterVeiculo || filterDataInicio !== format(startOfMonth(new Date()), 'yyyy-MM-dd') || filterDataFim !== format(endOfMonth(new Date()), 'yyyy-MM-dd')) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            <Button onClick={handleExportPDF} disabled={exporting} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exportando..." : "Exportar PDF"}
            </Button>
          </div>
        </div>

        {coletasCalculadas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground mb-6">
            <p>Nenhum dado encontrado para os filtros selecionados.</p>
          </div>
        )}

        {/* KPIs - Dashboard Geral */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">Total Pneus</p>
                <p className="text-2xl font-bold">{totalPneus}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">🟢 Saudáveis</p>
                <p className="text-2xl font-bold text-green-600">{pneusSaudaveis}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">🟡 Atenção</p>
                <p className="text-2xl font-bold text-yellow-600">{pneusAtencao}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">🔴 Retirar</p>
                <p className="text-2xl font-bold text-orange-600">{pneusRetirar}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">⛔ Críticos</p>
                <p className="text-2xl font-bold text-red-600">{pneusCriticos}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">Vida Média (km)</p>
                <p className="text-2xl font-bold">{vidaMediaRestante.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPIs secundários */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Desgaste Médio</p>
                  <p className="text-xl font-bold">{desgasteMedio} mm</p>
                </div>
                <TrendingDown className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Média Frota</p>
                  <p className="text-xl font-bold">{taxaMediaFrota.toFixed(2)} mm/1000km</p>
                </div>
                <Gauge className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pressão Fora Padrão</p>
                  <p className="text-xl font-bold">{pressaoForaPadrao}%</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Economia Potencial</p>
                  <p className="text-xl font-bold">R$ {economiaEstimada}</p>
                </div>
                <DollarSign className="h-6 w-6 text-green-500" />
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
                Alertas Automáticos ({alertas.length})
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
                                <Truck className="h-4 w-4 text-destructive" />
                                <span className="font-medium text-sm">{alerta.veiculo}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{alerta.posicao}</Badge>
                            </div>
                            <p className="text-sm mt-1">{alerta.mensagem}</p>
                            <p className="text-xs text-muted-foreground mt-1 italic">{alerta.recomendacao}</p>
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
                                <Truck className="h-4 w-4 text-yellow-600" />
                                <span className="font-medium text-sm">{alerta.veiculo}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{alerta.posicao}</Badge>
                            </div>
                            <p className="text-sm mt-1">{alerta.mensagem}</p>
                            <p className="text-xs text-muted-foreground mt-1 italic">{alerta.recomendacao}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Gráfico de Status dos Pneus */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do Sulco</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sulcoChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" fontSize={10} />
                  <YAxis domain={[0, 16]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sulco" stroke="hsl(var(--primary))" name="Sulco (mm)" />
                  <Line type="monotone" dataKey="minimo" stroke="#ef4444" strokeDasharray="5 5" name="Mín. Reforma" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pressão: Atual vs Recomendada</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pressaoChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="veiculo" fontSize={8} angle={-45} textAnchor="end" height={60} />
                  <YAxis domain={[80, 120]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="atual" fill="hsl(var(--primary))" name="Atual" />
                  <Bar dataKey="recomendada" fill="hsl(var(--muted-foreground))" name="Recom." />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Medições com todos os cálculos */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Medições (Dados Calculados)</CardTitle>
            <CardDescription>
              Taxa de desgaste, vida útil estimada e classificação de risco automáticos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Posição</TableHead>
                    <TableHead>Sulco</TableHead>
                    <TableHead>Status Sulco</TableHead>
                    <TableHead>Pressão</TableHead>
                    <TableHead>Status Pressão</TableHead>
                    <TableHead>Taxa Desg.</TableHead>
                    <TableHead>Vida Restante</TableHead>
                    <TableHead>Risco</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coletasCalculadas.slice(0, 20).map(c => (
                    <TableRow key={c.id} className={c.desgaste_anomalo ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                      <TableCell className="font-medium">{c.clientes?.nome}</TableCell>
                      <TableCell>{c.veiculos?.placa}</TableCell>
                      <TableCell>{c.posicao_pneu}</TableCell>
                      <TableCell>{c.sulco_atual} mm</TableCell>
                      <TableCell>{getStatusSulcoBadge(c.status_sulco)}</TableCell>
                      <TableCell>{c.pressao_atual} psi</TableCell>
                      <TableCell>{getStatusPressaoBadge(c.status_pressao)}</TableCell>
                      <TableCell>
                        {c.taxa_desgaste > 0 ? (
                          <span className={c.desgaste_anomalo ? "text-orange-600 font-medium" : ""}>
                            {c.taxa_desgaste.toFixed(2)} mm/1000km
                            {c.desgaste_anomalo && " ⚠"}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {c.vida_restante_km > 0 ? `${Math.round(c.vida_restante_km).toLocaleString()} km` : "-"}
                      </TableCell>
                      <TableCell>{getRiscoBadge(c.risco)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
