// Mock data for the Rastro Portal

export interface TelemetryData {
  id: string;
  frota: string;
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
  dataInstalacao: string;
  statusFinal: 'reforma_recomendada' | 'troca_necessaria' | 'vendido' | 'em_uso';
  historicoReformas: number;
}

// Telemetry Mock Data - 10 tires, 3 with critical status
export const telemetryData: TelemetryData[] = [
  { id: 'PNE001', frota: 'Frota A', quilometragem: 45000, pressao: 110, profundidadeBanda: 3.2, dataColeta: '2025-01-15', status: 'critical' },
  { id: 'PNE002', frota: 'Frota A', quilometragem: 38000, pressao: 95, profundidadeBanda: 5.8, dataColeta: '2025-01-15', status: 'normal' },
  { id: 'PNE003', frota: 'Frota A', quilometragem: 42000, pressao: 88, profundidadeBanda: 4.1, dataColeta: '2025-01-15', status: 'warning' },
  { id: 'PNE004', frota: 'Frota B', quilometragem: 50000, pressao: 85, profundidadeBanda: 2.8, dataColeta: '2025-01-14', status: 'critical' },
  { id: 'PNE005', frota: 'Frota B', quilometragem: 35000, pressao: 98, profundidadeBanda: 6.2, dataColeta: '2025-01-14', status: 'normal' },
  { id: 'PNE006', frota: 'Frota B', quilometragem: 39000, pressao: 92, profundidadeBanda: 5.1, dataColeta: '2025-01-14', status: 'normal' },
  { id: 'PNE007', frota: 'Frota C', quilometragem: 47000, pressao: 82, profundidadeBanda: 3.0, dataColeta: '2025-01-13', status: 'critical' },
  { id: 'PNE008', frota: 'Frota C', quilometragem: 33000, pressao: 100, profundidadeBanda: 7.0, dataColeta: '2025-01-13', status: 'normal' },
  { id: 'PNE009', frota: 'Frota C', quilometragem: 41000, pressao: 90, profundidadeBanda: 4.5, dataColeta: '2025-01-13', status: 'warning' },
  { id: 'PNE010', frota: 'Frota A', quilometragem: 36000, pressao: 96, profundidadeBanda: 5.5, dataColeta: '2025-01-15', status: 'normal' },
];

export const tecnicos: Tecnico[] = [
  { id: 'TEC001', nome: 'João Silva', especialidade: 'Diagnóstico de Pneus', frotasAtribuidas: ['Frota A', 'Frota B'] },
  { id: 'TEC002', nome: 'Maria Santos', especialidade: 'Manutenção Preventiva', frotasAtribuidas: ['Frota C'] },
  { id: 'TEC003', nome: 'Pedro Costa', especialidade: 'Reforma e Recapagem', frotasAtribuidas: [] },
];

export const contratos: Contrato[] = [
  { id: 'CTR001', cliente: 'Transportadora LogiRapid', escopo: 'Diagnóstico mensal completo', visitasMes: 4, dataVencimento: '2025-12-31', status: 'ativo' },
  { id: 'CTR002', cliente: 'Fretes do Brasil', escopo: 'Monitoramento de telemetria', visitasMes: 2, dataVencimento: '2025-06-30', status: 'ativo' },
  { id: 'CTR003', cliente: 'TransCarga Nacional', escopo: 'Gestão completa de pneus', visitasMes: 6, dataVencimento: '2025-02-28', status: 'renovacao' },
];

export const tarefas: Tarefa[] = [
  { id: 'TAR001', descricao: 'Inspeção de pressão - Frota A', frota: 'Frota A', tecnico: 'João Silva', status: 'em_execucao', prioridade: 'alta' },
  { id: 'TAR002', descricao: 'Verificação de desgaste - Frota B', frota: 'Frota B', tecnico: 'João Silva', status: 'pendente', prioridade: 'media' },
  { id: 'TAR003', descricao: 'Reforma de pneus críticos - Frota C', frota: 'Frota C', tecnico: 'Maria Santos', status: 'concluido', prioridade: 'alta' },
  { id: 'TAR004', descricao: 'Manutenção preventiva mensal', frota: 'Frota A', tecnico: 'Pedro Costa', status: 'pendente', prioridade: 'baixa' },
];

export const parceiros: Parceiro[] = [
  { id: 'PAR001', nome: 'Recapagem Premium', tipo: 'reformadora', seloQualidade: true, volumeVendas: 85000, comissaoDevida: 4250 },
  { id: 'PAR002', nome: 'Pneus Recondicionados JK', tipo: 'reformadora', seloQualidade: true, volumeVendas: 62000, comissaoDevida: 3100 },
  { id: 'PAR003', nome: 'Distribuidora MaxPneus', tipo: 'fornecedor', seloQualidade: true, volumeVendas: 125000, comissaoDevida: 6250 },
];

export const cicloVidaPneus: CicloVidaPneu[] = [
  { id: 'PNE001', dataInstalacao: '2023-06-15', statusFinal: 'reforma_recomendada', historicoReformas: 1 },
  { id: 'PNE002', dataInstalacao: '2023-09-20', statusFinal: 'em_uso', historicoReformas: 0 },
  { id: 'PNE003', dataInstalacao: '2023-07-10', statusFinal: 'em_uso', historicoReformas: 1 },
  { id: 'PNE004', dataInstalacao: '2023-05-01', statusFinal: 'troca_necessaria', historicoReformas: 2 },
  { id: 'PNE005', dataInstalacao: '2023-10-12', statusFinal: 'em_uso', historicoReformas: 0 },
  { id: 'PNE006', dataInstalacao: '2023-08-18', statusFinal: 'em_uso', historicoReformas: 0 },
  { id: 'PNE007', dataInstalacao: '2023-04-22', statusFinal: 'reforma_recomendada', historicoReformas: 2 },
  { id: 'PNE008', dataInstalacao: '2023-11-05', statusFinal: 'em_uso', historicoReformas: 0 },
  { id: 'PNE009', dataInstalacao: '2023-07-30', statusFinal: 'em_uso', historicoReformas: 1 },
  { id: 'PNE010', dataInstalacao: '2023-09-15', statusFinal: 'em_uso', historicoReformas: 0 },
];

// KPIs for Dashboard
export const kpiData = {
  totalPneus: telemetryData.length,
  pneusCriticos: telemetryData.filter(t => t.status === 'critical').length,
  economiaEstimada: 45750, // R$ calculated from reforms vs new tires
  taxaReforma: 70, // percentage
  parceirosAtivos: parceiros.filter(p => p.seloQualidade).length,
};
