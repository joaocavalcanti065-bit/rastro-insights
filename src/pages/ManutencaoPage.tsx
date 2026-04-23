import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Wrench, Plus, Truck, FileText, ClipboardList } from "lucide-react";
import { STATUS_OS } from "@/lib/os-catalogo-servicos";
import { ManutencaoDashboard } from "@/components/manutencao/ManutencaoDashboard";

const TIPOS = ["alinhamento", "balanceamento", "rodizio", "calibragem", "troca", "inspecao", "reparo"];
const CAUSAS = ["desgaste_irregular", "pressao_inadequada", "falha_mecanica", "impacto", "preventivo"];

export default function ManutencaoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    veiculo_id: "",
    pneu_id: "",
    tipo: "inspecao",
    causa: "preventivo",
    custo: 0,
    km: 0,
    obs: "",
  });

  // Lista de Ordens de Serviço
  const { data: ordens } = useQuery({
    queryKey: ["ordens-servico-list"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ordens_servico")
        .select("*, veiculos:veiculo_id(placa, modelo)")
        .order("aberta_em", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: manutencoes, isLoading } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("manutencoes")
        .select("*, pneus(id_unico, marca), veiculos:veiculo_id(placa, modelo)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: veiculosList } = useQuery({
    queryKey: ["veiculos-manut"],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("id, placa, modelo, marca");
      return data || [];
    },
  });

  const { data: pneusAll } = useQuery({
    queryKey: ["pneus-manut-all"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("id, id_unico, marca, veiculo_id, posicao_atual, localizacao");
      return data || [];
    },
  });

  // Filter pneus by selected vehicle (or show all if no vehicle selected)
  const pneusFiltrados = useMemo(() => {
    if (!pneusAll) return [];
    if (!form.veiculo_id) return pneusAll;
    return pneusAll.filter((p) => p.veiculo_id === form.veiculo_id);
  }, [pneusAll, form.veiculo_id]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("manutencoes").insert({
        pneu_id: form.pneu_id || null,
        veiculo_id: form.veiculo_id || null,
        tipo: form.tipo,
        causa: form.causa,
        custo: form.custo,
        km_no_momento: form.km,
        observacoes: form.obs,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manutencoes"] });
      toast.success("Manutenção registrada!");
      setOpen(false);
      setForm({ veiculo_id: "", pneu_id: "", tipo: "inspecao", causa: "preventivo", custo: 0, km: 0, obs: "" });
    },
    onError: () => toast.error("Erro ao registrar manutenção"),
  });

  if (isLoading)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Manutenção</h1>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">Manutenção</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate("/manutencao/os/nova")} className="bg-primary">
            <ClipboardList className="h-4 w-4 mr-2" />
            Nova Ordem de Serviço
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Serviço Avulso
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Manutenção</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              {/* Step 1: Select Vehicle */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <Truck className="h-3.5 w-3.5 text-primary" />
                  Veículo
                </Label>
                <Select
                  value={form.veiculo_id}
                  onValueChange={(v) => setForm({ ...form, veiculo_id: v, pneu_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (serviço avulso)</SelectItem>
                    {veiculosList?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.placa} — {v.marca} {v.modelo || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Select Tire (filtered by vehicle) */}
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  Pneu
                  {form.veiculo_id && form.veiculo_id !== "none" && (
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                      ({pneusFiltrados.length} pneu(s) neste veículo)
                    </span>
                  )}
                </Label>
                <Select value={form.pneu_id} onValueChange={(v) => setForm({ ...form, pneu_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pneu" />
                  </SelectTrigger>
                  <SelectContent>
                    {pneusFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {form.veiculo_id && form.veiculo_id !== "none"
                          ? "Nenhum pneu instalado neste veículo"
                          : "Selecione um veículo primeiro ou escolha um pneu"}
                      </div>
                    ) : (
                      pneusFiltrados.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.id_unico} — {p.marca}
                          {p.posicao_atual ? ` (Pos: ${p.posicao_atual})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Causa</Label>
                  <Select value={form.causa} onValueChange={(v) => setForm({ ...form, causa: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAUSAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Custo (R$)</Label>
                  <Input
                    type="number"
                    value={form.custo}
                    onChange={(e) => setForm({ ...form, custo: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>KM no Momento</Label>
                  <Input
                    type="number"
                    value={form.km}
                    onChange={(e) => setForm({ ...form, km: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.pneu_id || createMutation.isPending}
              >
                {createMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Lista de Ordens de Serviço */}
      {ordens && ordens.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Ordens de Serviço</h2>
              <Badge variant="outline" className="ml-auto">{ordens.length}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map((os: any) => {
                  const stInfo = STATUS_OS.find((s) => s.value === os.status);
                  return (
                    <TableRow key={os.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/manutencao/os/${os.id}`)}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{os.numero_os}</TableCell>
                      <TableCell className="text-xs">{new Date(os.aberta_em).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-mono text-sm">{os.veiculos?.placa || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{os.tipo_os}</Badge></TableCell>
                      <TableCell>{stInfo && <Badge className={stInfo.cor}>{stInfo.label}</Badge>}</TableCell>
                      <TableCell className="text-sm">{os.tempo_total_minutos}min</TableCell>
                      <TableCell className="text-right text-sm font-semibold">R$ {Number(os.custo_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Button variant="ghost" size="sm">Abrir</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!manutencoes?.length ? (
        <EmptyState
          icon={Wrench}
          title="Nenhuma manutenção registrada"
          description="Registre serviços como alinhamento, calibragem e rodízio para acompanhar o histórico."
          actionLabel="Registrar Serviço"
          onAction={() => setOpen(true)}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Pneu</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Causa</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>KM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manutencoes.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {m.veiculos?.placa || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {m.pneus?.id_unico || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.tipo}</Badge>
                    </TableCell>
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
