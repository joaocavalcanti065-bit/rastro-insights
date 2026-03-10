import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, MapPin, Trash2, Edit2, Warehouse, LayoutGrid } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MEDIDAS_COMUNS = [
  "295/80 R22.5", "275/80 R22.5", "215/75 R17.5", "235/75 R17.5",
  "1000 R20", "1100 R22", "12.00 R24", "385/65 R22.5",
];

interface LocalEstoque {
  id: string;
  almoxarifado: string;
  setor: string | null;
  corredor: string | null;
  prateleira: string | null;
  capacidade: number | null;
  ocupacao_atual: number | null;
  medida_preferencial: string | null;
  ativo: boolean | null;
  observacoes: string | null;
}

export default function EnderecamentoPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LocalEstoque | null>(null);
  const [filterAlmox, setFilterAlmox] = useState("todos");
  const [form, setForm] = useState({
    almoxarifado: "", setor: "", corredor: "", prateleira: "",
    capacidade: 20, medida_preferencial: "", observacoes: "",
  });

  const { data: locais, isLoading } = useQuery({
    queryKey: ["locais-estoque"],
    queryFn: async () => {
      const { data } = await supabase.from("locais_estoque").select("*").eq("ativo", true).order("almoxarifado");
      return (data || []) as LocalEstoque[];
    },
  });

  const { data: pneus } = useQuery({
    queryKey: ["pneus-estoque-all"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("id, local_atual, medida").eq("localizacao", "estoque");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        almoxarifado: form.almoxarifado,
        setor: form.setor || null,
        corredor: form.corredor || null,
        prateleira: form.prateleira || null,
        capacidade: form.capacidade,
        medida_preferencial: form.medida_preferencial || null,
        observacoes: form.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from("locais_estoque").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("locais_estoque").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais-estoque"] });
      toast.success(editing ? "Local atualizado!" : "Local cadastrado!");
      closeModal();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locais_estoque").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locais-estoque"] });
      toast.success("Local desativado!");
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm({ almoxarifado: "", setor: "", corredor: "", prateleira: "", capacidade: 20, medida_preferencial: "", observacoes: "" });
  };

  const openEdit = (l: LocalEstoque) => {
    setEditing(l);
    setForm({
      almoxarifado: l.almoxarifado,
      setor: l.setor || "",
      corredor: l.corredor || "",
      prateleira: l.prateleira || "",
      capacidade: l.capacidade || 20,
      medida_preferencial: l.medida_preferencial || "",
      observacoes: l.observacoes || "",
    });
    setModalOpen(true);
  };

  const formatEndereco = (l: LocalEstoque) =>
    [l.almoxarifado, l.setor, l.corredor, l.prateleira].filter(Boolean).join(" → ");

  const almoxarifados = [...new Set((locais || []).map(l => l.almoxarifado))];
  const filtered = filterAlmox === "todos" ? locais : locais?.filter(l => l.almoxarifado === filterAlmox);

  const getOcupacao = (local: LocalEstoque) => {
    const endereco = formatEndereco(local);
    return pneus?.filter(p => p.local_atual === endereco).length || 0;
  };

  // Stats
  const totalLocais = locais?.length || 0;
  const totalCapacidade = locais?.reduce((s, l) => s + (l.capacidade || 0), 0) || 0;
  const totalOcupado = locais?.reduce((s, l) => s + getOcupacao(l), 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Endereçamento de Estoque</h1>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          Endereçamento de Estoque
        </h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Novo Local
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <LayoutGrid className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalLocais}</p>
              <p className="text-xs text-muted-foreground">Locais cadastrados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Warehouse className="h-8 w-8 text-chart-2" />
            <div>
              <p className="text-2xl font-bold">{totalCapacidade}</p>
              <p className="text-xs text-muted-foreground">Capacidade total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-chart-4" />
            <div>
              <p className="text-2xl font-bold">
                {totalCapacidade > 0 ? Math.round((totalOcupado / totalCapacidade) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Ocupação ({totalOcupado}/{totalCapacidade})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <Label className="text-sm">Filtrar almoxarifado:</Label>
        <Select value={filterAlmox} onValueChange={setFilterAlmox}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {almoxarifados.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!filtered?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum local cadastrado</p>
            <p className="text-sm">Cadastre almoxarifados, setores e prateleiras para organizar o estoque.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Medida Preferencial</TableHead>
                  <TableHead className="text-center">Capacidade</TableHead>
                  <TableHead className="text-center">Ocupação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map(l => {
                  const ocup = getOcupacao(l);
                  const pct = l.capacidade ? Math.round((ocup / l.capacidade) * 100) : 0;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-sm">{formatEndereco(l)}</TableCell>
                      <TableCell>
                        {l.medida_preferencial ? (
                          <Badge variant="secondary">{l.medida_preferencial}</Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-center">{l.capacidade || 0}</TableCell>
                      <TableCell className="text-center">
                        <span className={pct > 90 ? "text-destructive font-medium" : pct > 70 ? "text-chart-4 font-medium" : ""}>
                          {ocup}/{l.capacidade || 0} ({pct}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) closeModal(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Local" : "Novo Local de Estoque"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Almoxarifado *</Label>
              <Input value={form.almoxarifado} onChange={e => setForm(p => ({ ...p, almoxarifado: e.target.value }))} placeholder="Ex: Almoxarifado Central" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Setor</Label><Input value={form.setor} onChange={e => setForm(p => ({ ...p, setor: e.target.value }))} placeholder="A" /></div>
              <div><Label>Corredor</Label><Input value={form.corredor} onChange={e => setForm(p => ({ ...p, corredor: e.target.value }))} placeholder="01" /></div>
              <div><Label>Prateleira</Label><Input value={form.prateleira} onChange={e => setForm(p => ({ ...p, prateleira: e.target.value }))} placeholder="P1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Capacidade (un.)</Label><Input type="number" value={form.capacidade} onChange={e => setForm(p => ({ ...p, capacidade: Number(e.target.value) }))} /></div>
              <div>
                <Label>Medida Preferencial</Label>
                <Select value={form.medida_preferencial} onValueChange={v => setForm(p => ({ ...p, medida_preferencial: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Nenhuma</SelectItem>
                    {MEDIDAS_COMUNS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observações</Label><Input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Endereço gerado:</p>
              <p className="font-mono text-sm font-medium">
                {[form.almoxarifado, form.setor, form.corredor, form.prateleira].filter(Boolean).join(" → ") || "—"}
              </p>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.almoxarifado || saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
