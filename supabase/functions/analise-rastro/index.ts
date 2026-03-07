import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  semanal: `Você é um consultor sênior de gestão de frotas da Rastro. Gere um relatório semanal executivo em português brasileiro.
Analise os dados fornecidos e produza:
1. Resumo executivo da semana
2. KPIs principais (pneus críticos, custo acumulado, movimentações)
3. Alertas prioritários
4. Recomendações para a próxima semana
5. Projeção de economia
Seja direto, use dados reais fornecidos, sem texto genérico.`,

  mensal: `Você é um consultor sênior de gestão de frotas da Rastro. Gere um relatório mensal executivo em português brasileiro.
Analise os dados fornecidos e produza:
1. Resumo executivo do mês
2. Comparativo vs período anterior
3. Análise de custos (CPK, custo total, economia com recapagem)
4. Ranking de veículos por consumo
5. Gargalos identificados e oportunidades
6. Plano de ação para o próximo mês
7. Conclusão executiva com projeção financeira
Seja preciso e consultivo.`,

  alertas: `Você é o sistema de inteligência da Rastro. Analise os alertas e dados de pneus fornecidos.
Retorne:
1. Priorização dos problemas por gravidade
2. Causas prováveis para cada anomalia
3. Ações corretivas recomendadas com prazo
4. Impacto financeiro estimado se não corrigido
5. Resumo em linguagem clara para o gestor`,

  classificar_carcaca: `Você é um especialista técnico em análise de carcaças de pneus. Com base na descrição e histórico:
1. Classifique a carcaça: apta_premium | apta | apta_com_restricao | reparavel | nao_apta | sucata
2. Justifique tecnicamente
3. Indique se há restrições para recapagem
4. Estime o valor residual`,

  recomendar_acao: `Você é o sistema de recomendação inteligente da Rastro. Analise os dados do pneu:
1. Recomende a ação: continuar_rodando | agendar_inspecao | enviar_recapagem | descartar
2. Justifique com base nos dados (sulco, km, pressão, custo)
3. Estime o impacto financeiro de cada opção
4. Prazo recomendado para ação`,

  anomalias: `Você é um analista de dados da Rastro. Identifique anomalias no consumo de pneus:
1. Veículos com consumo fora do padrão
2. Possíveis causas (desalinhamento, sobrecarga, condução)
3. Recomendações específicas por veículo
4. Estimativa de economia se corrigido`,

  recomendacao_compra: `Você é um consultor de compras de pneus da Rastro. Analise o estoque atual e consumo histórico.
Com base nos dados fornecidos (estoque por medida, consumo médio nos últimos 90 dias, cobertura estimada):
1. Liste as medidas que precisam de reposição urgente (cobertura < 7 dias)
2. Liste as medidas em alerta (cobertura entre 7 e 15 dias)
3. Para cada medida, sugira a quantidade ideal de compra para manter 30 dias de cobertura
4. Estime o investimento necessário com base no custo médio unitário
5. Priorize as sugestões por urgência
Seja direto e prático. Formate como lista de ações.`,

  analise_giro: `Você é um analista de estoque inteligente da Rastro. Analise os dados de giro do estoque de pneus.
Com base nos dados (movimentações dos últimos 90 dias, estoque atual, custo):
1. Identifique medidas de ALTO GIRO (rotação rápida) — priorizar manutenção de estoque mínimo
2. Identifique medidas de BAIXO GIRO (paradas > 60 dias) — avaliar venda, descarte ou transferência
3. Calcule o custo de capital parado em itens de baixo giro
4. Sugira otimizações: redistribuir estoque, negociar com fornecedores, oportunidades de venda
5. Conclusão com potencial de economia
Use dados reais. Formate com seções claras e emojis para prioridade.`,

  alerta_pneu_parado: `Você é o sistema de inteligência da Rastro para gestão de estoque. Analise pneus parados.
Com base nos dados (pneus em estoque com dias parados, condição, custo):
1. Liste pneus parados há mais de 90 dias com recomendação individual:
   - Vender (com sugestão de preço baseado no custo e depreciação)
   - Enviar para recapagem (se carcaça apta)
   - Manter (se medida estratégica com demanda futura)
   - Descartar (se sucata ou sem viabilidade)
2. Calcule o custo de oportunidade de manter esses itens parados
3. Priorize por valor financeiro imobilizado
4. Resumo executivo com ação imediata recomendada`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tipo, dados } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const systemPrompt = SYSTEM_PROMPTS[tipo] || SYSTEM_PROMPTS.alertas;
    const userMessage = `Dados para análise:\n${JSON.stringify(dados, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analise = data.choices?.[0]?.message?.content || "Análise não disponível";

    return new Response(JSON.stringify({ analise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analise-rastro error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
