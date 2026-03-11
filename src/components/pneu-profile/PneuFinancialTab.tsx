import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingDown, TrendingUp, Trophy, Medal, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  pneu: any;
  manutencoes: any[];
  recapagens: any[];
}

export function PneuFinancialTab({ pneu, manutencoes, recapagens }: Props) {
  const custoAquisicao = Number(pneu.custo_aquisicao || 0);
  const custoRecapagens = recapagens.reduce((acc, r) => acc + Number(r.custo_recapagem || 0), 0);
  const custoManutencoes = manutencoes.reduce((acc, m) => acc + Number(m.custo || 0), 0);
  const custoTotal = custoAquisicao + custoRecapagens + custoManutencoes;
  const kmTotal = Number(pneu.km_atual || 0) - Number(pneu.km_inicial || 0);
  const cpk = kmTotal > 0 ? custoTotal / kmTotal : 0;

  // Fetch all tires with same medida for ranking
  const { data: pneusMesmaMedida, isLoading: loadingRanking } = useQuery({
    queryKey: ["ranking-cpk", pneu.medida],
    queryFn: async () => {
      const { data } = await supabase
        .from("pneus")
        .select("id, id_unico, rg_code, marca, modelo_pneu, medida, km_atual, km_inicial, custo_aquisicao, custo_acumulado, status, vida_atual")
        .eq("medida", pneu.medida)
        .neq("status", "sucata");
      return data || [];
    },
    enabled: !!pneu.medida,
  });

  // Build ranking
  const ranking = (pneusMesmaMedida || [])
    .map((p: any) => {
      const km = Math.max(0, (p.km_atual || 0) - (p.km_inicial || 0));
      const custo = Number(p.custo_aquisicao || 0) + Number(p.custo_acumulado || 0);
      const cpkVal = km > 0 ? custo / km : null;
      return { ...p, km, custo, cpk: cpkVal };
    })
    .filter((p: any) => p.cpk !== null && p.cpk > 0)
    .sort((a: any, b: any) => a.cpk - b.cpk);

  const currentRank = ranking.findIndex((p: any) => p.id === pneu.id) + 1;

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FinCard label="Custo Aquisição" value={`R$ ${custoAquisicao.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <FinCard label="Custo Recapagens" value={`R$ ${custoRecapagens.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <FinCard label="Custo Manutenções" value={`R$ ${custoManutencoes.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <FinCard label="Custo Total" value={`R$ ${custoTotal.toLocaleString("pt-BR")}`} icon={DollarSign} highlight />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Km Total Rodado</p>
            <p className="text-2xl font-bold font-mono">{kmTotal > 0 ? kmTotal.toLocaleString("pt-BR") : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Custo por Km</p>
            <p className="text-2xl font-bold font-mono">
              {cpk > 0 ? `R$ ${cpk.toFixed(3)}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Custo Acumulado (Sistema)</p>
            <p className="text-2xl font-bold font-mono">R$ {Number(pneu.custo_acumulado || 0).toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Composição do Custo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <CostBar label="Aquisição" value={custoAquisicao} total={custoTotal} color="bg-primary" />
            <CostBar label="Recapagens" value={custoRecapagens} total={custoTotal} color="bg-purple-500" />
            <CostBar label="Manutenções" value={custoManutencoes} total={custoTotal} color="bg-amber-500" />
          </div>
        </CardContent>
      </Card>

      {/* CPK Ranking */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Ranking Custo/Km — {pneu.medida}
            </CardTitle>
            {currentRank > 0 && (
              <Badge variant={currentRank <= 3 ? "default" : currentRank <= ranking.length * 0.5 ? "secondary" : "destructive"}>
                {currentRank}º de {ranking.length}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Comparativo entre {ranking.length} pneus da mesma medida com km rodado
          </p>
        </CardHeader>
        <CardContent>
          {loadingRanking ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sem dados suficientes para comparação (pneus precisam ter km rodado)
            </p>
          ) : (
            <div className="overflow-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Pneu</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">R$/Km</TableHead>
                    <TableHead className="text-right">Eficiência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((p: any, idx: number) => {
                    const isThis = p.id === pneu.id;
                    const best = ranking[0]?.cpk || 1;
                    const efficiency = best > 0 ? (best / p.cpk) * 100 : 0;
                    const RankIcon = idx === 0 ? Trophy : idx === 1 ? Medal : idx === 2 ? Award : null;
                    return (
                      <TableRow key={p.id} className={isThis ? "bg-primary/10 font-semibold" : ""}>
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-1">
                            {RankIcon && <RankIcon className={`h-4 w-4 ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : "text-amber-700"}`} />}
                            {!RankIcon && <span className="text-muted-foreground">{idx + 1}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{p.rg_code || p.id_unico}</span>
                          {isThis && <Badge variant="outline" className="ml-2 text-[10px]">Este</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{p.marca} {p.modelo_pneu || ""}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{p.km.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right font-mono text-xs">R$ {p.custo.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">
                          R$ {p.cpk.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${efficiency >= 80 ? "bg-emerald-500" : efficiency >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                                style={{ width: `${Math.min(efficiency, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{efficiency.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FinCard({ label, value, icon: Icon, highlight }: { label: string; value: string; icon: any; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary" : ""}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2 ${highlight ? "bg-primary" : "bg-muted"}`}>
          <Icon className={`h-4 w-4 ${highlight ? "text-primary-foreground" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold text-sm">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono">R$ {value.toLocaleString("pt-BR")} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}