
CREATE OR REPLACE FUNCTION public.check_sulco_critico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alerta_existente uuid;
  gravidade_alerta text;
  mensagem_alerta text;
  acao_alerta text;
BEGIN
  -- Only check if sulco_atual changed and is below 5mm
  IF NEW.sulco_atual IS NOT NULL AND NEW.sulco_atual < 5 AND NEW.status IN ('ativo', 'instalado') THEN
    
    -- Check if there's already an active alert for this tire with same type
    SELECT id INTO alerta_existente
    FROM public.alertas
    WHERE pneu_id = NEW.id
      AND tipo_alerta = 'sulco_critico_auto'
      AND ativo = true
    LIMIT 1;

    -- Determine severity
    IF NEW.sulco_atual <= 3 THEN
      gravidade_alerta := 'critica';
      mensagem_alerta := format(
        'URGENTE: Pneu %s (%s %s) com sulco de %smm — ABAIXO do limite de segurança de 3mm. Substituição imediata necessária!',
        NEW.id_unico, NEW.marca, COALESCE(NEW.medida, ''), NEW.sulco_atual
      );
      acao_alerta := 'Retirar o pneu de operação imediatamente. Encaminhar para análise de carcaça ou descarte.';
    ELSE
      gravidade_alerta := 'alta';
      mensagem_alerta := format(
        'ATENÇÃO: Pneu %s (%s %s) com sulco de %smm — próximo do limite de segurança (3mm). Programar substituição.',
        NEW.id_unico, NEW.marca, COALESCE(NEW.medida, ''), NEW.sulco_atual
      );
      acao_alerta := 'Programar rodízio, recapagem ou substituição. Monitorar semanalmente.';
    END IF;

    IF alerta_existente IS NOT NULL THEN
      -- Update existing alert
      UPDATE public.alertas
      SET mensagem = mensagem_alerta,
          gravidade = gravidade_alerta,
          acao_sugerida = acao_alerta,
          created_at = now()
      WHERE id = alerta_existente;
    ELSE
      -- Create new alert
      INSERT INTO public.alertas (tipo_alerta, gravidade, mensagem, acao_sugerida, pneu_id, veiculo_id, empresa_id, ativo)
      VALUES ('sulco_critico_auto', gravidade_alerta, mensagem_alerta, acao_alerta, NEW.id, NEW.veiculo_id, NEW.empresa_id, true);
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_sulco_critico
  AFTER INSERT OR UPDATE OF sulco_atual ON public.pneus
  FOR EACH ROW
  EXECUTE FUNCTION public.check_sulco_critico();
