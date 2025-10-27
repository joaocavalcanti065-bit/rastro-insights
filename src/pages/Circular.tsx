import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { parceiros, cicloVidaPneus, telemetryData } from "@/data/mockData";
import { Recycle, Award, TrendingUp, Package } from "lucide-react";

export default function Circular() {
  const getStatusBadge = (status: string) => {
    const variants = {
      reforma_recomendada: { label: 'Reforma Recomendada', variant: 'default' as const },
      troca_necessaria: { label: 'Troca Necessária', variant: 'destructive' as const },
      vendido: { label: 'Vendido', variant: 'secondary' as const },
      em_uso: { label: 'Em Uso', variant: 'outline' as const },
    };
    const config = variants[status as keyof typeof variants];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTipoIcon = (tipo: string) => {
    return tipo === 'reformadora' ? '🔧' : '📦';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Economia Circular e Parcerias</h1>
        <p className="text-muted-foreground">Gestão do ciclo de vida e rede de parceiros certificados</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parceiros Ativos</p>
                <p className="text-2xl font-bold">{parceiros.length}</p>
              </div>
              <Award className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pneus em Reforma</p>
                <p className="text-2xl font-bold">
                  {cicloVidaPneus.filter(c => c.statusFinal === 'reforma_recomendada').length}
                </p>
              </div>
              <Recycle className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volume Total</p>
                <p className="text-2xl font-bold">
                  R$ {parceiros.reduce((acc, p) => acc + p.volumeVendas, 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comissão Total</p>
                <p className="text-2xl font-bold">
                  R$ {parceiros.reduce((acc, p) => acc + p.comissaoDevida, 0).toLocaleString()}
                </p>
              </div>
              <Package className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partners Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Gestão de Parceiros
          </CardTitle>
          <CardDescription>Reformadoras e fornecedores homologados com Selo Rastro</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parceiro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Selo de Qualidade</TableHead>
                <TableHead>Volume de Vendas</TableHead>
                <TableHead>Comissão Devida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parceiros.map((parceiro) => (
                <TableRow key={parceiro.id}>
                  <TableCell className="font-medium">
                    {getTipoIcon(parceiro.tipo)} {parceiro.nome}
                  </TableCell>
                  <TableCell className="capitalize">{parceiro.tipo}</TableCell>
                  <TableCell>
                    {parceiro.seloQualidade ? (
                      <Badge variant="default" className="bg-success">
                        ✓ Certificado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell>R$ {parceiro.volumeVendas.toLocaleString()}</TableCell>
                  <TableCell className="font-medium text-success">
                    R$ {parceiro.comissaoDevida.toLocaleString()}
                  </TableCell>
                </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
      </Card>

      {/* Tire Lifecycle */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Recycle className="h-5 w-5" />
            Ciclo de Vida dos Pneus
          </CardTitle>
          <CardDescription>Rastreamento completo desde instalação até status final</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pneu</TableHead>
                <TableHead>Data Instalação</TableHead>
                <TableHead>Histórico de Reformas</TableHead>
                <TableHead>Quilometragem Atual</TableHead>
                <TableHead>Status Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cicloVidaPneus.map((pneu) => {
                const telemetria = telemetryData.find(t => t.id === pneu.id);
                return (
                  <TableRow key={pneu.id}>
                    <TableCell className="font-medium">{pneu.id}</TableCell>
                    <TableCell>{new Date(pneu.dataInstalacao).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pneu.historicoReformas}x reformado</Badge>
                    </TableCell>
                    <TableCell>
                      {telemetria ? `${telemetria.quilometragem.toLocaleString()} km` : 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(pneu.statusFinal)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Commission Summary */}
      <Card className="shadow-card border-success">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <TrendingUp className="h-5 w-5" />
            Comissionamento por Parceria
          </CardTitle>
          <CardDescription>Resumo financeiro das vendas geradas por parceiros certificados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {parceiros.map(parceiro => {
              const comissaoPercentual = (parceiro.comissaoDevida / parceiro.volumeVendas) * 100;
              return (
                <div key={parceiro.id} className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                  <div>
                    <p className="font-medium">{parceiro.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {comissaoPercentual.toFixed(1)}% de comissão
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Volume</p>
                    <p className="font-bold">R$ {parceiro.volumeVendas.toLocaleString()}</p>
                    <p className="text-sm text-success font-medium">
                      → R$ {parceiro.comissaoDevida.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
