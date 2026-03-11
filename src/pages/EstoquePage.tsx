import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ArrowDownToLine, ArrowUpFromLine, Bookmark, BarChart3, Camera, ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { EstoqueKPIs } from "@/components/estoque/EstoqueKPIs";
import { EstoqueVisaoMedida } from "@/components/estoque/EstoqueVisaoMedida";
import { EstoqueListaCompleta } from "@/components/estoque/EstoqueListaCompleta";
import { EstoqueEntradaModal } from "@/components/estoque/EstoqueEntradaModal";
import { EstoqueSaidaModal } from "@/components/estoque/EstoqueSaidaModal";
import { EstoqueReservaModal } from "@/components/estoque/EstoqueReservaModal";
import { EstoqueCurvaABC } from "@/components/estoque/EstoqueCurvaABC";
import { EstoqueIAPanel } from "@/components/estoque/EstoqueIAPanel";
import { EstoqueInventarioModal } from "@/components/estoque/EstoqueInventarioModal";
import { QrScanner } from "@/components/QrScanner";

export default function EstoquePage() {
  const navigate = useNavigate();
  const [entradaOpen, setEntradaOpen] = useState(false);
  const [saidaOpen, setSaidaOpen] = useState(false);
  const [reservaOpen, setReservaOpen] = useState(false);
  const [abcOpen, setAbcOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [inventarioOpen, setInventarioOpen] = useState(false);
  const [view, setView] = useState<"medida" | "lista">("medida");
  const [saidaPreset, setSaidaPreset] = useState<{ pneuId?: string; motivo?: string }>({});

  const { data: pneus, isLoading, refetch } = useQuery({
    queryKey: ["pneus-estoque-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pneus")
        .select("*")
        .in("localizacao", ["estoque"])
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: reservas } = useQuery({
    queryKey: ["reservas-ativas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservas_pneu")
        .select("*")
        .eq("ativa", true);
      return data || [];
    },
  });

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-list"],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("id, placa, frota").eq("status", "ativo");
      return data || [];
    },
  });

  const reservedIds = new Set((reservas || []).map((r: any) => r.pneu_id));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)}>
            <Camera className="h-4 w-4 mr-2" />Ler QR
          </Button>
          <Button variant="outline" size="sm" onClick={() => setInventarioOpen(true)}>
            <ClipboardCheck className="h-4 w-4 mr-2" />Inventário
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAbcOpen(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />Curva ABC
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReservaOpen(true)}>
            <Bookmark className="h-4 w-4 mr-2" />Reservar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSaidaOpen(true)}>
            <ArrowUpFromLine className="h-4 w-4 mr-2" />Saída
          </Button>
          <Button size="sm" onClick={() => setEntradaOpen(true)}>
            <ArrowDownToLine className="h-4 w-4 mr-2" />Entrada
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <EstoqueKPIs pneus={pneus || []} reservedIds={reservedIds} />

      {/* AI Panel */}
      {(pneus?.length ?? 0) > 0 && <EstoqueIAPanel pneus={pneus || []} />}

      {!pneus?.length ? (
        <EmptyState
          icon={Package}
          title="Estoque vazio"
          description="Registre a entrada de pneus no estoque para começar o controle."
          actionLabel="Registrar Entrada"
          onAction={() => setEntradaOpen(true)}
        />
      ) : (
        <>
          {/* View Toggle */}
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="medida">Por Medida</TabsTrigger>
              <TabsTrigger value="lista">Lista Completa</TabsTrigger>
            </TabsList>
            <TabsContent value="medida">
              <EstoqueVisaoMedida pneus={pneus} reservedIds={reservedIds} onEntrada={() => setEntradaOpen(true)} onReservar={() => setReservaOpen(true)} />
            </TabsContent>
            <TabsContent value="lista">
              <EstoqueListaCompleta
                pneus={pneus}
                reservedIds={reservedIds}
                onNavigate={(rg) => navigate(`/pneu/${rg}`)}
                onTransferToVehicle={(pneuId) => {
                  setSaidaPreset({ pneuId, motivo: "instalacao" });
                  setSaidaOpen(true);
                }}
                onTransferToRetread={(pneuId) => {
                  setSaidaPreset({ pneuId, motivo: "recapagem" });
                  setSaidaOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Modals */}
      <EstoqueEntradaModal open={entradaOpen} onClose={() => setEntradaOpen(false)} onSuccess={refetch} />
      <EstoqueSaidaModal open={saidaOpen} onClose={() => { setSaidaOpen(false); setSaidaPreset({}); }} onSuccess={refetch} pneus={pneus || []} veiculos={veiculos || []} presetPneuId={saidaPreset.pneuId} presetMotivo={saidaPreset.motivo} />
      <EstoqueReservaModal open={reservaOpen} onClose={() => setReservaOpen(false)} onSuccess={refetch} pneus={pneus || []} reservedIds={reservedIds} veiculos={veiculos || []} />
      <EstoqueCurvaABC open={abcOpen} onClose={() => setAbcOpen(false)} pneus={pneus || []} />
      <EstoqueInventarioModal open={inventarioOpen} onClose={() => setInventarioOpen(false)} pneus={pneus || []} onSuccess={refetch} />

      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(value) => {
          const found = pneus?.find(p => (p as any).rg_code === value || p.qr_code === value || p.id_unico === value);
          if (found) navigate(`/pneu/${(found as any).rg_code || found.id_unico}`);
          else navigate(`/pneu/${value}`);
        }}
      />
    </div>
  );
}
