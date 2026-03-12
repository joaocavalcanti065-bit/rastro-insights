import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { VehicleTireLayout } from "@/components/VehicleTireLayout";
import { VehicleDetailPanel } from "@/components/frota/VehicleDetailPanel";
import { toast } from "sonner";
import { Truck, Plus, AlertTriangle, Eye, X } from "lucide-react";

const TIPOS_VEICULO = [
  { label: "Carro / SUV / Van", value: "Carro", pneus: 4 },
  { label: "Caminhão 3/4", value: "Caminhão 3/4", pneus: 6 },
  { label: "Toco", value: "Toco", pneus: 6 },
  { label: "Truck", value: "Truck", pneus: 10 },
  { label: "Bi-Truck", value: "Bi-Truck", pneus: 12 },
  { label: "Cavalo Mecânico", value: "Cavalo Mecânico", pneus: 6 },
  { label: "Carreta Simples / LS", value: "Carreta Simples", pneus: 10 },
  { label: "Carreta 2 eixos", value: "Carreta 2 eixos", pneus: 12 },
  { label: "Carreta 3 eixos", value: "Carreta 3 eixos", pneus: 14 },
  { label: "Rodotrem", value: "Rodotrem", pneus: 18 },
  { label: "Bitrem", value: "Bitrem", pneus: 22 },
];

export default function Frota() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<string | null>(null);
  const [form, setForm] = useState({ placa: "", tipo_veiculo: "", modelo: "", marca: "", categoria: "Pesado", quantidade_eixos: 3, possui_estepe: false, quantidade_estepes: 0 });

  const { data: veiculos, isLoading } = useQuery({
    queryKey: ["veiculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("veiculos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: pneus } = useQuery({
    queryKey: ["pneus-frota"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("id, id_unico, veiculo_id, posicao_atual, sulco_atual, sulco_inicial, pressao_atual, pressao_ideal, marca, medida, status");
      return data || [];
    },
  });

  const { data: alertasAtivos } = useQuery({
    queryKey: ["alertas-frota-ativos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alertas")
        .select("id, veiculo_id, pneu_id, tipo_alerta, gravidade, mensagem")
        .eq("ativo", true)
        .in("gravidade", ["critico", "atencao"]);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Get or create default client
      let clienteId: string;
      const { data: existingClientes } = await supabase.from("clientes").select("id").limit(1);
      if (existingClientes && existingClientes.length > 0) {
        clienteId = existingClientes[0].id;
      } else {
        const { data: newCliente, error: clienteError } = await supabase.from("clientes").insert({ nome: "Minha Empresa" }).select("id").single();
        if (clienteError || !newCliente) throw clienteError || new Error("Erro ao criar cliente");
        clienteId = newCliente.id;
      }

      const tipoInfo = TIPOS_VEICULO.find(t => t.value === form.tipo_veiculo);
      const totalRodantes = tipoInfo?.pneus || 10;
      const { error } = await supabase.from("veiculos").insert({
        placa: form.placa.toUpperCase(),
        tipo_veiculo: form.tipo_veiculo,
        modelo: form.modelo,
        marca: form.marca || null,
        categoria: form.categoria,
        quantidade_eixos: form.quantidade_eixos,
        possui_estepe: form.possui_estepe,
        quantidade_estepes: form.quantidade_estepes,
        total_pneus_rodantes: totalRodantes,
        total_pneus: totalRodantes + form.quantidade_estepes,
        cliente_id: clienteId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success("Veículo cadastrado com sucesso!");
      setOpen(false);
      setForm({ placa: "", tipo_veiculo: "", modelo: "", marca: "", categoria: "Pesado", quantidade_eixos: 3, possui_estepe: false, quantidade_estepes: 0 });
    },
    onError: () => toast.error("Erro ao cadastrar veículo"),
  });

  const selectedV = veiculos?.find(v => v.id === selectedVeiculo);
  const selectedPneus = pneus?.filter(p => p.veiculo_id === selectedVeiculo) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Frota</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Frota</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Cadastrar Veículo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Veículo</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Placa</Label><Input placeholder="ABC-1234" value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value })} /></div>
                <div><Label>Modelo</Label><Input placeholder="Scania P310" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} /></div>
              </div>
              <div>
                <Label>Marca do Veículo</Label>
                <CreatableSelect
                  value={form.marca}
                  onValueChange={v => setForm({ ...form, marca: v })}
                  options={["Scania", "Volvo", "Mercedes-Benz", "DAF", "MAN", "Iveco", "Ford", "Volkswagen", "Toyota", "Hyundai", "Fiat"]}
                  placeholder="Selecione ou digite a marca"
                  searchPlaceholder="Buscar marca..."
                />
              </div>
              <div>
                <Label>Tipo de Veículo</Label>
                <Select value={form.tipo_veiculo} onValueChange={v => setForm({ ...form, tipo_veiculo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPOS_VEICULO.map(t => <SelectItem key={t.value} value={t.value}>{t.label} ({t.pneus} pneus)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Leve">Leve</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Pesado">Pesado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Qtd. Eixos</Label><Input type="number" value={form.quantidade_eixos} onChange={e => setForm({ ...form, quantidade_eixos: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.possui_estepe} onChange={e => setForm({ ...form, possui_estepe: e.target.checked, quantidade_estepes: e.target.checked ? 1 : 0 })} className="rounded" />
                  <Label>Possui estepe?</Label>
                </div>
                {form.possui_estepe && (
                  <div><Label>Qtd. Estepes</Label><Input type="number" value={form.quantidade_estepes} onChange={e => setForm({ ...form, quantidade_estepes: Number(e.target.value) })} /></div>
                )}
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.placa || !form.tipo_veiculo || createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vehicle detail modal */}
      <Dialog open={!!selectedVeiculo} onOpenChange={() => setSelectedVeiculo(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedV && (
            <VehicleDetailPanel veiculo={selectedV} onClose={() => setSelectedVeiculo(null)} />
          )}
        </DialogContent>
      </Dialog>

      {!veiculos?.length ? (
        <EmptyState icon={Truck} title="Nenhum veículo cadastrado" description="Cadastre o primeiro veículo da sua frota para começar a gestão dos pneus." actionLabel="Cadastrar Veículo" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {veiculos.map((v) => {
            const pneusVeiculo = pneus?.filter(p => p.veiculo_id === v.id) || [];
            const pneuIds = new Set(pneusVeiculo.map(p => p.id));
            // Alerts directly on vehicle OR on its installed tires
            const alertasVeiculo = (alertasAtivos || []).filter(a =>
              a.veiculo_id === v.id || (a.pneu_id && pneuIds.has(a.pneu_id))
            );
            const criticos = alertasVeiculo.filter(a => a.gravidade === "critico");
            const atencao = alertasVeiculo.filter(a => a.gravidade === "atencao");
            const hasCritico = criticos.length > 0;

            return (
              <Card
                key={v.id}
                className={`hover:border-primary/50 transition-colors cursor-pointer ${hasCritico ? "border-destructive/60 shadow-[0_0_12px_-3px] shadow-destructive/30" : atencao.length > 0 ? "border-yellow-500/40" : ""}`}
                onClick={() => setSelectedVeiculo(v.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{v.placa}</CardTitle>
                    <div className="flex items-center gap-2">
                      {hasCritico && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />{criticos.length} crítico(s)
                        </Badge>
                      )}
                      <Badge variant={v.status === "ativo" ? "default" : "secondary"}>{v.status || "ativo"}</Badge>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <span>{v.tipo_veiculo}</span>
                    </div>
                    {v.marca && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Marca</span>
                        <span className="font-medium">{v.marca}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modelo</span>
                      <span>{v.modelo || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pneus instalados</span>
                      <span>{pneusVeiculo.length} / {v.total_pneus}</span>
                    </div>
                    {alertasVeiculo.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {criticos.length > 0 && (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-medium">{criticos.length} alerta(s) crítico(s)</span>
                          </div>
                        )}
                        {atencao.length > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs">{atencao.length} alerta(s) de atenção</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
