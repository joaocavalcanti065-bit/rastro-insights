import { cn } from "@/lib/utils";

export interface EixoLayout {
  numero: number;
  tipo: "direcional" | "tracao" | "livre" | "morto";
  duplo: boolean;
  posicoes: string[];
}

export interface LayoutPneus {
  eixos: EixoLayout[];
}

export interface PneuStatus {
  posicao: string;
  pneu_id?: string;
  marca?: string;
  modelo?: string;
  sulco_atual?: number | null;
  pressao_atual?: number | null;
  vida_atual?: number | null;
  status_visual?: "bom" | "atencao" | "critico" | "vazio";
  selecionado?: boolean;
  servicosCount?: number;
}

interface Props {
  layout: LayoutPneus;
  pneusPorPosicao: Record<string, PneuStatus>;
  onPneuClick: (posicao: string, multi?: boolean) => void;
  onSelecionarEixo?: (eixoNumero: number) => void;
  posicoesSelecionadas: string[];
}

const corPorStatus = (s?: string) => {
  switch (s) {
    case "bom": return "bg-chart-1/25 border-chart-1 text-chart-1";
    case "atencao": return "bg-chart-4/25 border-chart-4 text-chart-4";
    case "critico": return "bg-destructive/25 border-destructive text-destructive animate-pulse";
    default: return "bg-muted border-border text-muted-foreground";
  }
};

const corTipoEixo = (tipo: string) => {
  switch (tipo) {
    case "direcional": return "bg-primary/10 text-primary border-primary/30";
    case "tracao": return "bg-chart-2/10 text-chart-2 border-chart-2/30";
    case "morto": return "bg-muted text-muted-foreground border-border";
    case "livre": return "bg-chart-3/10 text-chart-3 border-chart-3/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const labelTipoEixo = (tipo: string) =>
  ({ direcional: "Direcional", tracao: "Tração", morto: "Eixo Morto", livre: "Livre" } as Record<string, string>)[tipo] || tipo;

function PneuCard({
  pos,
  data,
  onClick,
  selecionado,
}: {
  pos: string;
  data?: PneuStatus;
  onClick: (e: React.MouseEvent) => void;
  selecionado: boolean;
}) {
  const cor = corPorStatus(data?.status_visual || "vazio");
  return (
    <button
      type="button"
      onClick={onClick}
      title={data?.marca ? `${data.marca} ${data.modelo || ""}\nSulco: ${data?.sulco_atual ?? "—"}mm\nPSI: ${data?.pressao_atual ?? "—"}` : "Vazio"}
      className={cn(
        "relative w-14 h-20 rounded-md border-2 transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm hover:scale-105 hover:shadow-md",
        cor,
        selecionado && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105",
      )}
    >
      <span className="text-[10px] font-bold leading-none">{pos}</span>
      {data?.sulco_atual != null && (
        <span className="text-[9px] font-semibold leading-none">{data.sulco_atual}mm</span>
      )}
      {data?.vida_atual != null && data.vida_atual > 1 && (
        <span className="text-[8px] leading-none opacity-80">R{data.vida_atual - 1}</span>
      )}
      {(data?.servicosCount ?? 0) > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {data?.servicosCount}
        </span>
      )}
    </button>
  );
}

export function VeiculoTopDownLayout({
  layout,
  pneusPorPosicao,
  onPneuClick,
  onSelecionarEixo,
  posicoesSelecionadas,
}: Props) {
  return (
    <div className="bg-card/50 border border-border rounded-xl p-4 overflow-x-auto">
      {/* Cabine */}
      <div className="flex justify-center mb-2">
        <div className="w-32 h-10 bg-muted/60 border border-border rounded-t-2xl flex items-center justify-center text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
          Cabine
        </div>
      </div>

      {/* Chassi */}
      <div className="relative mx-auto bg-card border-x-2 border-border" style={{ minWidth: 280, maxWidth: 360 }}>
        <div className="space-y-3 py-3 px-2">
          {layout.eixos.map((eixo) => {
            const meio = Math.floor(eixo.posicoes.length / 2);
            const esq = eixo.posicoes.slice(0, meio);
            const dir = eixo.posicoes.slice(meio);

            return (
              <div key={eixo.numero} className="relative">
                {/* Etiqueta tipo eixo */}
                <div className="flex items-center justify-center mb-1.5">
                  <button
                    type="button"
                    onClick={() => onSelecionarEixo?.(eixo.numero)}
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide hover:opacity-80",
                      corTipoEixo(eixo.tipo),
                    )}
                    title={`Selecionar todos do eixo ${eixo.numero}`}
                  >
                    Eixo {eixo.numero} • {labelTipoEixo(eixo.tipo)}
                  </button>
                </div>

                {/* Linha do eixo */}
                <div className="flex items-center justify-between gap-2">
                  {/* Lado esquerdo */}
                  <div className="flex gap-1">
                    {esq.map((pos) => (
                      <PneuCard
                        key={pos}
                        pos={pos}
                        data={pneusPorPosicao[pos]}
                        selecionado={posicoesSelecionadas.includes(pos)}
                        onClick={(e) => onPneuClick(pos, e.shiftKey)}
                      />
                    ))}
                  </div>

                  {/* Eixo (barra) */}
                  <div className="flex-1 h-1 bg-foreground/30 mx-1 rounded-full" />

                  {/* Lado direito */}
                  <div className="flex gap-1">
                    {dir.map((pos) => (
                      <PneuCard
                        key={pos}
                        pos={pos}
                        data={pneusPorPosicao[pos]}
                        selecionado={posicoesSelecionadas.includes(pos)}
                        onClick={(e) => onPneuClick(pos, e.shiftKey)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-chart-1/40 border border-chart-1" /> Bom</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-chart-4/40 border border-chart-4" /> Atenção</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/40 border border-destructive" /> Crítico</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted border border-border" /> Vazio</span>
        <span className="opacity-70 ml-2">Shift+Click = multi-seleção · clique no rótulo do eixo = selecionar todos</span>
      </div>
    </div>
  );
}
