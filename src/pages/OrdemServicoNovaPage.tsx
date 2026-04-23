import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, FileDown, Save, Trash2, Truck, Wrench } from "lucide-react";
import { TIPOS_OS, LOCAIS_EXECUCAO, STATUS_OS } from "@/lib/os-catalogo-servicos";
import { VeiculoTopDownLayout, LayoutPneus, PneuStatus } from "@/components/os/VeiculoTopDownLayout";
import { ServicosDrawer, ServicoSelecionado } from "@/components/os/ServicosDrawer";
import { gerarPDFOrdemServico } from "@/lib/os-pdf";
import { acoesDisponiveis, avaliarTransicao, OsStatus } from "@/lib/os-state-machine";

type ItemPendente = ServicoSelecionado & {
  posicao_codigo: string;
  tempId: string;
};

export default function OrdemServicoNovaPage() {
  const navigate = useNavigate();
  const params = useParams();
  const editId = params.id;
  const queryClient = useQueryClient();
  const [osId, setOsId] = useState<string | null>(editId || null);
  const [veiculoId, setVeiculoId] = useState("");
  const [tipoOs, setTipoOs] = useState("PREVENTIVA");
  const [localExec, setLocalExec] = useState("OFICINA_INTERNA");
  const [responsavel, setResponsavel] = useState("");
  const [hodometro, setHodometro] = useState<number>(0);
  const [observacoes, setObservacoes] = useState("");
  const [posicoesSelecionadas, setPosicoesSelecionadas] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [itensPendentes, setItensPendentes] = useState<ItemPendente[]>([]);
  const [status, setStatus] = useState<OsStatus>("RASCUNHO");
  const [numeroOs, setNumeroOs] = useState<string>("");

  // Limite de aprovação configurável (R$)
  const { data: limiteAprovacao = 0 } = useQuery({
    queryKey: ["os-limite-aprovacao"],
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "os_limite_aprovacao")
        .maybeSingle();
      return Number(data?.valor || 0);
    },
  });

  // Veículos
  const { data: veiculos } = useQuery({
    queryKey: ["os-veiculos"],
    queryFn: async () => {
      const { data } = await supabase.from("veiculos").select("id, placa, modelo, marca, tipo_veiculo");
      return data || [];
    },
  });

  const veiculo = veiculos?.find((v) => v.id === veiculoId);

  // Layout do veículo
  const { data: layoutData } = useQuery({
    queryKey: ["os-layout", veiculo?.tipo_veiculo],
    enabled: !!veiculo?.tipo_veiculo,
    queryFn: async () => {
      // Tenta match exato, senão usa fallback Truck
      const tipoUpper = (veiculo?.tipo_veiculo || "").toUpperCase().replace(/\s+/g, "_");
      const { data } = await (supabase as any)
        .from("layouts_pneus_veiculo")
        .select("*")
        .or(`tipo_veiculo.eq.${tipoUpper},tipo_veiculo.eq.TRUCK`)
        .order("tipo_veiculo");
      return (data?.find((d: any) => d.tipo_veiculo === tipoUpper) || data?.[0]) as
        | { layout_json: LayoutPneus; nome_exibicao: string; tipo_veiculo: string }
        | undefined;
    },
  });

  // Pneus instalados
  const { data: pneusInstalados } = useQuery({
    queryKey: ["os-pneus-veiculo", veiculoId],
    enabled: !!veiculoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("pneus")
        .select("id, id_unico, marca, modelo_pneu, posicao_atual, sulco_atual, pressao_atual, vida_atual")
        .eq("veiculo_id", veiculoId);
      return data || [];
    },
  });

  // Pneus em estoque
  const { data: pneusEstoque } = useQuery({
    queryKey: ["os-pneus-estoque"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pneus")
        .select("id, id_unico, marca, medida")
        .eq("localizacao", "estoque");
      return data || [];
    },
  });

  // Carregar OS existente (modo edição)
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data: os } = await (supabase as any).from("ordens_servico").select("*").eq("id", editId).maybeSingle();
      if (os) {
        setVeiculoId(os.veiculo_id);
        setTipoOs(os.tipo_os);
        setLocalExec(os.local_execucao);
        setResponsavel(os.responsavel || "");
        setHodometro(os.hodometro_km || 0);
        setObservacoes(os.observacoes || "");
        setStatus(os.status);
        setNumeroOs(os.numero_os);
      }
      const { data: itens } = await (supabase as any).from("ordens_servico_itens").select("*").eq("ordem_servico_id", editId);
      if (itens) {
        setItensPendentes(
          itens.map((it: any) => ({
            tempId: it.id,
            codigo: it.tipo_servico,
            nome: it.tipo_servico,
            categoria: it.categoria_servico,
            custoUnitario: Number(it.custo_unitario),
            tempoMinutos: it.tempo_estimado_minutos,
            tecnico: it.tecnico_responsavel,
            observacoes: it.observacoes_tecnicas,
            posicaoDestino: it.posicao_destino,
            pneuNovoId: it.pneu_novo_id,
            posicao_codigo: it.posicao_codigo,
          })),
        );
      }
    })();
  }, [editId]);

  // Map pneus por posição
  const pneusPorPosicao = useMemo(() => {
    const map: Record<string, PneuStatus> = {};
    (pneusInstalados || []).forEach((p) => {
      if (!p.posicao_atual) return;
      const sulco = p.sulco_atual ?? null;
      const status_visual: PneuStatus["status_visual"] =
        sulco == null ? "vazio" : sulco <= 3 ? "critico" : sulco < 5 ? "atencao" : "bom";
      const servicosCount = itensPendentes.filter((i) => i.posicao_codigo === p.posicao_atual).length;
      map[p.posicao_atual] = {
        posicao: p.posicao_atual,
        pneu_id: p.id,
        marca: p.marca,
        modelo: p.modelo_pneu || undefined,
        sulco_atual: p.sulco_atual,
        pressao_atual: p.pressao_atual,
        vida_atual: p.vida_atual,
        status_visual,
        servicosCount,
      };
    });
    // Garantir que posições vazias do layout também tenham contador de serviços
    if (layoutData?.layout_json) {
      layoutData.layout_json.eixos.forEach((eixo) =>
        eixo.posicoes.forEach((pos) => {
          if (!map[pos]) {
            const servicosCount = itensPendentes.filter((i) => i.posicao_codigo === pos).length;
            map[pos] = { posicao: pos, status_visual: "vazio", servicosCount };
          }
        }),
      );
    }
    return map;
  }, [pneusInstalados, itensPendentes, layoutData]);

  const todasPosicoes = useMemo(
    () => layoutData?.layout_json?.eixos.flatMap((e) => e.posicoes) || [],
    [layoutData],
  );

  const handlePneuClick = (pos: string, multi?: boolean) => {
    setPosicoesSelecionadas((prev) => {
      if (multi) {
        return prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos];
      }
      return prev.length === 1 && prev[0] === pos ? [] : [pos];
    });
  };

  const handleSelecionarEixo = (numero: number) => {
    const eixo = layoutData?.layout_json?.eixos.find((e) => e.numero === numero);
    if (!eixo) return;
    setPosicoesSelecionadas(eixo.posicoes);
  };

  const abrirDrawer = () => {
    if (posicoesSelecionadas.length === 0) {
      toast.error("Selecione ao menos um pneu primeiro");
      return;
    }
    setDrawerOpen(true);
  };

  const onConfirmarServicos = (servs: ServicoSelecionado[]) => {
    const novos: ItemPendente[] = [];
    posicoesSelecionadas.forEach((pos) => {
      servs.forEach((s) => {
        novos.push({ ...s, posicao_codigo: pos, tempId: `${pos}-${s.codigo}-${Date.now()}-${Math.random()}` });
      });
    });
    setItensPendentes((prev) => [...prev, ...novos]);
    setPosicoesSelecionadas([]);
    toast.success(`${novos.length} serviço(s) adicionado(s)`);
  };

  const removerItem = (tempId: string) => {
    setItensPendentes((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const totais = useMemo(() => {
    const custo = itensPendentes.reduce((s, x) => s + (x.custoUnitario || 0), 0);
    const tempo = itensPendentes.reduce((s, x) => s + (x.tempoMinutos || 0), 0);
    const pneus = new Set(itensPendentes.map((i) => i.posicao_codigo)).size;
    return { custo, tempo, pneus, count: itensPendentes.length };
  }, [itensPendentes]);

  // Salvar
  const salvarMutation = useMutation({
    mutationFn: async (statusFinal: string) => {
      if (!veiculoId) throw new Error("Selecione um veículo");
      let id = osId;

      if (!id) {
        const { data, error } = await (supabase as any)
          .from("ordens_servico")
          .insert({
            veiculo_id: veiculoId,
            tipo_os: tipoOs,
            local_execucao: localExec,
            responsavel,
            hodometro_km: hodometro || null,
            observacoes,
            status: statusFinal,
          })
          .select()
          .single();
        if (error) throw error;
        id = data.id;
        setOsId(id);
        setNumeroOs(data.numero_os);
        setStatus(data.status);
      } else {
        const { error } = await (supabase as any)
          .from("ordens_servico")
          .update({
            veiculo_id: veiculoId,
            tipo_os: tipoOs,
            local_execucao: localExec,
            responsavel,
            hodometro_km: hodometro || null,
            observacoes,
            status: statusFinal,
          })
          .eq("id", id);
        if (error) throw error;
        setStatus(statusFinal);
        // Limpa itens antigos para reinserir
        await (supabase as any).from("ordens_servico_itens").delete().eq("ordem_servico_id", id);
      }

      if (itensPendentes.length > 0) {
        const payload = itensPendentes.map((it) => ({
          ordem_servico_id: id,
          pneu_id: pneusInstalados?.find((p) => p.posicao_atual === it.posicao_codigo)?.id || null,
          posicao_codigo: it.posicao_codigo,
          tipo_servico: it.codigo,
          categoria_servico: it.categoria,
          custo_unitario: it.custoUnitario,
          tempo_estimado_minutos: it.tempoMinutos,
          tecnico_responsavel: it.tecnico || null,
          observacoes_tecnicas: it.observacoes || null,
          posicao_destino: it.posicaoDestino || null,
          pneu_novo_id: it.pneuNovoId || null,
        }));
        const { error } = await (supabase as any).from("ordens_servico_itens").insert(payload);
        if (error) throw error;
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico-list"] });
      toast.success("OS salva com sucesso");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  // Aplicar integrações ao concluir
  const concluirMutation = useMutation({
    mutationFn: async () => {
      const id = await salvarMutation.mutateAsync("CONCLUIDA");

      // Aplica efeitos colaterais
      for (const it of itensPendentes) {
        const pneuId = pneusInstalados?.find((p) => p.posicao_atual === it.posicao_codigo)?.id;

        if (it.codigo === "RODIZIO" && pneuId && it.posicaoDestino) {
          await supabase.from("pneus").update({ posicao_atual: it.posicaoDestino }).eq("id", pneuId);
          await supabase.from("movimentacoes_pneus").insert({
            pneu_id: pneuId,
            tipo_movimentacao: "rodizio",
            origem: it.posicao_codigo,
            destino: it.posicaoDestino,
            posicao_destino: it.posicaoDestino,
            veiculo_origem_id: veiculoId,
            veiculo_destino_id: veiculoId,
            km_no_momento: hodometro,
            observacoes: `OS ${numeroOs}`,
          });
        }
        if (it.codigo === "TROCA_PNEU" && it.pneuNovoId) {
          if (pneuId) {
            await supabase.from("pneus").update({ veiculo_id: null, posicao_atual: null, localizacao: "estoque" }).eq("id", pneuId);
          }
          await supabase
            .from("pneus")
            .update({ veiculo_id: veiculoId, posicao_atual: it.posicao_codigo, localizacao: "rodando" })
            .eq("id", it.pneuNovoId);
        }
        if (it.codigo === "DESCARTE" && pneuId) {
          await supabase.from("pneus").update({ status: "sucata", localizacao: "descartado", veiculo_id: null, posicao_atual: null }).eq("id", pneuId);
        }
        if (it.codigo === "RECAPAGEM" && pneuId) {
          await supabase.from("pneus").update({ localizacao: "recapagem", veiculo_id: null, posicao_atual: null }).eq("id", pneuId);
        }

        // Registra manutenção legada (compatibilidade com módulo existente)
        await supabase.from("manutencoes").insert({
          veiculo_id: veiculoId,
          pneu_id: pneuId || null,
          tipo: it.codigo.toLowerCase(),
          causa: tipoOs.toLowerCase(),
          custo: it.custoUnitario,
          km_no_momento: hodometro,
          observacoes: `OS ${numeroOs} — Pos. ${it.posicao_codigo}`,
        });
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("OS concluída e integrações aplicadas!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao concluir"),
  });

  const baixarPDF = async () => {
    if (!veiculo) return toast.error("Salve a OS antes de gerar o PDF");
    if (!numeroOs) {
      await salvarMutation.mutateAsync("RASCUNHO");
    }
    await gerarPDFOrdemServico({
      numero_os: numeroOs || "OS-RASCUNHO",
      veiculo_placa: veiculo.placa,
      veiculo_modelo: veiculo.modelo || undefined,
      responsavel,
      hodometro_km: hodometro,
      tipo_os: tipoOs,
      local_execucao: localExec,
      status,
      custo_total: totais.custo,
      tempo_total_minutos: totais.tempo,
      observacoes,
      aberta_em: new Date().toISOString(),
      itens: itensPendentes.map((it) => ({
        posicao_codigo: it.posicao_codigo,
        tipo_servico: it.nome,
        categoria_servico: it.categoria,
        custo_unitario: it.custoUnitario,
        tempo_estimado_minutos: it.tempoMinutos,
        tecnico_responsavel: it.tecnico,
        observacoes_tecnicas: it.observacoes,
      })),
    });
  };

  const statusInfo = STATUS_OS.find((s) => s.value === status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/manutencao")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {numeroOs || "Nova Ordem de Serviço"}
            </h1>
            {statusInfo && <Badge className={statusInfo.cor}>{statusInfo.label}</Badge>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={baixarPDF} disabled={itensPendentes.length === 0}>
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" onClick={() => salvarMutation.mutate("RASCUNHO")} disabled={salvarMutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> Rascunho
          </Button>
          <Button onClick={() => salvarMutation.mutate("ABERTA")} disabled={!veiculoId || salvarMutation.isPending}>
            Abrir OS
          </Button>
          <Button variant="default" className="bg-chart-1 hover:bg-chart-1/90" onClick={() => concluirMutation.mutate()} disabled={!veiculoId || concluirMutation.isPending || itensPendentes.length === 0}>
            <Send className="h-4 w-4 mr-2" /> Concluir
          </Button>
        </div>
      </div>

      {/* Cabeçalho */}
      <Card>
        <CardContent className="p-4 grid md:grid-cols-3 gap-4">
          <div>
            <Label className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-primary" /> Veículo</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {veiculos?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo || ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de OS</Label>
            <Select value={tipoOs} onValueChange={setTipoOs}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_OS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Local de execução</Label>
            <Select value={localExec} onValueChange={setLocalExec}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOCAIS_EXECUCAO.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome" />
          </div>
          <div>
            <Label>Hodômetro (km)</Label>
            <Input type="number" value={hodometro || ""} onChange={(e) => setHodometro(Number(e.target.value))} />
          </div>
          <div className="md:col-span-1">
            <Label>Observações iniciais</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Layout pneus */}
      {!veiculoId ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Selecione um veículo para visualizar o layout dos pneus.
          </CardContent>
        </Card>
      ) : !layoutData ? (
        <Skeleton className="h-72" />
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-semibold">{layoutData.nome_exibicao}</h2>
                <p className="text-xs text-muted-foreground">
                  {layoutData.layout_json.eixos.length} eixos · {todasPosicoes.length} pneus
                </p>
              </div>
              <Button onClick={abrirDrawer} disabled={posicoesSelecionadas.length === 0}>
                <Wrench className="h-4 w-4 mr-2" />
                Adicionar serviços ({posicoesSelecionadas.length})
              </Button>
            </div>
            <VeiculoTopDownLayout
              layout={layoutData.layout_json}
              pneusPorPosicao={pneusPorPosicao}
              onPneuClick={handlePneuClick}
              onSelecionarEixo={handleSelecionarEixo}
              posicoesSelecionadas={posicoesSelecionadas}
            />
          </CardContent>
        </Card>
      )}

      {/* Itens da OS */}
      {itensPendentes.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold">Serviços da OS</h2>
              <div className="flex gap-3 text-xs text-muted-foreground items-center">
                <Badge variant="outline">{totais.pneus} pneu(s)</Badge>
                <Badge variant="outline">{totais.count} serviço(s)</Badge>
                <span>⏱ {totais.tempo} min</span>
                <span className="text-base font-bold text-foreground">
                  R$ {totais.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pos.</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensPendentes.map((it) => (
                  <TableRow key={it.tempId}>
                    <TableCell className="font-mono text-xs">{it.posicao_codigo}</TableCell>
                    <TableCell>
                      {it.nome}
                      {it.posicaoDestino && <span className="text-xs text-muted-foreground ml-1">→ {it.posicaoDestino}</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{it.categoria}</Badge></TableCell>
                    <TableCell className="text-sm">{it.tecnico || "—"}</TableCell>
                    <TableCell className="text-sm">{it.tempoMinutos}min</TableCell>
                    <TableCell className="text-sm">R$ {it.custoUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removerItem(it.tempId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ServicosDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        posicoes={posicoesSelecionadas}
        posicoesDisponiveis={todasPosicoes}
        pneusEstoque={pneusEstoque || []}
        onConfirmar={onConfirmarServicos}
      />
    </div>
  );
}
