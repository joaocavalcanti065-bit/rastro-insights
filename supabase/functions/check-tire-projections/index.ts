import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active tires with tread data
    const { data: pneus, error: pneusError } = await supabase
      .from("pneus")
      .select("id, id_unico, marca, modelo_pneu, medida, sulco_atual, sulco_inicial, veiculo_id, empresa_id, status")
      .eq("status", "ativo");

    if (pneusError) throw pneusError;

    if (!pneus || pneus.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum pneu ativo encontrado", alerts_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LIMITE_SEGURANCA_MM = 3;
    const TAXA_DESGASTE_COM_RECOMENDACOES = 0.8; // mm/mês
    const TAXA_DESGASTE_SEM_RECOMENDACOES = 1.5; // mm/mês
    const MESES_ALERTA = 2;
    let alertsCriados = 0;

    for (const pneu of pneus) {
      const sulcoAtual = pneu.sulco_atual ?? 0;

      if (sulcoAtual <= LIMITE_SEGURANCA_MM) {
        // Already below safety — create critical alert
        const { error } = await supabase.from("alertas").insert({
          tipo_alerta: "sulco_critico",
          gravidade: "critica",
          mensagem: `Pneu ${pneu.id_unico} (${pneu.marca} ${pneu.medida ?? ""}) está com sulco de ${sulcoAtual}mm, ABAIXO do limite de segurança de ${LIMITE_SEGURANCA_MM}mm. Substituição imediata recomendada.`,
          acao_sugerida: "Substituir o pneu imediatamente. Encaminhar para análise de carcaça ou sucata.",
          pneu_id: pneu.id,
          veiculo_id: pneu.veiculo_id,
          empresa_id: pneu.empresa_id,
          ativo: true,
        });
        if (!error) alertsCriados++;
        continue;
      }

      // Calculate months until safety limit with normal wear
      const mmAteLimit = sulcoAtual - LIMITE_SEGURANCA_MM;
      const mesesComRecomendacoes = mmAteLimit / TAXA_DESGASTE_COM_RECOMENDACOES;
      const mesesSemRecomendacoes = mmAteLimit / TAXA_DESGASTE_SEM_RECOMENDACOES;

      // Alert if tire will reach limit within 2 months (worst case scenario)
      if (mesesSemRecomendacoes <= MESES_ALERTA) {
        let gravidade = "alta";
        let mensagem = "";
        let acaoSugerida = "";

        if (mesesComRecomendacoes <= MESES_ALERTA) {
          // Even with recommendations, will hit limit
          gravidade = "critica";
          mensagem = `Pneu ${pneu.id_unico} (${pneu.marca} ${pneu.medida ?? ""}) atingirá o limite de ${LIMITE_SEGURANCA_MM}mm em ~${Math.round(mesesComRecomendacoes)} mês(es) mesmo com manutenção adequada. Sulco atual: ${sulcoAtual}mm.`;
          acaoSugerida = "Programar substituição ou recapagem urgente. Verificar disponibilidade em estoque.";
        } else {
          // Only without recommendations will hit limit
          gravidade = "alta";
          mensagem = `Pneu ${pneu.id_unico} (${pneu.marca} ${pneu.medida ?? ""}) pode atingir o limite de ${LIMITE_SEGURANCA_MM}mm em ~${Math.round(mesesSemRecomendacoes)} mês(es) sem manutenção adequada. Sulco atual: ${sulcoAtual}mm. Com recomendações: ~${Math.round(mesesComRecomendacoes)} meses.`;
          acaoSugerida = "Seguir recomendações de calibragem e rodízio para estender a vida útil. Monitorar sulco mensalmente.";
        }

        // Check if similar alert already exists (avoid duplicates)
        const { data: existingAlerts } = await supabase
          .from("alertas")
          .select("id")
          .eq("pneu_id", pneu.id)
          .eq("tipo_alerta", "projecao_sulco")
          .eq("ativo", true)
          .limit(1);

        if (existingAlerts && existingAlerts.length > 0) {
          // Update existing alert
          await supabase
            .from("alertas")
            .update({ mensagem, gravidade, acao_sugerida: acaoSugerida })
            .eq("id", existingAlerts[0].id);
        } else {
          // Create new alert
          const { error } = await supabase.from("alertas").insert({
            tipo_alerta: "projecao_sulco",
            gravidade,
            mensagem,
            acao_sugerida: acaoSugerida,
            pneu_id: pneu.id,
            veiculo_id: pneu.veiculo_id,
            empresa_id: pneu.empresa_id,
            ativo: true,
          });
          if (!error) alertsCriados++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Verificação concluída. ${alertsCriados} alertas criados.`,
        alerts_created: alertsCriados,
        tires_checked: pneus.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na verificação de projeções:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
