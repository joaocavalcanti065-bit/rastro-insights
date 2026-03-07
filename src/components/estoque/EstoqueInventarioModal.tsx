import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { QrScanner } from "@/components/QrScanner";
import {
  ClipboardCheck, Camera, CheckCircle2, AlertTriangle, XCircle,
  Package, FileDown, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  pneus: any[];
  onSuccess: () => void;
}

type PneuStatus = "esperado" | "contado" | "nao_encontrado" | "nao_esperado";

interface PneuInventario {
  id: string;
  rg_code: string;
  marca: string;
  medida: string;
  local_atual: string;
  status: PneuStatus;
}

export function EstoqueInventarioModal({ open, onClose, pneus, onSuccess }: Props) {
  const [step, setStep] = useState<"intro" | "scanning" | "results">("intro");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [items, setItems] = useState<PneuInventario[]>([]);
  const [naoEsperados, setNaoEsperados] = useState<{ code: string; time: string }[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const initInventory = () => {
    const mapped: PneuInventario[] = pneus.map((p) => ({
      id: p.id,
      rg_code: p.rg_code || p.qr_code || p.id_unico,
      marca: p.marca,
      medida: p.medida || "—",
      local_atual: p.local_atual || "Sem endereço",
      status: "esperado" as PneuStatus,
    }));
    setItems(mapped);
    setNaoEsperados([]);
    setStartTime(new Date());
    setStep("scanning");
  };

  const contados = items.filter((i) => i.status === "contado").length;
  const total = items.length;
  const progressPct = total > 0 ? Math.round((contados / total) * 100) : 0;

  const handleScan = useCallback(
    (value: string) => {
      const normalizedValue = value.trim();

      const idx = items.findIndex(
        (i) =>
          i.rg_code === normalizedValue ||
          i.id === normalizedValue
      );

      if (idx >= 0) {
        if (items[idx].status === "contado") {
          toast.info(`Pneu ${items[idx].rg_code} já foi contado.`);
        } else {
          setItems((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], status: "contado" };
            return updated;
          });
          toast.success(`✓ Pneu ${items[idx].rg_code} contado!`);
        }
      } else {
        // Not expected in this stock
        const alreadyAdded = naoEsperados.some((n) => n.code === normalizedValue);
        if (!alreadyAdded) {
          setNaoEsperados((prev) => [
            ...prev,
            { code: normalizedValue, time: new Date().toLocaleTimeString("pt-BR") },
          ]);
          toast.warning(`⚠️ Pneu ${normalizedValue} não esperado neste estoque!`);
        } else {
          toast.info(`Pneu ${normalizedValue} já registrado como não esperado.`);
        }
      }

      // Reopen scanner for continuous scanning
      setTimeout(() => setScannerOpen(true), 500);
    },
    [items, naoEsperados]
  );

  const finishInventory = async () => {
    // Mark remaining as not found
    setItems((prev) =>
      prev.map((i) => (i.status === "esperado" ? { ...i, status: "nao_encontrado" } : i))
    );
    setStep("results");

    // Log inventory
    const endTime = new Date();
    const summary = {
      total_esperados: total,
      contados,
      nao_encontrados: total - contados,
      nao_esperados: naoEsperados.length,
      inicio: startTime?.toISOString(),
      fim: endTime.toISOString(),
    };

    await supabase.from("movimentacoes_pneus").insert({
      pneu_id: pneus[0]?.id || "00000000-0000-0000-0000-000000000000",
      tipo_movimentacao: "inventario",
      origem: "estoque",
      destino: "estoque",
      observacoes: `Inventário: ${contados}/${total} contados, ${naoEsperados.length} não esperados`,
    });

    toast.success("Inventário finalizado!");
  };

  const handleClose = () => {
    setStep("intro");
    setItems([]);
    setNaoEsperados([]);
    setStartTime(null);
    onClose();
    if (step === "results") onSuccess();
  };

  const resultItems = items.filter((i) => i.status !== "esperado");
  const naoEncontrados = items.filter((i) => i.status === "nao_encontrado");

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              {step === "intro" && "Iniciar Inventário"}
              {step === "scanning" && "Inventário em Andamento"}
              {step === "results" && "Resultado do Inventário"}
            </DialogTitle>
          </DialogHeader>

          {step === "intro" && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Como funciona:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>O sistema gera a lista de todos os pneus esperados no estoque</li>
                  <li>Você percorre o almoxarifado escaneando o QR de cada pneu</li>
                  <li>Divergências são detectadas em tempo real</li>
                  <li>Ao finalizar, um relatório de divergências é gerado</li>
                </ol>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span>
                  <strong>{pneus.length}</strong> pneus esperados no estoque atual
                </span>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={initInventory} disabled={pneus.length === 0}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Iniciar Contagem
                </Button>
              </div>
            </div>
          )}

          {step === "scanning" && (
            <div className="space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso da contagem</span>
                  <span className="font-mono font-bold">{contados}/{total}</span>
                </div>
                <Progress value={progressPct} className="h-3" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 flex flex-col items-center text-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-1" />
                    <p className="text-lg font-bold">{contados}</p>
                    <p className="text-[10px] text-muted-foreground">Contados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 flex flex-col items-center text-center">
                    <Package className="h-5 w-5 text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{total - contados}</p>
                    <p className="text-[10px] text-muted-foreground">Pendentes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 flex flex-col items-center text-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
                    <p className="text-lg font-bold">{naoEsperados.length}</p>
                    <p className="text-[10px] text-muted-foreground">Não esperados</p>
                  </CardContent>
                </Card>
              </div>

              {/* Scan button */}
              <Button
                className="w-full h-14 text-lg"
                onClick={() => setScannerOpen(true)}
              >
                <Camera className="h-6 w-6 mr-2" />
                Escanear Próximo Pneu
              </Button>

              {/* Recent scans */}
              {(contados > 0 || naoEsperados.length > 0) && (
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {items
                      .filter((i) => i.status === "contado")
                      .slice(-5)
                      .reverse()
                      .map((i) => (
                        <div key={i.id} className="flex items-center justify-between text-sm p-2 rounded bg-emerald-500/10">
                          <span className="font-mono">{i.rg_code}</span>
                          <span className="text-muted-foreground">{i.marca} {i.medida}</span>
                          <Badge variant="outline" className="text-emerald-600 border-emerald-600">✓</Badge>
                        </div>
                      ))}
                    {naoEsperados.slice(-3).reverse().map((n, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-amber-500/10">
                        <span className="font-mono">{n.code}</span>
                        <span className="text-muted-foreground">{n.time}</span>
                        <Badge variant="outline" className="text-amber-600 border-amber-600">⚠️</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setStep("intro"); setItems([]); setNaoEsperados([]); }}>
                  <RotateCcw className="h-4 w-4 mr-2" />Reiniciar
                </Button>
                <Button variant="destructive" onClick={finishInventory}>
                  Finalizar Inventário
                </Button>
              </div>
            </div>
          )}

          {step === "results" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{total}</p>
                    <p className="text-[10px] text-muted-foreground">Esperados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-emerald-500">{contados}</p>
                    <p className="text-[10px] text-muted-foreground">Encontrados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-destructive">{naoEncontrados.length}</p>
                    <p className="text-[10px] text-muted-foreground">Ausentes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-amber-500">{naoEsperados.length}</p>
                    <p className="text-[10px] text-muted-foreground">Não esperados</p>
                  </CardContent>
                </Card>
              </div>

              {/* Accuracy */}
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Acurácia do Inventário</p>
                <p className={`text-3xl font-bold ${progressPct >= 95 ? "text-emerald-500" : progressPct >= 80 ? "text-amber-500" : "text-destructive"}`}>
                  {progressPct}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Duração: {startTime ? Math.round((Date.now() - startTime.getTime()) / 60000) : 0} min
                </p>
              </div>

              {/* Divergences */}
              {naoEncontrados.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Pneus não encontrados ({naoEncontrados.length})
                  </p>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1">
                      {naoEncontrados.map((i) => (
                        <div key={i.id} className="flex items-center justify-between text-sm p-2 rounded bg-destructive/10">
                          <span className="font-mono">{i.rg_code}</span>
                          <span className="text-muted-foreground">{i.marca} {i.medida}</span>
                          <span className="text-[11px] text-muted-foreground">{i.local_atual}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {naoEsperados.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Pneus não esperados ({naoEsperados.length})
                  </p>
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {naoEsperados.map((n, i) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-amber-500/10">
                          <span className="font-mono">{n.code}</span>
                          <span className="text-muted-foreground">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {naoEncontrados.length === 0 && naoEsperados.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">Inventário 100% correto!</p>
                  <p className="text-xs text-muted-foreground">Todos os pneus foram encontrados sem divergências.</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose}>
                  <FileDown className="h-4 w-4 mr-2" />Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(value) => {
          setScannerOpen(false);
          handleScan(value);
        }}
      />
    </>
  );
}
