import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer, AlertTriangle } from "lucide-react";
import { generateLabelPdf } from "@/lib/qr-label";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  em_estoque: { label: "Em Estoque", variant: "secondary" },
  instalado: { label: "Instalado", variant: "default" },
  em_inspecao: { label: "Em Inspeção", variant: "outline" },
  aguardando_recapagem: { label: "Aguard. Recap.", variant: "outline" },
  em_recapagem: { label: "Em Recapagem", variant: "outline" },
  sucata: { label: "Sucata", variant: "destructive" },
  vendido: { label: "Vendido", variant: "outline" },
  extraviado: { label: "Extraviado", variant: "destructive" },
};

const CONDICAO_MAP: Record<string, string> = {
  novo: "Novo",
  "recapado_1": "Recapado — 1ª vida",
  "recapado_2": "Recapado — 2ª vida",
  "recapado_3": "Recapado — 3ª vida ou mais",
  em_analise: "Em análise",
  sucata: "Sucata",
};

export function PneuIdentityTab({ pneu }: { pneu: any }) {
  const status = STATUS_MAP[pneu.status] || { label: pneu.status, variant: "outline" as const };
  const condicaoLabel = CONDICAO_MAP[pneu.tipo_pneu] || pneu.tipo_pneu || "Novo";

  // Parse DOT info
  let dotInfo = "";
  if (pneu.dot && pneu.dot.length >= 4) {
    const clean = pneu.dot.replace(/[^0-9]/g, "");
    if (clean.length >= 4) {
      const week = clean.slice(-4, -2);
      const year = "20" + clean.slice(-2);
      dotInfo = `Fabricado na ${week}ª semana de ${year}`;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
      {/* QR Code Card */}
      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle className="text-lg">QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={`${window.location.origin}/pneu/${pneu.rg_code || pneu.id_unico}`}
              size={200}
            />
          </div>
          <p className="text-lg font-mono font-bold">{pneu.rg_code || pneu.id_unico}</p>
          <Badge variant={status.variant} className="text-sm">{status.label}</Badge>
          <Button variant="outline" size="sm" onClick={() => generateLabelPdf(pneu)}>
            <Printer className="h-4 w-4 mr-2" />Imprimir Etiqueta
          </Button>
        </CardContent>
      </Card>

      {/* Identity Info */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Identificação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Código RG" value={pneu.rg_code} mono />
            <Field label="ID Único" value={pneu.id_unico} mono />
            <Field label="Nº Fogo" value={pneu.numero_fogo || "—"} />
            <Field label="Marca" value={pneu.marca} />
            <Field label="Modelo" value={pneu.modelo_pneu || "—"} />
            <Field label="Medida" value={pneu.medida} />
            <div className="col-span-2">
              <Field label="DOT" value={pneu.dot || "—"} />
              {dotInfo && <p className="text-xs text-muted-foreground mt-1">{dotInfo}</p>}
              {pneu.dot_alerta_vencimento && (
                <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Pneu com mais de 5 anos de fabricação</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Dados Técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Field label="Largura" value={pneu.largura_nominal ? `${pneu.largura_nominal}mm` : "—"} />
            <Field label="Perfil" value={pneu.perfil_nominal ? `${pneu.perfil_nominal}%` : "—"} />
            <Field label="Aro" value={pneu.aro_nominal ? `${pneu.aro_nominal}"` : "—"} />
            <Field label="Índice Carga" value={pneu.indice_carga || "—"} />
            <Field label="Índice Velocidade" value={pneu.indice_velocidade || "—"} />
            <Field label="Construção" value={pneu.tipo_construcao || "Radial"} />
            <Field label="Aplicação" value={formatApp(pneu.tipo_aplicacao)} />
            <Field label="Tipo Eixo" value={formatEixo(pneu.tipo_eixo)} />
            <Field label="Condição" value={condicaoLabel} />
            <Field label="Recapagens" value={String(pneu.qtd_recapagens || pneu.numero_recapagens || 0)} />
            <Field label="Data Aquisição" value={pneu.data_aquisicao ? new Date(pneu.data_aquisicao).toLocaleDateString("pt-BR") : "—"} />
            <Field label="Custo Aquisição" value={`R$ ${Number(pneu.custo_aquisicao || 0).toLocaleString("pt-BR")}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function formatApp(v?: string | null) {
  const map: Record<string, string> = { rodoviario: "Rodoviário", urbano: "Urbano", misto: "Misto", fora_estrada: "Fora de Estrada" };
  return map[v || ""] || v || "—";
}

function formatEixo(v?: string | null) {
  const map: Record<string, string> = { direcional: "Direcional", tracao: "Tração", livre: "Livre" };
  return map[v || ""] || v || "—";
}
