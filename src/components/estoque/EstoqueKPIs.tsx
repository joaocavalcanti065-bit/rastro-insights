import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle, Lock, RotateCcw, Trash2, DollarSign, AlertTriangle, Clock } from "lucide-react";

interface Props {
  pneus: any[];
  reservedIds: Set<string>;
}

export function EstoqueKPIs({ pneus, reservedIds }: Props) {
  const total = pneus.length;
  const reservados = pneus.filter(p => reservedIds.has(p.id)).length;
  const disponiveis = total - reservados;
  const carcacasAptas = pneus.filter(p => p.tipo_pneu !== "novo" && p.status !== "sucata" && (p.qtd_recapagens || 0) < 3).length;
  const sucata = pneus.filter(p => p.status === "sucata").length;
  const valorTotal = pneus.reduce((acc, p) => acc + Number(p.custo_aquisicao || 0), 0);

  const now = Date.now();
  const diasParados = pneus.map(p => {
    const d = p.updated_at ? Math.floor((now - new Date(p.updated_at).getTime()) / 86400000) : 0;
    return d;
  });
  const tempoMedioParado = diasParados.length > 0 ? Math.round(diasParados.reduce((a, b) => a + b, 0) / diasParados.length) : 0;
  const abaixoMinimo = 0; // Would need config for min per medida — placeholder

  const kpis = [
    { icon: Package, label: "Total em Estoque", value: total, color: "bg-primary" },
    { icon: CheckCircle, label: "Disponíveis", value: disponiveis, color: "bg-emerald-600" },
    { icon: Lock, label: "Reservados", value: reservados, color: "bg-amber-600" },
    { icon: RotateCcw, label: "Carcaças aptas", value: carcacasAptas, color: "bg-purple-600" },
    { icon: Trash2, label: "Sucata", value: sucata, color: "bg-destructive" },
    { icon: DollarSign, label: "Valor Total", value: `R$ ${valorTotal.toLocaleString("pt-BR")}`, color: "bg-emerald-600" },
    { icon: AlertTriangle, label: "Abaixo do mínimo", value: abaixoMinimo, color: abaixoMinimo > 0 ? "bg-destructive" : "bg-muted" },
    { icon: Clock, label: "Tempo médio parado", value: `${tempoMedioParado}d`, color: "bg-muted" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpis.map((k, i) => (
        <Card key={i}>
          <CardContent className="p-3 flex flex-col items-center text-center gap-1">
            <div className={`rounded-lg p-1.5 ${k.color}`}>
              <k.icon className="h-4 w-4 text-primary-foreground" />
            </div>
            <p className="text-lg font-bold">{k.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{k.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
