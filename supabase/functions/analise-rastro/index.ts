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
