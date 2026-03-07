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

    // Fetch all fuel records ordered by vehicle and date
    const { data: abastecimentos, error } = await supabase
      .from("coleta_manual_combustivel")
      .select("*")
      .order("data_abastecimento", { ascending: true });

    if (error) throw error;

    if (!abastecimentos || abastecimentos.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum abastecimento encontrado", alerts_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by vehicle
    const byVehicle: Record<string, typeof abastecimentos> = {};
    for (const a of abastecimentos) {
      if (!byVehicle[a.veiculo_id]) byVehicle[a.veiculo_id] = [];
      byVehicle[a.veiculo_id].push(a);
    }

    const THRESHOLD = 0.15; // 15% drop
    let alertsCriados = 0;

    for (const [veiculoId, records] of Object.entries(byVehicle)) {
      // Only consider records with valid consumption data
      const withConsumption = records.filter(
        (r) => r.consumo_km_por_litro && r.consumo_km_por_litro > 0
      );

      if (withConsumption.length < 3) continue; // Need at least 3 records for meaningful average

      // Calculate historical average (all except last record)
      const historicalRecords = withConsumption.slice(0, -1);
      const lastRecord = withConsumption[withConsumption.length - 1];

      const avgHistorico =
        historicalRecords.reduce((a, r) => a + Number(r.consumo_km_por_litro), 0) /
        historicalRecords.length;

      const consumoAtual = Number(lastRecord.consumo_km_por_litro);
      const queda = (avgHistorico - consumoAtual) / avgHistorico;

      if (queda >= THRESHOLD) {
        const quedaPercent = (queda * 100).toFixed(1);

        // Check for existing active alert for this vehicle
        const { data: existing } = await supabase
          .from("alertas")
          .select("id")
          .eq("veiculo_id", veiculoId)
          .eq("tipo_alerta", "queda_eficiencia_combustivel")
          .eq("ativo", true)
          .limit(1);

        const mensagem = `Veículo com queda de ${quedaPercent}% no consumo de combustível. Média histórica: ${avgHistorico.toFixed(2)} km/L → Último registro: ${consumoAtual.toFixed(2)} km/L. Data: ${lastRecord.data_abastecimento}.`;
        const acaoSugerida = `Verificar: alinhamento, calibragem dos pneus, filtro de ar, sistema de injeção. Investigar mudanças de rota ou carga excessiva.`;
        const gravidade = queda >= 0.30 ? "critica" : queda >= 0.20 ? "alta" : "media";

        if (existing && existing.length > 0) {
          await supabase
            .from("alertas")
            .update({ mensagem, gravidade, acao_sugerida: acaoSugerida })
            .eq("id", existing[0].id);
        } else {
          const { error: insertError } = await supabase.from("alertas").insert({
            tipo_alerta: "queda_eficiencia_combustivel",
            gravidade,
            mensagem,
            acao_sugerida: acaoSugerida,
            veiculo_id: veiculoId,
            empresa_id: null,
            ativo: true,
          });
          if (!insertError) alertsCriados++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Verificação concluída. ${alertsCriados} alertas de combustível criados.`,
        alerts_created: alertsCriados,
        vehicles_checked: Object.keys(byVehicle).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na verificação de eficiência:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
