import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Truck, Circle, Package, RefreshCw, Bell, DollarSign, TrendingDown, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["hsl(239,84%,67%)", "hsl(142,76%,36%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)"];

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: veiculos, isLoading: loadingV } = useQuery({
    queryKey: ["veiculos-count"],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("id");
      return data || [];
    },
  });

  const { data: pneus, isLoading: loadingP } = useQuery({
    queryKey: ["pneus-all"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("*");
      return data || [];
    },
  });

  const { data: alertas } = useQuery({
    queryKey: ["alertas-ativos"],
    queryFn: async () => {
      const { data } = await supabase.from("alertas").select("id, gravidade").eq("ativo", true);
      return data || [];
    },
  });

  const { data: recapagens } = useQuery({
    queryKey: ["recapagens-all"],
    queryFn: async () => {
      const { data } = await supabase.from("recapagens").select("*");
      return data || [];
    },
  });

  const isLoading = loadingV || loadingP;
  const totalVeiculos = veiculos?.length || 0;
  const totalPneus = pneus?.length || 0;
  const emOperacao = pneus?.filter(p => p.localizacao === "veiculo").length || 0;
  const emEstoque = pneus?.filter(p => p.localizacao === "estoque").length || 0;
  const emRecapagem = pneus?.filter(p => p.status === "em_recapagem" || p.status === "aguardando_recapagem").length || 0;
  const sucateados = pneus?.filter(p => p.status === "sucata").length || 0;
  const alertasCriticos = alertas?.filter(a => a.gravidade === "critico").length || 0;
  const custoTotal = pneus?.reduce((acc, p) => acc + Number(p.custo_acumulado || p.custo_aquisicao || 0), 0) || 0;
  const economiaRecapagem = (recapagens?.filter(r => r.status === "retornado").length || 0) * 1800;

  const statusDistribution = [
    { name: "Em operação", value: emOperacao },
    { name: "Em estoque", value: emEstoque },
    { name: "Recapagem", value: emRecapagem },
    { name: "Sucata", value: sucateados },
  ].filter(d => d.value > 0);

  const hasData = totalVeiculos > 0 || totalPneus > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <EmptyState
          icon={BarChart3}
          title="Bem-vindo à Rastro"
          description="Comece cadastrando sua frota e seus pneus. Após o cadastro, seu dashboard será automaticamente preenchido com métricas e análises em tempo real."
          actionLabel="Cadastrar Veículo"
          onAction={() => window.location.href = "/frota"}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center">
              <Truck className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">1. Cadastre sua Frota</p>
              <p className="text-sm text-muted-foreground mt-1">Adicione seus veículos com tipo e placa</p>
            </CardContent>
          </Card>
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center">
              <Circle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">2. Cadastre seus Pneus</p>
              <p className="text-sm text-muted-foreground mt-1">Cada pneu recebe um QR Code único</p>
            </CardContent>
          </Card>
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">3. Acompanhe Aqui</p>
              <p className="text-sm text-muted-foreground mt-1">KPIs, alertas e economia em tempo real</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Veículos" value={totalVeiculos} icon={Truck} color="bg-primary" />
        <StatCard title="Pneus Cadastrados" value={totalPneus} icon={Circle} color="bg-primary" />
        <StatCard title="Em Operação" value={emOperacao} icon={Circle} color="bg-success" />
        <StatCard title="Em Estoque" value={emEstoque} icon={Package} color="bg-muted" />
        <StatCard title="Em Recapagem" value={emRecapagem} icon={RefreshCw} color="bg-warning" />
        <StatCard title="Sucateados" value={sucateados} icon={Circle} color="bg-destructive" />
        <StatCard title="Alertas Críticos" value={alertasCriticos} icon={Bell} color="bg-destructive" />
        <StatCard title="Custo Acumulado" value={`R$ ${custoTotal.toLocaleString("pt-BR")}`} icon={DollarSign} color="bg-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {statusDistribution.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição de Pneus</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        {economiaRecapagem > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Economia com Recapagem</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <TrendingDown className="h-12 w-12 text-success mb-4" />
              <p className="text-4xl font-bold text-success">R$ {economiaRecapagem.toLocaleString("pt-BR")}</p>
              <p className="text-sm text-muted-foreground mt-2">Estimativa vs. compra de pneus novos</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
