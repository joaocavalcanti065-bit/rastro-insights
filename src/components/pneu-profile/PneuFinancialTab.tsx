import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

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
