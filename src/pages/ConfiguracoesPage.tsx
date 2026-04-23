import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Moon, Sun, ShieldCheck } from "lucide-react";

export default function ConfiguracoesPage() {
  const { darkMode, toggleDarkMode } = useAppStore();
  const [sulcoMinimo, setSulcoMinimo] = useState("3");
  const [pressaoDesvio, setPressaoDesvio] = useState("10");
  const [estoqueMinimo, setEstoqueMinimo] = useState("5");
  const [limiteAprovacaoOs, setLimiteAprovacaoOs] = useState("1000");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("configuracoes")
        .select("chave, valor")
        .in("chave", ["os_limite_aprovacao", "sulco_minimo", "pressao_desvio", "estoque_minimo"]);
      data?.forEach((c) => {
        if (c.chave === "os_limite_aprovacao" && c.valor) setLimiteAprovacaoOs(c.valor);
        if (c.chave === "sulco_minimo" && c.valor) setSulcoMinimo(c.valor);
        if (c.chave === "pressao_desvio" && c.valor) setPressaoDesvio(c.valor);
        if (c.chave === "estoque_minimo" && c.valor) setEstoqueMinimo(c.valor);
      });
    })();
  }, []);

  const upsertConfig = async (chave: string, valor: string) => {
    const { data: existing } = await supabase.from("configuracoes").select("id").eq("chave", chave).maybeSingle();
    if (existing) {
      await supabase.from("configuracoes").update({ valor }).eq("id", existing.id);
    } else {
      await supabase.from("configuracoes").insert({ chave, valor });
    }
  };

  const salvar = async () => {
    try {
      await Promise.all([
        upsertConfig("sulco_minimo", sulcoMinimo),
        upsertConfig("pressao_desvio", pressaoDesvio),
        upsertConfig("estoque_minimo", estoqueMinimo),
        upsertConfig("os_limite_aprovacao", limiteAprovacaoOs),
      ]);
      toast.success("Configurações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Aparência</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tema</p>
                <p className="text-sm text-muted-foreground">{darkMode ? "Modo escuro ativo" : "Modo claro ativo"}</p>
              </div>
              <Button variant="outline" size="icon" onClick={toggleDarkMode}>
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Limites de Alertas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sulco mínimo para alerta (mm)</Label>
              <Input type="number" value={sulcoMinimo} onChange={e => setSulcoMinimo(e.target.value)} />
            </div>
            <div>
              <Label>Desvio máximo de pressão (%)</Label>
              <Input type="number" value={pressaoDesvio} onChange={e => setPressaoDesvio(e.target.value)} />
            </div>
            <div>
              <Label>Estoque mínimo por medida</Label>
              <Input type="number" value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} />
            </div>
            <Button onClick={salvar}>Salvar Configurações</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Ordens de Serviço — Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm">
              <Label>Limite para aprovação obrigatória (R$)</Label>
              <Input
                type="number"
                min={0}
                step={50}
                value={limiteAprovacaoOs}
                onChange={(e) => setLimiteAprovacaoOs(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                OS com custo total acima deste valor serão automaticamente direcionadas para o estado{" "}
                <span className="font-semibold text-foreground">Aguardando Aprovação</span> ao tentar abrir, iniciar ou concluir.
                Use <span className="font-mono">0</span> para desabilitar.
              </p>
            </div>
            <Button onClick={salvar}>Salvar Configurações</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
