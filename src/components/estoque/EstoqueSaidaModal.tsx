import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RetroactiveDatePicker } from "@/components/RetroactiveDatePicker";

const MOTIVOS_SAIDA = [
  { value: "instalacao", label: "Instalação em veículo" },
  { value: "recapagem", label: "Envio para recapagem" },
  { value: "manutencao", label: "Envio para manutenção" },
  { value: "venda", label: "Venda" },
  { value: "descarte", label: "Descarte / Sucata" },
  { value: "transferencia", label: "Transferência para outra unidade" },
  { value: "ajuste", label: "Ajuste de inventário" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pneus: any[];
  veiculos: any[];
}

export function EstoqueSaidaModal({ open, onClose, onSuccess, pneus, veiculos }: Props) {
  const queryClient = useQueryClient();
  const [pneuId, setPneuId] = useState("");
  const [motivo, setMotivo] = useState("instalacao");
  const [veiculoId, setVeiculoId] = useState("");
  const [posicao, setPosicao] = useState("");
  const [kmAtual, setKmAtual] = useState("");
  const [observacoes, setObservacoes] = useState("");
  // Sale fields
  const [tipoComprador, setTipoComprador] = useState("pf");
  const [compradorNome, setCompradorNome] = useState("");
  const [compradorDoc, setCompradorDoc] = useState("");
  const [valorVenda, setValorVenda] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataSaida, setDataSaida] = useState(new Date());

  const selected = pneus.find(p => p.id === pneuId);

  const mutation = useMutation({
    mutationFn: async () => {
      const statusMap: Record<string, string> = {
        instalacao: "instalado",
        recapagem: "em_recapagem",
        manutencao: "em_inspecao",
        venda: "vendido",
        descarte: "sucata",
        transferencia: "em_estoque",
        ajuste: "em_estoque",
      };
      const locMap: Record<string, string> = {
        instalacao: "veiculo",
        recapagem: "recapagem",
        venda: "vendido",
        descarte: "sucata",
      };

      // Update pneu
      const updateData: any = {
        status: statusMap[motivo] || "em_estoque",
        localizacao: locMap[motivo] || "estoque",
        updated_at: dataSaida.toISOString(),
      };
      if (motivo === "instalacao" && veiculoId) {
        updateData.veiculo_id = veiculoId;
        updateData.posicao_atual = posicao;
        if (kmAtual) updateData.km_inicial = Number(kmAtual);
      }
      await supabase.from("pneus").update(updateData).eq("id", pneuId);

      // Register movement
      await supabase.from("movimentacoes_pneus").insert({
        pneu_id: pneuId,
        tipo_movimentacao: motivo,
        origem: "estoque",
        destino: motivo,
        data_movimentacao: dataSaida.toISOString().split("T")[0],
        veiculo_destino_id: motivo === "instalacao" ? veiculoId || null : null,
        posicao_destino: posicao || null,
        km_no_momento: kmAtual ? Number(kmAtual) : null,
        sulco_no_momento: selected?.sulco_atual,
        pressao_no_momento: selected?.pressao_atual,
        observacoes,
      });

      // If sale, register in vendas_pneu
      if (motivo === "venda" && valorVenda) {
        const custoAcum = Number(selected?.custo_acumulado || 0);
        const vVenda = Number(valorVenda);
        await supabase.from("vendas_pneu").insert({
          pneu_id: pneuId,
          tipo_comprador: tipoComprador,
          comprador_nome: compradorNome,
          comprador_documento: compradorDoc,
          valor_venda: vVenda,
          custo_acumulado_na_venda: custoAcum,
          resultado_financeiro: vVenda - custoAcum,
          forma_pagamento: formaPagamento,
          observacoes,
        });
      }

      // If recapagem, create recapagem record
      if (motivo === "recapagem") {
        const ciclo = (selected?.qtd_recapagens || 0) + 1;
        await supabase.from("recapagens").insert({
          pneu_id: pneuId,
          numero_ciclo: ciclo,
          data_envio: new Date().toISOString().split("T")[0],
          status: "aguardando",
          observacoes,
        });
        await supabase.from("pneus").update({
          qtd_recapagens: ciclo,
        }).eq("id", pneuId);
      }

      // If descarte, update custo_acumulado as loss
      if (motivo === "descarte") {
        await supabase.from("pneus").update({
          status: "sucata",
          localizacao: "sucata",
        }).eq("id", pneuId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pneus-estoque-all"] });
      toast.success("Saída registrada com sucesso!");
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar saída"),
  });

  const resetForm = () => {
    setPneuId(""); setMotivo("instalacao"); setVeiculoId(""); setPosicao("");
    setKmAtual(""); setObservacoes(""); setCompradorNome(""); setCompradorDoc("");
    setValorVenda(""); setFormaPagamento("pix"); setTipoComprador("pf");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Saída</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Selecionar Pneu</Label>
            <Select value={pneuId} onValueChange={setPneuId}>
              <SelectTrigger><SelectValue placeholder="Buscar pneu..." /></SelectTrigger>
              <SelectContent>
                {pneus.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p as any).rg_code || p.id_unico} — {p.marca} {p.medida}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Motivo da Saída</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MOTIVOS_SAIDA.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {motivo === "instalacao" && (
            <>
              <div>
                <Label>Veículo</Label>
                <Select value={veiculoId} onValueChange={setVeiculoId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar veículo" /></SelectTrigger>
                  <SelectContent>
                    {veiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.frota || ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Posição</Label><Input value={posicao} onChange={e => setPosicao(e.target.value)} placeholder="Ex: DD1" /></div>
                <div><Label>Km Atual Veículo</Label><Input type="number" value={kmAtual} onChange={e => setKmAtual(e.target.value)} /></div>
              </div>
            </>
          )}

          {motivo === "venda" && (
            <>
              <div>
                <Label>Tipo de Comprador</Label>
                <Select value={tipoComprador} onValueChange={setTipoComprador}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pf">Pessoa Física</SelectItem>
                    <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                    <SelectItem value="transportadora">Transportadora</SelectItem>
                    <SelectItem value="revendedor">Borracharia / Revendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={compradorNome} onChange={e => setCompradorNome(e.target.value)} /></div>
                <div><Label>{tipoComprador === "pj" ? "CNPJ" : "CPF"}</Label><Input value={compradorDoc} onChange={e => setCompradorDoc(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor de Venda (R$)</Label><Input type="number" value={valorVenda} onChange={e => setValorVenda(e.target.value)} /></div>
                <div><Label>Pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="avista">À vista</SelectItem>
                      <SelectItem value="prazo">Prazo</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {motivo === "descarte" && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              ⚠️ Ao confirmar o descarte, o pneu será marcado como sucata permanentemente.
            </div>
          )}

          <div><Label>Observações</Label><Input value={observacoes} onChange={e => setObservacoes(e.target.value)} /></div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!pneuId || mutation.isPending}
              variant={motivo === "descarte" ? "destructive" : "default"}
            >
              {mutation.isPending ? "Registrando..." : "Confirmar Saída"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
