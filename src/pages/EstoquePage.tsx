import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Package, DollarSign, Clock, TrendingUp } from "lucide-react";

export default function EstoquePage() {
  const { data: pneus, isLoading } = useQuery({
    queryKey: ["pneus-estoque"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("*").eq("localizacao", "estoque");
      return data || [];
    },
  });

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Estoque</h1><Skeleton className="h-64 rounded-xl" /></div>;

  const byMedida = pneus?.reduce((acc, p) => {
    const key = p.medida || "Sem medida";
    if (!acc[key]) acc[key] = { total: 0, valor: 0, novos: 0, recapados: 0 };
    acc[key].total++;
    acc[key].valor += Number(p.custo_aquisicao || 0);
    if (p.tipo_pneu === "novo") acc[key].novos++;
    else acc[key].recapados++;
    return acc;
  }, {} as Record<string, { total: number; valor: number; novos: number; recapados: number }>);

  const totalValor = pneus?.reduce((acc, p) => acc + Number(p.custo_aquisicao || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Estoque</h1>

      {!pneus?.length ? (
        <EmptyState icon={Package} title="Estoque vazio" description="Os pneus cadastrados com localização 'Estoque' aparecerão aqui automaticamente." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl p-3 bg-primary"><Package className="h-5 w-5 text-primary-foreground" /></div>
                <div><p className="text-sm text-muted-foreground">Total em Estoque</p><p className="text-2xl font-bold">{pneus.length}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl p-3 bg-success"><DollarSign className="h-5 w-5 text-success-foreground" /></div>
                <div><p className="text-sm text-muted-foreground">Valor em Estoque</p><p className="text-2xl font-bold">R$ {totalValor.toLocaleString("pt-BR")}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl p-3 bg-info"><TrendingUp className="h-5 w-5 text-info-foreground" /></div>
                <div><p className="text-sm text-muted-foreground">Medidas Diferentes</p><p className="text-2xl font-bold">{Object.keys(byMedida || {}).length}</p></div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(byMedida || {}).map(([medida, data]) => (
              <Card key={medida}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-mono">{medida}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Disponível</span><span className="font-bold">{data.total}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Novos</span><span>{data.novos}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Recapados</span><span>{data.recapados}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span>R$ {data.valor.toLocaleString("pt-BR")}</span></div>
                  <Badge variant={data.total > 2 ? "default" : data.total > 0 ? "outline" : "destructive"} className="mt-2">
                    {data.total > 2 ? "OK" : data.total > 0 ? "Atenção" : "Crítico"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
