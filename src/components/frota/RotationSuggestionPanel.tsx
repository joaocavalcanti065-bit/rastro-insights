import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface TireData {
  id: string;
  id_unico: string;
  posicao_atual: string | null;
  sulco_atual: number | null;
  sulco_inicial: number | null;
  marca: string;
  medida: string | null;
}

interface RotationSuggestion {
  fromTireId: string;
  fromTireLabel: string;
  fromPosition: string;
  fromSulco: number;
  toTireId: string;
  toTireLabel: string;
  toPosition: string;
  toSulco: number;
  reason: string;
  priority: "alta" | "media" | "baixa";
}

interface Props {
  pneus: TireData[];
  onApplySuggestion?: (tireId: string, fromPos: string, toPos: string, swapTireId: string) => void;
}

function getAxleFromPosition(pos: string): string {
  const match = pos.match(/^[A-Z](\d+)/);
  return match ? match[1] : "0";
}

function getSideFromPosition(pos: string): "left" | "right" {
  if (pos.includes("E")) return "left";
  return "right";
}

function getWearPct(tire: TireData): number {
  const ref = tire.sulco_inicial && tire.sulco_inicial > 0 ? tire.sulco_inicial : 16;
  return ((tire.sulco_atual || 0) / ref) * 100;
}

export function RotationSuggestionPanel({ pneus, onApplySuggestion }: Props) {
  const suggestions = useMemo(() => {
    const tiresWithPos = pneus.filter(p => p.posicao_atual && p.sulco_atual != null);
    if (tiresWithPos.length < 2) return [];

    const result: RotationSuggestion[] = [];

    // Group tires by axle
    const axleGroups: Record<string, TireData[]> = {};
    tiresWithPos.forEach(t => {
      const axle = getAxleFromPosition(t.posicao_atual!);
      if (!axleGroups[axle]) axleGroups[axle] = [];
      axleGroups[axle].push(t);
    });

    // 1) Check within-axle imbalance (left vs right)
    Object.entries(axleGroups).forEach(([axle, tires]) => {
      if (tires.length < 2) return;
      const left = tires.filter(t => getSideFromPosition(t.posicao_atual!) === "left");
      const right = tires.filter(t => getSideFromPosition(t.posicao_atual!) === "right");

      for (const l of left) {
        for (const r of right) {
          const diff = Math.abs((l.sulco_atual || 0) - (r.sulco_atual || 0));
          if (diff >= 3) {
            const worse = (l.sulco_atual || 0) < (r.sulco_atual || 0) ? l : r;
            const better = worse === l ? r : l;
            result.push({
              fromTireId: worse.id,
              fromTireLabel: worse.id_unico,
              fromPosition: worse.posicao_atual!,
              fromSulco: worse.sulco_atual!,
              toTireId: better.id,
              toTireLabel: better.id_unico,
              toPosition: better.posicao_atual!,
              toSulco: better.sulco_atual!,
              reason: `Diferença de ${diff.toFixed(1)}mm no eixo ${axle} (desgaste desigual lateral)`,
              priority: diff >= 5 ? "alta" : "media",
            });
          }
        }
      }
    });

    // 2) Check cross-axle: steer vs drive imbalance — suggest moving better tires to steer
    const axleKeys = Object.keys(axleGroups).sort();
    if (axleKeys.length >= 2) {
      const steerAxle = axleKeys[0]; // axle 1 = direcional
      const steerTires = axleGroups[steerAxle] || [];

      for (let i = 1; i < axleKeys.length; i++) {
        const driveAxle = axleKeys[i];
        const driveTires = axleGroups[driveAxle] || [];

        for (const steer of steerTires) {
          for (const drive of driveTires) {
            const steerSulco = steer.sulco_atual || 0;
            const driveSulco = drive.sulco_atual || 0;

            // If drive tire has significantly more tread than steer, suggest swap
            if (driveSulco - steerSulco >= 3) {
              const alreadySuggested = result.some(
                s => (s.fromTireId === steer.id && s.toTireId === drive.id) ||
                     (s.fromTireId === drive.id && s.toTireId === steer.id)
              );
              if (!alreadySuggested) {
                result.push({
                  fromTireId: steer.id,
                  fromTireLabel: steer.id_unico,
                  fromPosition: steer.posicao_atual!,
                  fromSulco: steerSulco,
                  toTireId: drive.id,
                  toTireLabel: drive.id_unico,
                  toPosition: drive.posicao_atual!,
                  toSulco: driveSulco,
                  reason: `Pneu direcional (${steerSulco}mm) mais gasto que tração (${driveSulco}mm) — trocar para equalizar`,
                  priority: driveSulco - steerSulco >= 5 ? "alta" : "media",
                });
              }
            }
          }
        }
      }
    }

    // 3) Flag critically worn tires (< 5mm) near better ones
    for (const t of tiresWithPos) {
      if ((t.sulco_atual || 0) <= 5) {
        const better = tiresWithPos.find(
          o => o.id !== t.id && (o.sulco_atual || 0) >= 10 && !o.posicao_atual?.startsWith("EST")
        );
        if (better) {
          const alreadySuggested = result.some(
            s => (s.fromTireId === t.id && s.toTireId === better.id) ||
                 (s.fromTireId === better.id && s.toTireId === t.id)
          );
          if (!alreadySuggested) {
            result.push({
              fromTireId: t.id,
              fromTireLabel: t.id_unico,
              fromPosition: t.posicao_atual!,
              fromSulco: t.sulco_atual!,
              toTireId: better.id,
              toTireLabel: better.id_unico,
              toPosition: better.posicao_atual!,
              toSulco: better.sulco_atual!,
              reason: `Pneu em ${t.posicao_atual} com sulco crítico (${t.sulco_atual}mm) — considerar substituição ou rodízio`,
              priority: "alta",
            });
          }
        }
      }
    }

    // Sort by priority
    const order = { alta: 0, media: 1, baixa: 2 };
    result.sort((a, b) => order[a.priority] - order[b.priority]);

    // Limit to top 5
    return result.slice(0, 5);
  }, [pneus]);

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-4 flex items-center gap-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-medium text-emerald-400">Desgaste equilibrado</p>
            <p className="text-xs text-muted-foreground">Nenhuma sugestão de rodízio no momento. Os pneus estão com desgaste uniforme.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Sugestões de Rodízio
          <Badge variant="secondary" className="text-[10px] ml-auto">{suggestions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg border p-3 space-y-2",
              s.priority === "alta" && "border-red-500/30 bg-red-500/5",
              s.priority === "media" && "border-amber-500/30 bg-amber-500/5",
              s.priority === "baixa" && "border-muted-foreground/20",
            )}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className={cn(
                "h-4 w-4 shrink-0 mt-0.5",
                s.priority === "alta" && "text-red-400",
                s.priority === "media" && "text-amber-400",
                s.priority === "baixa" && "text-muted-foreground",
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{s.reason}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                    {s.fromTireLabel.split('-').pop()} ({s.fromPosition}) — {s.fromSulco}mm
                  </span>
                  <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                    {s.toTireLabel.split('-').pop()} ({s.toPosition}) — {s.toSulco}mm
                  </span>
                </div>
              </div>
              <Badge variant={s.priority === "alta" ? "destructive" : "secondary"} className="text-[9px] shrink-0">
                {s.priority}
              </Badge>
            </div>
            {onApplySuggestion && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs"
                onClick={() => onApplySuggestion(s.fromTireId, s.fromPosition, s.toPosition, s.toTireId)}
              >
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                Aplicar rodízio
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
