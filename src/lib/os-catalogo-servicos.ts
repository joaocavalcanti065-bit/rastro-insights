// Catálogo de serviços de borracharia/manutenção para Ordem de Serviço
// Espelhado em paridade com o Borracharia Mais

export type CategoriaServico = "PNEU" | "RODA_EIXO" | "FREIO" | "SUSPENSAO";

export interface ServicoCatalogo {
  codigo: string;
  nome: string;
  categoria: CategoriaServico;
  custoSugerido: number;
  tempoMinutos: number;
  exigeDestino?: boolean; // ex: rodízio precisa posição destino
  exigeNovoPneu?: boolean; // troca exige escolher pneu do estoque
  icone: string; // nome lucide-react
}

export const CATALOGO_SERVICOS: ServicoCatalogo[] = [
  // PNEU
  { codigo: "CALIBRAGEM", nome: "Calibragem", categoria: "PNEU", custoSugerido: 5, tempoMinutos: 5, icone: "Gauge" },
  { codigo: "RODIZIO", nome: "Rodízio", categoria: "PNEU", custoSugerido: 30, tempoMinutos: 20, exigeDestino: true, icone: "RefreshCw" },
  { codigo: "BALANCEAMENTO", nome: "Balanceamento", categoria: "PNEU", custoSugerido: 40, tempoMinutos: 25, icone: "Scale" },
  { codigo: "ALINHAMENTO", nome: "Alinhamento (eixo)", categoria: "PNEU", custoSugerido: 80, tempoMinutos: 45, icone: "Crosshair" },
  { codigo: "TROCA_PNEU", nome: "Troca de pneu", categoria: "PNEU", custoSugerido: 50, tempoMinutos: 30, exigeNovoPneu: true, icone: "Replace" },
  { codigo: "REPARO", nome: "Conserto / Reparo (furo, prego)", categoria: "PNEU", custoSugerido: 60, tempoMinutos: 30, icone: "Wrench" },
  { codigo: "VULCANIZACAO", nome: "Vulcanização", categoria: "PNEU", custoSugerido: 90, tempoMinutos: 40, icone: "Flame" },
  { codigo: "RECAPAGEM", nome: "Recapagem (envio recapadora)", categoria: "PNEU", custoSugerido: 350, tempoMinutos: 15, icone: "RotateCcw" },
  { codigo: "DESCARTE", nome: "Descarte / Sucata", categoria: "PNEU", custoSugerido: 0, tempoMinutos: 10, icone: "Trash2" },
  { codigo: "INSPECAO_SULCO", nome: "Inspeção de sulco (TWI)", categoria: "PNEU", custoSugerido: 0, tempoMinutos: 5, icone: "Ruler" },
  { codigo: "TROCA_CAMARA", nome: "Troca de câmara de ar", categoria: "PNEU", custoSugerido: 70, tempoMinutos: 25, icone: "CircleDot" },
  { codigo: "TROCA_VALVULA", nome: "Troca de válvula / bico", categoria: "PNEU", custoSugerido: 15, tempoMinutos: 10, icone: "Pipette" },
  { codigo: "TROCA_PROTETOR", nome: "Troca de protetor", categoria: "PNEU", custoSugerido: 25, tempoMinutos: 15, icone: "Shield" },

  // RODA / EIXO
  { codigo: "TROCA_ROLAMENTO", nome: "Troca de rolamento", categoria: "RODA_EIXO", custoSugerido: 250, tempoMinutos: 90, icone: "Settings" },
  { codigo: "TROCA_CUBO", nome: "Troca de cubo", categoria: "RODA_EIXO", custoSugerido: 380, tempoMinutos: 120, icone: "Cog" },
  { codigo: "TROCA_PARAFUSO", nome: "Troca de parafuso/porca de roda", categoria: "RODA_EIXO", custoSugerido: 20, tempoMinutos: 15, icone: "Bolt" },
  { codigo: "LUBRIFICACAO_EIXO", nome: "Lubrificação de eixo", categoria: "RODA_EIXO", custoSugerido: 45, tempoMinutos: 20, icone: "Droplet" },

  // FREIO
  { codigo: "RETIFICA_DISCO", nome: "Retífica de disco de freio", categoria: "FREIO", custoSugerido: 120, tempoMinutos: 60, icone: "Disc" },
  { codigo: "TROCA_LONA", nome: "Troca de lona / pastilha", categoria: "FREIO", custoSugerido: 180, tempoMinutos: 75, icone: "AlertTriangle" },
];

export const TIPOS_OS = [
  { value: "PREVENTIVA", label: "Preventiva" },
  { value: "CORRETIVA", label: "Corretiva" },
  { value: "EMERGENCIAL", label: "Emergencial" },
  { value: "AUDITORIA", label: "Auditoria" },
];

export const LOCAIS_EXECUCAO = [
  { value: "OFICINA_INTERNA", label: "Oficina Interna" },
  { value: "BORRACHARIA_PARCEIRA", label: "Borracharia Parceira" },
  { value: "EM_ROTA", label: "Em Rota" },
];

export const STATUS_OS = [
  { value: "RASCUNHO", label: "Rascunho", cor: "bg-muted text-muted-foreground" },
  { value: "ABERTA", label: "Aberta", cor: "bg-primary/15 text-primary" },
  { value: "EM_ANDAMENTO", label: "Em Andamento", cor: "bg-chart-2/20 text-chart-2" },
  { value: "AGUARDANDO_APROVACAO", label: "Aguardando Aprovação", cor: "bg-chart-4/20 text-chart-4" },
  { value: "CONCLUIDA", label: "Concluída", cor: "bg-chart-1/20 text-chart-1" },
  { value: "CANCELADA", label: "Cancelada", cor: "bg-destructive/15 text-destructive" },
];
