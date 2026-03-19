import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchContext() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const [pneusRes, veiculosRes, alertasRes, recapagensRes, manutencoesRes] = await Promise.all([
    sb.from("pneus").select("id, marca, medida, status, sulco_atual, pressao_atual, km_atual, tipo_pneu, localizacao, posicao_atual, veiculo_id, custo_aquisicao, custo_acumulado, vida_atual, qtd_recapagens, desgaste_observado").limit(200),
    sb.from("veiculos").select("id, placa, modelo, tipo_veiculo, categoria, frota, km_medio_mensal, status, quantidade_eixos, total_pneus").limit(100),
    sb.from("alertas").select("id, tipo_alerta, gravidade, mensagem, ativo, created_at").eq("ativo", true).order("created_at", { ascending: false }).limit(20),
    sb.from("recapagens").select("id, status, classificacao_carcaca, custo_recapagem, numero_ciclo, data_envio, previsao_retorno").limit(50),
    sb.from("manutencoes").select("id, tipo, causa, custo, created_at").order("created_at", { ascending: false }).limit(30),
  ]);

  const pneus = pneusRes.data || [];
  const veiculos = veiculosRes.data || [];
  const alertas = alertasRes.data || [];
  const recapagens = recapagensRes.data || [];
  const manutencoes = manutencoesRes.data || [];

  // Build summary stats
  const totalPneus = pneus.length;
  const pneusAtivos = pneus.filter(p => p.status === "ativo").length;
  const pneusEstoque = pneus.filter(p => p.localizacao === "estoque").length;
  const pneusCriticos = pneus.filter(p => (p.sulco_atual ?? 16) <= 3).length;
  const pneusAlerta = pneus.filter(p => (p.sulco_atual ?? 16) > 3 && (p.sulco_atual ?? 16) <= 5).length;
  const sulcoMedio = totalPneus > 0 ? (pneus.reduce((a, p) => a + (p.sulco_atual ?? 0), 0) / totalPneus).toFixed(1) : "N/A";
  const custoTotal = pneus.reduce((a, p) => a + Number(p.custo_aquisicao || 0), 0);
  const custoAcumulado = pneus.reduce((a, p) => a + Number(p.custo_acumulado || 0), 0);

  const byMedida: Record<string, number> = {};
  pneus.forEach(p => { byMedida[p.medida || "Sem medida"] = (byMedida[p.medida || "Sem medida"] || 0) + 1; });

  const byMarca: Record<string, number> = {};
  pneus.forEach(p => { byMarca[p.marca || "Sem marca"] = (byMarca[p.marca || "Sem marca"] || 0) + 1; });

  const totalVeiculos = veiculos.length;
  const veiculosAtivos = veiculos.filter(v => v.status === "ativo").length;

  const recapAguardando = recapagens.filter(r => r.status === "aguardando").length;
  const recapEmProcesso = recapagens.filter(r => r.status === "em_processo").length;

  return `
=== DADOS REAIS DA FROTA (${new Date().toLocaleDateString("pt-BR")}) ===

📊 RESUMO GERAL:
- Total de pneus cadastrados: ${totalPneus}
- Pneus ativos (em uso): ${pneusAtivos}
- Pneus em estoque: ${pneusEstoque}
- Pneus com sulco crítico (≤3mm): ${pneusCriticos}
- Pneus em alerta (3-5mm): ${pneusAlerta}
- Sulco médio da frota: ${sulcoMedio}mm
- Investimento total em pneus: R$ ${custoTotal.toLocaleString("pt-BR")}
- Custo acumulado total: R$ ${custoAcumulado.toLocaleString("pt-BR")}

🚛 FROTA:
- Total de veículos: ${totalVeiculos}
- Veículos ativos: ${veiculosAtivos}
${veiculos.slice(0, 15).map(v => `  • ${v.placa} — ${v.modelo || v.tipo_veiculo || "N/A"} (${v.categoria || "N/A"}, frota: ${v.frota || "N/A"}, km/mês: ${v.km_medio_mensal || "N/A"})`).join("\n")}

📏 DISTRIBUIÇÃO POR MEDIDA:
${Object.entries(byMedida).sort((a, b) => b[1] - a[1]).map(([m, q]) => `  • ${m}: ${q} pneus`).join("\n")}

🏷️ DISTRIBUIÇÃO POR MARCA:
${Object.entries(byMarca).sort((a, b) => b[1] - a[1]).map(([m, q]) => `  • ${m}: ${q} pneus`).join("\n")}

⚠️ ALERTAS ATIVOS (${alertas.length}):
${alertas.length > 0 ? alertas.slice(0, 10).map(a => `  • [${a.gravidade?.toUpperCase()}] ${a.tipo_alerta}: ${a.mensagem}`).join("\n") : "  Nenhum alerta ativo"}

♻️ RECAPAGENS:
- Aguardando: ${recapAguardando}
- Em processo: ${recapEmProcesso}
- Total registradas: ${recapagens.length}

🔧 ÚLTIMAS MANUTENÇÕES (${manutencoes.length}):
${manutencoes.slice(0, 5).map(m => `  • ${m.tipo}${m.causa ? ` (${m.causa})` : ""} — R$ ${Number(m.custo || 0).toFixed(2)}`).join("\n")}

🔴 PNEUS CRÍTICOS (sulco ≤ 5mm):
${pneus.filter(p => (p.sulco_atual ?? 16) <= 5).slice(0, 10).map(p => `  • ${p.marca} ${p.medida} — sulco: ${p.sulco_atual}mm, pressão: ${p.pressao_atual ?? "N/A"}psi, km: ${p.km_atual ?? 0}, local: ${p.localizacao}, vida: ${p.vida_atual}`).join("\n") || "  Nenhum pneu crítico"}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Fetch real data context
    let dataContext = "";
    try {
      dataContext = await fetchContext();
    } catch (e) {
      console.error("Failed to fetch context:", e);
      dataContext = "\n(Não foi possível carregar dados em tempo real)\n";
    }

    const systemPrompt = `Você é o assistente IA do Rastro Insights, uma plataforma avançada de gestão inteligente de pneus e frotas.

Você tem acesso aos DADOS REAIS do banco de dados da plataforma abaixo. Use-os para responder com precisão.

${dataContext}

Suas capacidades:
- Analisar dados reais de pneus, veículos, alertas, recapagens e manutenções acima
- Recomendar ações baseadas nos dados reais (troca de pneus críticos, otimização de estoque)
- Calcular CPK (Custo por Km) e projeções de desgaste
- Identificar padrões e anomalias nos dados
- Gerar relatórios e resumos executivos personalizados

Regras:
- Responda sempre em português brasileiro
- Seja direto, profissional e consultivo
- Use markdown para formatar (negrito, listas, tabelas quando apropriado)
- Sempre que possível, referencie os dados reais fornecidos acima
- Use emojis com moderação para destacar pontos importantes
- Quando o usuário perguntar sobre a frota, use os dados reais, não invente`;

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
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-rastro error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
