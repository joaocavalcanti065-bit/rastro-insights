import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export function AlertaRealtimeListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("alertas-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alertas",
          filter: "ativo=eq.true",
        },
        (payload) => {
          const alerta = payload.new as any;

          // Only show toast for critical sulco alerts
          if (alerta.tipo_alerta === "sulco_critico_auto") {
            const isCritica = alerta.gravidade === "critica";

            toast.error(alerta.mensagem, {
              duration: 8000,
              icon: isCritica
                ? <ShieldAlert className="h-5 w-5 text-destructive" />
                : <AlertTriangle className="h-5 w-5 text-amber-400" />,
              description: alerta.acao_sugerida,
              action: {
                label: "Ver alertas",
                onClick: () => {
                  window.location.href = "/alertas";
                },
              },
            });
          }

          queryClient.invalidateQueries({ queryKey: ["alertas"] });
          queryClient.invalidateQueries({ queryKey: ["alertas-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}
