import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  pneus: any[];
}

function calcABC(items: { key: string; value: number }[]) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  let cumulative = 0;

  return sorted.map(item => {
    cumulative += item.value;
    const pct = total > 0 ? (cumulative / total) * 100 : 0;
    const classe = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
    return { ...item, pct: total > 0 ? (item.value / total) * 100 : 0, cumPct: pct, classe };
  });
}

export function EstoqueCurvaABC({ open, onClose, pneus }: Props) {
  // Group by medida
  const byMedida: Record<string, { qtd: number; valor: number }> = {};
  pneus.forEach(p => {
    const k = p.medida || "Sem medida";
    if (!byMedida[k]) byMedida[k] = { qtd: 0, valor: 0 };
    byMedida[k].qtd++;
    byMedida[k].valor += Number(p.custo_aquisicao || 0);
  });

  const byValor = calcABC(Object.entries(byMedida).map(([key, v]) => ({ key, value: v.valor })));
  const byVolume = calcABC(Object.entries(byMedida).map(([key, v]) => ({ key, value: v.qtd })));

  const classeColor = (c: string) => {
    if (c === "A") return "destructive" as const;
    if (c === "B") return "outline" as const;
    return "secondary" as const;
  };

  const classeDesc = (c: string) => {
    if (c === "A") return "Monitoramento diário";
    if (c === "B") return "Monitoramento semanal";
    return "Monitoramento mensal";
  };

  const exportCSV = (data: any[], type: string) => {
    const headers = "Medida,Valor/Qtd,%,% Acum.,Classe\n";
    const rows = data.map(d => `${d.key},${d.value.toFixed(2)},${d.pct.toFixed(1)},${d.cumPct.toFixed(1)},${d.classe}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curva-abc-${type}.csv`;
    a.click();
  };

  const renderTable = (data: any[], type: string) => (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {["A", "B", "C"].map(c => {
          const items = data.filter(d => d.classe === c);
          const totalVal = items.reduce((s, i) => s + i.value, 0);
          return (
            <Card key={c}>
              <CardContent className="p-4 text-center">
                <Badge variant={classeColor(c)} className="text-lg px-3 py-1 mb-2">Classe {c}</Badge>
                <p className="text-sm font-bold">{items.length} medidas</p>
                <p className="text-xs text-muted-foreground">{classeDesc(c)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCSV(data, type)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medida</TableHead>
            <TableHead className="text-right">{type === "valor" ? "Valor (R$)" : "Quantidade"}</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">% Acum.</TableHead>
            <TableHead>Classe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(d => (
            <TableRow key={d.key}>
              <TableCell className="font-mono">{d.key}</TableCell>
              <TableCell className="text-right font-mono">
                {type === "valor" ? `R$ ${d.value.toLocaleString("pt-BR")}` : d.value}
              </TableCell>
              <TableCell className="text-right">{d.pct.toFixed(1)}%</TableCell>
              <TableCell className="text-right">{d.cumPct.toFixed(1)}%</TableCell>
              <TableCell><Badge variant={classeColor(d.classe)}>{d.classe}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Curva ABC do Estoque</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="valor">
          <TabsList>
            <TabsTrigger value="valor">Por Valor (R$)</TabsTrigger>
            <TabsTrigger value="volume">Por Volume (Qtd)</TabsTrigger>
          </TabsList>
          <TabsContent value="valor">{renderTable(byValor, "valor")}</TabsContent>
          <TabsContent value="volume">{renderTable(byVolume, "volume")}</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
