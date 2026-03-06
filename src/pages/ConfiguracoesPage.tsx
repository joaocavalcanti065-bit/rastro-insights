import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import { toast } from "sonner";
import { Cog, Moon, Sun } from "lucide-react";

export default function ConfiguracoesPage() {
  const { darkMode, toggleDarkMode } = useAppStore();
  const [sulcoMinimo, setSulcoMinimo] = useState("3");
  const [pressaoDesvio, setPressaoDesvio] = useState("10");
  const [estoqueMinimo, setEstoqueMinimo] = useState("5");

  const salvar = () => {
    toast.success("Configurações salvas com sucesso!");
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
      </div>
    </div>
  );
}
