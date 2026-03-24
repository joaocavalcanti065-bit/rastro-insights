import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { Settings, Plus, Building2, Users } from "lucide-react";

export default function CadastrosPage() {
  const queryClient = useQueryClient();
  const [fornOpen, setFornOpen] = useState(false);
  const [fornForm, setFornForm] = useState({ nome: "", tipo: "recapadora", cnpj: "", contato: "" });

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data } = await supabase.from("fornecedores").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createFornecedor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fornecedores").insert(fornForm);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast.success("Fornecedor cadastrado!");
      setFornOpen(false);
      setFornForm({ nome: "", tipo: "recapadora", cnpj: "", contato: "" });
    },
    onError: () => toast.error("Erro ao cadastrar fornecedor"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cadastros</h1>

      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="empresas">Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={clienteOpen} onOpenChange={setClienteOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div><Label>Nome *</Label><Input value={clienteForm.nome} onChange={e => setClienteForm({ ...clienteForm, nome: e.target.value })} /></div>
                  <div><Label>Nome Fantasia</Label><Input value={clienteForm.nome_fantasia} onChange={e => setClienteForm({ ...clienteForm, nome_fantasia: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Responsável</Label><Input value={clienteForm.responsavel} onChange={e => setClienteForm({ ...clienteForm, responsavel: e.target.value })} /></div>
                    <div><Label>Telefone</Label><Input value={clienteForm.telefone} onChange={e => setClienteForm({ ...clienteForm, telefone: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Email</Label><Input value={clienteForm.email} onChange={e => setClienteForm({ ...clienteForm, email: e.target.value })} /></div>
                    <div><Label>Cidade</Label><Input value={clienteForm.cidade} onChange={e => setClienteForm({ ...clienteForm, cidade: e.target.value })} /></div>
                  </div>
                  <div><Label>Observações</Label><Input value={clienteForm.observacoes} onChange={e => setClienteForm({ ...clienteForm, observacoes: e.target.value })} /></div>
                  <Button onClick={() => createCliente.mutate()} disabled={!clienteForm.nome || createCliente.isPending}>
                    {createCliente.isPending ? "Salvando..." : "Cadastrar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!clientesData?.length ? (
            <EmptyState icon={Users} title="Nenhum cliente" description="Cadastre o primeiro cliente para vincular veículos." actionLabel="Cadastrar Cliente" onAction={() => setClienteOpen(true)} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Fantasia</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesData.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.nome_fantasia || "—"}</TableCell>
                        <TableCell>{c.responsavel || "—"}</TableCell>
                        <TableCell>{c.telefone || "—"}</TableCell>
                        <TableCell>{c.cidade || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={fornOpen} onOpenChange={setFornOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div><Label>Nome</Label><Input value={fornForm.nome} onChange={e => setFornForm({ ...fornForm, nome: e.target.value })} /></div>
                  <div><Label>Tipo</Label>
                    <Select value={fornForm.tipo} onValueChange={v => setFornForm({ ...fornForm, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recapadora">Recapadora</SelectItem>
                        <SelectItem value="borracharia">Borracharia</SelectItem>
                        <SelectItem value="distribuidor">Distribuidor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>CNPJ</Label><Input value={fornForm.cnpj} onChange={e => setFornForm({ ...fornForm, cnpj: e.target.value })} /></div>
                  <div><Label>Contato</Label><Input value={fornForm.contato} onChange={e => setFornForm({ ...fornForm, contato: e.target.value })} /></div>
                  <Button onClick={() => createFornecedor.mutate()} disabled={!fornForm.nome || createFornecedor.isPending}>
                    {createFornecedor.isPending ? "Salvando..." : "Cadastrar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!fornecedores?.length ? (
            <EmptyState icon={Building2} title="Nenhum fornecedor" description="Cadastre recapadoras, borracharias e distribuidores." actionLabel="Cadastrar Fornecedor" onAction={() => setFornOpen(true)} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Contato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fornecedores.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell>{f.tipo}</TableCell>
                        <TableCell>{f.cnpj || "—"}</TableCell>
                        <TableCell>{f.contato || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="empresas">
          <EmptyState icon={Users} title="Gestão de Empresa" description="Configure os dados da empresa e gerencie usuários e perfis de acesso." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
