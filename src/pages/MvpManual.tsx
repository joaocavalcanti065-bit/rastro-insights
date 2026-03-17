import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Plus, TrendingDown, Gauge, DollarSign, AlertTriangle, Download, AlertCircle, XCircle, Truck, CheckCircle2, CircleDot, Package, ArrowRightLeft, Hash, Tag } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { RetroactiveDatePicker } from "@/components/RetroactiveDatePicker";
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

interface Pneu {
  id: string;
  id_unico: string;
  cliente_id: string;
  marca: string;
  modelo_pneu: string | null;
  medida: string | null;
  valor_aquisicao: number | null;
  data_aquisicao: string | null;
  localizacao: string;
  veiculo_id: string | null;
  posicao_atual: string | null;
  numero_recapagens: number;
  vida_atual: number;
  sulco_inicial: number | null;
  status: string;
  observacoes: string | null;
  created_at: string;
}

interface Movimentacao {
  id: string;
  pneu_id: string;
  tipo_movimentacao: string;
  origem: string | null;
  destino: string | null;
  veiculo_origem_id: string | null;
  veiculo_destino_id: string | null;
  posicao_destino: string | null;
  data_movimentacao: string;
  observacoes: string | null;
  created_at: string;
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

const MARCAS_PNEU = [
  'Michelin', 'Pirelli', 'Bridgestone', 'Goodyear', 'Continental',
  'Dunlop', 'Xbri', 'Firestone', 'Yokohama', 'Hankook',
  'Vipal', 'Bandag', 'Recap', 'Outra'
];

const LOCALIZACOES = [
  { value: 'estoque', label: '📦 Estoque' },
  { value: 'veiculo', label: '🚛 No Veículo' },
  { value: 'manutencao', label: '🔧 Manutenção' },
  { value: 'recapagem', label: '♻️ Recapagem' },
  { value: 'sucata', label: '🗑️ Sucata' },
];

const gerarPosicoesPneu = (veiculo: Veiculo | null): string[] => {
  if (!veiculo) return [];
  const posicoes: string[] = [];
  const eixos = veiculo.quantidade_eixos || 3;
  posicoes.push('D1E', 'D1D');
  for (let i = 2; i <= eixos; i++) {
    const tipoVeiculo = TIPOS_VEICULO.find(t => t.tipo === veiculo.tipo_veiculo);
    const isDuplo = tipoVeiculo ? tipoVeiculo.pneus > 4 : true;
    if (isDuplo) {
      posicoes.push(`T${i}EE`, `T${i}EI`, `T${i}DI`, `T${i}DE`);
    } else {
      posicoes.push(`T${i}E`, `T${i}D`);
    }
  }
  if (veiculo.possui_estepe && veiculo.quantidade_estepes) {
    for (let i = 1; i <= veiculo.quantidade_estepes; i++) {
      posicoes.push(`ESP${i}`);
    }
  }
  return posicoes;
};

const getNomenclaturaCompleta = (codigo: string): string => {
  const map: Record<string, string> = {
    'D1E': 'Dianteiro 1 Esquerdo', 'D1D': 'Dianteiro 1 Direito',
    'T2EE': 'Traseiro 2 Esq Externo', 'T2EI': 'Traseiro 2 Esq Interno',
    'T2DI': 'Traseiro 2 Dir Interno', 'T2DE': 'Traseiro 2 Dir Externo',
    'T3EE': 'Traseiro 3 Esq Externo', 'T3EI': 'Traseiro 3 Esq Interno',
    'T3DI': 'Traseiro 3 Dir Interno', 'T3DE': 'Traseiro 3 Dir Externo',
    'T4EE': 'Traseiro 4 Esq Externo', 'T4EI': 'Traseiro 4 Esq Interno',
    'T4DI': 'Traseiro 4 Dir Interno', 'T4DE': 'Traseiro 4 Dir Externo',
    'ESP1': 'Estepe 1', 'ESP2': 'Estepe 2',
    'T2E': 'Traseiro 2 Esquerdo', 'T2D': 'Traseiro 2 Direito',
    'T3E': 'Traseiro 3 Esquerdo', 'T3D': 'Traseiro 3 Direito',
  };
  return map[codigo] || codigo;
};

const SULCO_MINIMO_TWI = 1.6;
const SULCO_IDEAL_REFORMA = 3.0;
const VALOR_PNEU_MEDIO = 3200;

export default function MvpManual() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [coletas, setColetas] = useState<Coleta[]>([]);
  const [pneus, setPneus] = useState<Pneu[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
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
  const [pressaoRecomendada, setPressaoRecomendada] = useState("110");
  const [kmAtual, setKmAtual] = useState("");
  const [kmAnterior, setKmAnterior] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Form state - Novo Cliente
  const [novoCliente, setNovoCliente] = useState("");

  // Form state - Novo Veículo
  const [novoVeiculo, setNovoVeiculo] = useState({
    placa: "", modelo: "", tipo_veiculo: "Truck", categoria: "Pesado",
    quantidade_eixos: 3, possui_estepe: false, quantidade_estepes: 0, km_medio_mensal: 12000,
  });

  // Form state - Novo Pneu (Cadastro Único)
  const [novoPneu, setNovoPneu] = useState({
    id_unico: "", marca: "Michelin", modelo_pneu: "", medida: "295/80 R22.5",
    valor_aquisicao: "3200", localizacao: "estoque", sulco_inicial: "16",
    observacoes: "",
  });

  // Form state - Movimentação
  const [movForm, setMovForm] = useState({
    pneu_id: "", tipo: "estoque_para_veiculo", veiculo_destino_id: "",
    posicao_destino: "", observacoes: "", data: new Date().toISOString().split("T")[0],
  });

  const [posicoesDisponiveis, setPosicoesDisponiveis] = useState<string[]>([]);

  useEffect(() => { fetchData(); setupRealtime(); }, []);

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
      if (veiculo) setPosicoesDisponiveis(gerarPosicoesPneu(veiculo));
    } else {
      setVeiculoSelecionado(null);
      setPosicoesDisponiveis([]);
    }
  }, [selectedVeiculo, veiculos]);

  useEffect(() => {
    if (selectedVeiculo && posicaoPneu) fetchLastMeasurement();
  }, [selectedVeiculo, posicaoPneu]);

  useEffect(() => {
    const tipoInfo = TIPOS_VEICULO.find(t => t.tipo === novoVeiculo.tipo_veiculo);
    if (tipoInfo) {
      setNovoVeiculo(prev => ({ ...prev, categoria: tipoInfo.categoria, quantidade_eixos: tipoInfo.eixos }));
    }
  }, [novoVeiculo.tipo_veiculo]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('mvp-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coleta_manual_pneus' }, () => fetchColetas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'veiculos' }, () => fetchVeiculos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pneus' }, () => fetchPneus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes_pneus' }, () => fetchMovimentacoes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const fetchData = async () => {
    await Promise.all([fetchClientes(), fetchVeiculos(), fetchColetas(), fetchPneus(), fetchMovimentacoes()]);
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

  const fetchPneus = async () => {
    const { data } = await supabase.from("pneus").select("*").order("id_unico");
    if (data) setPneus(data as Pneu[]);
  };

  const fetchMovimentacoes = async () => {
    const { data } = await supabase.from("movimentacoes_pneus").select("*").order("created_at", { ascending: false });
    if (data) setMovimentacoes(data as Movimentacao[]);
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
    } else { setSulcoAnterior(""); setKmAnterior(""); }
  };

  const handleAddCliente = async () => {
    if (!novoCliente.trim()) return;
    const { error } = await supabase.from("clientes").insert({ nome: novoCliente.trim() });
    if (!error) { toast({ title: "Cliente adicionado!" }); setNovoCliente(""); fetchClientes(); }
  };

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
      cliente_id: selectedCliente, placa: novoVeiculo.placa.trim().toUpperCase(),
      modelo: novoVeiculo.modelo.trim() || null, tipo_veiculo: novoVeiculo.tipo_veiculo,
      categoria: novoVeiculo.categoria, quantidade_eixos: novoVeiculo.quantidade_eixos,
      possui_estepe: novoVeiculo.possui_estepe,
      quantidade_estepes: novoVeiculo.possui_estepe ? novoVeiculo.quantidade_estepes : 0,
      total_pneus_rodantes: pneusRodantes, total_pneus: totalPneus,
      km_medio_mensal: novoVeiculo.km_medio_mensal,
    });
    if (!error) {
      toast({ title: "Veículo cadastrado!" });
      setNovoVeiculo({ placa: "", modelo: "", tipo_veiculo: "Truck", categoria: "Pesado", quantidade_eixos: 3, possui_estepe: false, quantidade_estepes: 0, km_medio_mensal: 12000 });
      fetchVeiculos();
    } else {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // === CADASTRO DE PNEU ÚNICO ===
  const handleAddPneu = async () => {
    if (!novoPneu.id_unico.trim() || !selectedCliente) return;
    const { error } = await supabase.from("pneus").insert({
      id_unico: novoPneu.id_unico.trim().toUpperCase(),
      cliente_id: selectedCliente,
      marca: novoPneu.marca,
      modelo_pneu: novoPneu.modelo_pneu || null,
      medida: novoPneu.medida || null,
      valor_aquisicao: parseFloat(novoPneu.valor_aquisicao) || 3200,
      localizacao: novoPneu.localizacao,
      sulco_inicial: parseFloat(novoPneu.sulco_inicial) || 16,
      observacoes: novoPneu.observacoes || null,
    } as any);
    if (!error) {
      toast({ title: `Pneu ${novoPneu.id_unico.toUpperCase()} cadastrado!` });
      setNovoPneu({ id_unico: "", marca: "Michelin", modelo_pneu: "", medida: "295/80 R22.5", valor_aquisicao: "3200", localizacao: "estoque", sulco_inicial: "16", observacoes: "" });
      fetchPneus();
    } else {
      toast({ title: "Erro ao cadastrar pneu", description: error.message, variant: "destructive" });
    }
  };

  // === MOVIMENTAÇÃO DE PNEU ===
  const handleMovimentacao = async () => {
    if (!movForm.pneu_id) return;
    const pneu = pneus.find(p => p.id === movForm.pneu_id);
    if (!pneu) return;

    let novaLocalizacao = '';
    let novoVeiculoId: string | null = null;
    let novaPosicao: string | null = null;
    let origem = pneu.localizacao;
    let destino = '';

    switch (movForm.tipo) {
      case 'estoque_para_veiculo':
        novaLocalizacao = 'veiculo';
        novoVeiculoId = movForm.veiculo_destino_id || null;
        novaPosicao = movForm.posicao_destino || null;
        destino = `Veículo ${veiculos.find(v => v.id === movForm.veiculo_destino_id)?.placa || ''}`;
        break;
      case 'veiculo_para_estoque':
        novaLocalizacao = 'estoque';
        destino = 'Estoque';
        break;
      case 'veiculo_para_manutencao':
        novaLocalizacao = 'manutencao';
        destino = 'Manutenção';
        break;
      case 'manutencao_para_estoque':
        novaLocalizacao = 'estoque';
        destino = 'Estoque';
        break;
      case 'para_recapagem':
        novaLocalizacao = 'recapagem';
        destino = 'Recapagem';
        break;
      case 'para_sucata':
        novaLocalizacao = 'sucata';
        destino = 'Sucata';
        break;
    }

    // Insert movement record
    const { error: movError } = await supabase.from("movimentacoes_pneus").insert({
      pneu_id: pneu.id,
      tipo_movimentacao: movForm.tipo,
      origem,
      destino,
      veiculo_destino_id: novoVeiculoId,
      posicao_destino: novaPosicao,
      data_movimentacao: movForm.data,
      observacoes: movForm.observacoes || null,
    } as any);

    if (movError) {
      toast({ title: "Erro na movimentação", description: movError.message, variant: "destructive" });
      return;
    }

    // Update pneu location
    const updateData: any = {
      localizacao: novaLocalizacao,
      veiculo_id: novoVeiculoId,
      posicao_atual: novaPosicao,
    };
    if (novaLocalizacao === 'sucata') updateData.status = 'inativo';
    if (movForm.tipo === 'para_recapagem') {
      updateData.numero_recapagens = (pneu.numero_recapagens || 0) + 1;
      updateData.vida_atual = (pneu.vida_atual || 1) + 1;
    }

    await supabase.from("pneus").update(updateData).eq("id", pneu.id);

    toast({ title: `Pneu ${pneu.id_unico} movido para ${destino}` });
    setMovForm({ pneu_id: "", tipo: "estoque_para_veiculo", veiculo_destino_id: "", posicao_destino: "", observacoes: "", data: new Date().toISOString().split("T")[0] });
    fetchPneus();
    fetchMovimentacoes();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const erros: string[] = [];
    if (!sulcoAtual || parseFloat(sulcoAtual) <= 0) erros.push("Sulco atual não informado");
    if (!pressaoAtual || parseFloat(pressaoAtual) <= 0) erros.push("Pressão atual não informada");
    if (kmAnterior && parseInt(kmAtual) <= parseInt(kmAnterior)) erros.push("Km atual deve ser maior que Km anterior");
    if (!posicaoPneu) erros.push("Posição do pneu não definida");

    if (erros.length > 0) {
      toast({ title: "Medição incompleta", description: erros.join(". "), variant: "destructive" });
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
    const kmPorMm = sulcoVariacao && sulcoVariacao > 0 && kmPeriodo && kmPeriodo > 0 ? kmPeriodo / sulcoVariacao : null;

    const { error } = await supabase.from("coleta_manual_pneus").insert({
      cliente_id: selectedCliente, veiculo_id: selectedVeiculo, data_medicao: dataMedicao,
      posicao_pneu: posicaoPneu, sulco_atual: sulcoAtualNum, sulco_anterior: sulcoAnteriorNum,
      sulco_variacao: sulcoVariacao, pressao_atual: pressaoAtualNum,
      pressao_recomendada: pressaoRecomendadaNum, pressao_diferenca: pressaoDiferenca,
      km_atual: kmAtualNum, km_anterior: kmAnteriorNum, km_periodo: kmPeriodo,
      km_por_mm: kmPorMm, observacoes: observacoes || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Medição salva!" });
      setPosicaoPneu(""); setSulcoAtual(""); setSulcoAnterior(""); setPressaoAtual("");
      setKmAtual(""); setKmAnterior(""); setObservacoes("");
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
    const custo_por_km = km_rodado > 0 ? VALOR_PNEU_MEDIO / (vida_restante_km + km_rodado) : undefined;

    return { ...coleta, desgaste_mm, km_rodado, taxa_desgaste, vida_restante_km, status_sulco, status_pressao, desvio_pressao_percentual, risco, desgaste_anomalo, custo_por_km };
  };

  // Filtered data
  const coletasFiltradas = coletas.filter(c => {
    const matchCliente = !filterCliente || c.cliente_id === filterCliente;
    const matchVeiculo = !filterVeiculo || c.veiculo_id === filterVeiculo;
    const dataColeta = parseISO(c.data_medicao);
    const matchPeriodo = isWithinInterval(dataColeta, { start: parseISO(filterDataInicio), end: parseISO(filterDataFim) });
    return matchCliente && matchVeiculo && matchPeriodo;
  });

  const taxasDesgaste = coletasFiltradas
    .filter(c => c.sulco_anterior && c.km_anterior)
    .map(c => {
      const desgaste = (c.sulco_anterior || 0) - c.sulco_atual;
      const km = c.km_atual - (c.km_anterior || 0);
      return km > 0 && desgaste > 0 ? (desgaste / km) * 1000 : 0;
    }).filter(t => t > 0);

  const taxaMediaFrota = taxasDesgaste.length > 0 ? taxasDesgaste.reduce((a, b) => a + b, 0) / taxasDesgaste.length : 0;
  const coletasCalculadas: DadosPneuCalculado[] = coletasFiltradas.map(c => calcularDadosPneu(c, taxaMediaFrota));

  // KPIs
  const totalPneusColeta = coletasCalculadas.length;
  const pneusSaudaveis = coletasCalculadas.filter(c => c.status_sulco === 'saudavel').length;
  const pneusAtencao = coletasCalculadas.filter(c => c.status_sulco === 'atencao').length;
  const pneusRetirar = coletasCalculadas.filter(c => c.status_sulco === 'retirar').length;
  const pneusCriticos = coletasCalculadas.filter(c => c.status_sulco === 'critico').length;

  const desgasteMedio = coletasCalculadas.filter(c => c.desgaste_mm > 0).length > 0
    ? (coletasCalculadas.reduce((acc, c) => acc + c.desgaste_mm, 0) / coletasCalculadas.filter(c => c.desgaste_mm > 0).length).toFixed(2) : "0";

  const vidaMediaRestante = coletasCalculadas.filter(c => c.vida_restante_km > 0).length > 0
    ? Math.round(coletasCalculadas.filter(c => c.vida_restante_km > 0).reduce((acc, c) => acc + c.vida_restante_km, 0) / coletasCalculadas.filter(c => c.vida_restante_km > 0).length) : 0;

  const pressaoForaPadrao = totalPneusColeta > 0
    ? ((coletasCalculadas.filter(c => c.status_pressao !== 'ok').length / totalPneusColeta) * 100).toFixed(1) : "0";

  const custoMedioPorKm = coletasCalculadas.filter(c => c.custo_por_km).length > 0
    ? (coletasCalculadas.filter(c => c.custo_por_km).reduce((acc, c) => acc + (c.custo_por_km || 0), 0) / coletasCalculadas.filter(c => c.custo_por_km).length).toFixed(2) : "0";

  const pneusDianteiros = coletasCalculadas.filter(c => c.posicao_pneu.startsWith('D')).length;
  const pneusTraseiros = coletasCalculadas.filter(c => c.posicao_pneu.startsWith('T')).length;
  const pneusInternos = coletasCalculadas.filter(c => c.posicao_pneu.includes('I')).length;
  const pneusExternos = coletasCalculadas.filter(c => c.posicao_pneu.includes('E') && !c.posicao_pneu.includes('ESP')).length;
  const percentDesgasteAnormal = totalPneusColeta > 0
    ? ((coletasCalculadas.filter(c => c.desgaste_anomalo).length / totalPneusColeta) * 100).toFixed(1) : "0";

  // Inventory KPIs
  const pneusNoEstoque = pneus.filter(p => p.localizacao === 'estoque' && p.status === 'ativo').length;
  const pneusNoVeiculo = pneus.filter(p => p.localizacao === 'veiculo' && p.status === 'ativo').length;
  const pneusEmManutencao = pneus.filter(p => p.localizacao === 'manutencao' || p.localizacao === 'recapagem').length;
  const pneusNaSucata = pneus.filter(p => p.localizacao === 'sucata' || p.status === 'inativo').length;
  const valorTotalEstoque = pneus.filter(p => p.status === 'ativo').reduce((acc, p) => acc + (p.valor_aquisicao || 0), 0);

  // Ranking veículos
  const rankingVeiculos = Object.entries(
    coletasCalculadas.reduce((acc, c) => {
      const veiculo = c.veiculos?.placa || 'N/A';
      if (!acc[veiculo]) acc[veiculo] = { total: 0, count: 0 };
      if (c.custo_por_km) { acc[veiculo].total += c.custo_por_km; acc[veiculo].count += 1; }
      return acc;
    }, {} as Record<string, { total: number; count: number }>)
  ).map(([veiculo, data]) => ({ veiculo, custoMedio: data.count > 0 ? data.total / data.count : 0 }))
   .sort((a, b) => b.custoMedio - a.custoMedio).slice(0, 5);

  const statusPieData = [
    { name: 'Saudável', value: pneusSaudaveis, color: '#22c55e' },
    { name: 'Atenção', value: pneusAtencao, color: '#eab308' },
    { name: 'Retirar', value: pneusRetirar, color: '#f97316' },
    { name: 'Crítico', value: pneusCriticos, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const inventarioPieData = [
    { name: 'Estoque', value: pneusNoEstoque, color: '#3b82f6' },
    { name: 'Veículo', value: pneusNoVeiculo, color: '#22c55e' },
    { name: 'Manutenção', value: pneusEmManutencao, color: '#eab308' },
    { name: 'Sucata', value: pneusNaSucata, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const sulcoChartData = coletasCalculadas.slice(0, 20).reverse().map(c => ({
    data: new Date(c.data_medicao).toLocaleDateString("pt-BR"),
    sulco: c.sulco_atual, minimo: SULCO_IDEAL_REFORMA,
  }));

  const pressaoChartData = coletasCalculadas.slice(0, 10).map(c => ({
    veiculo: `${c.veiculos?.placa} - ${c.posicao_pneu}`,
    atual: c.pressao_atual, recomendada: c.pressao_recomendada,
  }));

  const alertas = coletasCalculadas.reduce((acc: { tipo: string; nivel: 'critico' | 'atencao'; mensagem: string; veiculo: string; posicao: string; recomendacao: string; data: string }[], c) => {
    if (c.status_sulco === 'critico') acc.push({ tipo: 'sulco', nivel: 'critico', mensagem: `⛔ Sulco crítico: ${c.sulco_atual}mm`, veiculo: c.veiculos?.placa || '', posicao: c.posicao_pneu, recomendacao: 'Retirar imediatamente.', data: new Date(c.data_medicao).toLocaleDateString('pt-BR') });
    else if (c.status_sulco === 'retirar') acc.push({ tipo: 'sulco', nivel: 'critico', mensagem: `🔴 Retirar para reforma: ${c.sulco_atual}mm`, veiculo: c.veiculos?.placa || '', posicao: c.posicao_pneu, recomendacao: 'Programar recapagem.', data: new Date(c.data_medicao).toLocaleDateString('pt-BR') });
    if (c.status_pressao === 'critico') acc.push({ tipo: 'pressao', nivel: 'critico', mensagem: `❌ Pressão crítica: ${c.pressao_atual}psi (${c.desvio_pressao_percentual.toFixed(1)}% desvio)`, veiculo: c.veiculos?.placa || '', posicao: c.posicao_pneu, recomendacao: 'Impacta desgaste e combustível.', data: new Date(c.data_medicao).toLocaleDateString('pt-BR') });
    if (c.desgaste_anomalo && c.taxa_desgaste > 0) acc.push({ tipo: 'desgaste', nivel: 'atencao', mensagem: `🔔 Desgaste acima da média: ${c.taxa_desgaste.toFixed(2)} mm/1000km`, veiculo: c.veiculos?.placa || '', posicao: c.posicao_pneu, recomendacao: 'Verificar alinhamento e carga.', data: new Date(c.data_medicao).toLocaleDateString('pt-BR') });
    return acc;
  }, []);

  const alertasCriticos = alertas.filter(a => a.nivel === 'critico');
  const alertasAtencao = alertas.filter(a => a.nivel === 'atencao');

  const getStatusSulcoBadge = (status: string) => {
    switch (status) {
      case 'saudavel': return <Badge className="bg-green-500 hover:bg-green-600">🟢 Saudável</Badge>;
      case 'atencao': return <Badge className="bg-yellow-500 hover:bg-yellow-600">🟡 Atenção</Badge>;
      case 'retirar': return <Badge className="bg-orange-500 hover:bg-orange-600">🔴 Retirar</Badge>;
      case 'critico': return <Badge variant="destructive">⛔ Crítico</Badge>;
      default: return null;
    }
  };

  const getRiscoBadge = (risco: string) => {
    switch (risco) {
      case 'baixo': return <Badge className="bg-blue-500 hover:bg-blue-600">🔵 Baixo</Badge>;
      case 'medio': return <Badge className="bg-orange-500 hover:bg-orange-600">🟠 Médio</Badge>;
      case 'alto': return <Badge variant="destructive">🔴 Alto</Badge>;
      default: return null;
    }
  };

  const getLocalizacaoBadge = (loc: string) => {
    switch (loc) {
      case 'estoque': return <Badge className="bg-blue-500 hover:bg-blue-600">📦 Estoque</Badge>;
      case 'veiculo': return <Badge className="bg-green-500 hover:bg-green-600">🚛 Veículo</Badge>;
      case 'manutencao': return <Badge className="bg-yellow-500 hover:bg-yellow-600">🔧 Manutenção</Badge>;
      case 'recapagem': return <Badge className="bg-purple-500 hover:bg-purple-600">♻️ Recapagem</Badge>;
      case 'sucata': return <Badge variant="outline">🗑️ Sucata</Badge>;
      default: return <Badge variant="outline">{loc}</Badge>;
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
      pdf.text("Relatório de Eficiência Operacional Rastro", pdfWidth / 2, 8, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pdfWidth / 2, 14, { align: "center" });
      pdf.addImage(imgData, "PNG", (pdfWidth - canvas.width * ratio) / 2, 20, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`relatorio-rastro-${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF exportado!" });
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const veiculosDoCliente = filterCliente ? veiculos.filter(v => v.cliente_id === filterCliente) : veiculos;
  const pneusDoCliente = selectedCliente ? pneus.filter(p => p.cliente_id === selectedCliente) : pneus;
  const { pneusRodantes, totalPneus: totalPneusCalc } = calcularTotaisPneus();

  // Movimentação: veículo destino positions
  const veiculoDestino = veiculos.find(v => v.id === movForm.veiculo_destino_id);
  const posicoesDestino = veiculoDestino ? gerarPosicoesPneu(veiculoDestino) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">MVP Manual Rastro</h1>
        <p className="text-muted-foreground">Gestão inteligente de ativos • Rastreabilidade individual • Controle financeiro</p>
      </div>

      <Tabs defaultValue="coleta" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="coleta" className="text-xs">Coleta</TabsTrigger>
          <TabsTrigger value="veiculos" className="text-xs">Veículos</TabsTrigger>
          <TabsTrigger value="pneus" className="text-xs">Pneus</TabsTrigger>
          <TabsTrigger value="movimentacoes" className="text-xs">Movimentações</TabsTrigger>
          <TabsTrigger value="resumos" className="text-xs">Resumos</TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
        </TabsList>

        {/* ABA 1: Coleta de Pneus */}
        <TabsContent value="coleta" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Injeção de Dados (Inspeção)</CardTitle>
              <CardDescription>Registre medições — o sistema cria histórico automático por posição</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {clientes.filter(c => c.id).map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
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
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {filteredVeiculos.filter(v => v.id).map(v => (<SelectItem key={v.id} value={v.id}>{v.placa} - {v.tipo_veiculo || v.modelo}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {veiculoSelecionado && (
                    <div className="space-y-2">
                      <Label>Info</Label>
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        <p>{veiculoSelecionado.tipo_veiculo} ({veiculoSelecionado.categoria})</p>
                        <p>{veiculoSelecionado.quantidade_eixos} eixos • {veiculoSelecionado.total_pneus} pneus</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <RetroactiveDatePicker
                    date={dataMedicao ? new Date(dataMedicao + "T12:00:00") : new Date()}
                    onDateChange={(d) => setDataMedicao(format(d, "yyyy-MM-dd"))}
                    label="Data *"
                  />
                  <div className="space-y-2">
                    <Label>Posição *</Label>
                    <Select value={posicaoPneu} onValueChange={setPosicaoPneu}>
                      <SelectTrigger><SelectValue placeholder="Posição" /></SelectTrigger>
                      <SelectContent>
                        {posicoesDisponiveis.length > 0 ? posicoesDisponiveis.map(p => (<SelectItem key={p} value={p}>{p} - {getNomenclaturaCompleta(p)}</SelectItem>)) : (
                          <><SelectItem value="D1E">D1E - Dianteiro Esquerdo</SelectItem><SelectItem value="D1D">D1D - Dianteiro Direito</SelectItem></>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Sulco Atual (mm) *</Label><Input type="number" step="0.1" min="0" max="20" value={sulcoAtual} onChange={e => setSulcoAtual(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Sulco Anterior</Label><Input type="number" step="0.1" value={sulcoAnterior} onChange={e => setSulcoAnterior(e.target.value)} disabled className="bg-muted" /></div>
                  <div className="space-y-2"><Label>Pressão (psi) *</Label><Input type="number" step="1" min="0" max="200" value={pressaoAtual} onChange={e => setPressaoAtual(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Pressão Recom.</Label><Input type="number" step="1" value={pressaoRecomendada} onChange={e => setPressaoRecomendada(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2"><Label>Km Atual *</Label><Input type="number" min="0" value={kmAtual} onChange={e => setKmAtual(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Km Anterior</Label><Input type="number" value={kmAnterior} onChange={e => setKmAnterior(e.target.value)} disabled className="bg-muted" /></div>
                  <div className="col-span-2 space-y-2"><Label>Observações</Label><Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Irregularidades: rasgos, bolhas, desgaste irregular..." /></div>
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
              <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Cadastro de Veículos</CardTitle>
              <CardDescription>Configure tipo, eixos, estepes — cálculo automático de pneus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{clientes.filter(c => c.id).map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Novo Cliente</Label>
                    <div className="flex gap-2">
                      <Input value={novoCliente} onChange={e => setNovoCliente(e.target.value)} placeholder="Nome" />
                      <Button type="button" variant="outline" onClick={handleAddCliente}>+</Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Veículo *</Label>
                    <Select value={novoVeiculo.tipo_veiculo} onValueChange={v => setNovoVeiculo(prev => ({ ...prev, tipo_veiculo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS_VEICULO.map(t => (<SelectItem key={t.tipo} value={t.tipo}>{t.tipo} ({t.pneus} pneus)</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Placa *</Label><Input value={novoVeiculo.placa} onChange={e => setNovoVeiculo(prev => ({ ...prev, placa: e.target.value }))} placeholder="ABC1D23" /></div>
                  <div className="space-y-2"><Label>Modelo</Label><Input value={novoVeiculo.modelo} onChange={e => setNovoVeiculo(prev => ({ ...prev, modelo: e.target.value }))} placeholder="Scania P310" /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2"><Label>Categoria</Label><Input value={novoVeiculo.categoria} disabled className="bg-muted" /></div>
                  <div className="space-y-2"><Label>Eixos</Label><Input type="number" value={novoVeiculo.quantidade_eixos} onChange={e => setNovoVeiculo(prev => ({ ...prev, quantidade_eixos: parseInt(e.target.value) || 2 }))} /></div>
                  <div className="space-y-2"><Label>Km Médio/Mês</Label><Input type="number" value={novoVeiculo.km_medio_mensal} onChange={e => setNovoVeiculo(prev => ({ ...prev, km_medio_mensal: parseInt(e.target.value) || 0 }))} /></div>
                  <div className="flex items-end gap-4 pb-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={novoVeiculo.possui_estepe} onCheckedChange={v => setNovoVeiculo(prev => ({ ...prev, possui_estepe: v }))} />
                      <Label>Estepe</Label>
                    </div>
                    {novoVeiculo.possui_estepe && (
                      <Input type="number" min="1" max="4" className="w-16" value={novoVeiculo.quantidade_estepes} onChange={e => setNovoVeiculo(prev => ({ ...prev, quantidade_estepes: parseInt(e.target.value) || 1 }))} />
                    )}
                  </div>
                </div>
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div><p className="text-sm text-muted-foreground">Rodantes</p><p className="text-2xl font-bold">{pneusRodantes}</p></div>
                      <div><p className="text-sm text-muted-foreground">Estepes</p><p className="text-2xl font-bold">{novoVeiculo.possui_estepe ? novoVeiculo.quantidade_estepes : 0}</p></div>
                      <div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold text-primary">{totalPneusCalc}</p></div>
                      <div><p className="text-sm text-muted-foreground">Eixos</p><p className="text-2xl font-bold">{novoVeiculo.quantidade_eixos}</p></div>
                    </div>
                  </CardContent>
                </Card>
                <Button onClick={handleAddVeiculo} disabled={!selectedCliente || !novoVeiculo.placa.trim()}>Cadastrar Veículo</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Veículos Cadastrados ({veiculos.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Placa</TableHead><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead>
                  <TableHead>Eixos</TableHead><TableHead>Pneus</TableHead><TableHead>Km/Mês</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {veiculos.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.placa}</TableCell>
                      <TableCell>{v.tipo_veiculo || '-'}</TableCell>
                      <TableCell>{v.categoria || '-'}</TableCell>
                      <TableCell>{v.quantidade_eixos || '-'}</TableCell>
                      <TableCell>{v.total_pneus || '-'}</TableCell>
                      <TableCell>{v.km_medio_mensal?.toLocaleString() || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: Cadastro de Pneus (Identidade Única) */}
        <TabsContent value="pneus" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Cadastro de Pneu — Identidade Única</CardTitle>
              <CardDescription>Cada pneu recebe um ID permanente (ex: 015P). Este código acompanha o pneu por toda sua vida útil.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{clientes.filter(c => c.id).map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ID Único do Pneu * <span className="text-xs text-muted-foreground">(ex: 001P, R-050)</span></Label>
                    <Input value={novoPneu.id_unico} onChange={e => setNovoPneu(prev => ({ ...prev, id_unico: e.target.value }))} placeholder="015P" className="font-mono text-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Marca *</Label>
                    <CreatableSelect value={novoPneu.marca} onValueChange={v => setNovoPneu(prev => ({ ...prev, marca: v }))} options={MARCAS_PNEU} placeholder="Selecione ou digite" searchPlaceholder="Buscar marca..." />
                  </div>
                  <div className="space-y-2"><Label>Modelo</Label><Input value={novoPneu.modelo_pneu} onChange={e => setNovoPneu(prev => ({ ...prev, modelo_pneu: e.target.value }))} placeholder="X Line Energy Z" /></div>
                  <div className="space-y-2"><Label>Medida</Label><CreatableSelect value={novoPneu.medida} onValueChange={v => setNovoPneu(prev => ({ ...prev, medida: v }))} options={["295/80 R22.5", "275/80 R22.5", "215/75 R17.5", "235/75 R17.5", "1000 R20", "1100 R22", "12.00 R24", "385/65 R22.5", "11 R22.5", "12 R22.5", "315/80 R22.5"]} placeholder="Selecione ou digite" searchPlaceholder="Buscar medida..." /></div>
                  <div className="space-y-2"><Label>Valor Aquisição (R$)</Label><Input type="number" value={novoPneu.valor_aquisicao} onChange={e => setNovoPneu(prev => ({ ...prev, valor_aquisicao: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Sulco Inicial (mm)</Label><Input type="number" step="0.1" value={novoPneu.sulco_inicial} onChange={e => setNovoPneu(prev => ({ ...prev, sulco_inicial: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>Localização Inicial</Label>
                    <Select value={novoPneu.localizacao} onValueChange={v => setNovoPneu(prev => ({ ...prev, localizacao: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LOCALIZACOES.map(l => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Observações</Label><Input value={novoPneu.observacoes} onChange={e => setNovoPneu(prev => ({ ...prev, observacoes: e.target.value }))} placeholder="Primeira injeção, recapado, etc." /></div>
                </div>
                <Button onClick={handleAddPneu} disabled={!selectedCliente || !novoPneu.id_unico.trim()}>
                  <Hash className="h-4 w-4 mr-2" /> Cadastrar Pneu
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventário de Pneus */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">📦 Estoque</p><p className="text-2xl font-bold">{pneusNoEstoque}</p></CardContent></Card>
            <Card className="border-l-4 border-l-green-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">🚛 Veículos</p><p className="text-2xl font-bold">{pneusNoVeiculo}</p></CardContent></Card>
            <Card className="border-l-4 border-l-yellow-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">🔧 Manutenção</p><p className="text-2xl font-bold">{pneusEmManutencao}</p></CardContent></Card>
            <Card className="border-l-4 border-l-gray-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">🗑️ Sucata</p><p className="text-2xl font-bold">{pneusNaSucata}</p></CardContent></Card>
            <Card className="border-l-4 border-l-primary"><CardContent className="p-4"><p className="text-xs text-muted-foreground">💰 Valor Total</p><p className="text-2xl font-bold">R$ {valorTotalEstoque.toLocaleString()}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Pneus Cadastrados ({pneus.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>ID Único</TableHead><TableHead>Marca</TableHead><TableHead>Medida</TableHead>
                    <TableHead>Valor</TableHead><TableHead>Localização</TableHead><TableHead>Veículo</TableHead>
                    <TableHead>Posição</TableHead><TableHead>Vida</TableHead><TableHead>Recapagens</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {pneus.map(p => (
                      <TableRow key={p.id} className={p.status === 'inativo' ? 'opacity-50' : ''}>
                        <TableCell className="font-mono font-bold text-primary">{p.id_unico}</TableCell>
                        <TableCell>{p.marca}</TableCell>
                        <TableCell>{p.medida || '-'}</TableCell>
                        <TableCell>R$ {(p.valor_aquisicao || 0).toLocaleString()}</TableCell>
                        <TableCell>{getLocalizacaoBadge(p.localizacao)}</TableCell>
                        <TableCell>{p.veiculo_id ? veiculos.find(v => v.id === p.veiculo_id)?.placa || '-' : '-'}</TableCell>
                        <TableCell>{p.posicao_atual ? getNomenclaturaCompleta(p.posicao_atual) : '-'}</TableCell>
                        <TableCell>{p.vida_atual}ª vida</TableCell>
                        <TableCell>{p.numero_recapagens}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: Movimentações */}
        <TabsContent value="movimentacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Movimentação de Pneus</CardTitle>
              <CardDescription>Controle de entrada e saída: Estoque ↔ Veículo ↔ Manutenção ↔ Recapagem ↔ Sucata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Pneu (ID Único) *</Label>
                    <Select value={movForm.pneu_id} onValueChange={v => setMovForm(prev => ({ ...prev, pneu_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione o pneu" /></SelectTrigger>
                      <SelectContent>
                        {pneus.filter(p => p.status === 'ativo').map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.id_unico} — {p.marca} ({p.localizacao})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Movimentação *</Label>
                    <Select value={movForm.tipo} onValueChange={v => setMovForm(prev => ({ ...prev, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estoque_para_veiculo">📦→🚛 Estoque → Veículo</SelectItem>
                        <SelectItem value="veiculo_para_estoque">🚛→📦 Veículo → Estoque</SelectItem>
                        <SelectItem value="veiculo_para_manutencao">🚛→🔧 Veículo → Manutenção</SelectItem>
                        <SelectItem value="manutencao_para_estoque">🔧→📦 Manutenção → Estoque</SelectItem>
                        <SelectItem value="para_recapagem">♻️ Enviar para Recapagem</SelectItem>
                        <SelectItem value="para_sucata">🗑️ Enviar para Sucata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <RetroactiveDatePicker
                    date={movForm.data ? new Date(movForm.data + "T12:00:00") : new Date()}
                    onDateChange={(d) => setMovForm(prev => ({ ...prev, data: format(d, "yyyy-MM-dd") }))}
                    label="Data"
                  />
                </div>

                {movForm.tipo === 'estoque_para_veiculo' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Veículo Destino</Label>
                      <Select value={movForm.veiculo_destino_id} onValueChange={v => setMovForm(prev => ({ ...prev, veiculo_destino_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{veiculos.map(v => (<SelectItem key={v.id} value={v.id}>{v.placa} - {v.tipo_veiculo}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Posição no Veículo</Label>
                      <Select value={movForm.posicao_destino} onValueChange={v => setMovForm(prev => ({ ...prev, posicao_destino: v }))}>
                        <SelectTrigger><SelectValue placeholder="Posição" /></SelectTrigger>
                        <SelectContent>{posicoesDestino.map(p => (<SelectItem key={p} value={p}>{p} - {getNomenclaturaCompleta(p)}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2"><Label>Observações</Label><Textarea value={movForm.observacoes} onChange={e => setMovForm(prev => ({ ...prev, observacoes: e.target.value }))} placeholder="Motivo da movimentação..." /></div>
                <Button onClick={handleMovimentacao} disabled={!movForm.pneu_id}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" /> Registrar Movimentação
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Movimentações */}
          <Card>
            <CardHeader><CardTitle>Histórico de Movimentações ({movimentacoes.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>Pneu</TableHead><TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>Observações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {movimentacoes.slice(0, 30).map(m => {
                      const pneu = pneus.find(p => p.id === m.pneu_id);
                      return (
                        <TableRow key={m.id}>
                          <TableCell>{new Date(m.data_movimentacao).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="font-mono font-bold">{pneu?.id_unico || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{m.tipo_movimentacao.replace(/_/g, ' ')}</Badge></TableCell>
                          <TableCell>{m.origem || '-'}</TableCell>
                          <TableCell>{m.destino || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.observacoes || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 5: Resumos Automáticos */}
        <TabsContent value="resumos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Dianteiros</p><p className="text-2xl font-bold">{pneusDianteiros}</p></div><CircleDot className="h-6 w-6 text-blue-500" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Traseiros</p><p className="text-2xl font-bold">{pneusTraseiros}</p></div><CircleDot className="h-6 w-6 text-orange-500" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Internos</p><p className="text-2xl font-bold">{pneusInternos}</p></div><CircleDot className="h-6 w-6 text-purple-500" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Externos</p><p className="text-2xl font-bold">{pneusExternos}</p></div><CircleDot className="h-6 w-6 text-teal-500" /></div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> KPIs Financeiros</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Custo Médio/Km</span><span className="font-bold text-lg">R$ {custoMedioPorKm}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">% Desgaste Anormal</span><span className="font-bold text-lg text-orange-500">{percentDesgasteAnormal}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vida Média Restante</span><span className="font-bold text-lg">{vidaMediaRestante.toLocaleString()} km</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Taxa Média Frota</span><span className="font-bold text-lg">{taxaMediaFrota.toFixed(2)} mm/1000km</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Patrimônio em Pneus</span><span className="font-bold text-lg text-primary">R$ {valorTotalEstoque.toLocaleString()}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Ranking: Veículos Mais Caros</CardTitle></CardHeader>
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
                ) : <p className="text-muted-foreground">Sem dados suficientes</p>}
              </CardContent>
            </Card>
          </div>

          {/* Inventário por Marca */}
          <Card>
            <CardHeader><CardTitle>Inventário por Marca de Pneu</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Marca</TableHead><TableHead>Qtd</TableHead><TableHead>No Estoque</TableHead><TableHead>No Veículo</TableHead><TableHead>Valor Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(pneus.reduce((acc, p) => {
                    if (!acc[p.marca]) acc[p.marca] = { total: 0, estoque: 0, veiculo: 0, valor: 0 };
                    acc[p.marca].total += 1;
                    if (p.localizacao === 'estoque') acc[p.marca].estoque += 1;
                    if (p.localizacao === 'veiculo') acc[p.marca].veiculo += 1;
                    acc[p.marca].valor += p.valor_aquisicao || 0;
                    return acc;
                  }, {} as Record<string, { total: number; estoque: number; veiculo: number; valor: number }>)).map(([marca, d]) => (
                    <TableRow key={marca}>
                      <TableCell className="font-medium">{marca}</TableCell>
                      <TableCell>{d.total}</TableCell>
                      <TableCell>{d.estoque}</TableCell>
                      <TableCell>{d.veiculo}</TableCell>
                      <TableCell>R$ {d.valor.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Resumo por Tipo de Veículo */}
          <Card>
            <CardHeader><CardTitle>Resumo por Tipo de Veículo</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Qtd Veículos</TableHead><TableHead>Total Pneus</TableHead><TableHead>Categoria</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(veiculos.reduce((acc, v) => {
                    const tipo = v.tipo_veiculo || 'Não definido';
                    if (!acc[tipo]) acc[tipo] = { count: 0, pneus: 0, categoria: v.categoria || '-' };
                    acc[tipo].count += 1; acc[tipo].pneus += v.total_pneus || 0;
                    return acc;
                  }, {} as Record<string, { count: number; pneus: number; categoria: string }>)).map(([tipo, d]) => (
                    <TableRow key={tipo}><TableCell className="font-medium">{tipo}</TableCell><TableCell>{d.count}</TableCell><TableCell>{d.pneus}</TableCell><TableCell><Badge variant="outline">{d.categoria}</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 6: Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
          <div ref={dashboardRef} className="bg-background p-4 rounded-lg space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Relatório de Eficiência Operacional</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filterCliente || "all"} onValueChange={v => { setFilterCliente(v === "all" ? "" : v); setFilterVeiculo(""); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos clientes" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos</SelectItem>{clientes.filter(c => c.id).map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent>
                </Select>
                <Select value={filterVeiculo || "all"} onValueChange={v => setFilterVeiculo(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos veículos" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todos</SelectItem>{veiculosDoCliente.filter(v => v.id).map(v => (<SelectItem key={v.id} value={v.id}>{v.placa}</SelectItem>))}</SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Input type="date" value={filterDataInicio} onChange={e => setFilterDataInicio(e.target.value)} className="w-[140px]" />
                  <span className="text-muted-foreground">até</span>
                  <Input type="date" value={filterDataFim} onChange={e => setFilterDataFim(e.target.value)} className="w-[140px]" />
                </div>
                <Button onClick={handleExportPDF} disabled={exporting} variant="outline">
                  <Download className="h-4 w-4 mr-2" />{exporting ? "..." : "PDF"}
                </Button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Medições</p><p className="text-2xl font-bold">{totalPneusColeta}</p></CardContent></Card>
              <Card className="border-l-4 border-l-green-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">🟢 Saudáveis</p><p className="text-2xl font-bold text-green-600">{pneusSaudaveis}</p></CardContent></Card>
              <Card className="border-l-4 border-l-yellow-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">🟡 Atenção</p><p className="text-2xl font-bold text-yellow-600">{pneusAtencao}</p></CardContent></Card>
              <Card className="border-l-4 border-l-orange-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">🔴 Retirar</p><p className="text-2xl font-bold text-orange-600">{pneusRetirar}</p></CardContent></Card>
              <Card className="border-l-4 border-l-red-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">⛔ Críticos</p><p className="text-2xl font-bold text-red-600">{pneusCriticos}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vida Média (km)</p><p className="text-2xl font-bold">{vidaMediaRestante.toLocaleString()}</p></CardContent></Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Desgaste Médio</p><p className="text-xl font-bold">{desgasteMedio} mm</p></div><TrendingDown className="h-6 w-6 text-primary" /></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Taxa Frota</p><p className="text-xl font-bold">{taxaMediaFrota.toFixed(2)} mm/1000km</p></div><Gauge className="h-6 w-6 text-primary" /></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pressão Fora</p><p className="text-xl font-bold">{pressaoForaPadrao}%</p></div><AlertTriangle className="h-6 w-6 text-yellow-500" /></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Custo/km</p><p className="text-xl font-bold">R$ {custoMedioPorKm}</p></div><DollarSign className="h-6 w-6 text-green-500" /></div></CardContent></Card>
            </div>

            {/* Saving Projection */}
            {totalPneusColeta > 0 && (
              <Card className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5 text-green-600" /> Projeção de Saving Anual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Economia em Pneus (extensão vida útil)</p>
                      <p className="text-2xl font-bold text-green-600">R$ {(veiculos.length * 3400).toLocaleString()}/ano</p>
                      <p className="text-xs text-muted-foreground">~R$ 3.400/veículo com gestão correta</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Economia em Combustível</p>
                      <p className="text-2xl font-bold text-green-600">R$ {(veiculos.length * 2100).toLocaleString()}/ano</p>
                      <p className="text-xs text-muted-foreground">~R$ 2.100/veículo com pressão ideal</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">💰 SAVING TOTAL ESTIMADO</p>
                      <p className="text-3xl font-bold text-green-700">R$ {(veiculos.length * 5500).toLocaleString()}/ano</p>
                      <p className="text-xs text-muted-foreground">Para {veiculos.length} veículo(s) na frota</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alertas */}
            {alertas.length > 0 && (
              <Card className="border-l-4 border-l-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg"><AlertCircle className="h-5 w-5 text-destructive" /> Alertas ({alertas.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-destructive flex items-center gap-2 mb-3"><XCircle className="h-4 w-4" /> Críticos ({alertasCriticos.length})</h4>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2 pr-4">
                          {alertasCriticos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum</p> : alertasCriticos.map((a, i) => (
                            <div key={i} className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-destructive" /><span className="font-medium text-sm">{a.veiculo}</span></div>
                                <Badge variant="outline" className="text-xs">{a.posicao}</Badge>
                              </div>
                              <p className="text-sm mt-1">{a.mensagem}</p>
                              <p className="text-xs text-muted-foreground mt-1 italic">{a.recomendacao}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-600 flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4" /> Atenção ({alertasAtencao.length})</h4>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2 pr-4">
                          {alertasAtencao.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum</p> : alertasAtencao.map((a, i) => (
                            <div key={i} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-yellow-600" /><span className="font-medium text-sm">{a.veiculo}</span></div>
                                <Badge variant="outline" className="text-xs">{a.posicao}</Badge>
                              </div>
                              <p className="text-sm mt-1">{a.mensagem}</p>
                              <p className="text-xs text-muted-foreground mt-1 italic">{a.recomendacao}</p>
                            </div>
                          ))}
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
                <CardHeader><CardTitle className="text-base">Status dos Pneus</CardTitle></CardHeader>
                <CardContent>
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart><Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value" label={({ value }) => `${value}`}>
                        {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie><Tooltip /><Legend /></PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">Sem dados</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Inventário de Pneus</CardTitle></CardHeader>
                <CardContent>
                  {inventarioPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart><Pie data={inventarioPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value" label={({ value }) => `${value}`}>
                        {inventarioPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie><Tooltip /><Legend /></PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">Sem dados</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Pressão: Atual vs Recomendada</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={pressaoChartData}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="veiculo" fontSize={8} angle={-45} textAnchor="end" height={60} />
                      <YAxis domain={[80, 130]} /><Tooltip /><Legend />
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
                <CardTitle>Histórico de Medições</CardTitle>
                <CardDescription>Taxa de desgaste, vida útil, CPK e risco</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Cliente</TableHead><TableHead>Veículo</TableHead><TableHead>Posição</TableHead>
                      <TableHead>Sulco</TableHead><TableHead>Status</TableHead><TableHead>Pressão</TableHead>
                      <TableHead>Taxa Desg.</TableHead><TableHead>Vida Rest.</TableHead><TableHead>Custo/km</TableHead><TableHead>Risco</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {coletasCalculadas.slice(0, 20).map(c => (
                        <TableRow key={c.id} className={c.desgaste_anomalo ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                          <TableCell className="font-medium">{c.clientes?.nome}</TableCell>
                          <TableCell>{c.veiculos?.placa}</TableCell>
                          <TableCell>{c.posicao_pneu}</TableCell>
                          <TableCell>{c.sulco_atual} mm</TableCell>
                          <TableCell>{getStatusSulcoBadge(c.status_sulco)}</TableCell>
                          <TableCell>{c.pressao_atual} psi</TableCell>
                          <TableCell>{c.taxa_desgaste > 0 ? <span className={c.desgaste_anomalo ? "text-orange-600 font-medium" : ""}>{c.taxa_desgaste.toFixed(2)} {c.desgaste_anomalo && "⚠"}</span> : "-"}</TableCell>
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
