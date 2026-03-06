import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Cpu, Globe, Smartphone, BarChart3, Mail } from "lucide-react";

const integracoes = [
  { nome: "Telemetria Rastro", desc: "Dados de pressão e temperatura em tempo real via sensores", icon: Radio, status: "Configurável" },
  { nome: "Sensores TPMS", desc: "Monitoramento automático de pressão e temperatura", icon: Cpu, status: "Em breve" },
  { nome: "ERP via API", desc: "Integração com sistemas de gestão externos", icon: Globe, status: "Em breve" },
  { nome: "App Mobile", desc: "Coleta de dados em campo via smartphone", icon: Smartphone, status: "Em breve" },
  { nome: "BI / Power BI", desc: "Exportação de dados para ferramentas de BI", icon: BarChart3, status: "Em breve" },
  { nome: "E-mail Automático", desc: "Envio automático de relatórios e alertas por e-mail", icon: Mail, status: "Configurável" },
];

export default function IntegracoesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrações</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integracoes.map(i => (
          <Card key={i.nome} className={i.status === "Em breve" ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2 bg-muted"><i.icon className="h-5 w-5" /></div>
                  <CardTitle className="text-base">{i.nome}</CardTitle>
                </div>
                <Badge variant={i.status === "Configurável" ? "default" : "secondary"}>{i.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{i.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
