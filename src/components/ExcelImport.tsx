import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

const TEMPLATE_COLUMNS = [
  "id_unico", "marca", "modelo_pneu", "medida", "dot",
  "indice_carga", "tipo_aplicacao", "tipo_eixo",
  "sulco_inicial", "pressao_ideal", "custo_aquisicao", "localizacao",
];

const MARCAS_VALIDAS = ["Michelin", "Pirelli", "Goodyear", "Continental", "Bridgestone", "Dunlop", "Xbri", "Firestone", "Vipal", "Bandag"];
const APLICACOES_VALIDAS = ["rodoviario", "urbano", "misto", "fora_estrada"];
const EIXOS_VALIDOS = ["direcional", "tracao", "livre"];
const LOCALIZACOES_VALIDAS = ["estoque", "veiculo"];

interface RowResult {
  row: number;
  id_unico: string;
  status: "ok" | "erro";
  errors: string[];
}

interface ExcelImportProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingIds: string[];
}

function validateRow(row: Record<string, any>, idx: number, existingIds: string[]): { valid: Record<string, any> | null; result: RowResult } {
  const errors: string[] = [];
  const id_unico = String(row.id_unico ?? "").trim();

  if (!id_unico) errors.push("ID único obrigatório");
  if (existingIds.includes(id_unico)) errors.push("ID já cadastrado no sistema");

  const marca = String(row.marca ?? "Michelin").trim();
  if (marca && !MARCAS_VALIDAS.includes(marca)) errors.push(`Marca inválida: ${marca}`);

  const tipo_aplicacao = String(row.tipo_aplicacao ?? "rodoviario").trim();
  if (tipo_aplicacao && !APLICACOES_VALIDAS.includes(tipo_aplicacao)) errors.push(`Tipo aplicação inválido: ${tipo_aplicacao}`);

  const tipo_eixo = String(row.tipo_eixo ?? "tracao").trim();
  if (tipo_eixo && !EIXOS_VALIDOS.includes(tipo_eixo)) errors.push(`Tipo eixo inválido: ${tipo_eixo}`);

  const localizacao = String(row.localizacao ?? "estoque").trim();
  if (localizacao && !LOCALIZACOES_VALIDAS.includes(localizacao)) errors.push(`Localização inválida: ${localizacao}`);

  const sulco_inicial = Number(row.sulco_inicial ?? 16);
  if (isNaN(sulco_inicial) || sulco_inicial <= 0 || sulco_inicial > 30) errors.push("Sulco inicial deve ser entre 1 e 30mm");

  const pressao_ideal = Number(row.pressao_ideal ?? 110);
  if (isNaN(pressao_ideal) || pressao_ideal <= 0) errors.push("Pressão ideal deve ser positiva");

  const custo_aquisicao = Number(row.custo_aquisicao ?? 0);
  if (isNaN(custo_aquisicao) || custo_aquisicao < 0) errors.push("Custo de aquisição inválido");

  const result: RowResult = { row: idx + 2, id_unico: id_unico || `Linha ${idx + 2}`, status: errors.length ? "erro" : "ok", errors };

  if (errors.length) return { valid: null, result };

  return {
    valid: {
      id_unico,
      marca: marca || "Michelin",
      modelo_pneu: String(row.modelo_pneu ?? "").trim() || null,
      medida: String(row.medida ?? "295/80 R22.5").trim(),
      dot: String(row.dot ?? "").trim() || null,
      indice_carga: String(row.indice_carga ?? "").trim() || null,
      tipo_aplicacao: tipo_aplicacao || "rodoviario",
      tipo_eixo: tipo_eixo || "tracao",
      tipo_pneu: "novo",
      sulco_inicial,
      sulco_atual: sulco_inicial,
      pressao_ideal,
      custo_aquisicao,
      custo_acumulado: custo_aquisicao,
      localizacao: localizacao || "estoque",
      status: localizacao === "estoque" ? "em_estoque" : "instalado",
      qr_code: `RASTRO-${id_unico}-${Date.now()}`,
      cliente_id: "00000000-0000-0000-0000-000000000000",
    },
    result,
  };
}

export function ExcelImport({ open, onClose, onSuccess, existingIds }: ExcelImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<RowResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<{ valid: Record<string, any>[]; results: RowResult[] } | null>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      ["001P", "Michelin", "XZA3", "295/80 R22.5", "2024", "152/148", "rodoviario", "tracao", 16, 110, 3200, "estoque"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pneus");
    XLSX.writeFile(wb, "modelo_importacao_pneus.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      if (!rows.length) {
        toast.error("Planilha vazia");
        return;
      }

      const allResults: RowResult[] = [];
      const validRows: Record<string, any>[] = [];
      const seenIds = new Set(existingIds);

      rows.forEach((row, i) => {
        const { valid, result } = validateRow(row, i, [...seenIds]);
        allResults.push(result);
        if (valid) {
          validRows.push(valid);
          seenIds.add(valid.id_unico);
        }
      });

      setParsed({ valid: validRows, results: allResults });
      setResults(allResults);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!parsed?.valid.length) return;
    setImporting(true);
    try {
      const { error } = await supabase.from("pneus").insert(parsed.valid);
      if (error) throw error;
      toast.success(`${parsed.valid.length} pneus importados com sucesso!`);
      onSuccess();
      handleReset();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar");
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setParsed(null);
    setResults([]);
  };

  const okCount = results.filter(r => r.status === "ok").length;
  const errCount = results.filter(r => r.status === "erro").length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Pneus via Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Download template + upload */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Baixar modelo
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Selecionar planilha
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>

          <p className="text-xs text-muted-foreground">
            Colunas obrigatórias: <span className="font-mono">id_unico</span>. Demais campos usam valores padrão se vazios.
          </p>

          {/* Results log */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />{okCount} válidos</Badge>
                {errCount > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{errCount} erros</Badge>}
              </div>

              <ScrollArea className="h-56 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Linha</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.row}</TableCell>
                        <TableCell className="font-mono text-xs">{r.id_unico}</TableCell>
                        <TableCell>
                          {r.status === "ok" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.errors.length ? r.errors.join("; ") : "OK"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>Limpar</Button>
                <Button size="sm" onClick={handleImport} disabled={importing || okCount === 0}>
                  {importing ? "Importando..." : `Importar ${okCount} pneus`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
