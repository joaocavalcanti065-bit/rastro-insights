import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Bell, AlertTriangle, AlertCircle, Info, Check } from "lucide-react";

const GRAVIDADE_CONFIG: Record<string, { icon: any; color: string; badge: "destructive" | "outline" | "default" }> = {
  critico: { icon: AlertTriangle, color: "text-destructive", badge: "destructive" },
  atencao: { icon: AlertCircle, color: "text-warning", badge: "outline" },
  informativo: { icon: Info, color: "text-info", badge: "default" },
};

export default function AlertasPage() {
  const queryClient = useQueryClient();

  const { data: alertas, isLoading } = useQuery({
    queryKey: ["alertas"],
    queryFn: async () => {
      const { data } = await supabase.from("alertas").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const tratarMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("alertas").update({ ativo: false, tratado_em: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertas"] });
      toast.success("Alerta tratado!");
    },
  });

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Alertas</h1><Skeleton className="h-64 rounded-xl" /></div>;

  const ativos = alertas?.filter(a => a.ativo) || [];
  const tratados = alertas?.filter(a => !a.ativo) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alertas</h1>

      {!alertas?.length ? (
        <EmptyState icon={Bell} title="Nenhum alerta" description="Os alertas são gerados automaticamente conforme você registra dados de pneus, pressão e sulco." />
      ) : (
        <>
          {ativos.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Ativos ({ativos.length})</h2>
              {ativos.map(a => {
                const config = GRAVIDADE_CONFIG[a.gravidade] || GRAVIDADE_CONFIG.informativo;
                const Icon = config.icon;
                return (
                  <Card key={a.id} className="border-l-4" style={{ borderLeftColor: a.gravidade === "critico" ? "hsl(0,84%,60%)" : a.gravidade === "atencao" ? "hsl(38,92%,50%)" : "hsl(217,91%,60%)" }}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={config.badge}>{a.gravidade}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <p className="text-sm font-medium">{a.tipo_alerta}</p>
                        <p className="text-sm text-muted-foreground">{a.mensagem}</p>
                        {a.acao_sugerida && <p className="text-xs text-info mt-1">Ação sugerida: {a.acao_sugerida}</p>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => tratarMutation.mutate(a.id)}>
                        <Check className="h-3 w-3 mr-1" />Tratar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {tratados.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">Tratados ({tratados.length})</h2>
              {tratados.slice(0, 10).map(a => (
                <Card key={a.id} className="opacity-60">
                  <CardContent className="flex items-center gap-4 p-4">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">{a.tipo_alerta} — {a.mensagem}</p>
                      <p className="text-xs text-muted-foreground">Tratado em {a.tratado_em ? new Date(a.tratado_em).toLocaleDateString("pt-BR") : "—"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
