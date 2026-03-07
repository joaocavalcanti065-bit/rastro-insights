import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ArrowDownToLine, Bookmark } from "lucide-react";

interface Props {
  pneus: any[];
  reservedIds: Set<string>;
  onEntrada: () => void;
  onReservar: () => void;
}

export function EstoqueVisaoMedida({ pneus, reservedIds, onEntrada, onReservar }: Props) {
  // Group by medida
  const groups = pneus.reduce((acc, p) => {
    const key = p.medida || "Sem medida";
    if (!acc[key]) acc[key] = { total: 0, disponiveis: 0, reservados: 0, recap: 0, valor: 0, novos: 0, recapados: 0 };
    acc[key].total++;
    if (reservedIds.has(p.id)) acc[key].reservados++;
    else acc[key].disponiveis++;
    if (p.tipo_pneu !== "novo") acc[key].recapados++;
    else acc[key].novos++;
    if (p.tipo_pneu !== "novo" && (p.qtd_recapagens || 0) < 3) acc[key].recap++;
    acc[key].valor += Number(p.custo_aquisicao || 0);
    return acc;
  }, {} as Record<string, any>);

  // Sort by quantity desc
  const sorted = Object.entries(groups).sort((a: any, b: any) => b[1].total - a[1].total);

  // Estimate coverage (days) - simplified: avg consumption is 2 per month per medida
  const estimateCoverage = (total: number) => Math.round(total * 15); // ~15 days per unit

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {sorted.map(([medida, data]: [string, any]) => {
        const coverage = estimateCoverage(data.disponiveis);
        const coverageColor = coverage > 15 ? "border-emerald-500/30 bg-emerald-500/5" : coverage > 7 ? "border-amber-500/30 bg-amber-500/5" : "border-destructive/30 bg-destructive/5";
        const coverageBarPct = Math.min(coverage / 30 * 100, 100);
        const coverageBarColor = coverage > 15 ? "bg-emerald-500" : coverage > 7 ? "bg-amber-500" : "bg-destructive";

        return (
          <Card key={medida} className={coverageColor}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-mono">{medida}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold">{data.disponiveis}</p>
                  <p className="text-[10px] text-muted-foreground">Dispon.</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{data.reservados}</p>
                  <p className="text-[10px] text-muted-foreground">Reserv.</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{data.recap}</p>
                  <p className="text-[10px] text-muted-foreground">Recap.</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{data.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cobertura: {coverage} dias</span>
                  <Badge variant={coverage > 15 ? "default" : coverage > 7 ? "outline" : "destructive"} className="text-[10px] px-1.5">
                    {coverage > 15 ? "OK" : coverage > 7 ? "Atenção" : "Crítico"}
                  </Badge>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${coverageBarColor}`} style={{ width: `${coverageBarPct}%` }} />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Novos: {data.novos} | Recapados: {data.recapados} | Valor: R$ {data.valor.toLocaleString("pt-BR")}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onEntrada}>
                  <ArrowDownToLine className="h-3 w-3 mr-1" />Entrada
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onReservar}>
                  <Bookmark className="h-3 w-3 mr-1" />Reservar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
