import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { RefreshCw, Plus } from "lucide-react";

const COLUNAS_KANBAN = [
  { key: "aguardando", label: "Triagem", color: "bg-muted" },
  { key: "em_processo", label: "Em Processo", color: "bg-info/20" },
  { key: "retornado", label: "Retornado", color: "bg-success/20" },
  { key: "perdida", label: "Reprovada/Sucata", color: "bg-destructive/20" },
];

const CLASSIFICACOES = [
  { value: "apta_premium", label: "Apta Premium" },
  { value: "apta", label: "Apta" },
  { value: "apta_com_restricao", label: "Apta c/ Restrição" },
  { value: "reparavel", label: "Reparável" },
  { value: "nao_apta", label: "Não Apta" },
  { value: "sucata", label: "Sucata" },
];

export default function RecapagemPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ pneu_id: "", classificacao: "em_analise", custo: 0 });

  const { data: recapagens, isLoading } = useQuery({
    queryKey: ["recapagens"],
    queryFn: async () => {
      const { data } = await supabase.from("recapagens").select("*, pneus(id_unico, marca, medida)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: pneusDisponiveis } = useQuery({
    queryKey: ["pneus-recap-disponiveis"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("id, id_unico, marca, medida").or("status.eq.aguardando_recapagem,status.eq.em_estoque");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recapagens").insert({
        pneu_id: form.pneu_id,
        classificacao_carcaca: form.classificacao,
        custo_recapagem: form.custo,
        status: "aguardando",
        data_envio: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
      await supabase.from("pneus").update({ status: "em_recapagem" }).eq("id", form.pneu_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recapagens"] });
      toast.success("Recapagem registrada!");
      setOpen(false);
    },
    onError: () => toast.error("Erro ao registrar recapagem"),
  });

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Recapagem</h1><Skeleton className="h-64 rounded-xl" /></div>;

  const totalRetornado = recapagens?.filter(r => r.status === "retornado").length || 0;
  const totalPerdida = recapagens?.filter(r => r.status === "perdida").length || 0;
  const taxaAproveitamento = recapagens?.length ? ((totalRetornado / recapagens.length) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recapagem</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Recapagem</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Recapagem</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Pneu</Label>
                <Select value={form.pneu_id} onValueChange={v => setForm({ ...form, pneu_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o pneu" /></SelectTrigger>
                  <SelectContent>{pneusDisponiveis?.map(p => <SelectItem key={p.id} value={p.id}>{p.id_unico} — {p.marca} {p.medida}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Classificação da Carcaça</Label>
                <Select value={form.classificacao} onValueChange={v => setForm({ ...form, classificacao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSIFICACOES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Custo Estimado (R$)</Label><Input type="number" value={form.custo} onChange={e => setForm({ ...form, custo: Number(e.target.value) })} /></div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.pneu_id || createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!recapagens?.length ? (
        <EmptyState icon={RefreshCw} title="Nenhuma recapagem registrada" description="Envie pneus para recapagem e acompanhe o ciclo completo aqui." actionLabel="Registrar Recapagem" onAction={() => setOpen(true)} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{recapagens.length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Taxa Aproveitamento</p><p className="text-2xl font-bold text-success">{taxaAproveitamento}%</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Perdidas/Sucata</p><p className="text-2xl font-bold text-destructive">{totalPerdida}</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {COLUNAS_KANBAN.map(col => {
              const items = recapagens.filter(r => r.status === col.key);
              return (
                <div key={col.key} className={`rounded-xl p-4 ${col.color} min-h-[200px]`}>
                  <h3 className="font-medium text-sm mb-3">{col.label} ({items.length})</h3>
                  <div className="space-y-2">
                    {items.map(r => (
                      <Card key={r.id} className="cursor-pointer hover:border-primary/50">
                        <CardContent className="p-3">
                          <p className="font-mono text-sm font-medium">{(r as any).pneus?.id_unico || "—"}</p>
                          <p className="text-xs text-muted-foreground">{(r as any).pneus?.marca} {(r as any).pneus?.medida}</p>
                          <Badge variant="outline" className="mt-1 text-[10px]">{r.classificacao_carcaca}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
