import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Package, Clock, RotateCcw, ShoppingCart, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  em_estoque: { icon: "🔵", label: "Em Estoque", color: "text-blue-400" },
  instalado: { icon: "🟢", label: "Instalado em Veículo", color: "text-emerald-400" },
  em_inspecao: { icon: "🟡", label: "Em Inspeção", color: "text-yellow-400" },
  aguardando_recapagem: { icon: "🟠", label: "Aguardando Recapagem", color: "text-orange-400" },
  em_recapagem: { icon: "🟣", label: "Em Recapagem", color: "text-purple-400" },
  sucata: { icon: "🔴", label: "Sucata / Descartado", color: "text-destructive" },
  vendido: { icon: "⚪", label: "Vendido", color: "text-muted-foreground" },
  extraviado: { icon: "⚫", label: "Extraviado", color: "text-destructive" },
};

const LOC_LABELS: Record<string, string> = {
  estoque: "Estoque / Almoxarifado",
  veiculo: "Instalado em veículo",
  recapagem: "Na recapadora",
  sucata: "Descartado (sucata)",
  vendido: "Vendido / Saiu do ativo",
};

export function PneuLocationTab({ pneu, veiculo }: { pneu: any; veiculo: any }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[pneu.status] || { icon: "⚪", label: pneu.status, color: "text-muted-foreground" };
  const isInstalado = pneu.status === "instalado" || pneu.localizacao === "veiculo";
  const isEstoque = pneu.status === "em_estoque" || pneu.localizacao === "estoque";
  const isRecapagem = pneu.status === "em_recapagem" || pneu.status === "aguardando_recapagem";
  const isVendido = pneu.status === "vendido";
  const isSucata = pneu.status === "sucata";

  const diasNoStatus = pneu.updated_at
    ? Math.floor((Date.now() - new Date(pneu.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Status + Location Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{cfg.icon}</span>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xl font-bold">{cfg.label}</p>
                <Badge variant="outline" className="text-xs">
                  há {diasNoStatus} dias neste status
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                <div>
                  <p className="text-muted-foreground text-xs">Localização</p>
                  <p className="font-medium">{LOC_LABELS[pneu.localizacao] || pneu.localizacao}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Local físico</p>
                  <p className="font-medium">{pneu.local_atual || "Não definido"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Última atualização</p>
                  <p className="font-medium">
                    {pneu.updated_at ? new Date(pneu.updated_at).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Vida atual</p>
                  <p className="font-medium">{pneu.vida_atual || 1}ª vida</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installed on vehicle */}
      {isInstalado && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-400" />Veículo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Placa</p>
                <p className="font-bold font-mono text-lg">{veiculo?.placa || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Frota</p>
                <p className="font-medium">{veiculo?.frota || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Modelo</p>
                <p className="font-medium">{veiculo?.modelo || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Posição no veículo</p>
                <p className="font-mono font-bold text-lg">{pneu.posicao_atual || "—"}</p>
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
                <p className="text-muted-foreground text-xs">Km rodado nesta instalação</p>
                <p className="font-mono font-bold">
                  {pneu.km_atual && pneu.km_inicial
                    ? (pneu.km_atual - pneu.km_inicial).toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Sulco atual</p>
                <p className={`font-bold ${(pneu.sulco_atual || 0) < 3 ? "text-destructive" : (pneu.sulco_atual || 0) < 5 ? "text-yellow-400" : ""}`}>
                  {pneu.sulco_atual ?? "—"} mm
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Pressão atual</p>
                <p className="font-medium">{pneu.pressao_atual ?? "—"} psi</p>
              </div>
            </div>
            {veiculo?.id && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/frota")}>
                <Eye className="h-4 w-4 mr-2" />Ver veículo na frota
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* In stock */}
      {isEstoque && (
        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-400" />Estoque
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
                  <p className={`font-bold ${diasNoStatus > 90 ? "text-destructive" : diasNoStatus > 60 ? "text-yellow-400" : ""}`}>
                    {diasNoStatus} dias
                  </p>
                </div>
                {diasNoStatus > 90 && (
                  <p className="text-xs text-destructive mt-1">⚠️ Parado há mais de 90 dias</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Sulco atual</p>
                <p className="font-medium">{pneu.sulco_atual ?? "—"} mm</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Condição</p>
                <p className="font-medium capitalize">{pneu.tipo_pneu?.replace(/_/g, " ") || "Novo"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* In retread */}
      {isRecapagem && (
        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-purple-400" />Recapagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Este pneu está em processo de recapagem ({pneu.status === "aguardando_recapagem" ? "aguardando envio" : "na recapadora"}).
              Consulte a aba <strong>Recapagem</strong> para detalhes do ciclo, fornecedor e previsão de retorno.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <p className="text-muted-foreground text-xs">Recapagens realizadas</p>
                <p className="font-bold">{pneu.qtd_recapagens || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Dias neste status</p>
                <p className="font-bold">{diasNoStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sold */}
      {isVendido && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />Vendido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Este pneu foi vendido e saiu do ativo da frota. Consulte a aba <strong>Financeiro</strong> para ver os detalhes da venda.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Scrapped */}
      {isSucata && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />Sucata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Este pneu foi descartado como sucata e não está mais disponível para uso.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
