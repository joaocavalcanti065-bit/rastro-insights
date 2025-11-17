import { Activity, AlertTriangle, DollarSign, CheckCircle, Users, Gauge, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getDashboardData, getTelemetriaData } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

/**
 * DASHBOARD - INTEGRAÇÃO N8N
 * 
 * Esta página consome os seguintes endpoints:
 * - GET /api/dashboard - KPIs gerais
 * - GET /api/telemetria - Dados dos pneus para alertas
 * 
 * Configure o .env com VITE_API_BASE_URL apontando para seu n8n
 */

// Dados fictícios de performance ao longo do tempo
const performanceData = [{
  mes: 'Jan',
  veiculo1: 95,
  veiculo2: 92,
  veiculo3: 88,
  veiculo4: 90,
  veiculo5: 93
}, {
  mes: 'Fev',
  veiculo1: 93,
  veiculo2: 90,
  veiculo3: 85,
  veiculo4: 88,
  veiculo5: 91
}, {
  mes: 'Mar',
  veiculo1: 90,
  veiculo2: 87,
  veiculo3: 82,
  veiculo4: 85,
  veiculo5: 88
}, {
  mes: 'Abr',
  veiculo1: 87,
  veiculo2: 84,
  veiculo3: 78,
  veiculo4: 82,
  veiculo5: 85
}, {
  mes: 'Mai',
  veiculo1: 84,
  veiculo2: 81,
  veiculo3: 75,
  veiculo4: 79,
  veiculo5: 82
}, {
  mes: 'Jun',
  veiculo1: 81,
  veiculo2: 78,
  veiculo3: 71,
  veiculo4: 76,
  veiculo5: 79
}];
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

  // Cálculos realistas
  const totalPneus = kpiData?.totalPneus || 90;
  const vidaUtilMedia = kpiData?.vidaUtilMedia || 60; // 60% de vida útil média
  const custoKm = kpiData?.custoKm || 0.053; // R$ 0.053 por km
  const eficiencia = kpiData?.eficiencia || 90; // 90% de eficiência

  // Dados para o gauge de vida útil
  const gaugeData = [{
    name: 'Vida Útil',
    value: vidaUtilMedia,
    fill: vidaUtilMedia >= 70 ? '#22c55e' : vidaUtilMedia >= 40 ? '#eab308' : '#ef4444'
  }];
  if (loading) {
    return <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard
        </h1>
          <p className="text-muted-foreground">Carregando dados via API...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>)}
        </div>
      </div>;
  }
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Monitoramento inteligente da frota</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance Chart - Takes 2 columns */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>Desgaste dos pneus ao longo do tempo (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{
                fontSize: '12px'
              }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{
                fontSize: '12px'
              }} domain={[60, 100]} ticks={[60, 70, 80, 90, 100]} />
                <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} />
                <Legend />
                <Line type="monotone" dataKey="veiculo1" stroke="#3b82f6" strokeWidth={2} name="V001" />
                <Line type="monotone" dataKey="veiculo2" stroke="#10b981" strokeWidth={2} name="V002" />
                <Line type="monotone" dataKey="veiculo3" stroke="#f59e0b" strokeWidth={2} name="V003" />
                <Line type="monotone" dataKey="veiculo4" stroke="#8b5cf6" strokeWidth={2} name="V004" />
                <Line type="monotone" dataKey="veiculo5" stroke="#ec4899" strokeWidth={2} name="V005" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right Column - Metrics */}
        <div className="space-y-6">
          {/* Custo por Quilômetro */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Custo por Quilômetro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">R$ {custoKm.toFixed(3)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Vida Útil dos Pneus */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vida Útil dos Pneus</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="relative">
                <ResponsiveContainer width={120} height={120}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={gaugeData} startAngle={90} endAngle={-270}>
                    <RadialBar background={{
                    fill: 'hsl(var(--muted))'
                  }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{vidaUtilMedia}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eficiência */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Eficiência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{eficiencia}</span>
                <span className="text-2xl font-bold">%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seção de Alertas */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertas
          </CardTitle>
          <CardDescription>Monitoramento em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          {criticalTires.length === 0 && warningTires.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Sistema operando normalmente</p>
              <p className="text-sm mt-2">Nenhum alerta ativo no momento</p>
            </div> : <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {/* Alertas de Baixa Pressão */}
              {telemetryData.filter(t => t.pressao < 100).slice(0, 3).map(tire => <div key={`pressure-${tire.id}`} className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Baixa pressão detectada</p>
                    <p className="text-xs text-muted-foreground">{tire.id} - {tire.pressao} PSI</p>
                  </div>
                </div>)}
              
              {/* Alertas de Alta Temperatura */}
              {telemetryData.filter(t => t.temperatura > 70).slice(0, 3).map(tire => <div key={`temp-${tire.id}`} className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Alta temperatura detectada</p>
                    <p className="text-xs text-muted-foreground">{tire.id} - {tire.temperatura}°C</p>
                  </div>
                </div>)}

              {/* Alertas de Pneus Críticos */}
              {criticalTires.slice(0, 2).map(tire => <div key={`critical-${tire.id}`} className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Condição crítica do pneu</p>
                    <p className="text-xs text-muted-foreground">{tire.id} - Banda: {tire.profundidadeBanda}mm</p>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de Pneus" value={totalPneus} icon={Activity} variant="info" />
        <StatCard title="Pneus Críticos" value={kpiData?.pneusCriticos || criticalTires.length} icon={AlertTriangle} variant="warning" />
        <StatCard title="Economia Estimada" value={`R$ ${(kpiData?.economiaEstimada || 15300).toLocaleString()}`} icon={DollarSign} variant="success" trend={{
        value: 18,
        positive: true
      }} />
        <StatCard title="Parceiros Ativos" value={kpiData?.parceirosAtivos || 2} icon={Users} variant="default" />
      </div>
    </div>;
}