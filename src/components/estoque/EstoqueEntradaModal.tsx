import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

export function EstoqueEntradaModal({ open, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"novo" | "existente">("novo");
  const [form, setForm] = useState({
    id_unico: "", marca: "Michelin", modelo_pneu: "", medida: "295/80 R22.5",
    dot: "", motivo: "compra_nova", nota_fiscal: "", custo_aquisicao: 3200,
    sulco_entrada: 16, pressao_entrada: 110, local_fisico: "", condicao: "novo",
    observacoes: "", tipo_eixo: "tracao", tipo_aplicacao: "rodoviario",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pneus").insert({
        id_unico: form.id_unico || `EST-${Date.now()}`,
        marca: form.marca,
        modelo_pneu: form.modelo_pneu,
        medida: form.medida,
        dot: form.dot,
        tipo_pneu: form.condicao === "novo" ? "novo" : "recapado",
        tipo_eixo: form.tipo_eixo,
        tipo_aplicacao: form.tipo_aplicacao,
        sulco_inicial: form.sulco_entrada,
        sulco_atual: form.sulco_entrada,
        pressao_ideal: form.pressao_entrada,
        custo_aquisicao: form.custo_aquisicao,
        custo_acumulado: form.custo_aquisicao,
        localizacao: "estoque",
        local_atual: form.local_fisico || "Sem endereço definido",
        status: "em_estoque",
        nota_fiscal: form.nota_fiscal,
        observacoes: form.observacoes,
        cliente_id: "00000000-0000-0000-0000-000000000000",
      });
      if (error) throw error;
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
                <div><Label>Custo (R$)</Label><Input type="number" value={form.custo_aquisicao} onChange={e => set("custo_aquisicao", Number(e.target.value))} /></div>
              </div>
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
              <div><Label>Local Físico</Label><Input value={form.local_fisico} onChange={e => set("local_fisico", e.target.value)} placeholder="Almoxarifado / Corredor / Prateleira" /></div>
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
                <p><span className="text-muted-foreground">Local:</span> {form.local_fisico || "Sem endereço"}</p>
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
