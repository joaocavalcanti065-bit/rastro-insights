import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BRAND_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

interface PneuTrend {
  marca: string;
  km_atual: number | null;
  km_inicial: number | null;
  custo_aquisicao: number | null;
  custo_acumulado: number | null;
  created_at: string;
  status: string;
}

export default function CpkTrendPanel() {
  const [periodo, setPeriodo] = useState("12");

  const { data: pneus, isLoading } = useQuery({
    queryKey: ["cpk-trend-pneus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pneus")
        .select("marca, km_atual, km_inicial, custo_aquisicao, custo_acumulado, created_at, status")
        .neq("status", "sucata")
        .neq("status", "extraviado")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as PneuTrend[];
    },
  });

  const { trendData, brands } = useMemo(() => {
    if (!pneus || pneus.length === 0) return { trendData: [], brands: [] };

    const allBrands = [...new Set(pneus.map((p) => p.marca))].sort();
    const now = new Date();
    const mesesFiltro = Number(periodo);
    const dataInicio = new Date(now.getFullYear(), now.getMonth() - mesesFiltro, 1);

    const months: Date[] = [];
    const cursor = new Date(dataInicio);
    while (cursor <= now) {
      months.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (months.length === 0) months.push(new Date(now.getFullYear(), now.getMonth(), 1));

    const data = months.map((month) => {
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
      const label = `${String(month.getMonth() + 1).padStart(2, "0")}/${month.getFullYear()}`;

      const row: Record<string, string | number | null> = { month: label };

      for (const brand of allBrands) {
        const brandTires = pneus.filter(
          (p) => p.marca === brand && new Date(p.created_at) <= endOfMonth
        );

        const withCpk = brandTires
          .map((p) => {
            const km = Math.max(0, (p.km_atual || 0) - (p.km_inicial || 0));
            const custo = Number(p.custo_aquisicao || 0) + Number(p.custo_acumulado || 0);
            return km > 0 ? custo / km : 0;
          })
          .filter((cpk) => cpk > 0);

        row[brand] =
          withCpk.length > 0
            ? Number((withCpk.reduce((s, v) => s + v, 0) / withCpk.length).toFixed(3))
            : null;
      }

      return row;
    });

    return { trendData: data, brands: allBrands };
  }, [pneus, periodo]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Carregando tendência…</p>
        </CardContent>
      </Card>
    );
  }

  if (trendData.length === 0 || brands.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tendência Histórica de CPK por Marca
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Evolução do custo por km acumulado ao longo do tempo
            </CardDescription>
          </div>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickFormatter={(v) => `R$${v.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
              formatter={(val: number | null, name: string) => {
                if (val === null) return ["—", name];
                return [`R$ ${val.toFixed(3)}/km`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {brands.map((brand, i) => (
              <Line
                key={brand}
                type="monotone"
                dataKey={brand}
                name={brand}
                stroke={BRAND_COLORS[i % BRAND_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
