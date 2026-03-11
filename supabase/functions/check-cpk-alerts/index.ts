import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all active tires with cost and km data
    const { data: pneus, error } = await supabase
      .from("pneus")
      .select("id, marca, modelo_pneu, medida, km_atual, km_inicial, custo_aquisicao, custo_acumulado, empresa_id")
      .not("status", "in", '("sucata","extraviado")');

    if (error) throw error;
    if (!pneus || pneus.length === 0) {
      return new Response(JSON.stringify({ message: "Sem pneus para análise" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate CPK per tire
    const tiresWithCpk = pneus
      .map((p) => {
        const km = Math.max(0, (p.km_atual || 0) - (p.km_inicial || 0));
        const custo = Number(p.custo_aquisicao || 0) + Number(p.custo_acumulado || 0);
        const cpk = km > 0 ? custo / km : 0;
        return { ...p, km, custo, cpk };
      })
      .filter((p) => p.cpk > 0);

    if (tiresWithCpk.length === 0) {
      return new Response(JSON.stringify({ message: "Sem dados de CPK" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Global average CPK
    const cpkGlobal = tiresWithCpk.reduce((s, p) => s + p.cpk, 0) / tiresWithCpk.length;
    const threshold = cpkGlobal * 2;

    // Group by brand
    const brandMap = new Map<string, { cpkSum: number; count: number; empresaId: string | null }>();
    for (const p of tiresWithCpk) {
      const existing = brandMap.get(p.marca) || { cpkSum: 0, count: 0, empresaId: p.empresa_id };
      existing.cpkSum += p.cpk;
      existing.count++;
      brandMap.set(p.marca, existing);
    }

    const alertsToCreate: Array<{
      tipo_alerta: string;
      gravidade: string;
      mensagem: string;
      acao_sugerida: string;
      empresa_id: string | null;
    }> = [];

    for (const [marca, data] of brandMap.entries()) {
      const cpkMarca = data.cpkSum / data.count;
      if (cpkMarca > threshold) {
        const pct = ((cpkMarca / cpkGlobal - 1) * 100).toFixed(0);
        alertsToCreate.push({
          tipo_alerta: "cpk_elevado",
          gravidade: "alto",
          mensagem: `A marca ${marca} apresenta CPK de R$ ${cpkMarca.toFixed(3)}/km, que é ${pct}% acima da média da frota (R$ ${cpkGlobal.toFixed(3)}/km). Isso ultrapassa o dobro do CPK médio.`,
          acao_sugerida: `Reavaliar a continuidade de compras da marca ${marca}. Considere substituir por marcas com melhor custo-benefício identificadas no dashboard de Eficiência.`,
          empresa_id: data.empresaId,
        });
      }
    }

    // Deduplicate: skip if an active alert of same type+message already exists
    let created = 0;
    for (const alert of alertsToCreate) {
      const { data: existing } = await supabase
        .from("alertas")
        .select("id")
        .eq("tipo_alerta", "cpk_elevado")
        .eq("ativo", true)
        .ilike("mensagem", `%${alert.mensagem.substring(0, 30)}%`)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("alertas").insert(alert);
        created++;
      }
    }

    return new Response(
      JSON.stringify({
        cpk_global: Number(cpkGlobal.toFixed(3)),
        threshold: Number(threshold.toFixed(3)),
        brands_checked: brandMap.size,
        alerts_created: created,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
