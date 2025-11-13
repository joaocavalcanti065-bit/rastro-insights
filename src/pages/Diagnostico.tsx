import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { telemetryData } from "@/data/mockData";
import { AlertTriangle, CheckCircle, Clock, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function Diagnostico() {
  // Cálculo da vida útil média dos pneus (14mm = novo, 2mm = desgastado)
  const calcularVidaUtil = (profundidadeBanda: number) => {
    const profundidadeNova = 14;
    const profundidadeMinima = 2;
    const percentual = ((profundidadeBanda - profundidadeMinima) / (profundidadeNova - profundidadeMinima)) * 100;
    return Math.max(0, Math.min(100, Math.round(percentual)));
  };

  // Gera recomendações automáticas baseadas nos dados
  const gerarRecomendacoes = () => {
    return telemetryData.map(pneu => {
      const vidaUtil = calcularVidaUtil(pneu.profundidadeBanda);
      let recomendacao = '';
      let motivo = '';
      let acao = '';
      let prioridade: 'alta' | 'media' | 'baixa' = 'baixa';
      let tipo: 'troca' | 'recapagem' | 'monitoramento' | 'descarte' = 'monitoramento';

      if (pneu.status === 'critical') {
        if (vidaUtil < 20) {
          recomendacao = 'Substituição Imediata';
          motivo = 'Profundidade da banda crítica e risco de segurança';
          acao = 'Troca necessária nas próximas 48h';
          prioridade = 'alta';
          tipo = 'troca';
        } else if (pneu.pressao < 85) {
          recomendacao = 'Calibragem Urgente';
          motivo = 'Pressão muito abaixo do ideal pode causar danos estruturais';
          acao = 'Calibrar imediatamente para 95 PSI';
          prioridade = 'alta';
          tipo = 'monitoramento';
        }
      } else if (pneu.status === 'warning') {
        if (vidaUtil >= 40 && vidaUtil < 70) {
          recomendacao = 'Recapagem Recomendada';
          motivo = 'Pneu ainda possui estrutura aproveitável para recapagem';
          acao = 'Agendar recapagem nos próximos 30 dias';
          prioridade = 'media';
          tipo = 'recapagem';
        } else if (vidaUtil < 40) {
          recomendacao = 'Avaliar para Descarte';
          motivo = 'Estrutura pode estar comprometida para recapagem';
          acao = 'Inspeção técnica necessária';
          prioridade = 'media';
          tipo = 'descarte';
        }
      } else {
        recomendacao = 'Monitoramento Normal';
        motivo = 'Pneu em condições ideais de operação';
        acao = 'Continuar inspeções regulares';
        prioridade = 'baixa';
        tipo = 'monitoramento';
      }

      // Previsão de troca baseada na quilometragem média (assumindo 1000km por semana)
      const kmRestantes = (pneu.profundidadeBanda - 2) * 8000; // 8000km por mm de banda
      const semanasRestantes = Math.round(kmRestantes / 1000);

      return {
        ...pneu,
        recomendacao,
        motivo,
        acao,
        prioridade,
        tipo,
        vidaUtil,
        previsaoTrocaSemanas: semanasRestantes > 0 ? semanasRestantes : 0,
      };
    });
  };

  const recomendacoes = gerarRecomendacoes();
  const criticas = recomendacoes.filter(r => r.prioridade === 'alta');
  const recapagens = recomendacoes.filter(r => r.tipo === 'recapagem');
  const trocas = recomendacoes.filter(r => r.tipo === 'troca');
  const descartes = recomendacoes.filter(r => r.tipo === 'descarte');

  const getPrioridadeBadge = (prioridade: string) => {
    const variants = {
      alta: { variant: 'destructive' as const, icon: AlertTriangle },
      media: { variant: 'default' as const, icon: Clock },
      baixa: { variant: 'secondary' as const, icon: CheckCircle },
    };
    const config = variants[prioridade as keyof typeof variants];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const variants = {
      troca: { label: 'Troca', variant: 'destructive' as const },
      recapagem: { label: 'Recapagem', variant: 'default' as const },
      descarte: { label: 'Descarte', variant: 'secondary' as const },
      monitoramento: { label: 'Monitoramento', variant: 'outline' as const },
    };
    const config = variants[tipo as keyof typeof variants];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAcao = (id: string, acao: string) => {
    toast.success(`Ação registrada para pneu ${id}: ${acao}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Diagnóstico Inteligente</h1>
        <p className="text-muted-foreground">Recomendações automáticas e ações prescritivas</p>
      </div>

      {/* Resumo de Ações */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ações Críticas</p>
                <p className="text-3xl font-bold text-destructive">{criticas.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trocas Necessárias</p>
                <p className="text-3xl font-bold text-foreground">{trocas.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recapagens Indicadas</p>
                <p className="text-3xl font-bold text-success">{recapagens.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Descartes Avaliar</p>
                <p className="text-3xl font-bold text-warning">{descartes.length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações Críticas */}
      {criticas.length > 0 && (
        <Card className="shadow-lg border-2 border-destructive">
          <CardHeader className="bg-destructive/10">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Ações Críticas - Atenção Imediata
            </CardTitle>
            <CardDescription>Pneus que requerem ação urgente nas próximas 48 horas</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {criticas.map(rec => (
                <div key={rec.id} className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{rec.id}</span>
                        {getPrioridadeBadge(rec.prioridade)}
                        {getTipoBadge(rec.tipo)}
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{rec.recomendacao}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Motivo:</span> {rec.motivo}
                        </p>
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Ação:</span> {rec.acao}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleAcao(rec.id, rec.acao)}
                    >
                      Executar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela Completa de Diagnósticos */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Diagnóstico Completo da Frota</CardTitle>
          <CardDescription>Todas as recomendações e previsões baseadas em dados reais</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pneu</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Tipo de Ação</TableHead>
                <TableHead>Recomendação</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Vida Útil</TableHead>
                <TableHead>Previsão Troca</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recomendacoes.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{rec.id}</TableCell>
                  <TableCell>{getPrioridadeBadge(rec.prioridade)}</TableCell>
                  <TableCell>{getTipoBadge(rec.tipo)}</TableCell>
                  <TableCell className="font-semibold">{rec.recomendacao}</TableCell>
                  <TableCell className="max-w-xs text-sm">{rec.motivo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded text-sm font-medium ${
                        rec.vidaUtil >= 70 ? 'bg-success text-white' :
                        rec.vidaUtil >= 40 ? 'bg-warning text-white' :
                        'bg-destructive text-white'
                      }`}>
                        {rec.vidaUtil}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {rec.previsaoTrocaSemanas > 0 
                      ? `${rec.previsaoTrocaSemanas} semanas`
                      : 'Imediato'
                    }
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAcao(rec.id, rec.acao)}
                    >
                      Ver Ação
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card de Recapagens */}
      {recapagens.length > 0 && (
        <Card className="shadow-card border-success/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              Oportunidades de Recapagem
            </CardTitle>
            <CardDescription>
              Pneus aptos para recapagem - Economia estimada: R$ {(recapagens.length * 1700).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {recapagens.map(rec => (
                <div key={rec.id} className="p-3 border rounded-lg bg-success/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{rec.id} - {rec.frota}</p>
                      <p className="text-sm text-muted-foreground">{rec.acao}</p>
                    </div>
                    <Badge variant="default">Vida útil: {rec.vidaUtil}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
