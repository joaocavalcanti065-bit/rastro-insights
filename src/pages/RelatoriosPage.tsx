import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { FileText, Download, Sparkles, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";

export default function RelatoriosPage() {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const { data: pneus } = useQuery({
    queryKey: ["pneus-relatorio"],
    queryFn: async () => {
      const { data } = await supabase.from("pneus").select("*");
      return data || [];
    },
  });

  const { data: veiculos } = useQuery({
    queryKey: ["veiculos-relatorio"],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("*");
      return data || [];
    },
  });

  const { data: analises } = useQuery({
    queryKey: ["analises-ia"],
    queryFn: async () => {
      const { data } = await supabase.from("analises_ia").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const gerarAnalise = async (tipo: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analise-rastro", {
        body: {
          tipo,
          dados: {
            total_pneus: pneus?.length || 0,
            total_veiculos: veiculos?.length || 0,
            pneus_criticos: pneus?.filter(p => Number(p.sulco_atual || 0) < 4).length || 0,
            custo_total: pneus?.reduce((acc, p) => acc + Number(p.custo_acumulado || 0), 0) || 0,
            em_estoque: pneus?.filter(p => p.localizacao === "estoque").length || 0,
            em_operacao: pneus?.filter(p => p.localizacao === "veiculo").length || 0,
          },
        },
      });
      if (error) throw error;
      setAiReport(data?.analise || "Análise não disponível");
      
      await supabase.from("analises_ia").insert({
        tipo, conteudo: data?.analise || "",
        dados_entrada: { total_pneus: pneus?.length, total_veiculos: veiculos?.length },
      });
      
      toast.success("Análise gerada com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar análise. Tente novamente.");
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório Rastro", 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, 30);
    doc.setFontSize(12);
    doc.text(`Total de veículos: ${veiculos?.length || 0}`, 20, 45);
    doc.text(`Total de pneus: ${pneus?.length || 0}`, 20, 55);
    doc.text(`Em operação: ${pneus?.filter(p => p.localizacao === "veiculo").length || 0}`, 20, 65);
    doc.text(`Em estoque: ${pneus?.filter(p => p.localizacao === "estoque").length || 0}`, 20, 75);
    doc.text(`Custo acumulado: R$ ${(pneus?.reduce((a, p) => a + Number(p.custo_acumulado || 0), 0) || 0).toLocaleString("pt-BR")}`, 20, 85);
    
    if (aiReport) {
      doc.setFontSize(14);
      doc.text("Análise Inteligente", 20, 105);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(aiReport, 170);
      doc.text(lines, 20, 115);
    }
    
    doc.setFontSize(8);
    doc.text("Gerado por Rastro | Pneus, Estoque e Recapagem", 20, 285);
    doc.save("relatorio-rastro.pdf");
    toast.success("PDF exportado!");
  };

  const hasData = (pneus?.length || 0) > 0 || (veiculos?.length || 0) > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      {!hasData ? (
        <EmptyState icon={FileText} title="Sem dados para relatório" description="Cadastre veículos e pneus para gerar relatórios e análises inteligentes." />
      ) : (
        <Tabs defaultValue="semanal">
          <TabsList>
            <TabsTrigger value="semanal">Relatório Semanal</TabsTrigger>
            <TabsTrigger value="mensal">Relatório Mensal</TabsTrigger>
          </TabsList>

          <TabsContent value="semanal" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Veículos</p><p className="text-2xl font-bold">{veiculos?.length || 0}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pneus</p><p className="text-2xl font-bold">{pneus?.length || 0}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pneus Críticos</p><p className="text-2xl font-bold text-destructive">{pneus?.filter(p => Number(p.sulco_atual || 0) < 4).length || 0}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Análise Inteligente</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => gerarAnalise("semanal")} disabled={aiLoading} size="sm">
                      {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : "Gerar Análise Semanal"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportarPDF}><Download className="h-4 w-4 mr-2" />Exportar PDF</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {aiReport ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm">{aiReport}</div>
                ) : analises?.length ? (
                  <div className="space-y-3">
                    {analises.map(a => (
                      <div key={a.id} className="border rounded-lg p-3">
                        <div className="flex justify-between mb-1">
                          <Badge variant="outline">{a.tipo}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <p className="text-sm line-clamp-3">{a.conteudo}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Clique em "Gerar Análise" para obter insights sobre sua frota.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mensal" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Relatório Mensal Executivo</CardTitle>
                  <Button onClick={() => gerarAnalise("mensal")} disabled={aiLoading} size="sm">
                    {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : "Gerar Relatório Mensal"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiReport ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm">{aiReport}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">Gere o relatório mensal para obter uma análise executiva completa com comparativos e recomendações.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
