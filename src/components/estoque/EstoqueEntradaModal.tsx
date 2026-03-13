import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Sparkles } from "lucide-react";
import { RetroactiveDatePicker } from "@/components/RetroactiveDatePicker";

const MARCAS = ["Michelin", "Pirelli", "Goodyear", "Continental", "Bridgestone", "Dunlop", "Xbri", "Firestone", "Vipal", "Bandag"];
const MOTIVOS = [
  { value: "compra_nova", label: "Compra nova" },
  { value: "retorno_recapagem", label: "Retorno de recapagem" },
  { value: "retorno_veiculo", label: "Retorno de veículo" },
  { value: "transferencia", label: "Transferência de outra unidade" },
  { value: "devolucao_venda", label: "Devolução de venda" },
  { value: "ajuste_inventario", label: "Ajuste de inventário" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LocalEstoque {
  id: string;
  almoxarifado: string;
  setor: string | null;
  corredor: string | null;
  prateleira: string | null;
  capacidade: number | null;
  ocupacao_atual: number | null;
  medida_preferencial: string | null;
}

export function EstoqueEntradaModal({ open, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    id_unico: "", marca: "Michelin", modelo_pneu: "", medida: "295/80 R22.5",
    dot: "", motivo: "compra_nova", nota_fiscal: "", custo_aquisicao: 3200,
    sulco_entrada: 16, pressao_entrada: 110, local_fisico: "", condicao: "novo",
    observacoes: "", tipo_eixo: "tracao", tipo_aplicacao: "rodoviario",
    valor_venda_sugerido: 0,
  });

  const margemCusto = form.custo_aquisicao > 0 && form.valor_venda_sugerido > 0
    ? (((form.valor_venda_sugerido - form.custo_aquisicao) / form.custo_aquisicao) * 100).toFixed(1)
    : null;
  const [dataEntrada, setDataEntrada] = useState(new Date());
  const [sugestaoLocal, setSugestaoLocal] = useState<string | null>(null);

  // Fetch storage locations for auto-suggest
  const { data: locais } = useQuery({
    queryKey: ["locais-estoque"],
    queryFn: async () => {
      const { data } = await supabase.from("locais_estoque").select("*").eq("ativo", true).order("almoxarifado");
      return (data || []) as LocalEstoque[];
    },
    enabled: open,
  });

  // Fetch current stock to calculate occupancy
  const { data: pneusEstoque } = useQuery({
    queryKey: ["pneus-estoque-locais"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("local_atual").eq("localizacao", "estoque");
      return data || [];
    },
    enabled: open,
  });

  // Auto-suggest location when medida changes
  useEffect(() => {
    if (!locais?.length || !form.medida) { setSugestaoLocal(null); return; }

    const formatEndereco = (l: LocalEstoque) =>
      [l.almoxarifado, l.setor, l.corredor, l.prateleira].filter(Boolean).join(" → ");

    const getOcupacao = (endereco: string) =>
      pneusEstoque?.filter(p => p.local_atual === endereco).length || 0;

    // Priority 1: location with matching medida_preferencial and capacity
    const preferencial = locais
      .filter(l => l.medida_preferencial === form.medida)
      .map(l => ({ ...l, endereco: formatEndereco(l), ocupacao: getOcupacao(formatEndereco(l)) }))
      .filter(l => (l.capacidade || 0) > l.ocupacao)
      .sort((a, b) => a.ocupacao - b.ocupacao);

    if (preferencial.length > 0) {
      setSugestaoLocal(preferencial[0].endereco);
      return;
    }

    // Priority 2: any location with available capacity
    const disponiveis = locais
      .filter(l => !l.medida_preferencial || l.medida_preferencial === "nenhuma")
      .map(l => ({ ...l, endereco: formatEndereco(l), ocupacao: getOcupacao(formatEndereco(l)) }))
      .filter(l => (l.capacidade || 0) > l.ocupacao)
      .sort((a, b) => a.ocupacao - b.ocupacao);

    if (disponiveis.length > 0) {
      setSugestaoLocal(disponiveis[0].endereco);
    } else {
      setSugestaoLocal(null);
    }
  }, [form.medida, locais, pneusEstoque]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: inserted, error } = await supabase.from("pneus").insert({
        id_unico: form.id_unico || `EST-${Date.now()}`,
        marca: form.marca,
        modelo_pneu: form.modelo_pneu,
        medida: form.medida,
        dot: form.dot,
        tipo_pneu: form.condicao === "novo" ? "novo" : form.condicao === "carcaca" ? "carcaca" : "recapado",
        tipo_eixo: form.tipo_eixo,
        tipo_aplicacao: form.tipo_aplicacao,
        sulco_inicial: form.sulco_entrada,
        sulco_atual: form.sulco_entrada,
        pressao_ideal: form.pressao_entrada,
        custo_aquisicao: form.custo_aquisicao,
        custo_acumulado: form.custo_aquisicao,
        valor_venda_sugerido: form.valor_venda_sugerido > 0 ? form.valor_venda_sugerido : null,
        localizacao: "estoque",
        local_atual: form.local_fisico || "Sem endereço definido",
        status: form.condicao === "carcaca" ? "carcaca" : "em_estoque",
        nota_fiscal: form.nota_fiscal,
        data_aquisicao: dataEntrada.toISOString().split("T")[0],
        observacoes: form.observacoes,
        cliente_id: "00000000-0000-0000-0000-000000000000",
      }).select("id").single();
      if (error) throw error;

      if (inserted) {
        await supabase.from("movimentacoes_pneus").insert({
          pneu_id: inserted.id,
          tipo_movimentacao: "entrada_estoque",
          origem: form.motivo,
          destino: "estoque",
          data_movimentacao: dataEntrada.toISOString().split("T")[0],
          sulco_no_momento: form.sulco_entrada,
          pressao_no_momento: form.pressao_entrada,
          observacoes: form.observacoes || `Entrada: ${MOTIVOS.find(m => m.value === form.motivo)?.label}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pneus-estoque-all"] });
      toast.success("Entrada registrada com sucesso!");
      onSuccess();
      onClose();
      setStep(1);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar entrada"),
  });

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const applySugestao = () => {
    if (sugestaoLocal) set("local_fisico", sugestaoLocal);
  };

  // Build location select options from registered locations
  const locaisOptions = (locais || []).map(l =>
    [l.almoxarifado, l.setor, l.corredor, l.prateleira].filter(Boolean).join(" → ")
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setStep(1); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Entrada — Etapa {step}/4</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Identificação do pneu</p>
              <div><Label>ID Único</Label><Input value={form.id_unico} onChange={e => set("id_unico", e.target.value)} placeholder="Ex: 015P" /></div>
              <div><Label>Marca</Label>
                <Select value={form.marca} onValueChange={v => set("marca", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MARCAS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Modelo</Label><Input value={form.modelo_pneu} onChange={e => set("modelo_pneu", e.target.value)} /></div>
                <div><Label>DOT</Label><Input value={form.dot} onChange={e => set("dot", e.target.value)} placeholder="Ex: 3521" /></div>
              </div>
              <div><Label>Medida</Label><Input value={form.medida} onChange={e => set("medida", e.target.value)} /></div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Dados da entrada</p>
              <div><Label>Motivo da Entrada</Label>
                <Select value={form.motivo} onValueChange={v => set("motivo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOTIVOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nota Fiscal</Label><Input value={form.nota_fiscal} onChange={e => set("nota_fiscal", e.target.value)} /></div>
                <div><Label>Custo Aquisição (R$)</Label><Input type="number" value={form.custo_aquisicao} onChange={e => set("custo_aquisicao", Number(e.target.value))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor de Venda (R$)</Label><Input type="number" value={form.valor_venda_sugerido} onChange={e => set("valor_venda_sugerido", Number(e.target.value))} placeholder="0" /></div>
                <div>
                  <Label>Margem de Custo</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted text-sm">
                    {margemCusto !== null ? (
                      <span className={Number(margemCusto) >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {Number(margemCusto) >= 0 ? "+" : ""}{margemCusto}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
              <RetroactiveDatePicker date={dataEntrada} onDateChange={setDataEntrada} label="Data da Entrada" />
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Condição e localização</p>
              <div><Label>Condição</Label>
                <Select value={form.condicao} onValueChange={v => set("condicao", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="recapado">Recapado</SelectItem>
                    <SelectItem value="usado_bom">Usado em bom estado</SelectItem>
                    <SelectItem value="inspecao">Para inspeção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Sulco (mm)</Label><Input type="number" value={form.sulco_entrada} onChange={e => set("sulco_entrada", Number(e.target.value))} /></div>
                <div><Label>Pressão (PSI)</Label><Input type="number" value={form.pressao_entrada} onChange={e => set("pressao_entrada", Number(e.target.value))} /></div>
              </div>

              {/* Local with auto-suggest */}
              <div>
                <Label>Local Físico</Label>
                {locaisOptions.length > 0 ? (
                  <Select value={form.local_fisico} onValueChange={v => set("local_fisico", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um local" /></SelectTrigger>
                    <SelectContent>
                      {locaisOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.local_fisico} onChange={e => set("local_fisico", e.target.value)} placeholder="Almoxarifado / Corredor / Prateleira" />
                )}
              </div>

              {/* Auto-suggestion banner */}
              {sugestaoLocal && form.local_fisico !== sugestaoLocal && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Sugestão automática para <strong>{form.medida}</strong>:</p>
                    <p className="font-mono text-sm font-medium truncate">{sugestaoLocal}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={applySugestao}>
                    <MapPin className="h-3 w-3 mr-1" />Usar
                  </Button>
                </div>
              )}

              <div><Label>Observações</Label><Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} /></div>
            </>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Revisão e confirmação:</p>
              <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">ID:</span> {form.id_unico || "(auto)"}</p>
                <p><span className="text-muted-foreground">Marca:</span> {form.marca} — {form.medida}</p>
                <p><span className="text-muted-foreground">Motivo:</span> {MOTIVOS.find(m => m.value === form.motivo)?.label}</p>
                <p><span className="text-muted-foreground">Condição:</span> {form.condicao}</p>
                <p><span className="text-muted-foreground">Sulco:</span> {form.sulco_entrada}mm | Pressão: {form.pressao_entrada} PSI</p>
                <p><span className="text-muted-foreground">Custo:</span> R$ {form.custo_aquisicao.toLocaleString("pt-BR")}</p>
                <p className="flex items-center gap-1">
                  <span className="text-muted-foreground">Local:</span>
                  <MapPin className="h-3 w-3" />
                  {form.local_fisico || "Sem endereço"}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Voltar</Button>}
            {step < 4 ? (
              <Button onClick={() => setStep(s => s + 1)}>Próximo</Button>
            ) : (
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "Registrando..." : "Confirmar Entrada"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
