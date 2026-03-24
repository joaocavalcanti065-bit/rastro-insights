import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TireData {
  id: string;
  id_unico: string;
  posicao_atual: string | null;
  sulco_atual: number | null;
  sulco_inicial: number | null;
  pressao_atual: number | null;
  pressao_ideal: number | null;
  marca: string;
  medida: string | null;
  status: string;
}

interface VehicleTireLayoutProps {
  tipoVeiculo: string;
  quantidadeEixos: number;
  possuiEstepe: boolean;
  quantidadeEstepes: number;
  pneus: TireData[];
}

type AxleType = "direcional" | "tracao" | "livre";

interface AxleConfig {
  type: AxleType;
  label: string;
  dual: boolean;
}

function getAxleConfigs(tipo: string, eixos: number): AxleConfig[] {
  const configs: AxleConfig[] = [];

  if (tipo === "Carro") {
    configs.push({ type: "direcional", label: "Dianteiro", dual: false });
    configs.push({ type: "tracao", label: "Traseiro", dual: false });
    return configs;
  }

  // First axle is always direcional (single)
  configs.push({ type: "direcional", label: "Eixo 1 (Direcional)", dual: false });

  if (tipo === "Toco" || tipo === "Caminhão 3/4") {
    configs.push({ type: "tracao", label: "Eixo 2 (Tração)", dual: true });
  } else if (tipo === "Truck") {
    configs.push({ type: "tracao", label: "Eixo 2 (Tração)", dual: true });
    configs.push({ type: "tracao", label: "Eixo 3 (Tração)", dual: true });
  } else if (tipo === "Bi-Truck") {
    configs.push({ type: "tracao", label: "Eixo 2 (Tração)", dual: true });
    configs.push({ type: "tracao", label: "Eixo 3 (Tração)", dual: true });
    configs.push({ type: "livre", label: "Eixo 4 (Livre)", dual: true });
  } else if (tipo === "Cavalo Mecânico") {
    configs.push({ type: "tracao", label: "Eixo 2 (Tração)", dual: true });
    // If more than 2 axles, add trailer/extra axles
    for (let i = 3; i <= eixos; i++) {
      configs.push({ type: "livre", label: `Eixo ${i} (Livre)`, dual: true });
    }
  } else {
    for (let i = 2; i <= eixos; i++) {
      configs.push({
        type: i <= Math.ceil(eixos / 2) + 1 ? "tracao" : "livre",
        label: `Eixo ${i}`,
        dual: true,
      });
    }
  }

  return configs;
}

function generatePositionCodes(axles: AxleConfig[]): string[][] {
  return axles.map((axle, idx) => {
    const num = idx + 1;
    const prefix = axle.type === "direcional" ? "D" : axle.type === "tracao" ? "T" : "L";
    if (axle.dual) {
      return [
        `${prefix}${num}EE`,
        `${prefix}${num}EI`,
        `${prefix}${num}DI`,
        `${prefix}${num}DE`,
      ];
    }
    return [`${prefix}${num}E`, `${prefix}${num}D`];
  });
}

function getSulcoColor(sulcoAtual: number | null, sulcoInicial: number | null): string {
  if (sulcoAtual == null) return "bg-muted text-muted-foreground";
  const ref = sulcoInicial && sulcoInicial > 0 ? sulcoInicial : 16;
  const pct = (sulcoAtual / ref) * 100;
  if (pct >= 60) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
  if (pct >= 35) return "bg-amber-500/20 text-amber-400 border-amber-500/50";
  return "bg-red-500/20 text-red-400 border-red-500/50";
}

function getPressaoColor(pressaoAtual: number | null, pressaoIdeal: number | null): string {
  if (pressaoAtual == null) return "text-muted-foreground";
  if (pressaoIdeal == null || pressaoIdeal === 0) return "text-muted-foreground";
  const desvio = Math.abs(pressaoAtual - pressaoIdeal) / pressaoIdeal;
  if (desvio <= 0.05) return "text-emerald-400";
  if (desvio <= 0.1) return "text-amber-400";
  return "text-red-400";
}

function TireSlot({
  positionCode,
  tire,
  side,
}: {
  positionCode: string;
  tire: TireData | undefined;
  side: "left" | "right";
}) {
  const sulcoColor = tire ? getSulcoColor(tire.sulco_atual, tire.sulco_inicial) : "";
  const pressaoColor = tire ? getPressaoColor(tire.pressao_atual, tire.pressao_ideal) : "";
  const sulcoPct = tire?.sulco_inicial && tire.sulco_inicial > 0
    ? Math.round(((tire.sulco_atual || 0) / tire.sulco_inicial) * 100)
    : tire?.sulco_atual != null ? Math.round(((tire.sulco_atual) / 16) * 100) : null;

  if (!tire) {
    return (
      <div className={`w-14 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 ${side === "right" ? "ml-1" : "mr-1"}`}>
        <span className="text-[9px] text-muted-foreground/50 font-mono">{positionCode}</span>
        <span className="text-[8px] text-muted-foreground/40">Vazio</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`w-14 h-24 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all hover:scale-105 ${sulcoColor} ${side === "right" ? "ml-1" : "mr-1"}`}
        >
          <span className="text-[9px] font-mono font-bold truncate w-full text-center">{tire.id_unico.split('-').pop()}</span>
          <div className="w-10 h-1.5 rounded-full bg-background/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-current"
              style={{ width: `${sulcoPct ?? 0}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold">{tire.sulco_atual ?? "—"}mm</span>
          <span className={`text-[9px] font-medium ${pressaoColor}`}>
            {tire.pressao_atual ?? "—"} PSI
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side={side === "left" ? "left" : "right"} className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-bold">{tire.id_unico} — {tire.marca}</p>
          <p>Medida: {tire.medida || "—"}</p>
          <p>Posição: {positionCode}</p>
          <p>Sulco: {tire.sulco_atual ?? "—"} / {tire.sulco_inicial ?? "—"} mm ({sulcoPct ?? "—"}%)</p>
          <p>Pressão: {tire.pressao_atual ?? "—"} / {tire.pressao_ideal ?? "—"} PSI</p>
          <p>Status: {tire.status}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function VehicleTireLayout({ tipoVeiculo, quantidadeEixos, possuiEstepe, quantidadeEstepes, pneus }: VehicleTireLayoutProps) {
  const axleConfigs = useMemo(() => getAxleConfigs(tipoVeiculo, quantidadeEixos), [tipoVeiculo, quantidadeEixos]);
  const positionGrid = useMemo(() => generatePositionCodes(axleConfigs), [axleConfigs]);

  const tireMap = useMemo(() => {
    const map: Record<string, TireData> = {};
    pneus.forEach((p) => {
      if (p.posicao_atual) map[p.posicao_atual] = p;
    });
    return map;
  }, [pneus]);

  const allPositionCodes = useMemo(() => {
    const codes = new Set(positionGrid.flat());
    if (possuiEstepe) {
      for (let i = 1; i <= quantidadeEstepes; i++) codes.add(`EST${i}`);
    }
    return codes;
  }, [positionGrid, possuiEstepe, quantidadeEstepes]);

  const unmatchedTires = useMemo(() => {
    return pneus.filter(p => p.posicao_atual && !allPositionCodes.has(p.posicao_atual) && !p.posicao_atual.startsWith("EST"));
  }, [pneus, allPositionCodes]);

  const spareTires = pneus.filter(p => p.posicao_atual?.startsWith("EST"));

  const totalSlots = positionGrid.flat().length + (possuiEstepe ? quantidadeEstepes : 0);

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] mb-2 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50" />
          <span className="text-muted-foreground">Bom (≥60%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50" />
          <span className="text-muted-foreground">Atenção (35-60%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
          <span className="text-muted-foreground">Crítico (&lt;35%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-dashed border-muted-foreground/30" />
          <span className="text-muted-foreground">Vazio</span>
        </div>
      </div>

      {/* Vehicle body */}
      <div className="relative">
        <div className="flex justify-center mb-1">
          <div className="w-20 h-8 rounded-t-xl bg-muted/50 border border-b-0 border-muted-foreground/20 flex items-center justify-center">
            <span className="text-[9px] text-muted-foreground font-medium">CABINE</span>
          </div>
        </div>

        <div className="relative flex flex-col items-center">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-16 bg-muted/30 border-x border-muted-foreground/15 rounded-b-lg z-0" />

          <div className="relative z-10 flex flex-col gap-6 py-2">
            {positionGrid.map((positions, axleIdx) => {
              const axle = axleConfigs[axleIdx];
              const isDual = axle.dual;
              const leftPositions = isDual ? positions.slice(0, 2) : [positions[0]];
              const rightPositions = isDual ? positions.slice(2, 4) : [positions[1]];

              return (
                <div key={axleIdx} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground font-medium">{axle.label}</span>
                  <div className="flex items-center gap-0">
                    <div className="flex gap-0.5">
                      {leftPositions.map((pos) => (
                        <TireSlot key={pos} positionCode={pos} tire={tireMap[pos]} side="left" />
                      ))}
                    </div>
                    <div className="w-16 h-1 bg-muted-foreground/30 rounded-full" />
                    <div className="flex gap-0.5">
                      {rightPositions.map((pos) => (
                        <TireSlot key={pos} positionCode={pos} tire={tireMap[pos]} side="right" />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spare tires */}
        {possuiEstepe && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground font-medium">Estepe(s)</span>
            <div className="flex gap-2">
              {Array.from({ length: quantidadeEstepes }).map((_, i) => {
                const code = `EST${i + 1}`;
                const tire = spareTires[i];
                return <TireSlot key={code} positionCode={code} tire={tire} side="left" />;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Unmatched tires */}
      {unmatchedTires.length > 0 && (
        <div className="mt-2 w-full border-t border-muted-foreground/15 pt-2">
          <span className="text-[10px] text-amber-400 font-medium">
            {unmatchedTires.length} pneu(s) sem posição mapeada:
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {unmatchedTires.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-400 cursor-help">
                    {t.id_unico.split('-').pop()} ({t.posicao_atual}) — {t.sulco_atual ?? "—"}mm
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t.id_unico} — {t.marca} — {t.posicao_atual}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
        <span>{pneus.length} pneu(s) instalado(s)</span>
        <span>•</span>
        <span>{totalSlots} posição(ões)</span>
      </div>
    </div>
  );
}
