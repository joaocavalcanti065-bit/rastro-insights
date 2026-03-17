import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Camera, Circle, FileSpreadsheet, Plus, QrCode, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { QrScanner } from "@/components/QrScanner";
import { ExcelImport } from "@/components/ExcelImport";

const MARCAS = ["Michelin", "Pirelli", "Goodyear", "Continental", "Bridgestone", "Dunlop", "Xbri", "Firestone", "Vipal", "Bandag"];
const MEDIDAS = ["295/80 R22.5", "275/80 R22.5", "215/75 R17.5", "235/75 R17.5", "1000 R20", "1100 R22", "12.00 R24", "385/65 R22.5", "11 R22.5", "12 R22.5", "315/80 R22.5"];
const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  em_estoque: { label: "Em Estoque", variant: "secondary" },
  instalado: { label: "Instalado", variant: "default" },
  em_inspecao: { label: "Em Inspeção", variant: "outline" },
  aguardando_recapagem: { label: "Aguard. Recap.", variant: "outline" },
  em_recapagem: { label: "Em Recapagem", variant: "outline" },
  sucata: { label: "Sucata", variant: "destructive" },
};

export default function PneusPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [qrModal, setQrModal] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    id_unico: "", marca: "Michelin", modelo_pneu: "", medida: "295/80 R22.5",
    dot: "", indice_carga: "", tipo_aplicacao: "rodoviario", tipo_eixo: "tracao",
    sulco_inicial: 16, pressao_ideal: 110, custo_aquisicao: 3200, localizacao: "estoque",
  });

  const { data: pneus, isLoading } = useQuery({
    queryKey: ["pneus"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pneus").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const qrCode = `RASTRO-${form.id_unico}-${Date.now()}`;
      const { error } = await supabase.from("pneus").insert({
        id_unico: form.id_unico,
        marca: form.marca,
        modelo_pneu: form.modelo_pneu,
        medida: form.medida,
        dot: form.dot,
        indice_carga: form.indice_carga,
        tipo_aplicacao: form.tipo_aplicacao,
        tipo_eixo: form.tipo_eixo,
        tipo_pneu: "novo",
        sulco_inicial: form.sulco_inicial,
        sulco_atual: form.sulco_inicial,
        pressao_ideal: form.pressao_ideal,
        custo_aquisicao: form.custo_aquisicao,
        custo_acumulado: form.custo_aquisicao,
        localizacao: form.localizacao,
        status: form.localizacao === "estoque" ? "em_estoque" : "instalado",
        qr_code: qrCode,
        cliente_id: "00000000-0000-0000-0000-000000000000",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pneus"] });
      toast.success("Pneu cadastrado com sucesso!");
      setOpen(false);
      setStep(1);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cadastrar pneu"),
  });

  const filtered = pneus?.filter(p =>
    p.id_unico?.toLowerCase().includes(search.toLowerCase()) ||
    p.marca?.toLowerCase().includes(search.toLowerCase()) ||
    p.medida?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pneus</h1>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Pneus</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por ID, marca, medida..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            <Camera className="h-4 w-4 mr-2" />Ler QR Code
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />Importar Excel
          </Button>
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setStep(1); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Cadastrar Pneu</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Pneu — Etapa {step}/4</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                {step === 1 && (
                  <>
                    <div><Label>ID Único (Ex: 001P)</Label><Input value={form.id_unico} onChange={e => setForm({ ...form, id_unico: e.target.value })} /></div>
                    <div><Label>Marca</Label>
                      <CreatableSelect value={form.marca} onValueChange={v => setForm({ ...form, marca: v })} options={MARCAS} placeholder="Selecione ou digite" searchPlaceholder="Buscar marca..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Modelo</Label><Input value={form.modelo_pneu} onChange={e => setForm({ ...form, modelo_pneu: e.target.value })} /></div>
                      <div><Label>DOT</Label><Input value={form.dot} onChange={e => setForm({ ...form, dot: e.target.value })} /></div>
                    </div>
                    <div><Label>Medida</Label><Input value={form.medida} onChange={e => setForm({ ...form, medida: e.target.value })} /></div>
                  </>
                )}
                {step === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Sulco Inicial (mm)</Label><Input type="number" value={form.sulco_inicial} onChange={e => setForm({ ...form, sulco_inicial: Number(e.target.value) })} /></div>
                      <div><Label>Pressão Ideal (PSI)</Label><Input type="number" value={form.pressao_ideal} onChange={e => setForm({ ...form, pressao_ideal: Number(e.target.value) })} /></div>
                    </div>
                    <div><Label>Índice de Carga</Label><Input value={form.indice_carga} onChange={e => setForm({ ...form, indice_carga: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Tipo Aplicação</Label>
                        <Select value={form.tipo_aplicacao} onValueChange={v => setForm({ ...form, tipo_aplicacao: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rodoviario">Rodoviário</SelectItem>
                            <SelectItem value="urbano">Urbano</SelectItem>
                            <SelectItem value="misto">Misto</SelectItem>
                            <SelectItem value="fora_estrada">Fora de Estrada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Tipo Eixo</Label>
                        <Select value={form.tipo_eixo} onValueChange={v => setForm({ ...form, tipo_eixo: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direcional">Direcional</SelectItem>
                            <SelectItem value="tracao">Tração</SelectItem>
                            <SelectItem value="livre">Livre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                {step === 3 && (
                  <>
                    <div><Label>Localização Inicial</Label>
                      <Select value={form.localizacao} onValueChange={v => setForm({ ...form, localizacao: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="estoque">Estoque</SelectItem>
                          <SelectItem value="veiculo">Veículo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Custo de Aquisição (R$)</Label><Input type="number" value={form.custo_aquisicao} onChange={e => setForm({ ...form, custo_aquisicao: Number(e.target.value) })} /></div>
                  </>
                )}
                {step === 4 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Revise os dados antes de confirmar:</p>
                    <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
                      <p><span className="text-muted-foreground">ID:</span> {form.id_unico}</p>
                      <p><span className="text-muted-foreground">Marca:</span> {form.marca}</p>
                      <p><span className="text-muted-foreground">Medida:</span> {form.medida}</p>
                      <p><span className="text-muted-foreground">Sulco:</span> {form.sulco_inicial}mm</p>
                      <p><span className="text-muted-foreground">Pressão:</span> {form.pressao_ideal} PSI</p>
                      <p><span className="text-muted-foreground">Local:</span> {form.localizacao}</p>
                      <p><span className="text-muted-foreground">Custo:</span> R$ {form.custo_aquisicao.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
                  {step < 4 ? (
                    <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !form.id_unico}>Próximo</Button>
                  ) : (
                    <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Salvando..." : "Confirmar Cadastro"}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* QR Modal */}
      <Dialog open={!!qrModal} onOpenChange={() => setQrModal(null)}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader><DialogTitle>QR Code</DialogTitle></DialogHeader>
          <div className="flex justify-center p-4 bg-primary-foreground rounded-lg">
            <QRCodeSVG value={qrModal || ""} size={200} />
          </div>
          <p className="text-sm text-muted-foreground">{qrModal}</p>
        </DialogContent>
      </Dialog>

      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(value) => {
          const found = pneus?.find(p => p.qr_code === value || p.id_unico === value);
          if (found) {
            setSearch(found.id_unico);
            toast.success(`Pneu ${found.id_unico} encontrado!`);
          } else {
            toast.error("Pneu não encontrado no sistema");
          }
        }}
      />

      <ExcelImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["pneus"] })}
        existingIds={pneus?.map(p => p.id_unico) ?? []}
      />

      {!filtered?.length ? (
        <EmptyState icon={Circle} title="Nenhum pneu cadastrado" description="Cadastre seus pneus com ID único e QR Code para rastreamento completo do ciclo de vida." actionLabel="Cadastrar Pneu" onAction={() => setOpen(true)} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RG</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Medida</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sulco</TableHead>
                  <TableHead>Pressão</TableHead>
                  <TableHead>Custo/km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const status = STATUS_MAP[p.status] || { label: p.status, variant: "outline" as const };
                  const cpk = p.km_atual && p.km_atual > 0 && p.custo_acumulado ? (Number(p.custo_acumulado) / p.km_atual).toFixed(3) : "—";
                  const sulcoPercent = p.sulco_inicial ? ((Number(p.sulco_atual || 0) / Number(p.sulco_inicial)) * 100).toFixed(0) : "—";
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pneu/${(p as any).rg_code || p.id_unico}`)}>
                      <TableCell className="font-mono font-medium text-primary">{(p as any).rg_code || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.id_unico}</TableCell>
                      <TableCell>{p.medida}</TableCell>
                      <TableCell>{p.marca}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-success" style={{ width: `${sulcoPercent}%` }} />
                          </div>
                          <span className="text-xs">{p.sulco_atual}mm</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={Number(p.pressao_atual || 0) < Number(p.pressao_ideal || 110) * 0.9 ? "text-destructive" : ""}>
                          {p.pressao_atual || "—"} PSI
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">R$ {cpk}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
