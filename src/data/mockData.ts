// Mock data for the Rastro Portal

export interface TelemetryData {
  id: string;
  frota: string;
  veiculo: string;
  quilometragem: number;
  pressao: number;
  profundidadeBanda: number;
  dataColeta: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface Tecnico {
  id: string;
  nome: string;
  especialidade: string;
  frotasAtribuidas: string[];
}

export interface Contrato {
  id: string;
  cliente: string;
  escopo: string;
  visitasMes: number;
  dataVencimento: string;
  status: 'ativo' | 'vencido' | 'renovacao';
}

export interface Tarefa {
  id: string;
  descricao: string;
  frota: string;
  tecnico: string;
  status: 'pendente' | 'em_execucao' | 'concluido';
  prioridade: 'alta' | 'media' | 'baixa';
}

export interface Parceiro {
  id: string;
  nome: string;
  tipo: 'reformadora' | 'fornecedor';
  seloQualidade: boolean;
  volumeVendas: number;
  comissaoDevida: number;
}

export interface CicloVidaPneu {
  id: string;
  veiculo: string;
  dataInstalacao: string;
  statusFinal: 'reforma_recomendada' | 'troca_necessaria' | 'vendido' | 'em_uso';
  historicoReformas: number;
}

export interface Veiculo {
  id: string;
  modelo: string;
  dataInstalacao: string;
  quilometragemInicial: number;
}

// Veículos da Frota
export const veiculos: Veiculo[] = [
  { id: 'V001', modelo: 'Scania R450', dataInstalacao: '2024-01-15', quilometragemInicial: 150000 },
  { id: 'V002', modelo: 'Volvo FH 540', dataInstalacao: '2024-02-20', quilometragemInicial: 200000 },
  { id: 'V003', modelo: 'Mercedes-Benz Axor', dataInstalacao: '2024-03-01', quilometragemInicial: 180000 },
  { id: 'V004', modelo: 'Scania R450', dataInstalacao: '2024-04-10', quilometragemInicial: 165000 },
  { id: 'V005', modelo: 'Volvo FH 540', dataInstalacao: '2024-05-05', quilometragemInicial: 190000 },
];

// Função auxiliar para gerar dados de telemetria
const generateTelemetryData = (): TelemetryData[] => {
  const data: TelemetryData[] = [];
  let pneuCounter = 1;

  veiculos.forEach((veiculo) => {
    // 18 pneus por veículo
    for (let i = 1; i <= 18; i++) {
      const pneuId = `PNE${String(pneuCounter).padStart(3, '0')}`;
      const random = Math.random();
      
      let status: 'normal' | 'warning' | 'critical';
      let quilometragem: number;
      let pressao: number;
      let profundidadeBanda: number;

      // 10% críticos (9 pneus)
      if (random < 0.10) {
        status = 'critical';
        quilometragem = veiculo.quilometragemInicial + 35000 + Math.floor(Math.random() * 10000);
        pressao = 82 + Math.floor(Math.random() * 8); // 82-89 PSI
        profundidadeBanda = 2.0 + Math.random() * 0.9; // 2.0-2.9 mm
      }
      // 20% alerta (18 pneus)
      else if (random < 0.30) {
        status = 'warning';
        quilometragem = veiculo.quilometragemInicial + 20000 + Math.floor(Math.random() * 10000);
        pressao = 95 + Math.floor(Math.random() * 6); // 95-100 PSI
        profundidadeBanda = 4.0 + Math.random() * 2.0; // 4.0-6.0 mm
      }
      // 70% normais (63 pneus)
      else {
        status = 'normal';
        quilometragem = veiculo.quilometragemInicial + 5000 + Math.floor(Math.random() * 5000);
        pressao = 105 + Math.floor(Math.random() * 6); // 105-110 PSI
        profundidadeBanda = 10.0 + Math.random() * 4.0; // 10.0-14.0 mm
      }

      data.push({
        id: pneuId,
        frota: `Frota ${veiculo.id}`,
        veiculo: `${veiculo.modelo} (${veiculo.id})`,
        quilometragem: Math.round(quilometragem),
        pressao: Math.round(pressao),
        profundidadeBanda: Math.round(profundidadeBanda * 10) / 10,
        dataColeta: '2025-01-20',
        status,
      });

      pneuCounter++;
    }
  });

  return data;
};

// Telemetry Mock Data - 90 pneus (5 veículos × 18 pneus)
// 10% críticos (9), 20% alerta (18), 70% normais (63)
export const telemetryData: TelemetryData[] = generateTelemetryData();

export const tecnicos: Tecnico[] = [
  { id: 'TEC001', nome: 'João Silva', especialidade: 'Diagnóstico de Pneus', frotasAtribuidas: ['Frota V001', 'Frota V002'] },
  { id: 'TEC002', nome: 'Maria Santos', especialidade: 'Manutenção Preventiva', frotasAtribuidas: ['Frota V003'] },
  { id: 'TEC003', nome: 'Pedro Costa', especialidade: 'Reforma e Recapagem', frotasAtribuidas: ['Frota V004', 'Frota V005'] },
];

export const contratos: Contrato[] = [
  { id: 'CTR001', cliente: 'Transportadora LogiRapid - V001', escopo: 'Diagnóstico mensal completo', visitasMes: 4, dataVencimento: '2025-12-31', status: 'ativo' },
  { id: 'CTR002', cliente: 'Fretes do Brasil - V002', escopo: 'Monitoramento de telemetria', visitasMes: 2, dataVencimento: '2025-06-30', status: 'ativo' },
  { id: 'CTR003', cliente: 'TransCarga Nacional - V003', escopo: 'Gestão completa de pneus', visitasMes: 6, dataVencimento: '2025-12-31', status: 'ativo' },
  { id: 'CTR004', cliente: 'Express Cargas - V004', escopo: 'Diagnóstico e reforma', visitasMes: 3, dataVencimento: '2025-12-31', status: 'ativo' },
  { id: 'CTR005', cliente: 'Logística Nacional - V005', escopo: 'Monitoramento completo', visitasMes: 5, dataVencimento: '2025-12-31', status: 'ativo' },
];

export const tarefas: Tarefa[] = [
  { id: 'TAR001', descricao: 'Serviço de diagnóstico completo - V001', frota: 'Frota V001', tecnico: 'João Silva', status: 'concluido', prioridade: 'alta' },
  { id: 'TAR002', descricao: 'Serviço de diagnóstico completo - V002', frota: 'Frota V002', tecnico: 'João Silva', status: 'concluido', prioridade: 'alta' },
  { id: 'TAR003', descricao: 'Serviço de diagnóstico completo - V003', frota: 'Frota V003', tecnico: 'Maria Santos', status: 'concluido', prioridade: 'alta' },
  { id: 'TAR004', descricao: 'Serviço de diagnóstico completo - V004', frota: 'Frota V004', tecnico: 'João Silva', status: 'pendente', prioridade: 'alta' },
  { id: 'TAR005', descricao: 'Serviço de diagnóstico completo - V005', frota: 'Frota V005', tecnico: 'João Silva', status: 'pendente', prioridade: 'alta' },
  { id: 'TAR006', descricao: 'Reforma de pneus críticos - Urgente', frota: 'Múltiplas Frotas', tecnico: 'Pedro Costa', status: 'em_execucao', prioridade: 'alta' },
];

export const parceiros: Parceiro[] = [
  { id: 'PAR001', nome: 'Recapagem Forte', tipo: 'reformadora', seloQualidade: true, volumeVendas: 125000, comissaoDevida: 6250 },
  { id: 'PAR002', nome: 'Pneus Gigantes', tipo: 'fornecedor', seloQualidade: true, volumeVendas: 180000, comissaoDevida: 9000 },
  { id: 'PAR003', nome: 'Pneu Veloz', tipo: 'reformadora', seloQualidade: false, volumeVendas: 45000, comissaoDevida: 2250 },
];

// Ciclo de vida - gerar para todos os pneus
export const cicloVidaPneus: CicloVidaPneu[] = telemetryData.map((tire) => {
  const veiculo = veiculos.find(v => tire.veiculo.includes(v.id));
  let statusFinal: 'reforma_recomendada' | 'troca_necessaria' | 'vendido' | 'em_uso';
  let historicoReformas: number;

  if (tire.status === 'critical') {
    statusFinal = 'reforma_recomendada';
    historicoReformas = Math.floor(Math.random() * 3);
  } else if (tire.status === 'warning') {
    statusFinal = 'em_uso';
    historicoReformas = Math.floor(Math.random() * 2);
  } else {
    statusFinal = 'em_uso';
    historicoReformas = 0;
  }

  return {
    id: tire.id,
    veiculo: tire.veiculo,
    dataInstalacao: veiculo?.dataInstalacao || '2024-01-01',
    statusFinal,
    historicoReformas,
  };
});

// KPIs for Dashboard
export const kpiData = {
  totalPneus: telemetryData.length,
  pneusCriticos: telemetryData.filter(t => t.status === 'critical').length,
  economiaEstimada: 15300, // R$ 1.700 por pneu × 9 pneus críticos
  taxaReforma: 70, // percentage
  parceirosAtivos: parceiros.filter(p => p.seloQualidade).length,
};
