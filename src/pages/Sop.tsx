import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { getSopData, alocarTecnico } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * S&OP - INTEGRAÇÃO N8N
 * 
 * Esta página consome os seguintes endpoints:
 * - GET /api/sop - Lista tarefas, técnicos e contratos
 * - POST /api/sop/alocar - Aloca técnico a uma frota
 * 
 * Configure o .env com VITE_API_BASE_URL apontando para seu n8n
 */

export default function Sop() {
  const [loading, setLoading] = useState(true);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [selectedTecnico, setSelectedTecnico] = useState("");
  const [selectedFrota, setSelectedFrota] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // INTEGRAÇÃO N8N: Busca dados via API
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getSopData();
        setTarefas(data.tarefas || []);
        setTecnicos(data.tecnicos || []);
        setContratos(data.contratos || []);
      } catch (error) {
        console.error('Erro ao carregar S&OP:', error);
        setTarefas([]);
        setTecnicos([]);
        setContratos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleAlocar = async () => {
    if (!selectedTecnico || !selectedFrota) {
      toast({
        title: "Seleção incompleta",
        description: "Selecione um técnico e uma frota.",
        variant: "destructive",
      });
      return;
    }

    try {
      // INTEGRAÇÃO N8N: Envia alocação via POST
      await alocarTecnico(selectedTecnico, selectedFrota);
      toast({
        title: "Alocação realizada",
        description: `Técnico alocado à ${selectedFrota} via POST /api/sop/alocar`,
      });
    } catch (error) {
      console.error('Erro ao alocar:', error);
      toast({
        title: "Erro na alocação",
        description: "Configure o endpoint no n8n.",
        variant: "destructive",
      });
    }
  };
  const getStatusBadge = (status: string) => {
    const variants = {
      pendente: { label: 'Pendente', variant: 'secondary' as const },
      em_execucao: { label: 'Em Execução', variant: 'default' as const },
      concluido: { label: 'Concluído', variant: 'outline' as const },
    };
    return <Badge variant={variants[status as keyof typeof variants].variant}>
      {variants[status as keyof typeof variants].label}
    </Badge>;
  };

  const getPriorityBadge = (prioridade: string) => {
    const variants = {
      alta: 'destructive' as const,
      media: 'default' as const,
      baixa: 'secondary' as const,
    };
    return <Badge variant={variants[prioridade as keyof typeof variants]}>
      {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
    </Badge>;
  };

  const getContratoStatus = (status: string) => {
    const variants = {
      ativo: { label: 'Ativo', variant: 'default' as const },
      vencido: { label: 'Vencido', variant: 'destructive' as const },
      renovacao: { label: 'Em Renovação', variant: 'secondary' as const },
    };
    return <Badge variant={variants[status as keyof typeof variants].variant}>
      {variants[status as keyof typeof variants].label}
    </Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Serviço de Diagnóstico (S&OP)</h1>
        <p className="text-muted-foreground">Gestão de processos, recursos e contratos</p>
      </div>

      {/* Resource Allocation */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Alocação de Recursos
          </CardTitle>
          <CardDescription>Atribua técnicos às frotas e contratos</CardDescription>
        </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Técnico</Label>
                    <Select value={selectedTecnico} onValueChange={setSelectedTecnico}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um técnico" />
                      </SelectTrigger>
                      <SelectContent>
                        {tecnicos.length === 0 ? (
                          <SelectItem value="none" disabled>Nenhum técnico cadastrado</SelectItem>
                        ) : (
                          tecnicos.map(tec => (
                            <SelectItem key={tec.id} value={tec.id}>{tec.nome}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frota</Label>
                    <Select value={selectedFrota} onValueChange={setSelectedFrota}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frota" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a">Frota A</SelectItem>
                        <SelectItem value="b">Frota B</SelectItem>
                        <SelectItem value="c">Frota C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAlocar}>Atribuir</Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  📡 Alocação via <code className="bg-muted px-2 py-1 rounded">POST /api/sop/alocar</code>
                </p>
              </>
            )}

            <div className="mt-6">
              <h4 className="font-semibold mb-3">Técnicos Cadastrados</h4>
              {tecnicos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum técnico cadastrado</p>
                  <p className="text-sm mt-2">Dados via <code className="bg-muted px-2 py-1 rounded">GET /api/sop</code></p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tecnicos.map(tec => (
                <div key={tec.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{tec.nome}</p>
                    <p className="text-sm text-muted-foreground">{tec.especialidade}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {tec.frotasAtribuidas.length > 0 
                        ? tec.frotasAtribuidas.join(', ')
                        : 'Sem atribuição'}
                    </p>
                  </div>
                </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
      </Card>

      {/* Task Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Gestão de Processos
          </CardTitle>
          <CardDescription>Tarefas de diagnóstico e manutenção</CardDescription>
        </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : tarefas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma tarefa cadastrada</p>
                <p className="text-sm mt-2">Dados via <code className="bg-muted px-2 py-1 rounded">GET /api/sop</code></p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Frota</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarefas.map((tarefa) => (
                <TableRow key={tarefa.id}>
                  <TableCell className="font-medium">{tarefa.descricao}</TableCell>
                  <TableCell>{tarefa.frota}</TableCell>
                  <TableCell>{tarefa.tecnico}</TableCell>
                  <TableCell>{getPriorityBadge(tarefa.prioridade)}</TableCell>
                  <TableCell>{getStatusBadge(tarefa.status)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">Editar</Button>
                  </TableCell>
                </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
      </Card>

      {/* Contracts */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Contratos com Clientes</CardTitle>
          <CardDescription>Gestão de contratos e escopo de serviços</CardDescription>
        </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : contratos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum contrato cadastrado</p>
                <p className="text-sm mt-2">Dados via <code className="bg-muted px-2 py-1 rounded">GET /api/sop</code></p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Visitas/Mês</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contratos.map((contrato) => (
                <TableRow key={contrato.id}>
                  <TableCell className="font-medium">{contrato.cliente}</TableCell>
                  <TableCell>{contrato.escopo}</TableCell>
                  <TableCell>{contrato.visitasMes}x</TableCell>
                  <TableCell>{new Date(contrato.dataVencimento).toLocaleDateString()}</TableCell>
                  <TableCell>{getContratoStatus(contrato.status)}</TableCell>
                </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
      </Card>
    </div>
  );
}
