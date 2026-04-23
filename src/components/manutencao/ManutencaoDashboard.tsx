import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Wrench, PiggyBank, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

interface OS {
  status: string;
  custo_total: number | null;
  tipo_os: string | null;
  aberta_em: string;
  concluida_em?: string | null;
}

interface Manutencao {
  custo: number | null;
  causa: string | null;
  tipo: string | null;
  created_at: string;
}

interface Props {
  ordens: OS[];
  manutencoes: Manutencao[];
}

// Multiplicador: cada R$1 em preventiva evita ~R$3 em corretiva (referência setor)
const MULT_ECONOMIA_PREVENTIVA = 3;

export function ManutencaoDashboard({ ordens, manutencoes }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const ini30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Gastos reais — OS concluídas + manutenções
    const osConcluidas = ordens.filter((o) => o.status === "CONCLUIDA");
    const gastoOS = osConcluidas.reduce((s, o) => s + Number(o.custo_total || 0), 0);
    const gastoManut = manutencoes.reduce((s, m) => s + Number(m.custo || 0), 0);
    const gastoTotal = gastoOS + gastoManut;

    // Gasto últimos 30 dias
    const gasto30 =
      osConcluidas
        .filter((o) => new Date(o.concluida_em || o.aberta_em) >= ini30)
        .reduce((s, o) => s + Number(o.custo_total || 0), 0) +
      manutencoes
        .filter((m) => new Date(m.created_at) >= ini30)
        .reduce((s, m) => s + Number(m.custo || 0), 0);

    // Classificação preventiva vs corretiva
    const tiposPreventivos = ["preventivo", "inspecao", "calibragem", "rodizio", "alinhamento", "balanceamento", "PREVENTIVA"];
    const ehPreventivo = (tipo?: string | null, causa?: string | null) => {
      const v = (tipo || "").toLowerCase();
      const c = (causa || "").toLowerCase();
      return tiposPreventivos.some((t) => v.includes(t.toLowerCase())) || c === "preventivo";
    };

    const gastoPreventivo =
      osConcluidas
        .filter((o) => ehPreventivo(o.tipo_os))
        .reduce((s, o) => s + Number(o.custo_total || 0), 0) +
      manutencoes
        .filter((m) => ehPreventivo(m.tipo, m.causa))
        .reduce((s, m) => s + Number(m.custo || 0), 0);

    const gastoCorretivo = gastoTotal - gastoPreventivo;

    // Economia estimada: preventiva evita corretiva (3x)
    const economiaEstimada = gastoPreventivo * (MULT_ECONOMIA_PREVENTIVA - 1);

    // Pendentes
    const pendentes = ordens.filter((o) =>
      ["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_APROVACAO"].includes(o.status)
    );
    const custoPendente = pendentes.reduce((s, o) => s + Number(o.custo_total || 0), 0);

    return {
      gastoTotal,
      gasto30,
      gastoPreventivo,
      gastoCorretivo,
      economiaEstimada,
      qtdConcluidas: osConcluidas.length,
      qtdPendentes: pendentes.length,
      custoPendente,
      percPreventivo: gastoTotal > 0 ? (gastoPreventivo / gastoTotal) * 100 : 0,
    };
  }, [ordens, manutencoes]);

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      {/* Hero — economia x gasto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2.5 bg-emerald-500/15">
                <PiggyBank className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Economia estimada com preventiva
                </p>
                <p className="text-3xl font-bold text-emerald-500 mt-1">{fmt(stats.economiaEstimada)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cada R$ 1 em preventiva evita ~R$ {MULT_ECONOMIA_PREVENTIVA} em corretiva
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg p-2.5 bg-destructive/15">
                <Wrench className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Gasto total em manutenção
                </p>
                <p className="text-3xl font-bold text-destructive mt-1">{fmt(stats.gastoTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.qtdConcluidas} ordem(ns) concluída(s) · últimos 30 dias: {fmt(stats.gasto30)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Preventiva</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{fmt(stats.gastoPreventivo)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.percPreventivo.toFixed(0)}% do total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Corretiva</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{fmt(stats.gastoCorretivo)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{(100 - stats.percPreventivo).toFixed(0)}% do total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Últimos 30 dias</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{fmt(stats.gasto30)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">gasto recente</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">OS pendentes</p>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{stats.qtdPendentes}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(stats.custoPendente)} em aberto</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
