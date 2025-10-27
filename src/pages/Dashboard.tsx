import { Activity, AlertTriangle, DollarSign, CheckCircle, Users } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { kpiData, telemetryData } from "@/data/mockData";

export default function Dashboard() {
  const criticalTires = telemetryData.filter(t => t.status === 'critical');
  const warningTires = telemetryData.filter(t => t.status === 'warning');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das operações e KPIs</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Pneus"
          value={kpiData.totalPneus}
          icon={Activity}
          variant="info"
        />
        <StatCard
          title="Pneus Críticos"
          value={kpiData.pneusCriticos}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Economia Estimada"
          value={`R$ ${kpiData.economiaEstimada.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Parceiros Ativos"
          value={kpiData.parceirosAtivos}
          icon={Users}
          variant="default"
        />
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
            <div className="p-4 bg-gradient-primary rounded-lg text-white">
              <p className="text-lg font-medium mb-2">💡 Oportunidade de Economia</p>
              <p className="text-sm">
                Ao realizar a reforma dos <span className="font-bold">{kpiData.pneusCriticos} pneus</span> identificados 
                com desgaste crítico em vez de comprar novos, sua frota economizará 
                <span className="font-bold"> R$ {kpiData.economiaEstimada.toLocaleString()}</span> nos próximos 6 meses.
              </p>
            </div>
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
