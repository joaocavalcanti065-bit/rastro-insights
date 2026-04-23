import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Activity, LayoutDashboard, Radio, Stethoscope, TrendingUp, Recycle, ArrowRight } from "lucide-react";

const portals = [
  {
    title: "Dashboard",
    description: "Visão consolidada de KPIs operacionais e financeiros da frota.",
    icon: LayoutDashboard,
    to: "/dashboard",
  },
  {
    title: "Telemetria",
    description: "Monitoramento em tempo real de consumo, eficiência e desempenho.",
    icon: Radio,
    to: "/telemetria",
  },
  {
    title: "Diagnóstico",
    description: "Identificação preditiva de falhas e oportunidades de melhoria.",
    icon: Stethoscope,
    to: "/diagnostico",
  },
  {
    title: "Análise Financeira",
    description: "Custo total de propriedade (TCO), CPK e benchmarking de marcas.",
    icon: TrendingUp,
    to: "/analise",
  },
  {
    title: "Economia Circular",
    description: "Recapagem, reaproveitamento e ciclo de vida estendido dos pneus.",
    icon: Recycle,
    to: "/circular",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-data-watermark pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 lg:py-24">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <span className="font-semibold text-foreground tracking-tight">Rastro Insights</span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Inteligência Logística
              </p>
            </div>
          </div>
          <Link
            to="/auth"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Acessar conta
          </Link>
        </header>

        {/* Hero */}
        <section className="mb-16 max-w-3xl">
          <p className="text-[11px] font-medium text-primary uppercase tracking-[0.2em] mb-4">
            Portal de Inteligência Financeira
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-[1.1] tracking-tight mb-6">
            Transforme dados de frota em{" "}
            <span className="text-primary">economia real.</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
            Acesse os módulos de inteligência operacional da Rastro. Cada portal entrega visões
            específicas para reduzir custos, antecipar falhas e maximizar a vida útil dos ativos.
          </p>
        </section>

        {/* Portals grid */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
            Acesso aos módulos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portals.map((p) => (
              <Link key={p.to} to={p.to} className="group">
                <Card className="h-full p-6 bg-card/50 border-border/60 hover:border-primary/40 hover:bg-card transition-all duration-200">
                  <div className="flex flex-col h-full">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <p.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2 tracking-tight">
                      {p.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
                      {p.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <span>Acessar</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground/50 tracking-wide">
            Powered by Rastro Inteligência · v2.0
          </p>
        </footer>
      </div>
    </div>
  );
}
