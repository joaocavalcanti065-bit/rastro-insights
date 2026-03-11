import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Package, Truck, Wrench, AlertTriangle, RotateCcw, CheckCircle, XCircle,
  ArrowRightLeft, ClipboardCheck, Trash2, ShoppingCart
} from "lucide-react";

const EVENT_ICONS: Record<string, any> = {
  instalacao: Truck,
  remocao: ArrowRightLeft,
  entrada_estoque: Package,
  saida_estoque: Package,
  inspecao: ClipboardCheck,
  envio_recapagem: RotateCcw,
  retorno_recapagem: RotateCcw,
  recapagem: RotateCcw,
  manutencao: Wrench,
  alerta: AlertTriangle,
  alerta_tratado: CheckCircle,
  venda: ShoppingCart,
  descarte: Trash2,
  transferencia: ArrowRightLeft,
  ajuste: ClipboardCheck,
};

const EVENT_COLORS: Record<string, string> = {
  instalacao: "text-emerald-400",
  remocao: "text-yellow-400",
  entrada_estoque: "text-blue-400",
  saida_estoque: "text-orange-400",
  inspecao: "text-sky-400",
  envio_recapagem: "text-purple-400",
  retorno_recapagem: "text-purple-400",
  recapagem: "text-purple-400",
  manutencao: "text-amber-400",
  alerta: "text-destructive",
  alerta_tratado: "text-emerald-400",
  venda: "text-emerald-400",
  descarte: "text-destructive",
  transferencia: "text-sky-400",
  ajuste: "text-muted-foreground",
};

interface Props {
  pneu: any;
  movimentacoes: any[];
  manutencoes: any[];
  recapagens: any[];
  alertas: any[];
}

function buildVeiculoLabel(v: any) {
  if (!v) return null;
  const parts = [v.placa, v.frota && `Frota: ${v.frota}`, v.modelo].filter(Boolean);
  return parts.join(" — ");
}

export function PneuHistoryTab({ pneu, movimentacoes, manutencoes, recapagens, alertas }: Props) {
  const events: { date: Date; type: string; title: string; desc: string; details?: string[] }[] = [];

  // Created
  events.push({
    date: new Date(pneu.created_at),
    type: "entrada_estoque",
    title: "Cadastrado no sistema",
    desc: `${pneu.marca} ${pneu.medida} — ${pneu.rg_code || pneu.id_unico}`,
    details: [
      pneu.custo_aquisicao && `Custo aquisição: R$ ${Number(pneu.custo_aquisicao).toLocaleString("pt-BR")}`,
      pneu.nota_fiscal && `NF: ${pneu.nota_fiscal}`,
    ].filter(Boolean) as string[],
  });

  // Movimentações with vehicle details
  movimentacoes.forEach(m => {
    const t = m.tipo_movimentacao || "movimentacao";
    const typeMap: Record<string, string> = {
      instalacao: "instalacao",
      remocao: "remocao",
      entrada_estoque: "entrada_estoque",
      saida_estoque: "saida_estoque",
      envio_recapagem: "envio_recapagem",
      retorno_recapagem: "retorno_recapagem",
      recapagem: "recapagem",
      venda: "venda",
      descarte: "descarte",
      transferencia: "transferencia",
      ajuste: "ajuste",
      manutencao: "manutencao",
    };

    const veicDestLabel = buildVeiculoLabel(m.veiculo_destino);
    const veicOrigLabel = buildVeiculoLabel(m.veiculo_origem);

    const details: string[] = [];
    if (veicOrigLabel) details.push(`Veículo origem: ${veicOrigLabel}`);
    if (veicDestLabel) details.push(`Veículo destino: ${veicDestLabel}`);
    if (m.posicao_destino) details.push(`Posição: ${m.posicao_destino}`);
    if (m.km_no_momento) details.push(`Km: ${Number(m.km_no_momento).toLocaleString("pt-BR")}`);
    if (m.sulco_no_momento != null) details.push(`Sulco: ${m.sulco_no_momento} mm`);
    if (m.pressao_no_momento != null) details.push(`Pressão: ${m.pressao_no_momento} psi`);

    events.push({
      date: new Date(m.data_movimentacao || m.created_at),
      type: typeMap[t] || "saida_estoque",
      title: t.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
      desc: [m.origem && `De: ${m.origem}`, m.destino && `Para: ${m.destino}`, m.observacoes].filter(Boolean).join(" | "),
      details,
    });
  });

  // Manutenções
  manutencoes.forEach(m => {
    events.push({
      date: new Date(m.created_at),
      type: "manutencao",
      title: `Manutenção: ${m.tipo || "Geral"}`,
      desc: [m.causa && `Causa: ${m.causa}`, m.custo && `Custo: R$ ${Number(m.custo).toLocaleString("pt-BR")}`, m.observacoes].filter(Boolean).join(" | "),
      details: [
        m.ordem_servico && `OS: ${m.ordem_servico}`,
        m.km_no_momento && `Km: ${Number(m.km_no_momento).toLocaleString("pt-BR")}`,
      ].filter(Boolean) as string[],
    });
  });

  // Recapagens
  recapagens.forEach(r => {
    events.push({
      date: new Date(r.data_envio || r.created_at),
      type: "envio_recapagem",
      title: `Recapagem — Ciclo ${r.numero_ciclo || "?"}`,
      desc: [r.status && `Status: ${r.status}`, r.custo_recapagem && `Custo: R$ ${Number(r.custo_recapagem).toLocaleString("pt-BR")}`].filter(Boolean).join(" | "),
      details: [
        r.fornecedores?.nome && `Fornecedor: ${r.fornecedores.nome}`,
        r.classificacao_carcaca && `Carcaça: ${r.classificacao_carcaca}`,
        r.data_retorno_real && `Retorno: ${new Date(r.data_retorno_real).toLocaleDateString("pt-BR")}`,
        r.motivo_reprovacao && `Reprovação: ${r.motivo_reprovacao}`,
      ].filter(Boolean) as string[],
    });
  });

  // Alertas
  alertas.forEach(a => {
    events.push({
      date: new Date(a.created_at),
      type: a.tratado_em ? "alerta_tratado" : "alerta",
      title: `Alerta: ${a.tipo_alerta}`,
      desc: a.mensagem,
      details: [
        a.gravidade && `Gravidade: ${a.gravidade}`,
        a.acao_sugerida && `Ação: ${a.acao_sugerida}`,
        a.tratado_em && `Tratado em: ${new Date(a.tratado_em).toLocaleDateString("pt-BR")}`,
      ].filter(Boolean) as string[],
    });
  });

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Histórico Completo</CardTitle>
          <Badge variant="outline">{events.length} eventos</Badge>
        </div>
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
                      {ev.details && ev.details.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {ev.details.map((d, j) => (
                            <Badge key={j} variant="secondary" className="text-xs font-normal">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      )}
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
