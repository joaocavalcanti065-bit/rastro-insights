import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pneus: any[];
  reservedIds: Set<string>;
  veiculos: any[];
}

export function EstoqueReservaModal({ open, onClose, onSuccess, pneus, reservedIds, veiculos }: Props) {
  const queryClient = useQueryClient();
  const [pneuId, setPneuId] = useState("");
  const [motivo, setMotivo] = useState("instalacao_programada");
  const [veiculoId, setVeiculoId] = useState("");
  const [compradorNome, setCompradorNome] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [responsavel, setResponsavel] = useState("");

  const available = pneus.filter(p => !reservedIds.has(p.id));

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reservas_pneu").insert({
        pneu_id: pneuId,
        motivo,
        veiculo_destino_id: veiculoId || null,
        comprador_nome: compradorNome || null,
        data_prevista: dataPrevista || null,
        responsavel: responsavel || null,
        destino_descricao: motivo === "instalacao_programada" && veiculoId
          ? veiculos.find(v => v.id === veiculoId)?.placa
          : compradorNome || motivo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservas-ativas"] });
      toast.success("Pneu reservado com sucesso!");
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao reservar"),
  });

  const resetForm = () => {
    setPneuId(""); setMotivo("instalacao_programada"); setVeiculoId("");
    setCompradorNome(""); setDataPrevista(""); setResponsavel("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reservar Pneu</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Pneu</Label>
            <Select value={pneuId} onValueChange={setPneuId}>
              <SelectTrigger><SelectValue placeholder="Selecionar pneu disponível" /></SelectTrigger>
              <SelectContent>
                {available.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p as any).rg_code || p.id_unico} — {p.medida}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instalacao_programada">Instalação programada</SelectItem>
                <SelectItem value="recapagem_agendada">Recapagem agendada</SelectItem>
                <SelectItem value="venda_negociada">Venda negociada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {motivo === "instalacao_programada" && (
            <div>
              <Label>Veículo de destino</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger><SelectValue placeholder="Selecionar veículo" /></SelectTrigger>
                <SelectContent>
                  {veiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.frota || ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {motivo === "venda_negociada" && (
            <div><Label>Comprador</Label><Input value={compradorNome} onChange={e => setCompradorNome(e.target.value)} /></div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data Prevista</Label><Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} /></div>
            <div><Label>Responsável</Label><Input value={responsavel} onChange={e => setResponsavel(e.target.value)} /></div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={!pneuId || mutation.isPending}>
              {mutation.isPending ? "Reservando..." : "Confirmar Reserva"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
