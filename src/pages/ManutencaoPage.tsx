import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wrench, Plus } from "lucide-react";

const TIPOS = ["alinhamento", "balanceamento", "rodizio", "calibragem", "troca", "inspecao", "reparo"];
const CAUSAS = ["desgaste_irregular", "pressao_inadequada", "falha_mecanica", "impacto", "preventivo"];

export default function ManutencaoPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ pneu_id: "", tipo: "inspecao", causa: "preventivo", custo: 0, km: 0, obs: "" });

  const { data: manutencoes, isLoading } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data } = await supabase.from("manutencoes").select("*, pneus(id_unico, marca)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: pneusList } = useQuery({
    queryKey: ["pneus-manut"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("id, id_unico, marca");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("manutencoes").insert({
        pneu_id: form.pneu_id, tipo: form.tipo, causa: form.causa,
        custo: form.custo, km_no_momento: form.km, observacoes: form.obs,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manutencoes"] });
      toast.success("Manutenção registrada!");
      setOpen(false);
    },
    onError: () => toast.error("Erro ao registrar manutenção"),
  });

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Manutenção</h1><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manutenção</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Registrar Serviço</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Manutenção</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Pneu</Label>
                <Select value={form.pneu_id} onValueChange={v => setForm({ ...form, pneu_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{pneusList?.map(p => <SelectItem key={p.id} value={p.id}>{p.id_unico} — {p.marca}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Causa</Label>
                  <Select value={form.causa} onValueChange={v => setForm({ ...form, causa: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CAUSAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Custo (R$)</Label><Input type="number" value={form.custo} onChange={e => setForm({ ...form, custo: Number(e.target.value) })} /></div>
                <div><Label>KM no Momento</Label><Input type="number" value={form.km} onChange={e => setForm({ ...form, km: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} /></div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.pneu_id || createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!manutencoes?.length ? (
        <EmptyState icon={Wrench} title="Nenhuma manutenção registrada" description="Registre serviços como alinhamento, calibragem e rodízio para acompanhar o histórico." actionLabel="Registrar Serviço" onAction={() => setOpen(true)} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pneu</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Causa</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>KM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manutencoes.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-mono">{(m as any).pneus?.id_unico || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{m.tipo}</Badge></TableCell>
                    <TableCell className="text-sm">{m.causa || "—"}</TableCell>
                    <TableCell>R$ {Number(m.custo || 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{m.km_no_momento?.toLocaleString() || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
