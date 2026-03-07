import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Package, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  em_estoque: "🔵",
  instalado: "🟢",
  em_inspecao: "🟡",
  aguardando_recapagem: "🟠",
  em_recapagem: "🟣",
  sucata: "🔴",
  vendido: "⚪",
  extraviado: "⚫",
};

export function PneuLocationTab({ pneu, veiculo }: { pneu: any; veiculo: any }) {
  const statusIcon = STATUS_COLORS[pneu.status] || "⚪";
  const isInstalado = pneu.status === "instalado" || pneu.localizacao === "veiculo";
  const isEstoque = pneu.status === "em_estoque" || pneu.localizacao === "estoque";
  const isRecapagem = pneu.status === "em_recapagem" || pneu.status === "aguardando_recapagem";

  const diasEstoque = isEstoque && pneu.updated_at
    ? Math.floor((Date.now() - new Date(pneu.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Status Badge */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <span className="text-3xl">{statusIcon}</span>
          <div>
            <p className="text-xl font-bold capitalize">{pneu.status?.replace(/_/g, " ")}</p>
            <p className="text-sm text-muted-foreground">Status atual do pneu</p>
          </div>
        </CardContent>
      </Card>

      {/* Installed on vehicle */}
      {isInstalado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />Veículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Placa</p>
                <p className="font-bold font-mono">{veiculo?.placa || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Frota</p>
                <p className="font-medium">{veiculo?.frota || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Posição</p>
                <p className="font-medium">{pneu.posicao_atual || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Km na instalação</p>
                <p className="font-mono">{pneu.km_inicial?.toLocaleString("pt-BR") || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Km atual</p>
                <p className="font-mono">{pneu.km_atual?.toLocaleString("pt-BR") || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Km rodado</p>
                <p className="font-mono font-bold">
                  {pneu.km_atual && pneu.km_inicial
                    ? (pneu.km_atual - pneu.km_inicial).toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* In stock */}
      {isEstoque && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Local físico</p>
                <p className="font-medium">{pneu.local_atual || "Não definido"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Data de entrada</p>
                <p className="font-medium">
                  {pneu.updated_at ? new Date(pneu.updated_at).toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Dias parado</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className={`font-bold ${diasEstoque > 90 ? "text-destructive" : diasEstoque > 60 ? "text-yellow-400" : ""}`}>
                    {diasEstoque} dias
                  </p>
                </div>
                {diasEstoque > 90 && (
                  <p className="text-xs text-destructive mt-1">⚠️ Parado há mais de 90 dias</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* In retread */}
      {isRecapagem && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recapagem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Este pneu está em processo de recapagem. Consulte a aba Recapagem para mais detalhes.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
