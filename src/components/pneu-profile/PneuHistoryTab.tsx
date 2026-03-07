import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Package, Truck, Wrench, AlertTriangle, RotateCcw, CheckCircle, XCircle,
  ArrowRightLeft, ClipboardCheck, Trash2
} from "lucide-react";

const EVENT_ICONS: Record<string, any> = {
  instalacao: Truck,
  remocao: ArrowRightLeft,
  entrada_estoque: Package,
  saida_estoque: Package,
  inspecao: ClipboardCheck,
  envio_recapagem: RotateCcw,
  retorno_recapagem: RotateCcw,
  manutencao: Wrench,
  alerta: AlertTriangle,
  alerta_tratado: CheckCircle,
  venda: CheckCircle,
  descarte: Trash2,
};

const EVENT_COLORS: Record<string, string> = {
  instalacao: "text-emerald-400",
  remocao: "text-yellow-400",
  entrada_estoque: "text-blue-400",
  saida_estoque: "text-orange-400",
  inspecao: "text-sky-400",
  envio_recapagem: "text-purple-400",
  retorno_recapagem: "text-purple-400",
  manutencao: "text-amber-400",
  alerta: "text-destructive",
  alerta_tratado: "text-emerald-400",
  venda: "text-emerald-400",
  descarte: "text-destructive",
};

interface Props {
  pneu: any;
  movimentacoes: any[];
  manutencoes: any[];
  recapagens: any[];
  alertas: any[];
}

export function PneuHistoryTab({ pneu, movimentacoes, manutencoes, recapagens, alertas }: Props) {
  // Build unified timeline
  const events: { date: Date; type: string; title: string; desc: string }[] = [];

  // Created
  events.push({
    date: new Date(pneu.created_at),
    type: "entrada_estoque",
    title: "Cadastrado no sistema",
    desc: `${pneu.marca} ${pneu.medida} — ${pneu.rg_code || pneu.id_unico}`,
  });

  // Movimentações
  movimentacoes.forEach(m => {
    const t = m.tipo_movimentacao || "movimentacao";
    const typeMap: Record<string, string> = {
      instalacao: "instalacao",
      remocao: "remocao",
      entrada_estoque: "entrada_estoque",
      saida_estoque: "saida_estoque",
      envio_recapagem: "envio_recapagem",
      retorno_recapagem: "retorno_recapagem",
    };
    events.push({
      date: new Date(m.data_movimentacao || m.created_at),
      type: typeMap[t] || "saida_estoque",
      title: t.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
      desc: [m.origem && `De: ${m.origem}`, m.destino && `Para: ${m.destino}`, m.observacoes].filter(Boolean).join(" | "),
    });
  });

  // Manutenções
  manutencoes.forEach(m => {
    events.push({
      date: new Date(m.created_at),
      type: "manutencao",
      title: `Manutenção: ${m.tipo || "Geral"}`,
      desc: [m.causa && `Causa: ${m.causa}`, m.custo && `Custo: R$ ${Number(m.custo).toLocaleString("pt-BR")}`, m.observacoes].filter(Boolean).join(" | "),
    });
  });

  // Recapagens
  recapagens.forEach(r => {
    events.push({
      date: new Date(r.data_envio || r.created_at),
      type: "envio_recapagem",
      title: `Recapagem — Ciclo ${r.numero_ciclo || "?"}`,
      desc: [r.status && `Status: ${r.status}`, r.custo_recapagem && `Custo: R$ ${Number(r.custo_recapagem).toLocaleString("pt-BR")}`].filter(Boolean).join(" | "),
    });
  });

  // Alertas
  alertas.forEach(a => {
    events.push({
      date: new Date(a.created_at),
      type: a.tratado_em ? "alerta_tratado" : "alerta",
      title: `Alerta: ${a.tipo_alerta}`,
      desc: a.mensagem,
    });
  });

  // Sort by date desc
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Histórico Completo</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {events.map((ev, i) => {
                const Icon = EVENT_ICONS[ev.type] || Package;
                const color = EVENT_COLORS[ev.type] || "text-muted-foreground";
                return (
                  <div key={i} className="relative pl-10">
                    <div className={`absolute left-2 top-1 rounded-full p-1 bg-background border ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{ev.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(ev.date, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {ev.desc && <p className="text-xs text-muted-foreground mt-0.5">{ev.desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
