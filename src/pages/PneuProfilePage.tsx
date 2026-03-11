import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer } from "lucide-react";
import { PneuIdentityTab } from "@/components/pneu-profile/PneuIdentityTab";
import { PneuMeasuresTab } from "@/components/pneu-profile/PneuMeasuresTab";
import { PneuLocationTab } from "@/components/pneu-profile/PneuLocationTab";
import { PneuHistoryTab } from "@/components/pneu-profile/PneuHistoryTab";
import { PneuFinancialTab } from "@/components/pneu-profile/PneuFinancialTab";
import { PneuRetreadTab } from "@/components/pneu-profile/PneuRetreadTab";
import { generateLabelPdf } from "@/lib/qr-label";

export default function PneuProfilePage() {
  const { rg } = useParams<{ rg: string }>();
  const navigate = useNavigate();

  const { data: pneu, isLoading } = useQuery({
    queryKey: ["pneu-profile", rg],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pneus")
        .select("*")
        .or(`rg_code.eq.${rg},id_unico.eq.${rg}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!rg,
  });

  const { data: veiculo } = useQuery({
    queryKey: ["pneu-veiculo", pneu?.veiculo_id],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("*").eq("id", pneu!.veiculo_id!).single();
      return data;
    },
    enabled: !!pneu?.veiculo_id,
  });

  const { data: movimentacoes } = useQuery({
    queryKey: ["pneu-movimentacoes", pneu?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("movimentacoes_pneus")
        .select("*, veiculo_destino:veiculo_destino_id(id, placa, frota, modelo), veiculo_origem:veiculo_origem_id(id, placa, frota, modelo)")
        .eq("pneu_id", pneu!.id)
        .order("data_movimentacao", { ascending: false });
      return data || [];
    },
    enabled: !!pneu?.id,
  });

  const { data: manutencoes } = useQuery({
    queryKey: ["pneu-manutencoes", pneu?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("manutencoes")
        .select("*")
        .eq("pneu_id", pneu!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!pneu?.id,
  });

  const { data: recapagens } = useQuery({
    queryKey: ["pneu-recapagens", pneu?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("recapagens")
        .select("*, fornecedores:fornecedor_id(nome)")
        .eq("pneu_id", pneu!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!pneu?.id,
  });

  const { data: alertas } = useQuery({
    queryKey: ["pneu-alertas", pneu?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("alertas")
        .select("*")
        .eq("pneu_id", pneu!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!pneu?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!pneu) {
    return (
      <div className="space-y-4 text-center py-20">
        <h1 className="text-2xl font-bold">Pneu não encontrado</h1>
        <p className="text-muted-foreground">O código {rg} não corresponde a nenhum pneu cadastrado.</p>
        <Button onClick={() => navigate("/pneus")}>Voltar para Pneus</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono">{pneu.rg_code || pneu.id_unico}</h1>
            <p className="text-sm text-muted-foreground">
              {pneu.marca} {pneu.modelo_pneu} — {pneu.medida}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => generateLabelPdf(pneu)}>
          <Printer className="h-4 w-4 mr-2" />Imprimir Etiqueta
        </Button>
      </div>

      <Tabs defaultValue="identidade" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="medidas">Medidas</TabsTrigger>
          <TabsTrigger value="localizacao">Localização</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="recapagem">Recapagem</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade">
          <PneuIdentityTab pneu={pneu} />
        </TabsContent>
        <TabsContent value="medidas">
          <PneuMeasuresTab pneu={pneu} />
        </TabsContent>
        <TabsContent value="localizacao">
          <PneuLocationTab pneu={pneu} veiculo={veiculo} />
        </TabsContent>
        <TabsContent value="historico">
          <PneuHistoryTab
            pneu={pneu}
            movimentacoes={movimentacoes || []}
            manutencoes={manutencoes || []}
            recapagens={recapagens || []}
            alertas={alertas || []}
          />
        </TabsContent>
        <TabsContent value="financeiro">
          <PneuFinancialTab pneu={pneu} manutencoes={manutencoes || []} recapagens={recapagens || []} />
        </TabsContent>
        <TabsContent value="recapagem">
          <PneuRetreadTab pneu={pneu} recapagens={recapagens || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
