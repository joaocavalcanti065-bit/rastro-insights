import { Activity, AlertTriangle, DollarSign, CheckCircle, Users } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getDashboardData, getTelemetriaData } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * DASHBOARD - INTEGRAÇÃO N8N
 * 
 * Esta página consome os seguintes endpoints:
 * - GET /api/dashboard - KPIs gerais
 * - GET /api/telemetria - Dados dos pneus para alertas
 * 
 * Configure o .env com VITE_API_BASE_URL apontando para seu n8n
 */

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<any>(null);
  const [telemetryData, setTelemetryData] = useState<any[]>([]);

  useEffect(() => {
    // INTEGRAÇÃO N8N: Esta função busca dados via API
    async function fetchData() {
      try {
        setLoading(true);
        
        // Busca KPIs do dashboard
        const dashboard = await getDashboardData();
        setKpiData(dashboard);
        
        // Busca dados de telemetria para os alertas
        const telemetry = await getTelemetriaData();
        setTelemetryData(Array.isArray(telemetry) ? telemetry : []);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        // Fallback: mantém vazio se API não responder
        setKpiData(null);
        setTelemetryData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const criticalTires = telemetryData.filter(t => t.status === 'critical');
  const warningTires = telemetryData.filter(t => t.status === 'warning');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Carregando dados via API...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das operações e KPIs</p>
      </div>

      {/* KPI Cards - DADOS VIA API N8N */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!kpiData ? (
          <Card className="col-span-4 shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                📡 Aguardando dados do n8n via <code className="bg-muted px-2 py-1 rounded">GET /api/dashboard</code>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Configure VITE_API_BASE_URL no arquivo .env
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <StatCard
              title="Total de Pneus"
              value={kpiData.totalPneus || 0}
              icon={Activity}
              variant="info"
            />
            <StatCard
              title="Pneus Críticos"
              value={kpiData.pneusCriticos || 0}
              icon={AlertTriangle}
              variant="warning"
            />
            <StatCard
              title="Economia Estimada"
              value={`R$ ${(kpiData.economiaEstimada || 0).toLocaleString()}`}
              icon={DollarSign}
              variant="success"
              trend={{ value: 18, positive: true }}
            />
            <StatCard
              title="Parceiros Ativos"
              value={kpiData.parceirosAtivos || 0}
              icon={Users}
              variant="default"
            />
          </>
        )}
      </div>

      {/* Alerts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Alertas Críticos
            </CardTitle>
            <CardDescription>Pneus que necessitam ação imediata</CardDescription>
          </CardHeader>
          <CardContent>
            {criticalTires.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum pneu crítico detectado</p>
                <p className="text-sm mt-2">Dados via <code className="bg-muted px-2 py-1 rounded">GET /api/telemetria</code></p>
              </div>
            ) : (
              <div className="space-y-3">
                {criticalTires.map(tire => (
                  <div key={tire.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                    <div>
                      <p className="font-medium">{tire.id} - {tire.frota}</p>
                      <p className="text-sm text-muted-foreground">
                        Pressão: {tire.pressao} PSI | Banda: {tire.profundidadeBanda}mm
                      </p>
                    </div>
                    <Badge variant="destructive">Crítico</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Pílula de Conhecimento
            </CardTitle>
            <CardDescription>Insight financeiro mais recente</CardDescription>
          </CardHeader>
          <CardContent>
            {!kpiData || !kpiData.pilulaConhecimento ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Pílula de Conhecimento será exibida aqui</p>
                <p className="text-sm mt-2">Gerada via <code className="bg-muted px-2 py-1 rounded">POST /api/analise-financeira</code></p>
              </div>
            ) : (
              <div className="p-4 bg-gradient-primary rounded-lg text-white">
                <p className="text-lg font-medium mb-2">💡 Oportunidade de Economia</p>
                <p className="text-sm">
                  {kpiData.pilulaConhecimento || `Ao realizar a reforma dos ${kpiData.pneusCriticos} pneus identificados 
                  com desgaste crítico em vez de comprar novos, sua frota economizará 
                  R$ ${(kpiData.economiaEstimada || 0).toLocaleString()} nos próximos 6 meses.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>Últimas atualizações do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'Coleta de telemetria concluída', frota: 'Frota A', time: '2h atrás' },
              { action: 'Nova reforma agendada', frota: 'Frota B', time: '4h atrás' },
              { action: 'Relatório mensal gerado', frota: 'Todas', time: '1 dia atrás' },
              { action: 'Inspeção técnica finalizada', frota: 'Frota C', time: '2 dias atrás' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.frota}</p>
                </div>
                <span className="text-sm text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
