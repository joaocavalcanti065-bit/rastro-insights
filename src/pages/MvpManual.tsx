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
import { Plus, TrendingDown, Gauge, DollarSign, AlertTriangle, Download, AlertCircle, XCircle, Truck, Settings, CheckCircle2, CircleDot } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

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
  tipo_veiculo: string | null;
  categoria: string | null;
  quantidade_eixos: number | null;
  possui_estepe: boolean | null;
  quantidade_estepes: number | null;
  total_pneus_rodantes: number | null;
  total_pneus: number | null;
  km_medio_mensal: number | null;
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

interface DadosPneuCalculado extends Coleta {
  desgaste_mm: number;
  km_rodado: number;
  taxa_desgaste: number;
  vida_restante_km: number;
  status_sulco: 'saudavel' | 'atencao' | 'retirar' | 'critico';
  status_pressao: 'ok' | 'atencao' | 'critico';
  desvio_pressao_percentual: number;
  risco: 'baixo' | 'medio' | 'alto';
  desgaste_anomalo: boolean;
  custo_por_km?: number;
}

// Tipos de veículo com quantidade de pneus padrão
const TIPOS_VEICULO = [
  { tipo: 'Carro / SUV', pneus: 4, eixos: 2, categoria: 'Leve' },
  { tipo: 'Van', pneus: 4, eixos: 2, categoria: 'Leve' },
  { tipo: 'Caminhão 3/4', pneus: 6, eixos: 2, categoria: 'Médio' },
  { tipo: 'Toco', pneus: 6, eixos: 2, categoria: 'Médio' },
  { tipo: 'Truck', pneus: 10, eixos: 3, categoria: 'Pesado' },
  { tipo: 'Bi-Truck', pneus: 12, eixos: 4, categoria: 'Pesado' },
  { tipo: 'Cavalo Mecânico', pneus: 6, eixos: 2, categoria: 'Pesado' },
  { tipo: 'Carreta Simples / LS', pneus: 10, eixos: 3, categoria: 'Pesado' },
  { tipo: 'Carreta 2 Eixos', pneus: 12, eixos: 2, categoria: 'Pesado' },
  { tipo: 'Carreta 3 Eixos', pneus: 14, eixos: 3, categoria: 'Pesado' },
  { tipo: 'Rodotrem', pneus: 18, eixos: 6, categoria: 'Pesado' },
  { tipo: 'Bitrem', pneus: 22, eixos: 7, categoria: 'Pesado' },
];

const CATEGORIAS = ['Leve', 'Médio', 'Pesado'];

// Gerar posições de pneu baseado na configuração do veículo
const gerarPosicoesPneu = (veiculo: Veiculo | null): string[] => {
  if (!veiculo) return [];
  
  const posicoes: string[] = [];
  const eixos = veiculo.quantidade_eixos || 3;
  
  // Eixo dianteiro (sempre simples)
  posicoes.push('D1E'); // Dianteiro Esquerdo
  posicoes.push('D1D'); // Dianteiro Direito
  
  // Eixos traseiros (podem ser duplos)
  for (let i = 2; i <= eixos; i++) {
    const tipoVeiculo = TIPOS_VEICULO.find(t => t.tipo === veiculo.tipo_veiculo);
    const isDuplo = tipoVeiculo ? tipoVeiculo.pneus > 4 : true;
    
    if (isDuplo) {
      posicoes.push(`T${i}EE`); // Traseiro Eixo X Esquerdo Externo
      posicoes.push(`T${i}EI`); // Traseiro Eixo X Esquerdo Interno
      posicoes.push(`T${i}DI`); // Traseiro Eixo X Direito Interno
      posicoes.push(`T${i}DE`); // Traseiro Eixo X Direito Externo
    } else {
      posicoes.push(`T${i}E`); // Traseiro Eixo X Esquerdo
      posicoes.push(`T${i}D`); // Traseiro Eixo X Direito
    }
  }
  
  // Estepes
  if (veiculo.possui_estepe && veiculo.quantidade_estepes) {
    for (let i = 1; i <= veiculo.quantidade_estepes; i++) {
      posicoes.push(`ESP${i}`);
    }
  }
  
  return posicoes;
};

// Nomenclatura padronizada
const getNomenclaturaCompleta = (codigo: string): string => {
  const map: Record<string, string> = {
    'D1E': 'Dianteiro 1 Esquerdo',
    'D1D': 'Dianteiro 1 Direito',
    'T2E': 'Traseiro 2 Esquerdo',
    'T2D': 'Traseiro 2 Direito',
    'T2EE': 'Traseiro 2 Esquerdo Externo',
    'T2EI': 'Traseiro 2 Esquerdo Interno',
    'T2DI': 'Traseiro 2 Direito Interno',
    'T2DE': 'Traseiro 2 Direito Externo',
    'T3E': 'Traseiro 3 Esquerdo',
    'T3D': 'Traseiro 3 Direito',
    'T3EE': 'Traseiro 3 Esquerdo Externo',
    'T3EI': 'Traseiro 3 Esquerdo Interno',
    'T3DI': 'Traseiro 3 Direito Interno',
    'T3DE': 'Traseiro 3 Direito Externo',
    'T4EE': 'Traseiro 4 Esquerdo Externo',
    'T4EI': 'Traseiro 4 Esquerdo Interno',
    'T4DI': 'Traseiro 4 Direito Interno',
    'T4DE': 'Traseiro 4 Direito Externo',
    'ESP1': 'Estepe 1',
    'ESP2': 'Estepe 2',
  };
  return map[codigo] || codigo;
};

const SULCO_MINIMO_TWI = 1.6;
const SULCO_IDEAL_REFORMA = 3.0;
const VALOR_PNEU_MEDIO = 1500;

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

  // Form state - Coleta
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedVeiculo, setSelectedVeiculo] = useState("");
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null);
  const [dataMedicao, setDataMedicao] = useState(new Date().toISOString().split("T")[0]);
  const [posicaoPneu, setPosicaoPneu] = useState("");
  const [sulcoAtual, setSulcoAtual] = useState("");
  const [sulcoAnterior, setSulcoAnterior] = useState("");
  const [pressaoAtual, setPressaoAtual] = useState("");
  const [pressaoRecomendada, setPressaoRecomendada] = useState("100");
  const [kmAtual, setKmAtual] = useState("");
  const [kmAnterior, setKmAnterior] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [custoPneu, setCustoPneu] = useState("1500");

  // Form state - Novo Cliente
  const [novoCliente, setNovoCliente] = useState("");

  // Form state - Novo Veículo (Cadastro Avançado)
  const [novoVeiculo, setNovoVeiculo] = useState({
    placa: "",
    modelo: "",
    tipo_veiculo: "Truck",
    categoria: "Pesado",
    quantidade_eixos: 3,
    possui_estepe: false,
    quantidade_estepes: 0,
    km_medio_mensal: 12000,
  });

  // Posições disponíveis baseadas no veículo selecionado
  const [posicoesDisponiveis, setPosicoesDisponiveis] = useState<string[]>([]);

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
    if (selectedVeiculo) {
      const veiculo = veiculos.find(v => v.id === selectedVeiculo) || null;
      setVeiculoSelecionado(veiculo);
      if (veiculo) {
        setPosicoesDisponiveis(gerarPosicoesPneu(veiculo));
      }
    } else {
      setVeiculoSelecionado(null);
      setPosicoesDisponiveis([]);
    }
  }, [selectedVeiculo, veiculos]);

  useEffect(() => {
    if (selectedVeiculo && posicaoPneu) {
      fetchLastMeasurement();
    }
  }, [selectedVeiculo, posicaoPneu]);

  // Atualizar pneus automaticamente quando tipo de veículo muda
  useEffect(() => {
    const tipoInfo = TIPOS_VEICULO.find(t => t.tipo === novoVeiculo.tipo_veiculo);
    if (tipoInfo) {
      setNovoVeiculo(prev => ({
        ...prev,
        categoria: tipoInfo.categoria,
        quantidade_eixos: tipoInfo.eixos,
      }));
    }
  }, [novoVeiculo.tipo_veiculo]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('coleta-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coleta_manual_pneus' }, () => {
        fetchColetas();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'veiculos' }, () => {
        fetchVeiculos();
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
    if (data) setVeiculos(data as Veiculo[]);
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

  // Calcular totais de pneus
  const calcularTotaisPneus = () => {
    const tipoInfo = TIPOS_VEICULO.find(t => t.tipo === novoVeiculo.tipo_veiculo);
    const pneusRodantes = tipoInfo ? tipoInfo.pneus : 10;
    const totalPneus = pneusRodantes + (novoVeiculo.possui_estepe ? novoVeiculo.quantidade_estepes : 0);
    return { pneusRodantes, totalPneus };
  };

  const handleAddVeiculo = async () => {
    if (!novoVeiculo.placa.trim() || !selectedCliente) return;
    
    const { pneusRodantes, totalPneus } = calcularTotaisPneus();
    
    const { error } = await supabase.from("veiculos").insert({
      cliente_id: selectedCliente,
      placa: novoVeiculo.placa.trim().toUpperCase(),
      modelo: novoVeiculo.modelo.trim() || null,
      tipo_veiculo: novoVeiculo.tipo_veiculo,
      categoria: novoVeiculo.categoria,
      quantidade_eixos: novoVeiculo.quantidade_eixos,
      possui_estepe: novoVeiculo.possui_estepe,
      quantidade_estepes: novoVeiculo.possui_estepe ? novoVeiculo.quantidade_estepes : 0,
      total_pneus_rodantes: pneusRodantes,
      total_pneus: totalPneus,
      km_medio_mensal: novoVeiculo.km_medio_mensal,
    });
    
    if (!error) {
      toast({ title: "Veículo cadastrado com sucesso!" });
      setNovoVeiculo({
        placa: "",
        modelo: "",
        tipo_veiculo: "Truck",
        categoria: "Pesado",
        quantidade_eixos: 3,
        possui_estepe: false,
        quantidade_estepes: 0,
        km_medio_mensal: 12000,
      });
      fetchVeiculos();
    } else {
      toast({ title: "Erro ao cadastrar veículo", description: error.message, variant: "destructive" });
    }
  };

  const validarChecklist = (): { valido: boolean; erros: string[] } => {
    const erros: string[] = [];
    
    if (!sulcoAtual || parseFloat(sulcoAtual) <= 0) erros.push("Sulco atual não informado");
    if (!pressaoAtual || parseFloat(pressaoAtual) <= 0) erros.push("Pressão atual não informada");
    if (kmAnterior && parseInt(kmAtual) <= parseInt(kmAnterior)) erros.push("Km atual deve ser maior que Km anterior");
    if (!posicaoPneu) erros.push("Posição do pneu não definida");
    if (!pressaoRecomendada || parseFloat(pressaoRecomendada) <= 0) erros.push("Pressão recomendada não definida");

    return { valido: erros.length === 0, erros };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { valido, erros } = validarChecklist();
    if (!valido) {
      toast({ 
        title: "Medição incompleta ou inconsistente", 
        description: erros.join(". ") + ".",
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

    const sulcoVariacao = sulcoAnteriorNum ? sulcoAnteriorNum - sulcoAtualNum : null;
    const pressaoDiferenca = pressaoAtualNum - pressaoRecomendadaNum;
    const kmPeriodo = kmAnteriorNum ? kmAtualNum - kmAnteriorNum : null;
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

  const calcularDadosPneu = (coleta: Coleta, taxaMediaFrota: number): DadosPneuCalculado => {
    const desgaste_mm = coleta.sulco_anterior ? coleta.sulco_anterior - coleta.sulco_atual : 0;
    const km_rodado = coleta.km_anterior ? coleta.km_atual - coleta.km_anterior : 0;
    const taxa_desgaste = km_rodado > 0 && desgaste_mm > 0 ? (desgaste_mm / km_rodado) * 1000 : 0;
    
    let vida_restante_km = 0;
    if (coleta.sulco_atual > SULCO_IDEAL_REFORMA && taxa_desgaste > 0) {
      vida_restante_km = ((coleta.sulco_atual - SULCO_IDEAL_REFORMA) / taxa_desgaste) * 1000;
    }

    let status_sulco: 'saudavel' | 'atencao' | 'retirar' | 'critico';
    if (coleta.sulco_atual <= SULCO_MINIMO_TWI) status_sulco = 'critico';
    else if (coleta.sulco_atual <= SULCO_IDEAL_REFORMA) status_sulco = 'retirar';
    else if (coleta.sulco_atual <= 6) status_sulco = 'atencao';
    else status_sulco = 'saudavel';

    const desvio_pressao_percentual = Math.abs((coleta.pressao_diferenca || 0) / coleta.pressao_recomendada) * 100;
    
    let status_pressao: 'ok' | 'atencao' | 'critico';
    if (desvio_pressao_percentual <= 5) status_pressao = 'ok';
    else if (desvio_pressao_percentual <= 10) status_pressao = 'atencao';
    else status_pressao = 'critico';

    let risco: 'baixo' | 'medio' | 'alto';
    if (status_sulco === 'critico' || status_sulco === 'retirar' || taxa_desgaste > taxaMediaFrota * 1.5) risco = 'alto';
    else if (status_pressao !== 'ok' || status_sulco === 'atencao') risco = 'medio';
    else risco = 'baixo';

    const desgaste_anomalo = taxa_desgaste > 0 && taxaMediaFrota > 0 && taxa_desgaste > taxaMediaFrota;

    // Custo por km (PASSO 3)
    const custo_por_km = km_rodado > 0 ? VALOR_PNEU_MEDIO / (vida_restante_km + km_rodado) : undefined;

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
      custo_por_km,
    };
  };

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

  const coletasCalculadas: DadosPneuCalculado[] = coletasFiltradas.map(c => calcularDadosPneu(c, taxaMediaFrota));

  const clearFilters = () => {
    setFilterCliente("");
    setFilterVeiculo("");
    setFilterDataInicio(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setFilterDataFim(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  // KPIs
  const totalPneus = coletasCalculadas.length;
  const pneusSaudaveis = coletasCalculadas.filter(c => c.status_sulco === 'saudavel').length;
  const pneusAtencao = coletasCalculadas.filter(c => c.status_sulco === 'atencao').length;
  const pneusRetirar = coletasCalculadas.filter(c => c.status_sulco === 'retirar').length;
  const pneusCriticos = coletasCalculadas.filter(c => c.status_sulco === 'critico').length;

  const desgasteMedio = coletasCalculadas.filter(c => c.desgaste_mm > 0).length > 0
    ? (coletasCalculadas.reduce((acc, c) => acc + c.desgaste_mm, 0) / coletasCalculadas.filter(c => c.desgaste_mm > 0).length).toFixed(2)
    : "0";

  const vidaMediaRestante = coletasCalculadas.filter(c => c.vida_restante_km > 0).length > 0
    ? Math.round(coletasCalculadas.filter(c => c.vida_restante_km > 0).reduce((acc, c) => acc + c.vida_restante_km, 0) / coletasCalculadas.filter(c => c.vida_restante_km > 0).length)
    : 0;

  const pressaoForaPadrao = totalPneus > 0
    ? ((coletasCalculadas.filter(c => c.status_pressao !== 'ok').length / totalPneus) * 100).toFixed(1)
    : "0";

  const custoMedioPorKm = coletasCalculadas.filter(c => c.custo_por_km).length > 0
    ? (coletasCalculadas.filter(c => c.custo_por_km).reduce((acc, c) => acc + (c.custo_por_km || 0), 0) / coletasCalculadas.filter(c => c.custo_por_km).length).toFixed(2)
    : "0";

  // Resumos automáticos (PASSO 4)
  const pneusDianteiros = coletasCalculadas.filter(c => c.posicao_pneu.startsWith('D')).length;
  const pneusTraseiros = coletasCalculadas.filter(c => c.posicao_pneu.startsWith('T')).length;
  const pneusInternos = coletasCalculadas.filter(c => c.posicao_pneu.includes('I')).length;
  const pneusExternos = coletasCalculadas.filter(c => c.posicao_pneu.includes('E') && !c.posicao_pneu.includes('ESP')).length;

  // % desgaste anormal
  const percentDesgasteAnormal = totalPneus > 0
    ? ((coletasCalculadas.filter(c => c.desgaste_anomalo).length / totalPneus) * 100).toFixed(1)
    : "0";

  // Ranking de veículos por custo (PASSO 4)
  const rankingVeiculos = Object.entries(
    coletasCalculadas.reduce((acc, c) => {
      const veiculo = c.veiculos?.placa || 'N/A';
      if (!acc[veiculo]) acc[veiculo] = { total: 0, count: 0 };
      if (c.custo_por_km) {
        acc[veiculo].total += c.custo_por_km;
        acc[veiculo].count += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; count: number }>)
  )
    .map(([veiculo, data]) => ({ veiculo, custoMedio: data.count > 0 ? data.total / data.count : 0 }))
    .sort((a, b) => b.custoMedio - a.custoMedio)
    .slice(0, 5);

  const statusPieData = [
    { name: 'Saudável', value: pneusSaudaveis, color: '#22c55e' },
    { name: 'Atenção', value: pneusAtencao, color: '#eab308' },
    { name: 'Retirar para Reforma', value: pneusRetirar, color: '#f97316' },
    { name: 'Crítico', value: pneusCriticos, color: '#ef4444' },
  ].filter(d => d.value > 0);

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

  // Alertas
  const alertas = coletasCalculadas.reduce((acc: { 
    tipo: string; nivel: 'critico' | 'atencao'; mensagem: string; 
    veiculo: string; posicao: string; recomendacao: string; data: string 
  }[], c) => {
    if (c.status_sulco === 'critico') {
      acc.push({
        tipo: 'sulco', nivel: 'critico',
        mensagem: `⛔ Sulco crítico: ${c.sulco_atual}mm`,
        veiculo: c.veiculos?.placa || '', posicao: c.posicao_pneu,
        recomendacao: 'Retirar imediatamente de circulação.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    } else if (c.status_sulco === 'retirar') {
      acc.push({
        tipo: 'sulco', nivel: 'critico',
        mensagem: `🔴 Retirar para reforma: ${c.sulco_atual}mm`,
        veiculo: c.veiculos?.placa || '', posicao: c.posicao_pneu,
        recomendacao: 'Programar recapagem.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    if (c.status_pressao === 'critico') {
      acc.push({
        tipo: 'pressao', nivel: 'critico',
        mensagem: `❌ Pressão crítica: ${c.pressao_atual}psi (${c.desvio_pressao_percentual.toFixed(1)}% desvio)`,
        veiculo: c.veiculos?.placa || '', posicao: c.posicao_pneu,
        recomendacao: 'Impacta desgaste e consumo de combustível.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    if (c.desgaste_anomalo && c.taxa_desgaste > 0) {
      acc.push({
        tipo: 'desgaste', nivel: 'atencao',
        mensagem: `🔔 Desgaste acima da média: ${c.taxa_desgaste.toFixed(2)} mm/1000km`,
        veiculo: c.veiculos?.placa || '', posicao: c.posicao_pneu,
        recomendacao: 'Verificar alinhamento e carga.',
        data: new Date(c.data_medicao).toLocaleDateString('pt-BR'),
      });
    }

    return acc;
  }, []);

  const alertasCriticos = alertas.filter(a => a.nivel === 'critico');
  const alertasAtencao = alertas.filter(a => a.nivel === 'atencao');

  const getStatusSulcoBadge = (status: 'saudavel' | 'atencao' | 'retirar' | 'critico') => {
    switch (status) {
      case 'saudavel': return <Badge className="bg-green-500 hover:bg-green-600">🟢 Saudável</Badge>;
      case 'atencao': return <Badge className="bg-yellow-500 hover:bg-yellow-600">🟡 Atenção</Badge>;
      case 'retirar': return <Badge className="bg-orange-500 hover:bg-orange-600">🔴 Retirar</Badge>;
      case 'critico': return <Badge variant="destructive">⛔ Crítico</Badge>;
    }
  };

  const getStatusPressaoBadge = (status: 'ok' | 'atencao' | 'critico') => {
    switch (status) {
      case 'ok': return <Badge className="bg-green-500 hover:bg-green-600">✅ OK</Badge>;
      case 'atencao': return <Badge className="bg-yellow-500 hover:bg-yellow-600">⚠ Atenção</Badge>;
      case 'critico': return <Badge variant="destructive">❌ Crítico</Badge>;
    }
  };

  const getRiscoBadge = (risco: 'baixo' | 'medio' | 'alto') => {
    switch (risco) {
      case 'baixo': return <Badge className="bg-blue-500 hover:bg-blue-600">🔵 Baixo</Badge>;
      case 'medio': return <Badge className="bg-orange-500 hover:bg-orange-600">🟠 Médio</Badge>;
      case 'alto': return <Badge variant="destructive">🔴 Alto</Badge>;
    }
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    toast({ title: "Gerando PDF..." });

    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);

      pdf.setFontSize(18);
      pdf.text("Relatório MVP Manual Rastro", pdfWidth / 2, 8, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pdfWidth / 2, 14, { align: "center" });
      pdf.addImage(imgData, "PNG", (pdfWidth - canvas.width * ratio) / 2, 20, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`relatorio-rastro-${new Date().toISOString().split("T")[0]}.pdf`);

      toast({ title: "PDF exportado com sucesso!" });
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const veiculosDoCliente = filterCliente ? veiculos.filter(v => v.cliente_id === filterCliente) : veiculos;
  const { pneusRodantes, totalPneus: totalPneusCalc } = calcularTotaisPneus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">MVP Manual Rastro</h1>
        <p className="text-muted-foreground">O operador mede • O sistema calcula • O gestor decide</p>
      </div>

      <Tabs defaultValue="coleta" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="coleta">Coleta de Pneus</TabsTrigger>
          <TabsTrigger value="veiculos">Cadastro de Veículos</TabsTrigger>
          <TabsTrigger value="resumos">Resumos Automáticos</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* ABA 1: Coleta de Pneus */}
        <TabsContent value="coleta" className="space-y-6">
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
                          <SelectItem key={v.id} value={v.id}>
                            {v.placa} - {v.tipo_veiculo || v.modelo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {veiculoSelecionado && (
                    <div className="space-y-2">
                      <Label>Info Veículo</Label>
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        <p>{veiculoSelecionado.tipo_veiculo} ({veiculoSelecionado.categoria})</p>
                        <p>{veiculoSelecionado.quantidade_eixos} eixos • {veiculoSelecionado.total_pneus} pneus</p>
                      </div>
                    </div>
                  )}
                </div>

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
                        {posicoesDisponiveis.length > 0 ? (
                          posicoesDisponiveis.map(p => (
                            <SelectItem key={p} value={p}>{p} - {getNomenclaturaCompleta(p)}</SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="D1E">D1E - Dianteiro Esquerdo</SelectItem>
                            <SelectItem value="D1D">D1D - Dianteiro Direito</SelectItem>
                            <SelectItem value="T2EE">T2EE - Traseiro 2 Esq Externo</SelectItem>
                            <SelectItem value="T2EI">T2EI - Traseiro 2 Esq Interno</SelectItem>
                            <SelectItem value="T2DI">T2DI - Traseiro 2 Dir Interno</SelectItem>
                            <SelectItem value="T2DE">T2DE - Traseiro 2 Dir Externo</SelectItem>
                          </>
                        )}
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
        </TabsContent>

        {/* ABA 2: Cadastro de Veículos */}
        <TabsContent value="veiculos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Cadastro Avançado de Veículos
              </CardTitle>
              <CardDescription>
                Configure tipo, eixos, estepes e calcule automaticamente a quantidade de pneus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Seletor de Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Input value={novoCliente} onChange={e => setNovoCliente(e.target.value)} placeholder="Nome do cliente" />
                      <Button type="button" variant="outline" onClick={handleAddCliente}>+</Button>
                    </div>
                  </div>
                </div>

                {/* Dados do Veículo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Placa *</Label>
                    <Input 
                      value={novoVeiculo.placa} 
                      onChange={e => setNovoVeiculo(p => ({ ...p, placa: e.target.value.toUpperCase() }))} 
                      placeholder="ABC1D23" 
                      maxLength={7}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input 
                      value={novoVeiculo.modelo} 
                      onChange={e => setNovoVeiculo(p => ({ ...p, modelo: e.target.value }))} 
                      placeholder="Ex: Volvo FH 540" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Km Médio Mensal</Label>
                    <Input 
                      type="number"
                      value={novoVeiculo.km_medio_mensal} 
                      onChange={e => setNovoVeiculo(p => ({ ...p, km_medio_mensal: parseInt(e.target.value) || 0 }))} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Veículo *</Label>
                    <Select 
                      value={novoVeiculo.tipo_veiculo} 
                      onValueChange={(v) => setNovoVeiculo(p => ({ ...p, tipo_veiculo: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_VEICULO.map(t => (
                          <SelectItem key={t.tipo} value={t.tipo}>
                            {t.tipo} ({t.pneus} pneus)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select 
                      value={novoVeiculo.categoria} 
                      onValueChange={(v) => setNovoVeiculo(p => ({ ...p, categoria: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantidade de Eixos</Label>
                    <Input 
                      type="number"
                      min="2"
                      max="10"
                      value={novoVeiculo.quantidade_eixos} 
                      onChange={e => setNovoVeiculo(p => ({ ...p, quantidade_eixos: parseInt(e.target.value) || 2 }))} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={novoVeiculo.possui_estepe} 
                      onCheckedChange={(checked) => setNovoVeiculo(p => ({ ...p, possui_estepe: checked }))}
                    />
                    <Label>Possui Estepe?</Label>
                  </div>

                  {novoVeiculo.possui_estepe && (
                    <div className="space-y-2">
                      <Label>Quantidade de Estepes</Label>
                      <Input 
                        type="number"
                        min="1"
                        max="4"
                        value={novoVeiculo.quantidade_estepes} 
                        onChange={e => setNovoVeiculo(p => ({ ...p, quantidade_estepes: parseInt(e.target.value) || 1 }))} 
                      />
                    </div>
                  )}
                </div>

                {/* Resumo Automático */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Cálculos Automáticos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Pneus Rodantes</p>
                        <p className="text-2xl font-bold">{pneusRodantes}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estepes</p>
                        <p className="text-2xl font-bold">{novoVeiculo.possui_estepe ? novoVeiculo.quantidade_estepes : 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Geral</p>
                        <p className="text-2xl font-bold text-primary">{totalPneusCalc}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Eixos</p>
                        <p className="text-2xl font-bold">{novoVeiculo.quantidade_eixos}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handleAddVeiculo} disabled={!selectedCliente || !novoVeiculo.placa.trim()}>
                  Cadastrar Veículo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Veículos Cadastrados */}
          <Card>
            <CardHeader>
              <CardTitle>Veículos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Eixos</TableHead>
                    <TableHead>Pneus</TableHead>
                    <TableHead>Estepes</TableHead>
                    <TableHead>Km/Mês</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {veiculos.slice(0, 10).map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.placa}</TableCell>
                      <TableCell>{v.tipo_veiculo || '-'}</TableCell>
                      <TableCell>{v.categoria || '-'}</TableCell>
                      <TableCell>{v.quantidade_eixos || '-'}</TableCell>
                      <TableCell>{v.total_pneus || '-'}</TableCell>
                      <TableCell>{v.quantidade_estepes || 0}</TableCell>
                      <TableCell>{v.km_medio_mensal?.toLocaleString() || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: Resumos Automáticos */}
        <TabsContent value="resumos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Dianteiros</p>
                    <p className="text-2xl font-bold">{pneusDianteiros}</p>
                  </div>
                  <CircleDot className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Traseiros</p>
                    <p className="text-2xl font-bold">{pneusTraseiros}</p>
                  </div>
                  <CircleDot className="h-6 w-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Internos</p>
                    <p className="text-2xl font-bold">{pneusInternos}</p>
                  </div>
                  <CircleDot className="h-6 w-6 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Externos</p>
                    <p className="text-2xl font-bold">{pneusExternos}</p>
                  </div>
                  <CircleDot className="h-6 w-6 text-teal-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KPIs Financeiros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Indicadores Financeiros (KPI)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Custo Médio por Km</span>
                  <span className="font-bold text-lg">R$ {custoMedioPorKm}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">% Desgaste Anormal</span>
                  <span className="font-bold text-lg text-orange-500">{percentDesgasteAnormal}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Vida Média Restante</span>
                  <span className="font-bold text-lg">{vidaMediaRestante.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taxa Média Frota</span>
                  <span className="font-bold text-lg">{taxaMediaFrota.toFixed(2)} mm/1000km</span>
                </div>
              </CardContent>
            </Card>

            {/* Ranking de Veículos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Ranking: Veículos Mais Caros
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingVeiculos.length > 0 ? (
                  <div className="space-y-3">
                    {rankingVeiculos.map((v, idx) => (
                      <div key={v.veiculo} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge variant={idx === 0 ? "destructive" : "outline"}>{idx + 1}º</Badge>
                          <span>{v.veiculo}</span>
                        </div>
                        <span className="font-bold">R$ {v.custoMedio.toFixed(2)}/km</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sem dados suficientes</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumo por Tipo de Veículo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Tipo de Veículo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd Veículos</TableHead>
                    <TableHead>Total Pneus</TableHead>
                    <TableHead>Categoria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    veiculos.reduce((acc, v) => {
                      const tipo = v.tipo_veiculo || 'Não definido';
                      if (!acc[tipo]) acc[tipo] = { count: 0, pneus: 0, categoria: v.categoria || '-' };
                      acc[tipo].count += 1;
                      acc[tipo].pneus += v.total_pneus || 0;
                      return acc;
                    }, {} as Record<string, { count: number; pneus: number; categoria: string }>)
                  ).map(([tipo, data]) => (
                    <TableRow key={tipo}>
                      <TableCell className="font-medium">{tipo}</TableCell>
                      <TableCell>{data.count}</TableCell>
                      <TableCell>{data.pneus}</TableCell>
                      <TableCell><Badge variant="outline">{data.categoria}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <div ref={dashboardRef} className="bg-background p-4 rounded-lg space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-foreground">Dashboard Geral</h2>
              <div className="flex flex-wrap items-center gap-2">
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
                  <Input type="date" value={filterDataInicio} onChange={e => setFilterDataInicio(e.target.value)} className="w-[140px]" />
                  <span className="text-muted-foreground">até</span>
                  <Input type="date" value={filterDataFim} onChange={e => setFilterDataFim(e.target.value)} className="w-[140px]" />
                </div>
                <Button onClick={handleExportPDF} disabled={exporting} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? "Exportando..." : "PDF"}
                </Button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total Pneus</p>
                  <p className="text-2xl font-bold">{totalPneus}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">🟢 Saudáveis</p>
                  <p className="text-2xl font-bold text-green-600">{pneusSaudaveis}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">🟡 Atenção</p>
                  <p className="text-2xl font-bold text-yellow-600">{pneusAtencao}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">🔴 Retirar</p>
                  <p className="text-2xl font-bold text-orange-600">{pneusRetirar}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">⛔ Críticos</p>
                  <p className="text-2xl font-bold text-red-600">{pneusCriticos}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Vida Média (km)</p>
                  <p className="text-2xl font-bold">{vidaMediaRestante.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                      <p className="text-sm text-muted-foreground">Custo/km Médio</p>
                      <p className="text-xl font-bold">R$ {custoMedioPorKm}</p>
                    </div>
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alertas */}
            {alertas.length > 0 && (
              <Card className="border-l-4 border-l-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Alertas Automáticos ({alertas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value" label={({ value }) => `${value}`}>
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">Sem dados</div>
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

            {/* Tabela de Medições */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Medições (Dados Calculados)</CardTitle>
                <CardDescription>Taxa de desgaste, vida útil estimada e classificação de risco</CardDescription>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Pressão</TableHead>
                        <TableHead>Taxa Desg.</TableHead>
                        <TableHead>Vida Restante</TableHead>
                        <TableHead>Custo/km</TableHead>
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
                          <TableCell>
                            {c.taxa_desgaste > 0 ? (
                              <span className={c.desgaste_anomalo ? "text-orange-600 font-medium" : ""}>
                                {c.taxa_desgaste.toFixed(2)} {c.desgaste_anomalo && "⚠"}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell>{c.vida_restante_km > 0 ? `${Math.round(c.vida_restante_km).toLocaleString()} km` : "-"}</TableCell>
                          <TableCell>{c.custo_por_km ? `R$ ${c.custo_por_km.toFixed(2)}` : "-"}</TableCell>
                          <TableCell>{getRiscoBadge(c.risco)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
