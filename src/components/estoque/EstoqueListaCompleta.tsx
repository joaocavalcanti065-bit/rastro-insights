import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, FileSpreadsheet, MoreHorizontal, Truck, RefreshCw } from "lucide-react";

interface Props {
  pneus: any[];
  reservedIds: Set<string>;
  onNavigate: (rg: string) => void;
  onTransferToVehicle?: (pneuId: string) => void;
  onTransferToRetread?: (pneuId: string) => void;
}

export function EstoqueListaCompleta({ pneus, reservedIds, onNavigate, onTransferToVehicle, onTransferToRetread }: Props) {
  const [search, setSearch] = useState("");
  const [filterMedida, setFilterMedida] = useState("all");
  const [filterCondicao, setFilterCondicao] = useState("all");

  const medidas = [...new Set(pneus.map(p => p.medida).filter(Boolean))];

  const filtered = pneus.filter(p => {
    const matchSearch = !search || [p.id_unico, (p as any).rg_code, p.marca, p.medida]
      .filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchMedida = filterMedida === "all" || p.medida === filterMedida;
    const matchCondicao = filterCondicao === "all" || p.tipo_pneu === filterCondicao;
    return matchSearch && matchMedida && matchCondicao;
  });

  const now = Date.now();

  const exportToCSV = () => {
    const headers = "RG,ID,Marca,Medida,Condição,Sulco,Dias Parado,Custo\n";
    const rows = filtered.map(p => {
      const dias = p.updated_at ? Math.floor((now - new Date(p.updated_at).getTime()) / 86400000) : 0;
      return `${(p as any).rg_code || ""},${p.id_unico},${p.marca},${p.medida},${p.tipo_pneu},${p.sulco_atual},${dias},${p.custo_aquisicao}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estoque-pneus.csv";
    a.click();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar RG, ID, marca, medida..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterMedida} onValueChange={setFilterMedida}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Medida" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas medidas</SelectItem>
            {medidas.map(m => <SelectItem key={m} value={m!}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCondicao} onValueChange={setFilterCondicao}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Condição" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="recapado">Recapado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RG</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Medida</TableHead>
                <TableHead>Condição</TableHead>
                <TableHead>Sulco</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Dias Parado</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Ações</TableHead>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const dias = p.updated_at ? Math.floor((now - new Date(p.updated_at).getTime()) / 86400000) : 0;
                const isReserved = reservedIds.has(p.id);
                const sulcoPercent = p.sulco_inicial ? (Number(p.sulco_atual || 0) / Number(p.sulco_inicial)) * 100 : 0;

                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onNavigate((p as any).rg_code || p.id_unico)}
                  >
                    <TableCell className="font-mono font-medium text-primary">{(p as any).rg_code || "—"}</TableCell>
                    <TableCell>{p.marca}</TableCell>
                    <TableCell className="font-mono text-sm">{p.medida}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.tipo_pneu === "novo" ? "Novo" : "Recapado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${sulcoPercent > 50 ? "bg-emerald-500" : sulcoPercent > 20 ? "bg-amber-500" : "bg-destructive"}`}
                            style={{ width: `${sulcoPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{p.sulco_atual}mm</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{p.local_atual || "—"}</TableCell>
                    <TableCell>
                      <span className={`font-mono text-sm ${dias > 90 ? "text-destructive font-bold" : dias > 60 ? "text-amber-400" : ""}`}>
                        {dias}d
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">R$ {Number(p.custo_aquisicao || 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      {isReserved ? (
                        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">Reservado</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Disponível</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
