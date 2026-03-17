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

    // Optional: filter by veiculo_id
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const veiculoIdFilter = body.veiculo_id || null;

    // ========== FETCH DATA ==========
    let veiculosQuery = supabase.from("veiculos").select("*");
    if (veiculoIdFilter) veiculosQuery = veiculosQuery.eq("id", veiculoIdFilter);
    const { data: veiculos, error: vErr } = await veiculosQuery;
    if (vErr) throw vErr;

    const veiculoIds = (veiculos || []).map((v: any) => v.id);
    if (veiculoIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum veículo encontrado", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [pneusRes, fuelRes] = await Promise.all([
      supabase.from("pneus").select("*").in("veiculo_id", veiculoIds),
      supabase.from("coleta_manual_combustivel").select("*").in("veiculo_id", veiculoIds).order("data_abastecimento", { ascending: true }),
    ]);

    const pneus = pneusRes.data || [];
    const fuelEvents = fuelRes.data || [];

    const results: any[] = [];
    let totalAlertsCriados = 0;

    for (const veiculo of (veiculos || [])) {
      const vPneus = pneus.filter((p: any) => p.veiculo_id === veiculo.id);
      const vFuel = fuelEvents.filter((f: any) => f.veiculo_id === veiculo.id);

      // ========== FUEL KPIs ==========
      const fuelKpis = vFuel.map((f: any) => {
        const liters = Number(f.litros_abastecidos || 0);
        const cost = Number(f.valor_total_pago || 0);
        const tripKm = Number(f.km_rodado || 0);
        return {
          date: f.data_abastecimento,
          liters,
          total_cost: cost,
          trip_km: tripKm,
          price_per_liter: liters > 0 ? cost / liters : 0,
          km_per_liter: liters > 0 && tripKm > 0 ? tripKm / liters : 0,
          cost_per_km_fuel: tripKm > 0 ? cost / tripKm : 0,
        };
      });

      const fuelWithKm = fuelKpis.filter((f: any) => f.trip_km > 0);
      const totalKm = fuelWithKm.reduce((s: number, f: any) => s + f.trip_km, 0);
      const totalLiters = fuelWithKm.reduce((s: number, f: any) => s + f.liters, 0);
      const totalCostFuel = fuelWithKm.reduce((s: number, f: any) => s + f.total_cost, 0);
      const avgKmPerLiter = totalLiters > 0 ? totalKm / totalLiters : 0;
      const avgCostPerKmFuel = totalKm > 0 ? totalCostFuel / totalKm : 0;

      // ========== TIRE KPIs ==========
      const treadDepths = vPneus.map((p: any) => Number(p.sulco_atual || 0)).filter((v: number) => v > 0);
      const treadAvg = treadDepths.length > 0 ? treadDepths.reduce((a: number, b: number) => a + b, 0) / treadDepths.length : 0;
      const treadMin = treadDepths.length > 0 ? Math.min(...treadDepths) : 0;
      const treadMax = treadDepths.length > 0 ? Math.max(...treadDepths) : 0;

      // Life remaining
      const treadNewMm = 7.2; // default for Goodyear EfficientGrip
      const treadLimitMm = 1.6;
      const treadLifeRemainingPct = treadAvg > 0
        ? Math.min(1, Math.max(0, (treadAvg - treadLimitMm) / (treadNewMm - treadLimitMm)))
        : 0;

      // Wear projection (3 scenarios)
      const mmRemaining = Math.max(0, treadAvg - treadLimitMm);
      const wearProjection = {
        conservador: { rate_mm_per_1000km: 0.10, km_remaining: mmRemaining > 0 ? (mmRemaining / 0.10) * 1000 : 0 },
        base: { rate_mm_per_1000km: 0.15, km_remaining: mmRemaining > 0 ? (mmRemaining / 0.15) * 1000 : 0 },
        agressivo: { rate_mm_per_1000km: 0.20, km_remaining: mmRemaining > 0 ? (mmRemaining / 0.20) * 1000 : 0 },
      };

      // ========== ALERTS ==========
      const alerts: any[] = [];
      const pressaoSetpoint = Number(vPneus[0]?.pressao_ideal || 40);

      // Pressure alerts per tire
      for (const p of vPneus) {
        const pressao = Number(p.pressao_atual || 0);
        if (pressao <= 0) continue;
        const diff = pressaoSetpoint - pressao;

        if (diff >= 8) {
          alerts.push({
            tipo: "pressao_critica",
            gravidade: "critica",
            mensagem: `Pneu ${p.id_unico} (${p.posicao_atual}): pressão ${pressao} psi, ${diff.toFixed(0)} psi abaixo do setpoint (${pressaoSetpoint} psi).`,
            acao: "Calibrar imediatamente. Verificar possíveis vazamentos.",
            pneu_id: p.id,
          });
        } else if (diff >= 5) {
          alerts.push({
            tipo: "pressao_baixa",
            gravidade: "media",
            mensagem: `Pneu ${p.id_unico} (${p.posicao_atual}): pressão ${pressao} psi, ${diff.toFixed(0)} psi abaixo do setpoint.`,
            acao: "Calibrar na próxima parada.",
            pneu_id: p.id,
          });
        }
      }

      // Axle imbalance
      const eixos: Record<string, any[]> = {};
      for (const p of vPneus) {
        if (!p.posicao_atual) continue;
        const eixo = p.posicao_atual.replace(/[ED]$/, "");
        if (!eixos[eixo]) eixos[eixo] = [];
        eixos[eixo].push(p);
      }
      for (const [eixo, tires] of Object.entries(eixos)) {
        if (tires.length === 2) {
          const diff = Math.abs(Number(tires[0].pressao_atual || 0) - Number(tires[1].pressao_atual || 0));
          if (diff >= 3) {
            alerts.push({
              tipo: "desbalanco_pressao_eixo",
              gravidade: "media",
              mensagem: `Eixo ${eixo}: diferença de ${diff.toFixed(0)} psi entre pneus (${tires[0].id_unico}: ${tires[0].pressao_atual} psi vs ${tires[1].id_unico}: ${tires[1].pressao_atual} psi).`,
              acao: "Equalizar pressão dos pneus do mesmo eixo.",
              pneu_id: null,
            });
          }
        }
      }

      // Tread alerts
      if (treadMin > 0 && treadMin <= 2.0) {
        alerts.push({
          tipo: "sulco_critico",
          gravidade: "critica",
          mensagem: `Sulco mínimo: ${treadMin.toFixed(1)}mm. Troca recomendada (limite legal: 1.6mm).`,
          acao: "Programar substituição imediata do pneu.",
          pneu_id: null,
        });
      } else if (treadMin > 0 && treadMin <= 3.0) {
        alerts.push({
          tipo: "sulco_atencao",
          gravidade: "media",
          mensagem: `Sulco mínimo: ${treadMin.toFixed(1)}mm. Planejar troca nos próximos 5.000 km.`,
          acao: "Agendar compra/recapagem de pneu reserva.",
          pneu_id: null,
        });
      }

      // Fuel consumption variation alert
      if (fuelKpis.length >= 2) {
        const withKmL = fuelKpis.filter((f: any) => f.km_per_liter > 0);
        for (let i = 1; i < withKmL.length; i++) {
          const prev = withKmL[i - 1].km_per_liter;
          const curr = withKmL[i].km_per_liter;
          const variacao = Math.abs(curr - prev) / prev;
          if (variacao > 0.10) {
            const direction = curr > prev ? "melhora" : "queda";
            alerts.push({
              tipo: "variacao_consumo",
              gravidade: "media",
              mensagem: `Variação de ${(variacao * 100).toFixed(1)}% (${direction}) no consumo entre ${withKmL[i - 1].date} e ${withKmL[i].date}. De ${prev.toFixed(2)} para ${curr.toFixed(2)} km/L.`,
              acao: direction === "queda"
                ? "Investigar: alinhamento, calibragem, carga, rota."
                : "Melhoria registrada — manter práticas atuais.",
              pneu_id: null,
            });
          }
        }
      }

      // ========== PERSIST ALERTS ==========
      // Deactivate old auto alerts for this vehicle
      await supabase
        .from("alertas")
        .update({ ativo: false })
        .eq("veiculo_id", veiculo.id)
        .in("tipo_alerta", [
          "pressao_critica", "pressao_baixa", "desbalanco_pressao_eixo",
          "sulco_critico", "sulco_atencao", "variacao_consumo",
        ]);

      for (const alert of alerts) {
        const { error: aErr } = await supabase.from("alertas").insert({
          tipo_alerta: alert.tipo,
          gravidade: alert.gravidade,
          mensagem: alert.mensagem,
          acao_sugerida: alert.acao,
          veiculo_id: veiculo.id,
          pneu_id: alert.pneu_id,
          ativo: true,
        });
        if (!aErr) totalAlertsCriados++;
      }

      // ========== BUILD RESULT ==========
      const normalized = {
        veiculo: {
          id: veiculo.id,
          placa: veiculo.placa,
          modelo: veiculo.modelo,
          marca: veiculo.marca,
        },
        fuel_kpis: {
          events: fuelKpis,
          consolidated: {
            total_km: totalKm,
            total_liters: totalLiters,
            total_cost: totalCostFuel,
            avg_km_per_liter: Number(avgKmPerLiter.toFixed(2)),
            avg_cost_per_km: Number(avgCostPerKmFuel.toFixed(3)),
          },
        },
        tire_kpis: {
          tread_avg_mm: Number(treadAvg.toFixed(2)),
          tread_min_mm: treadMin,
          tread_max_mm: treadMax,
          tread_life_remaining_pct: Number((treadLifeRemainingPct * 100).toFixed(1)),
          wear_projection: wearProjection,
          tires: vPneus.map((p: any) => ({
            id_unico: p.id_unico,
            posicao: p.posicao_atual,
            sulco_mm: p.sulco_atual,
            pressao_psi: p.pressao_atual,
          })),
        },
        alerts_generated: alerts.length,
        alerts,
      };

      // Executive summary
      const summary = [
        `🚗 ${veiculo.placa} (${veiculo.modelo || "N/A"})`,
        `⛽ Consumo médio: ${avgKmPerLiter.toFixed(2)} km/L | Custo/km: R$ ${avgCostPerKmFuel.toFixed(3)}`,
        `🔧 Sulco médio: ${treadAvg.toFixed(1)}mm | Vida restante: ${(treadLifeRemainingPct * 100).toFixed(0)}%`,
        `📊 Projeção de troca: ${(wearProjection.base.km_remaining / 1000).toFixed(1)}k km (cenário base)`,
        `⚠️ ${alerts.length} alerta(s) gerado(s)`,
      ].join("\n");

      // Store analysis
      await supabase.from("analises_ia").insert({
        tipo: "mvp_auto_calculation",
        conteudo: summary,
        dados_entrada: normalized as any,
      });

      results.push(normalized);
    }

    return new Response(
      JSON.stringify({
        message: `Cálculos automáticos concluídos para ${results.length} veículo(s). ${totalAlertsCriados} alerta(s) criado(s).`,
        vehicles_processed: results.length,
        total_alerts: totalAlertsCriados,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no cálculo automático:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
