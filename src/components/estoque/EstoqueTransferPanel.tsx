import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowRightLeft, Circle, GripVertical, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocalEstoque {
  id: string;
  almoxarifado: string;
  setor: string | null;
  corredor: string | null;
  prateleira: string | null;
  capacidade: number | null;
  medida_preferencial: string | null;
}

interface Pneu {
  id: string;
  id_unico: string;
  local_atual: string | null;
  medida: string | null;
  marca: string;
  sulco_atual: number | null;
  status: string;
}

interface Props {
  locais: LocalEstoque[];
  pneus: Pneu[];
}

const formatEndereco = (l: LocalEstoque) =>
  [l.almoxarifado, l.setor, l.corredor, l.prateleira].filter(Boolean).join(" → ");

export function EstoqueTransferPanel({ locais, pneus }: Props) {
  const queryClient = useQueryClient();
  const [draggedPneu, setDraggedPneu] = useState<Pneu | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [lastTransfer, setLastTransfer] = useState<{ pneu: string; from: string; to: string } | null>(null);

  const transferMutation = useMutation({
    mutationFn: async ({ pneuId, novoLocal, localAnterior }: { pneuId: string; novoLocal: string; localAnterior: string }) => {
      const { error: updateError } = await supabase
        .from("pneus")
        .update({ local_atual: novoLocal })
        .eq("id", pneuId);
      if (updateError) throw updateError;

      const { error: movError } = await supabase.from("movimentacoes_pneus").insert({
        pneu_id: pneuId,
        tipo_movimentacao: "transferencia_local",
        origem: localAnterior,
        destino: novoLocal,
        observacoes: `Transferência de local: ${localAnterior} → ${novoLocal}`,
      });
      if (movError) throw movError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pneus-estoque-all"] });
      queryClient.invalidateQueries({ queryKey: ["pneus-estoque-locais"] });
      toast.success("Pneu transferido com sucesso!");
    },
    onError: (e: any) => toast.error(e.message || "Erro na transferência"),
  });

  const handleDragStart = (e: React.DragEvent, pneu: Pneu) => {
    setDraggedPneu(pneu);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", pneu.id);
  };

  const handleDragOver = (e: React.DragEvent, endereco: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(endereco);
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = (e: React.DragEvent, endereco: string) => {
    e.preventDefault();
    setDropTarget(null);
    if (!draggedPneu) return;
    if (draggedPneu.local_atual === endereco) {
      setDraggedPneu(null);
      return;
    }

    setLastTransfer({
      pneu: draggedPneu.id_unico,
      from: draggedPneu.local_atual || "Sem endereço",
      to: endereco,
    });

    transferMutation.mutate({
      pneuId: draggedPneu.id,
      novoLocal: endereco,
      localAnterior: draggedPneu.local_atual || "Sem endereço",
    });
    setDraggedPneu(null);
  };

  // Group tires by location
  const enderecos = locais.map(l => formatEndereco(l));
  const semEndereco = "Sem endereço definido";

  const pneusPorLocal = (endereco: string) =>
    pneus.filter(p => p.local_atual === endereco);

  const pneusSemLocal = pneus.filter(
    p => !p.local_atual || !enderecos.includes(p.local_atual)
  );

  const getLocalCapacidade = (endereco: string) => {
    const local = locais.find(l => formatEndereco(l) === endereco);
    return local?.capacidade || 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRightLeft className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Transferência entre Locais</h2>
        <span className="text-xs text-muted-foreground ml-auto">Arraste pneus entre locais para transferir</span>
      </div>

      {lastTransfer && (
        <div className="bg-chart-2/10 border border-chart-2/20 rounded-lg p-3 flex items-center gap-2 text-sm">
          <ArrowRightLeft className="h-4 w-4 text-chart-2" />
          <span>
            Última transferência: <strong>{lastTransfer.pneu}</strong> de{" "}
            <span className="font-mono">{lastTransfer.from}</span> → <span className="font-mono">{lastTransfer.to}</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Unaddressed tires */}
        {pneusSemLocal.length > 0 && (
          <LocationCard
            endereco={semEndereco}
            capacidade={0}
            pneus={pneusSemLocal}
            isDropTarget={dropTarget === semEndereco}
            isDragging={!!draggedPneu}
            onDragStart={handleDragStart}
            onDragOver={(e) => handleDragOver(e, semEndereco)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, semEndereco)}
            isUnsorted
          />
        )}

        {/* Each registered location */}
        {locais.map(local => {
          const endereco = formatEndereco(local);
          const pneusNoLocal = pneusPorLocal(endereco);
          return (
            <LocationCard
              key={local.id}
              endereco={endereco}
              capacidade={local.capacidade || 0}
              medidaPref={local.medida_preferencial}
              pneus={pneusNoLocal}
              isDropTarget={dropTarget === endereco}
              isDragging={!!draggedPneu}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, endereco)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, endereco)}
            />
          );
        })}
      </div>
    </div>
  );
}

function LocationCard({
  endereco,
  capacidade,
  medidaPref,
  pneus,
  isDropTarget,
  isDragging,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isUnsorted,
}: {
  endereco: string;
  capacidade: number;
  medidaPref?: string | null;
  pneus: Pneu[];
  isDropTarget: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, p: Pneu) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  isUnsorted?: boolean;
}) {
  const pct = capacidade > 0 ? Math.round((pneus.length / capacidade) * 100) : 0;

  return (
    <Card
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "transition-all duration-200 min-h-[180px]",
        isDropTarget && "ring-2 ring-primary bg-primary/5 scale-[1.02]",
        isDragging && !isDropTarget && "opacity-80",
        isUnsorted && "border-dashed border-muted-foreground/30"
      )}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-1.5">
            {isUnsorted ? (
              <Package className="h-4 w-4 text-muted-foreground" />
            ) : (
              <MapPin className="h-4 w-4 text-primary" />
            )}
            <span className="truncate max-w-[180px]">{endereco}</span>
          </CardTitle>
          {!isUnsorted && (
            <Badge variant={pct > 90 ? "destructive" : pct > 70 ? "secondary" : "outline"} className="text-[10px]">
              {pneus.length}/{capacidade}
            </Badge>
          )}
        </div>
        {medidaPref && medidaPref !== "nenhuma" && (
          <p className="text-[10px] text-muted-foreground">Pref: {medidaPref}</p>
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <ScrollArea className={cn("pr-2", pneus.length > 4 ? "h-[160px]" : "")}>
          <div className="space-y-1.5">
            {pneus.length === 0 && (
              <div className={cn(
                "rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground",
                isDropTarget && "border-primary text-primary"
              )}>
                {isDropTarget ? "Soltar aqui" : "Vazio — arraste pneus para cá"}
              </div>
            )}
            {pneus.map(p => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => onDragStart(e, p)}
                className="group flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                <Circle className="h-2.5 w-2.5 text-chart-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.id_unico}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.marca} · {p.medida}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{p.sulco_atual}mm</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
