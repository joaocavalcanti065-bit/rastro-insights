import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATALOGO_SERVICOS, CategoriaServico } from "@/lib/os-catalogo-servicos";
import { Wrench, Gauge, RefreshCw, Settings, AlertTriangle, Scale, Crosshair, Replace, Flame, RotateCcw, Trash2, Ruler, CircleDot, Pipette, Shield, Cog, Bolt, Droplet, Disc } from "lucide-react";

const ICONES: Record<string, any> = {
  Wrench, Gauge, RefreshCw, Settings, AlertTriangle, Scale, Crosshair, Replace,
  Flame, RotateCcw, Trash2, Ruler, CircleDot, Pipette, Shield, Cog, Bolt, Droplet, Disc,
};

export interface ServicoSelecionado {
  codigo: string;
  nome: string;
  categoria: CategoriaServico;
  custoUnitario: number;
  tempoMinutos: number;
  tecnico?: string;
  observacoes?: string;
  posicaoDestino?: string;
  pneuNovoId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  posicoes: string[]; // posições afetadas (multi-select possível)
  posicoesDisponiveis: string[]; // todas posições do veículo (para destino de rodízio)
  pneusEstoque: Array<{ id: string; id_unico: string; marca: string; medida: string | null }>;
  onConfirmar: (servicos: ServicoSelecionado[]) => void;
}

const CATEGORIAS: { id: CategoriaServico; label: string }[] = [
  { id: "PNEU", label: "Serviços de Pneu" },
  { id: "RODA_EIXO", label: "Roda / Eixo" },
  { id: "FREIO", label: "Freio" },
  { id: "SUSPENSAO", label: "Suspensão" },
];

export function ServicosDrawer({ open, onOpenChange, posicoes, posicoesDisponiveis, pneusEstoque, onConfirmar }: Props) {
  const [selecionados, setSelecionados] = useState<Record<string, ServicoSelecionado>>({});

  const toggle = (codigo: string) => {
    const cat = CATALOGO_SERVICOS.find((s) => s.codigo === codigo);
    if (!cat) return;
    setSelecionados((prev) => {
      const next = { ...prev };
      if (next[codigo]) delete next[codigo];
      else
        next[codigo] = {
          codigo: cat.codigo,
          nome: cat.nome,
          categoria: cat.categoria,
          custoUnitario: cat.custoSugerido,
          tempoMinutos: cat.tempoMinutos,
        };
      return next;
    });
  };

  const update = (codigo: string, patch: Partial<ServicoSelecionado>) => {
    setSelecionados((prev) => ({ ...prev, [codigo]: { ...prev[codigo], ...patch } }));
  };

  const totais = useMemo(() => {
    const lista = Object.values(selecionados);
    const custo = lista.reduce((s, x) => s + (x.custoUnitario || 0), 0) * Math.max(posicoes.length, 1);
    const tempo = lista.reduce((s, x) => s + (x.tempoMinutos || 0), 0) * Math.max(posicoes.length, 1);
    return { count: lista.length, custo, tempo };
  }, [selecionados, posicoes.length]);

  const validar = (): string | null => {
    for (const s of Object.values(selecionados)) {
      const meta = CATALOGO_SERVICOS.find((c) => c.codigo === s.codigo);
      if (meta?.exigeDestino && !s.posicaoDestino) return `Rodízio exige posição destino`;
      if (meta?.exigeNovoPneu && !s.pneuNovoId) return `Troca de pneu exige selecionar pneu do estoque`;
    }
    return null;
  };

  const confirmar = () => {
    const erro = validar();
    if (erro) {
      alert(erro);
      return;
    }
    onConfirmar(Object.values(selecionados));
    setSelecionados({});
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Adicionar Serviços</SheetTitle>
          <SheetDescription>
            Aplicando em {posicoes.length} posição(ões):{" "}
            <span className="font-mono text-foreground">{posicoes.join(", ")}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          <div className="space-y-6">
            {CATEGORIAS.map((cat) => {
              const itens = CATALOGO_SERVICOS.filter((s) => s.categoria === cat.id);
              if (itens.length === 0) return null;
              return (
                <div key={cat.id}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {cat.label}
                  </h3>
                  <div className="space-y-2">
                    {itens.map((s) => {
                      const Icon = ICONES[s.icone] || Wrench;
                      const checked = !!selecionados[s.codigo];
                      const sel = selecionados[s.codigo];
                      return (
                        <div
                          key={s.codigo}
                          className={`rounded-lg border p-3 transition ${
                            checked ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <Checkbox checked={checked} onCheckedChange={() => toggle(s.codigo)} className="mt-0.5" />
                            <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{s.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                Sugestão: R$ {s.custoSugerido} · {s.tempoMinutos}min
                              </div>
                            </div>
                          </label>

                          {checked && (
                            <div className="mt-3 ml-7 grid gap-2">
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-[10px]">Valor (R$)</Label>
                                  <Input
                                    type="number"
                                    value={sel.custoUnitario}
                                    onChange={(e) => update(s.codigo, { custoUnitario: Number(e.target.value) })}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px]">Tempo (min)</Label>
                                  <Input
                                    type="number"
                                    value={sel.tempoMinutos}
                                    onChange={(e) => update(s.codigo, { tempoMinutos: Number(e.target.value) })}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px]">Técnico</Label>
                                  <Input
                                    value={sel.tecnico || ""}
                                    onChange={(e) => update(s.codigo, { tecnico: e.target.value })}
                                    className="h-8 text-sm"
                                    placeholder="Nome"
                                  />
                                </div>
                              </div>

                              {s.exigeDestino && (
                                <div>
                                  <Label className="text-[10px]">Posição destino *</Label>
                                  <Select
                                    value={sel.posicaoDestino || ""}
                                    onValueChange={(v) => update(s.codigo, { posicaoDestino: v })}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Escolha a posição destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {posicoesDisponiveis
                                        .filter((p) => !posicoes.includes(p))
                                        .map((p) => (
                                          <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {s.exigeNovoPneu && (
                                <div>
                                  <Label className="text-[10px]">Pneu novo (estoque) *</Label>
                                  <Select
                                    value={sel.pneuNovoId || ""}
                                    onValueChange={(v) => update(s.codigo, { pneuNovoId: v })}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Selecione do estoque" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {pneusEstoque.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-muted-foreground">Sem pneus em estoque</div>
                                      ) : (
                                        pneusEstoque.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.id_unico} — {p.marca} {p.medida || ""}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <div>
                                <Label className="text-[10px]">Observações técnicas</Label>
                                <Textarea
                                  value={sel.observacoes || ""}
                                  onChange={(e) => update(s.codigo, { observacoes: e.target.value })}
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t border-border pt-3 mt-2 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <Badge variant="outline">{totais.count} serviço(s)</Badge>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>⏱ {totais.tempo} min</span>
              <span className="font-semibold text-foreground">R$ {totais.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={confirmar} disabled={totais.count === 0}>
              Adicionar à OS
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
