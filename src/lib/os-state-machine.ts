// Máquina de estados da Ordem de Serviço
// Define transições válidas e regras (limite de aprovação configurável)

export type OsStatus =
  | "RASCUNHO"
  | "ABERTA"
  | "EM_ANDAMENTO"
  | "AGUARDANDO_APROVACAO"
  | "CONCLUIDA"
  | "CANCELADA";

export interface OsStateContext {
  custoTotal: number;
  limiteAprovacao: number; // R$ — acima disso exige aprovação
  temItens: boolean;
}

// Mapa de transições permitidas a partir de cada estado
const TRANSICOES_VALIDAS: Record<OsStatus, OsStatus[]> = {
  RASCUNHO: ["ABERTA", "AGUARDANDO_APROVACAO", "CANCELADA"],
  ABERTA: ["EM_ANDAMENTO", "AGUARDANDO_APROVACAO", "CONCLUIDA", "CANCELADA"],
  EM_ANDAMENTO: ["AGUARDANDO_APROVACAO", "CONCLUIDA", "CANCELADA"],
  AGUARDANDO_APROVACAO: ["ABERTA", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"],
  CONCLUIDA: [], // estado final
  CANCELADA: [], // estado final
};

export interface TransitionResult {
  ok: boolean;
  /** Estado para o qual de fato vamos (pode ser AGUARDANDO_APROVACAO se exigir aprovação). */
  proximoStatus: OsStatus;
  /** Mensagem para exibir ao usuário em caso de bloqueio ou redirecionamento. */
  mensagem?: string;
  /** Indica se houve redirecionamento automático para aprovação. */
  exigiuAprovacao?: boolean;
}

/**
 * Avalia uma transição solicitada e retorna o estado efetivo.
 * Aplica regra de aprovação: se custo > limite, transições para ABERTA / CONCLUIDA
 * são desviadas para AGUARDANDO_APROVACAO.
 */
export function avaliarTransicao(
  atual: OsStatus,
  solicitado: OsStatus,
  ctx: OsStateContext,
): TransitionResult {
  // Estados finais não permitem transição
  if (atual === "CONCLUIDA" || atual === "CANCELADA") {
    return {
      ok: false,
      proximoStatus: atual,
      mensagem: `OS já está ${atual === "CONCLUIDA" ? "concluída" : "cancelada"} e não pode ser alterada.`,
    };
  }

  // Validações específicas por destino
  if (solicitado === "CONCLUIDA" && !ctx.temItens) {
    return {
      ok: false,
      proximoStatus: atual,
      mensagem: "Adicione ao menos um serviço antes de concluir a OS.",
    };
  }

  if (solicitado === "ABERTA" && !ctx.temItens && atual === "RASCUNHO") {
    // Permitido abrir sem itens (vai operar depois), mas avisar
  }

  // Regra de aprovação: custo acima do limite força AGUARDANDO_APROVACAO
  // quando o destino seria ABERTA, EM_ANDAMENTO ou CONCLUIDA
  const exigeAprovacao =
    ctx.limiteAprovacao > 0 &&
    ctx.custoTotal > ctx.limiteAprovacao &&
    (solicitado === "ABERTA" || solicitado === "EM_ANDAMENTO" || solicitado === "CONCLUIDA") &&
    atual !== "AGUARDANDO_APROVACAO"; // se já foi aprovada, segue

  const destinoEfetivo: OsStatus = exigeAprovacao ? "AGUARDANDO_APROVACAO" : solicitado;

  // Verifica se a transição final é permitida
  if (!TRANSICOES_VALIDAS[atual].includes(destinoEfetivo)) {
    return {
      ok: false,
      proximoStatus: atual,
      mensagem: `Transição inválida: ${atual} → ${destinoEfetivo}.`,
    };
  }

  if (exigeAprovacao) {
    return {
      ok: true,
      proximoStatus: "AGUARDANDO_APROVACAO",
      exigiuAprovacao: true,
      mensagem: `Custo total (R$ ${ctx.custoTotal.toFixed(2)}) acima do limite de R$ ${ctx.limiteAprovacao.toFixed(2)}. OS enviada para aprovação.`,
    };
  }

  return { ok: true, proximoStatus: destinoEfetivo };
}

/** Retorna lista de ações disponíveis a partir do estado atual. */
export function acoesDisponiveis(atual: OsStatus): {
  status: OsStatus;
  label: string;
  variant: "default" | "outline" | "destructive" | "secondary";
}[] {
  const acoes: Record<OsStatus, ReturnType<typeof acoesDisponiveis>> = {
    RASCUNHO: [
      { status: "ABERTA", label: "Abrir OS", variant: "default" },
      { status: "CANCELADA", label: "Cancelar", variant: "destructive" },
    ],
    ABERTA: [
      { status: "EM_ANDAMENTO", label: "Iniciar execução", variant: "default" },
      { status: "CONCLUIDA", label: "Concluir", variant: "default" },
      { status: "CANCELADA", label: "Cancelar", variant: "destructive" },
    ],
    EM_ANDAMENTO: [
      { status: "CONCLUIDA", label: "Concluir", variant: "default" },
      { status: "CANCELADA", label: "Cancelar", variant: "destructive" },
    ],
    AGUARDANDO_APROVACAO: [
      { status: "EM_ANDAMENTO", label: "Aprovar e iniciar", variant: "default" },
      { status: "CONCLUIDA", label: "Aprovar e concluir", variant: "default" },
      { status: "CANCELADA", label: "Reprovar / Cancelar", variant: "destructive" },
    ],
    CONCLUIDA: [],
    CANCELADA: [],
  };
  return acoes[atual] || [];
}
