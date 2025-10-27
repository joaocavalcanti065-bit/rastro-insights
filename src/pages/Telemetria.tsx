import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { telemetryData } from "@/data/mockData";
import { Upload, Filter } from "lucide-react";
import { toast } from "sonner";

export default function Telemetria() {
  const [filter, setFilter] = useState<string>('all');

  const filteredData = filter === 'all' 
    ? telemetryData 
    : telemetryData.filter(t => t.status === filter);

  const getStatusBadge = (status: string) => {
    const variants = {
      normal: { label: 'Normal', variant: 'default' as const },
      warning: { label: 'Atenção', variant: 'secondary' as const },
      critical: { label: 'Crítico', variant: 'destructive' as const },
    };
    const config = variants[status as keyof typeof variants];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleUpload = () => {
    toast.success('Funcionalidade de upload será integrada com fonte de dados real');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Telemetria e Dados Brutos</h1>
          <p className="text-muted-foreground">Visualização e gestão dos dados de campo</p>
        </div>
        <Button onClick={handleUpload}>
          <Upload className="mr-2 h-4 w-4" />
          Importar Dados
        </Button>
      </div>

      {/* Upload Form Card */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Entrada de Dados</CardTitle>
          <CardDescription>Simule a entrada de novos dados de telemetria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>ID do Pneu</Label>
              <Input placeholder="PNE011" />
            </div>
            <div className="space-y-2">
              <Label>Frota</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Frota A</SelectItem>
                  <SelectItem value="b">Frota B</SelectItem>
                  <SelectItem value="c">Frota C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quilometragem</Label>
              <Input type="number" placeholder="45000" />
            </div>
            <div className="space-y-2">
              <Label>Pressão (PSI)</Label>
              <Input type="number" placeholder="95" />
            </div>
            <div className="space-y-2">
              <Label>Profundidade Banda (mm)</Label>
              <Input type="number" placeholder="5.5" />
            </div>
            <div className="space-y-2">
              <Label>Data da Coleta</Label>
              <Input type="date" />
            </div>
          </div>
          <Button className="mt-4">Adicionar Registro</Button>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dados de Telemetria</CardTitle>
              <CardDescription>Visualização completa dos pneus monitorados</CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="warning">Atenção</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pneu</TableHead>
                <TableHead>Frota</TableHead>
                <TableHead>Quilometragem</TableHead>
                <TableHead>Pressão (PSI)</TableHead>
                <TableHead>Banda (mm)</TableHead>
                <TableHead>Data Coleta</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((tire) => (
                <TableRow key={tire.id}>
                  <TableCell className="font-medium">{tire.id}</TableCell>
                  <TableCell>{tire.frota}</TableCell>
                  <TableCell>{tire.quilometragem.toLocaleString()} km</TableCell>
                  <TableCell>{tire.pressao}</TableCell>
                  <TableCell>{tire.profundidadeBanda}</TableCell>
                  <TableCell>{new Date(tire.dataColeta).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(tire.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      <Card className="shadow-card border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Alertas Técnicos</CardTitle>
          <CardDescription>Pneus que atingiram limites críticos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {telemetryData.filter(t => t.status === 'critical').map(tire => (
              <div key={tire.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <div>
                  <p className="font-medium">{tire.id} - {tire.frota}</p>
                  <p className="text-sm text-muted-foreground">
                    {tire.pressao < 90 && 'Pressão abaixo de 90 PSI. '}
                    {tire.profundidadeBanda < 4 && 'Banda com menos de 4mm. '}
                    Necessita reforma ou troca imediata.
                  </p>
                </div>
                <Button variant="destructive" size="sm">Ação Necessária</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
