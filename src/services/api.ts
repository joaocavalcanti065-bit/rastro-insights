/**
 * API Service for Rastro Portal
 * 
 * INTEGRAÇÃO N8N:
 * Todos os endpoints abaixo devem ser implementados no n8n.
 * Configure a baseURL para apontar para seu servidor n8n.
 * 
 * Exemplo de configuração:
 * - Desenvolvimento: http://localhost:5678/webhook/rastro
 * - Produção: https://seu-n8n-server.com/webhook/rastro
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Helper function para fazer requisições
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Erro na requisição ${endpoint}:`, error);
    throw error;
  }
}

// ============================================================================
// DASHBOARD API
// ============================================================================

/**
 * GET /api/dashboard
 * 
 * N8N WORKFLOW: Deve retornar KPIs e resumo da Pílula de Conhecimento
 * 
 * Estrutura esperada do JSON:
 * {
 *   totalPneus: number,
 *   pneusCriticos: number,
 *   economiaEstimada: number,
 *   parceirosAtivos: number,
 *   pilulaConhecimento: string
 * }
 */
export async function getDashboardData() {
  return apiRequest('/dashboard');
}

// ============================================================================
// TELEMETRIA API
// ============================================================================

/**
 * GET /api/telemetria
 * 
 * N8N WORKFLOW: Deve retornar array de dados de telemetria
 * 
 * Estrutura esperada do JSON:
 * [{
 *   id: string,
 *   veiculo: string,
 *   frota: string,
 *   quilometragem: number,
 *   pressao: number,
 *   profundidadeBanda: number,
 *   dataColeta: string (ISO 8601),
 *   status: 'normal' | 'warning' | 'critical'
 * }]
 */
export async function getTelemetriaData() {
  return apiRequest('/telemetria');
}

/**
 * POST /api/telemetria
 * 
 * N8N WORKFLOW: Recebe novos dados de telemetria (upload CSV ou formulário)
 * 
 * Body esperado:
 * {
 *   data: Array (dados processados do CSV ou formulário)
 * }
 */
export async function postTelemetriaData(data: any) {
  return apiRequest('/telemetria', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

// ============================================================================
// S&OP (Serviço de Diagnóstico) API
// ============================================================================

/**
 * GET /api/sop
 * 
 * N8N WORKFLOW: Deve retornar tarefas, técnicos e contratos
 * 
 * Estrutura esperada do JSON:
 * {
 *   tarefas: [{
 *     id: string,
 *     descricao: string,
 *     frota: string,
 *     tecnico: string,
 *     prioridade: 'alta' | 'media' | 'baixa',
 *     status: 'pendente' | 'em_execucao' | 'concluido'
 *   }],
 *   tecnicos: [{
 *     id: string,
 *     nome: string,
 *     especialidade: string,
 *     frotasAtribuidas: string[]
 *   }],
 *   contratos: [{
 *     id: string,
 *     cliente: string,
 *     escopo: string,
 *     visitasMes: number,
 *     dataVencimento: string (ISO 8601),
 *     status: 'ativo' | 'vencido' | 'renovacao'
 *   }]
 * }
 */
export async function getSopData() {
  return apiRequest('/sop');
}

/**
 * POST /api/sop/alocar
 * 
 * N8N WORKFLOW: Aloca um técnico a uma frota/contrato
 * 
 * Body esperado:
 * {
 *   tecnicoId: string,
 *   frotaId: string
 * }
 */
export async function alocarTecnico(tecnicoId: string, frotaId: string) {
  return apiRequest('/sop/alocar', {
    method: 'POST',
    body: JSON.stringify({ tecnicoId, frotaId }),
  });
}

// ============================================================================
// ANÁLISE FINANCEIRA (Pílula de Conhecimento) API
// ============================================================================

/**
 * POST /api/analise-financeira
 * 
 * N8N WORKFLOW: ENDPOINT PRINCIPAL - Processa dados e retorna a Pílula de Conhecimento
 * 
 * Este é o coração da automação. O n8n deve:
 * 1. Receber os dados de telemetria críticos
 * 2. Calcular a economia (pneus críticos * (custo pneu novo - custo reforma))
 * 3. Gerar a mensagem da Pílula de Conhecimento
 * 
 * Body esperado:
 * {
 *   custoPneuNovo: number,
 *   custoReforma: number,
 *   pneusCriticos: Array
 * }
 * 
 * Resposta esperada:
 * {
 *   pilulaConhecimento: string,
 *   economiaTotal: number,
 *   quantidadePneus: number,
 *   detalhamento: [{
 *     id: string,
 *     economia: number
 *   }]
 * }
 */
export async function gerarAnaliseFinanceira(data: {
  custoPneuNovo: number;
  custoReforma: number;
}) {
  return apiRequest('/analise-financeira', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * GET /api/analise-financeira
 * 
 * N8N WORKFLOW: Retorna a última análise financeira gerada
 */
export async function getAnaliseFinanceira() {
  return apiRequest('/analise-financeira');
}

// ============================================================================
// ECONOMIA CIRCULAR E PARCERIAS API
// ============================================================================

/**
 * GET /api/parcerias
 * 
 * N8N WORKFLOW: Deve retornar lista de parceiros homologados
 * 
 * Estrutura esperada do JSON:
 * {
 *   parceiros: [{
 *     id: string,
 *     nome: string,
 *     tipo: 'reformadora' | 'fornecedor',
 *     seloQualidade: boolean,
 *     volumeVendas: number,
 *     comissaoDevida: number
 *   }],
 *   cicloVida: [{
 *     id: string,
 *     veiculo: string,
 *     dataInstalacao: string (ISO 8601),
 *     statusFinal: string,
 *     reformas: number
 *   }]
 * }
 */
export async function getParceriasData() {
  return apiRequest('/parcerias');
}
