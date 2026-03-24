import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VehicleTireLayout } from "@/components/VehicleTireLayout";
import { RetroactiveDatePicker } from "@/components/RetroactiveDatePicker";
import { toast } from "sonner";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { Truck, Circle, Fuel, Wrench, Plus, Gauge, DollarSign, Ruler } from "lucide-react";

const MARCAS = ["Michelin", "Pirelli", "Goodyear", "Continental", "Bridgestone", "Dunlop", "Xbri", "Firestone", "Vipal", "Bandag"];

interface VehicleDetailPanelProps {
  veiculo: any;
  onClose: () => void;
}

export function VehicleDetailPanel({ veiculo, onClose }: VehicleDetailPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("resumo");

  // ---- Drag-and-drop tire move handler ----
  const handleTireMove = async (tireId: string, fromPosition: string, toPosition: string, swapTireId?: string) => {
    try {
      // If there's a tire at the target position, swap them
      if (swapTireId) {
        const { error: e1 } = await supabase.from("pneus").update({ posicao_atual: toPosition }).eq("id", tireId);
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("pneus").update({ posicao_atual: fromPosition }).eq("id", swapTireId);
        if (e2) throw e2;

        await supabase.from("movimentacoes_pneus").insert([
          { pneu_id: tireId, tipo_movimentacao: "rodizio", origem: fromPosition, destino: toPosition, posicao_destino: toPosition, veiculo_origem_id: veiculo.id, veiculo_destino_id: veiculo.id, observacoes: `Rodízio: ${fromPosition} → ${toPosition} (troca)` },
          { pneu_id: swapTireId, tipo_movimentacao: "rodizio", origem: toPosition, destino: fromPosition, posicao_destino: fromPosition, veiculo_origem_id: veiculo.id, veiculo_destino_id: veiculo.id, observacoes: `Rodízio: ${toPosition} → ${fromPosition} (troca)` },
        ]);
        toast.success(`Pneus trocados: ${fromPosition} ↔ ${toPosition}`);
      } else {
        // Simple move to empty slot
        const { error } = await supabase.from("pneus").update({ posicao_atual: toPosition }).eq("id", tireId);
        if (error) throw error;

        await supabase.from("movimentacoes_pneus").insert({
          pneu_id: tireId, tipo_movimentacao: "rodizio", origem: fromPosition, destino: toPosition, posicao_destino: toPosition, veiculo_origem_id: veiculo.id, veiculo_destino_id: veiculo.id, observacoes: `Movido: ${fromPosition} → ${toPosition}`,
        });
        toast.success(`Pneu movido: ${fromPosition} → ${toPosition}`);
      }

      queryClient.invalidateQueries({ queryKey: ["pneus-veiculo", veiculo.id] });
      queryClient.invalidateQueries({ queryKey: ["pneus-frota-map", veiculo.id] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao mover pneu");
    }
  };

  // ---- Pneus do veículo ----
  const { data: pneus = [] } = useQuery({
    queryKey: ["pneus-veiculo", veiculo.id],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("*").eq("veiculo_id", veiculo.id);
      return data || [];
    },
  });

  // ---- Todos os pneus (para o mapa) ----
  const { data: pneusMap = [] } = useQuery({
    queryKey: ["pneus-frota-map", veiculo.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pneus")
        .select("id, id_unico, veiculo_id, posicao_atual, sulco_atual, sulco_inicial, pressao_atual, pressao_ideal, marca, medida, status")
        .eq("veiculo_id", veiculo.id);
      return data || [];
    },
  });

  // ---- Combustível ----
  const { data: abastecimentos = [] } = useQuery({
    queryKey: ["combustivel-veiculo", veiculo.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("coleta_manual_combustivel")
        .select("*")
        .eq("veiculo_id", veiculo.id)
        .order("data_abastecimento", { ascending: false });
      return data || [];
    },
  });

  // ---- Manutenções ----
  const { data: manutencoes = [] } = useQuery({
    queryKey: ["manutencoes-veiculo", veiculo.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("manutencoes")
        .select("*")
        .eq("veiculo_id", veiculo.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ---- Medições de pneus ----
  const { data: medicoes = [] } = useQuery({
    queryKey: ["medicoes-veiculo", veiculo.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("coleta_manual_pneus")
        .select("*")
        .eq("veiculo_id", veiculo.id)
        .order("data_medicao", { ascending: false });
      return data || [];
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-primary" />
          {veiculo.placa} — {veiculo.tipo_veiculo}
        </DialogTitle>
        <DialogDescription>
          {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") || "Veículo"} • {veiculo.categoria} • {veiculo.quantidade_eixos} eixos
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
          <TabsTrigger value="pneu" className="text-xs">+ Pneu</TabsTrigger>
          <TabsTrigger value="medicoes" className="text-xs">Medições</TabsTrigger>
          <TabsTrigger value="combustivel" className="text-xs">Combustível</TabsTrigger>
          <TabsTrigger value="manutencao" className="text-xs">Manutenção</TabsTrigger>
        </TabsList>

        {/* ===== RESUMO ===== */}
        <TabsContent value="resumo" className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <span className="text-muted-foreground text-xs">Marca</span>
              <p className="font-medium">{veiculo.marca || "—"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <span className="text-muted-foreground text-xs">Modelo</span>
              <p className="font-medium">{veiculo.modelo || "—"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <span className="text-muted-foreground text-xs">Categoria</span>
              <p className="font-medium">{veiculo.categoria}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <span className="text-muted-foreground text-xs">Pneus</span>
              <p className="font-medium">{pneusMap.length} / {veiculo.total_pneus}</p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Mapa de Pneus</CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleTireLayout
                tipoVeiculo={veiculo.tipo_veiculo || "Truck"}
                quantidadeEixos={veiculo.quantidade_eixos || 3}
                possuiEstepe={veiculo.possui_estepe || false}
                quantidadeEstepes={veiculo.quantidade_estepes || 0}
                pneus={pneusMap}
                editable
                onTireMove={handleTireMove}
              />
            </CardContent>
          </Card>

          {pneus.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pneus Instalados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Marca</TableHead>
                      <TableHead className="text-xs">Medida</TableHead>
                      <TableHead className="text-xs">Sulco</TableHead>
                      <TableHead className="text-xs">Posição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pneus.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-mono">{p.id_unico}</TableCell>
                        <TableCell className="text-xs">{p.marca}</TableCell>
                        <TableCell className="text-xs">{p.medida}</TableCell>
                        <TableCell className="text-xs">{p.sulco_atual}mm</TableCell>
                        <TableCell className="text-xs">{p.posicao_atual || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== CADASTRAR PNEU ===== */}
        <TabsContent value="pneu" className="mt-4">
          <PneuForm veiculoId={veiculo.id} clienteId={veiculo.cliente_id} onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["pneus-veiculo", veiculo.id] });
            queryClient.invalidateQueries({ queryKey: ["pneus-frota-map", veiculo.id] });
            queryClient.invalidateQueries({ queryKey: ["pneus"] });
            setActiveTab("resumo");
          }} />
        </TabsContent>

        {/* ===== MEDIÇÕES ===== */}
        <TabsContent value="medicoes" className="mt-4">
          <MedicaoForm veiculoId={veiculo.id} clienteId={veiculo.cliente_id} onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["medicoes-veiculo", veiculo.id] });
            queryClient.invalidateQueries({ queryKey: ["pneus-veiculo", veiculo.id] });
            queryClient.invalidateQueries({ queryKey: ["pneus-frota-map", veiculo.id] });
          }} />
          {medicoes.length > 0 && (
            <MedicoesCharts medicoes={medicoes} />
          )}
          {medicoes.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Histórico de Medições</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Posição</TableHead>
                      <TableHead className="text-xs">Sulco</TableHead>
                      <TableHead className="text-xs">Pressão</TableHead>
                      <TableHead className="text-xs">Km</TableHead>
                      <TableHead className="text-xs">Obs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicoes.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{m.data_medicao}</TableCell>
                        <TableCell className="text-xs font-mono">{m.posicao_pneu}</TableCell>
                        <TableCell className="text-xs">{m.sulco_atual}mm</TableCell>
                        <TableCell className="text-xs">{m.pressao_atual} psi</TableCell>
                        <TableCell className="text-xs">{m.km_atual?.toLocaleString()}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate">{m.observacoes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="combustivel" className="mt-4">
          <CombustivelForm veiculoId={veiculo.id} clienteId={veiculo.cliente_id} onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["combustivel-veiculo", veiculo.id] });
          }} />
          {abastecimentos.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Histórico de Abastecimentos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Km</TableHead>
                      <TableHead className="text-xs">Litros</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">Consumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abastecimentos.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{a.data_abastecimento}</TableCell>
                        <TableCell className="text-xs">{a.km_atual?.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{a.litros_abastecidos}L</TableCell>
                        <TableCell className="text-xs">R$ {a.valor_total_pago?.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">
                          {a.consumo_km_por_litro ? `${a.consumo_km_por_litro.toFixed(2)} km/l` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== MANUTENÇÃO ===== */}
        <TabsContent value="manutencao" className="mt-4">
          <ManutencaoForm veiculoId={veiculo.id} onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["manutencoes-veiculo", veiculo.id] });
          }} />
          {manutencoes.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Histórico de Manutenções</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Custo</TableHead>
                      <TableHead className="text-xs">Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manutencoes.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{format(new Date(m.created_at), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-xs capitalize">{m.tipo}</TableCell>
                        <TableCell className="text-xs">R$ {m.custo?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{m.observacoes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

// ===================== PNEU FORM =====================
function PneuForm({ veiculoId, clienteId, onSuccess }: { veiculoId: string; clienteId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({
    id_unico: "", marca: "Michelin", modelo_pneu: "", medida: "295/80 R22.5",
    dot: "", sulco_inicial: "16", pressao_ideal: "110", custo_aquisicao: "3200",
    posicao_atual: "", data_aquisicao: new Date(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.id_unico) throw new Error("ID único obrigatório");
      const qrCode = `RASTRO-${form.id_unico}-${Date.now()}`;
      const { error } = await supabase.from("pneus").insert({
        id_unico: form.id_unico,
        marca: form.marca,
        modelo_pneu: form.modelo_pneu,
        medida: form.medida,
        dot: form.dot,
        sulco_inicial: Number(form.sulco_inicial),
        sulco_atual: Number(form.sulco_inicial),
        pressao_ideal: Number(form.pressao_ideal),
        custo_aquisicao: Number(form.custo_aquisicao),
        custo_acumulado: Number(form.custo_aquisicao),
        data_aquisicao: format(form.data_aquisicao, "yyyy-MM-dd"),
        posicao_atual: form.posicao_atual || null,
        veiculo_id: veiculoId,
        localizacao: "veiculo",
        status: "instalado",
        qr_code: qrCode,
        cliente_id: clienteId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pneu cadastrado e vinculado ao veículo!");
      onSuccess();
      setForm({ id_unico: "", marca: "Michelin", modelo_pneu: "", medida: "295/80 R22.5", dot: "", sulco_inicial: "16", pressao_ideal: "110", custo_aquisicao: "3200", posicao_atual: "", data_aquisicao: new Date() });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cadastrar pneu"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Cadastrar Pneu neste Veículo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">ID Único / Nº Fogo *</Label>
            <Input placeholder="Ex: P-001" value={form.id_unico} onChange={e => setForm({ ...form, id_unico: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Data de Aquisição</Label>
            <RetroactiveDatePicker
              date={form.data_aquisicao}
              onDateChange={(d) => setForm({ ...form, data_aquisicao: d || new Date() })}
              label=""
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Marca</Label>
            <CreatableSelect value={form.marca} onValueChange={v => setForm({ ...form, marca: v })} options={MARCAS} placeholder="Selecione ou digite" searchPlaceholder="Buscar marca..." />
          </div>
          <div>
            <Label className="text-xs">Modelo</Label>
            <Input placeholder="Ex: XZE2+" value={form.modelo_pneu} onChange={e => setForm({ ...form, modelo_pneu: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Medida</Label>
            <CreatableSelect value={form.medida} onValueChange={v => setForm({ ...form, medida: v })} options={["295/80 R22.5", "275/80 R22.5", "215/75 R17.5", "235/75 R17.5", "1000 R20", "1100 R22", "12.00 R24", "385/65 R22.5", "11 R22.5", "12 R22.5", "315/80 R22.5"]} placeholder="Selecione ou digite" searchPlaceholder="Buscar medida..." />
          </div>
          <div>
            <Label className="text-xs">DOT</Label>
            <Input placeholder="2524" value={form.dot} onChange={e => setForm({ ...form, dot: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Posição</Label>
            <Input placeholder="Ex: D1E" value={form.posicao_atual} onChange={e => setForm({ ...form, posicao_atual: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Sulco Inicial (mm)</Label>
            <Input type="number" value={form.sulco_inicial} onChange={e => setForm({ ...form, sulco_inicial: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Pressão Ideal (psi)</Label>
            <Input type="number" value={form.pressao_ideal} onChange={e => setForm({ ...form, pressao_ideal: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Custo (R$)</Label>
            <Input type="number" value={form.custo_aquisicao} onChange={e => setForm({ ...form, custo_aquisicao: e.target.value })} />
          </div>
        </div>
        <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.id_unico || mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Cadastrar Pneu"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ===================== COMBUSTÍVEL FORM =====================
function CombustivelForm({ veiculoId, clienteId, onSuccess }: { veiculoId: string; clienteId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({
    data_abastecimento: new Date(),
    km_atual: "", km_anterior: "",
    litros_abastecidos: "", valor_total_pago: "",
    tipo_combustivel: "Diesel S10", posto: "", observacoes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const kmAtual = Number(form.km_atual);
      const kmAnterior = form.km_anterior ? Number(form.km_anterior) : null;
      const litros = Number(form.litros_abastecidos);
      const valor = Number(form.valor_total_pago);
      const kmRodado = kmAnterior ? kmAtual - kmAnterior : null;
      const consumo = kmRodado && litros ? kmRodado / litros : null;
      const custoKm = kmRodado && valor ? valor / kmRodado : null;
      const precoLitro = litros ? valor / litros : null;

      const { error } = await supabase.from("coleta_manual_combustivel").insert({
        veiculo_id: veiculoId,
        cliente_id: clienteId,
        data_abastecimento: format(form.data_abastecimento, "yyyy-MM-dd"),
        km_atual: kmAtual,
        km_anterior: kmAnterior,
        km_rodado: kmRodado,
        litros_abastecidos: litros,
        valor_total_pago: valor,
        preco_litro: precoLitro,
        consumo_km_por_litro: consumo,
        custo_por_km: custoKm,
        tipo_combustivel: form.tipo_combustivel,
        posto: form.posto || null,
        observacoes: form.observacoes || null,
        status_eficiencia: consumo ? (consumo >= 3 ? "bom" : consumo >= 2 ? "regular" : "critico") : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Abastecimento registrado!");
      onSuccess();
      setForm({ data_abastecimento: new Date(), km_atual: "", km_anterior: "", litros_abastecidos: "", valor_total_pago: "", tipo_combustivel: "Diesel S10", posto: "", observacoes: "" });
    },
    onError: () => toast.error("Erro ao registrar abastecimento"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Fuel className="h-4 w-4" /> Registrar Abastecimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Data</Label>
            <RetroactiveDatePicker
              date={form.data_abastecimento}
              onDateChange={(d) => setForm({ ...form, data_abastecimento: d || new Date() })}
              label=""
            />
          </div>
          <div>
            <Label className="text-xs">Combustível</Label>
            <Select value={form.tipo_combustivel} onValueChange={v => setForm({ ...form, tipo_combustivel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Diesel S10">Diesel S10</SelectItem>
                <SelectItem value="Diesel S500">Diesel S500</SelectItem>
                <SelectItem value="Gasolina">Gasolina</SelectItem>
                <SelectItem value="Etanol">Etanol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Km Atual *</Label>
            <Input type="number" placeholder="Ex: 150000" value={form.km_atual} onChange={e => setForm({ ...form, km_atual: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Km Anterior</Label>
            <Input type="number" placeholder="Ex: 149500" value={form.km_anterior} onChange={e => setForm({ ...form, km_anterior: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Litros *</Label>
            <Input type="number" placeholder="Ex: 200" value={form.litros_abastecidos} onChange={e => setForm({ ...form, litros_abastecidos: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Valor Total (R$) *</Label>
            <Input type="number" placeholder="Ex: 1200" value={form.valor_total_pago} onChange={e => setForm({ ...form, valor_total_pago: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Posto</Label>
            <Input placeholder="Nome do posto" value={form.posto} onChange={e => setForm({ ...form, posto: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Input placeholder="Opcional" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.km_atual || !form.litros_abastecidos || !form.valor_total_pago || mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Registrar Abastecimento"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ===================== MANUTENÇÃO FORM =====================
function ManutencaoForm({ veiculoId, onSuccess }: { veiculoId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({
    tipo: "inspecao", causa: "", custo: "", km_no_momento: "", ordem_servico: "", observacoes: "",
    data: new Date(),
  });

  const { data: pneusVeiculo = [] } = useQuery({
    queryKey: ["pneus-manut", veiculoId],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("id, id_unico").eq("veiculo_id", veiculoId);
      return data || [];
    },
  });

  const [pneuId, setPneuId] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("manutencoes").insert({
        veiculo_id: veiculoId,
        pneu_id: pneuId || null,
        tipo: form.tipo,
        causa: form.causa || null,
        custo: form.custo ? Number(form.custo) : 0,
        km_no_momento: form.km_no_momento ? Number(form.km_no_momento) : null,
        ordem_servico: form.ordem_servico || null,
        observacoes: form.observacoes || null,
        created_at: form.data.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Manutenção registrada!");
      onSuccess();
      setForm({ tipo: "inspecao", causa: "", custo: "", km_no_momento: "", ordem_servico: "", observacoes: "", data: new Date() });
      setPneuId("");
    },
    onError: () => toast.error("Erro ao registrar manutenção"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Registrar Manutenção</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Data</Label>
            <RetroactiveDatePicker
              date={form.data}
              onDateChange={(d) => setForm({ ...form, data: d || new Date() })}
              label=""
            />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inspecao">Inspeção</SelectItem>
                <SelectItem value="reparo">Reparo</SelectItem>
                <SelectItem value="troca">Troca</SelectItem>
                <SelectItem value="rodizio">Rodízio</SelectItem>
                <SelectItem value="calibragem">Calibragem</SelectItem>
                <SelectItem value="alinhamento">Alinhamento</SelectItem>
                <SelectItem value="balanceamento">Balanceamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Pneu (opcional)</Label>
            <Select value={pneuId} onValueChange={setPneuId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {pneusVeiculo.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.id_unico}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Km no Momento</Label>
            <Input type="number" value={form.km_no_momento} onChange={e => setForm({ ...form, km_no_momento: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Custo (R$)</Label>
            <Input type="number" value={form.custo} onChange={e => setForm({ ...form, custo: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Ordem de Serviço</Label>
            <Input value={form.ordem_servico} onChange={e => setForm({ ...form, ordem_servico: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Causa / Observações</Label>
          <Textarea rows={2} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Registrar Manutenção"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ===================== MEDIÇÃO FORM =====================
function MedicaoForm({ veiculoId, clienteId, onSuccess }: { veiculoId: string; clienteId: string; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    posicao_pneu: "", sulco_atual: "", pressao_atual: "", pressao_recomendada: "110",
    km_atual: "", observacoes: "", data_medicao: new Date(),
  });

  const { data: pneusVeiculo = [] } = useQuery({
    queryKey: ["pneus-medicao", veiculoId],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("id, id_unico, posicao_atual, sulco_atual, pressao_ideal").eq("veiculo_id", veiculoId);
      return data || [];
    },
  });

  const [selectedPneuId, setSelectedPneuId] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.sulco_atual || !form.pressao_atual || !form.km_atual) throw new Error("Preencha sulco, pressão e km");
      
      const selectedPneu = pneusVeiculo.find((p: any) => p.id === selectedPneuId);
      const sulcoAnterior = selectedPneu?.sulco_atual || null;
      const sulcoAtual = Number(form.sulco_atual);
      const pressaoAtual = Number(form.pressao_atual);
      const pressaoRecomendada = Number(form.pressao_recomendada);
      const kmAtual = Number(form.km_atual);

      const { error } = await supabase.from("coleta_manual_pneus").insert({
        veiculo_id: veiculoId,
        cliente_id: clienteId,
        posicao_pneu: form.posicao_pneu || selectedPneu?.posicao_atual || "N/D",
        sulco_atual: sulcoAtual,
        sulco_anterior: sulcoAnterior,
        sulco_variacao: sulcoAnterior ? sulcoAnterior - sulcoAtual : null,
        pressao_atual: pressaoAtual,
        pressao_recomendada: pressaoRecomendada,
        pressao_diferenca: pressaoAtual - pressaoRecomendada,
        km_atual: kmAtual,
        data_medicao: format(form.data_medicao, "yyyy-MM-dd"),
        observacoes: form.observacoes || null,
      });
      if (error) throw error;

      // Update pneu current values
      if (selectedPneuId) {
        await supabase.from("pneus").update({
          sulco_atual: sulcoAtual,
          pressao_atual: pressaoAtual,
          km_atual: kmAtual,
        }).eq("id", selectedPneuId);
      }

      // ---- Auto-generate alerts ----
      const pneuLabel = selectedPneu?.id_unico || form.posicao_pneu || "Pneu";
      const alertas: { tipo_alerta: string; mensagem: string; gravidade: string; acao_sugerida: string; pneu_id?: string; veiculo_id: string }[] = [];

      // Sulco crítico < 3mm
      if (sulcoAtual < 3) {
        alertas.push({
          tipo_alerta: "sulco_critico",
          mensagem: `${pneuLabel}: Sulco em ${sulcoAtual}mm — abaixo do limite de segurança (3mm)`,
          gravidade: "critica",
          acao_sugerida: "Substituir pneu imediatamente ou enviar para recapagem",
          pneu_id: selectedPneuId || undefined,
          veiculo_id: veiculoId,
        });
      } else if (sulcoAtual < 5) {
        alertas.push({
          tipo_alerta: "sulco_atencao",
          mensagem: `${pneuLabel}: Sulco em ${sulcoAtual}mm — próximo do limite crítico`,
          gravidade: "atencao",
          acao_sugerida: "Planejar substituição ou recapagem nas próximas semanas",
          pneu_id: selectedPneuId || undefined,
          veiculo_id: veiculoId,
        });
      }

      // Pressão com desvio > 10%
      const desvioPressao = Math.abs(pressaoAtual - pressaoRecomendada) / pressaoRecomendada;
      if (desvioPressao > 0.10) {
        const direcao = pressaoAtual > pressaoRecomendada ? "acima" : "abaixo";
        const desvioPercent = (desvioPressao * 100).toFixed(0);
        alertas.push({
          tipo_alerta: "pressao_desvio",
          mensagem: `${pneuLabel}: Pressão em ${pressaoAtual} psi — ${desvioPercent}% ${direcao} do ideal (${pressaoRecomendada} psi)`,
          gravidade: desvioPressao > 0.20 ? "critica" : "atencao",
          acao_sugerida: direcao === "abaixo" ? "Calibrar pneu imediatamente para evitar desgaste irregular" : "Verificar calibragem — pressão excessiva pode causar estouros",
          pneu_id: selectedPneuId || undefined,
          veiculo_id: veiculoId,
        });
      }

      // Insert alerts
      if (alertas.length > 0) {
        await supabase.from("alertas").insert(alertas);
      }
    },
    onSuccess: () => {
      const sulcoVal = Number(form.sulco_atual);
      const pressaoVal = Number(form.pressao_atual);
      const pressaoRec = Number(form.pressao_recomendada);
      const desvio = Math.abs(pressaoVal - pressaoRec) / pressaoRec;

      if (sulcoVal < 3) {
        toast.warning(`⚠️ Sulco crítico: ${sulcoVal}mm — abaixo do limite de segurança!`);
      } else if (sulcoVal < 5) {
        toast.warning(`Sulco em atenção: ${sulcoVal}mm — próximo do limite`);
      }
      if (desvio > 0.10) {
        toast.warning(`⚠️ Pressão com desvio de ${(desvio * 100).toFixed(0)}% do ideal!`);
      }

      toast.success("Medição registrada!");
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
      setForm({ posicao_pneu: "", sulco_atual: "", pressao_atual: "", pressao_recomendada: "110", km_atual: "", observacoes: "", data_medicao: new Date() });
      setSelectedPneuId("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar medição"),
  });

  const handlePneuSelect = (pneuId: string) => {
    setSelectedPneuId(pneuId);
    const pneu = pneusVeiculo.find((p: any) => p.id === pneuId);
    if (pneu) {
      setForm(prev => ({
        ...prev,
        posicao_pneu: pneu.posicao_atual || "",
        pressao_recomendada: String(pneu.pressao_ideal || 110),
      }));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Ruler className="h-4 w-4" /> Registrar Medição de Sulco & Pressão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Pneu</Label>
            <Select value={selectedPneuId} onValueChange={handlePneuSelect}>
              <SelectTrigger><SelectValue placeholder="Selecione o pneu" /></SelectTrigger>
              <SelectContent>
                {pneusVeiculo.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id_unico} {p.posicao_atual ? `(${p.posicao_atual})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Data da Medição</Label>
            <RetroactiveDatePicker
              date={form.data_medicao}
              onDateChange={(d) => setForm({ ...form, data_medicao: d || new Date() })}
              label=""
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Posição</Label>
            <Input placeholder="Ex: D1E" value={form.posicao_pneu} onChange={e => setForm({ ...form, posicao_pneu: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Sulco Atual (mm) *</Label>
            <Input type="number" step="0.1" placeholder="Ex: 12.5" value={form.sulco_atual} onChange={e => setForm({ ...form, sulco_atual: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Pressão Atual (psi) *</Label>
            <Input type="number" placeholder="Ex: 105" value={form.pressao_atual} onChange={e => setForm({ ...form, pressao_atual: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Km Atual *</Label>
            <Input type="number" placeholder="Ex: 150000" value={form.km_atual} onChange={e => setForm({ ...form, km_atual: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Pressão Recomendada (psi)</Label>
            <Input type="number" value={form.pressao_recomendada} onChange={e => setForm({ ...form, pressao_recomendada: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Observações</Label>
          <Input placeholder="Desgaste irregular, calibragem pendente..." value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <Button className="w-full" onClick={() => mutation.mutate()} disabled={!form.sulco_atual || !form.pressao_atual || !form.km_atual || mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Registrar Medição"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ===================== MEDIÇÕES CHARTS =====================
const CHART_COLORS = [
  "hsl(215, 60%, 45%)",
  "hsl(174, 62%, 42%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 50%, 55%)",
  "hsl(0, 65%, 55%)",
  "hsl(120, 40%, 45%)",
];

function MedicoesCharts({ medicoes }: { medicoes: any[] }) {
  // Group by position for multi-line charts
  const positions = [...new Set(medicoes.map((m: any) => m.posicao_pneu))];

  // Sort by date ascending for chart
  const sorted = [...medicoes].sort((a, b) => a.data_medicao.localeCompare(b.data_medicao));

  // Build chart data: each date has sulco/pressao per position
  const dateMap = new Map<string, any>();
  sorted.forEach((m: any) => {
    const key = m.data_medicao;
    if (!dateMap.has(key)) {
      dateMap.set(key, { data: format(new Date(key + "T12:00:00"), "dd/MM") });
    }
    const entry = dateMap.get(key);
    entry[`sulco_${m.posicao_pneu}`] = Number(m.sulco_atual);
    entry[`pressao_${m.posicao_pneu}`] = Number(m.pressao_atual);
  });
  const chartData = Array.from(dateMap.values());

  if (chartData.length < 1) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Sulco Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ruler className="h-4 w-4" /> Evolução do Sulco (mm)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 25%)" />
              <XAxis dataKey="data" tick={{ fontSize: 10, fill: "hsl(215, 20%, 60%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 60%)" }} domain={[0, 'auto']} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "hsl(216, 40%, 12%)", border: "1px solid hsl(215, 20%, 25%)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(215, 20%, 70%)" }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={3} stroke="hsl(0, 65%, 55%)" strokeDasharray="4 4" label={{ value: "Mín 3mm", fill: "hsl(0, 65%, 55%)", fontSize: 9 }} />
              {positions.map((pos, i) => (
                <Line
                  key={pos}
                  type="monotone"
                  dataKey={`sulco_${pos}`}
                  name={pos}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pressão Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Evolução da Pressão (psi)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 25%)" />
              <XAxis dataKey="data" tick={{ fontSize: 10, fill: "hsl(215, 20%, 60%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 60%)" }} domain={['auto', 'auto']} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "hsl(216, 40%, 12%)", border: "1px solid hsl(215, 20%, 25%)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(215, 20%, 70%)" }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={110} stroke="hsl(174, 62%, 42%)" strokeDasharray="4 4" label={{ value: "Ideal 110", fill: "hsl(174, 62%, 42%)", fontSize: 9 }} />
              {positions.map((pos, i) => (
                <Line
                  key={pos}
                  type="monotone"
                  dataKey={`pressao_${pos}`}
                  name={pos}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
