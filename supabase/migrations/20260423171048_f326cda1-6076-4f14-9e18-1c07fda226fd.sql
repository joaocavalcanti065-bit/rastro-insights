-- =======================================================
-- 1. TABELA DE LAYOUTS DE PNEUS POR TIPO DE VEÍCULO
-- =======================================================
CREATE TABLE public.layouts_pneus_veiculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_veiculo text NOT NULL UNIQUE,
  nome_exibicao text NOT NULL,
  qtd_eixos int NOT NULL,
  qtd_pneus int NOT NULL,
  layout_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.layouts_pneus_veiculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "layouts_pneus_select" ON public.layouts_pneus_veiculo FOR SELECT USING (true);
CREATE POLICY "layouts_pneus_insert" ON public.layouts_pneus_veiculo FOR INSERT WITH CHECK (true);
CREATE POLICY "layouts_pneus_update" ON public.layouts_pneus_veiculo FOR UPDATE USING (true);
CREATE POLICY "layouts_pneus_delete" ON public.layouts_pneus_veiculo FOR DELETE USING (true);

-- =======================================================
-- 2. SEQUÊNCIA PARA NUMERAÇÃO DE OS
-- =======================================================
CREATE SEQUENCE IF NOT EXISTS public.os_numero_seq START 1;

CREATE OR REPLACE FUNCTION public.gerar_numero_os()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ano text;
  proximo int;
BEGIN
  ano := to_char(now(), 'YYYY');
  proximo := nextval('public.os_numero_seq');
  RETURN 'OS-' || ano || '-' || lpad(proximo::text, 6, '0');
END;
$$;

-- =======================================================
-- 3. TABELA DE ORDENS DE SERVIÇO (cabeçalho)
-- =======================================================
CREATE TABLE public.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os text UNIQUE NOT NULL DEFAULT public.gerar_numero_os(),
  veiculo_id uuid NOT NULL,
  responsavel text,
  hodometro_km int,
  tipo_os text NOT NULL DEFAULT 'PREVENTIVA' CHECK (tipo_os IN ('PREVENTIVA','CORRETIVA','EMERGENCIAL','AUDITORIA')),
  local_execucao text NOT NULL DEFAULT 'OFICINA_INTERNA' CHECK (local_execucao IN ('OFICINA_INTERNA','BORRACHARIA_PARCEIRA','EM_ROTA')),
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','ABERTA','EM_ANDAMENTO','AGUARDANDO_APROVACAO','CONCLUIDA','CANCELADA')),
  custo_total numeric(10,2) NOT NULL DEFAULT 0,
  tempo_total_minutos int NOT NULL DEFAULT 0,
  observacoes text,
  empresa_id uuid,
  aberta_em timestamptz NOT NULL DEFAULT now(),
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordens_servico_select" ON public.ordens_servico FOR SELECT USING (true);
CREATE POLICY "ordens_servico_insert" ON public.ordens_servico FOR INSERT WITH CHECK (true);
CREATE POLICY "ordens_servico_update" ON public.ordens_servico FOR UPDATE USING (true);
CREATE POLICY "ordens_servico_delete" ON public.ordens_servico FOR DELETE USING (true);

CREATE INDEX idx_ordens_servico_veiculo ON public.ordens_servico(veiculo_id);
CREATE INDEX idx_ordens_servico_status ON public.ordens_servico(status);
CREATE INDEX idx_ordens_servico_aberta_em ON public.ordens_servico(aberta_em DESC);

-- =======================================================
-- 4. TABELA DE ITENS DA OS (serviços por pneu/posição)
-- =======================================================
CREATE TABLE public.ordens_servico_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  pneu_id uuid,
  posicao_codigo text NOT NULL,
  tipo_servico text NOT NULL,
  categoria_servico text NOT NULL DEFAULT 'PNEU' CHECK (categoria_servico IN ('PNEU','RODA_EIXO','FREIO','SUSPENSAO')),
  custo_unitario numeric(10,2) NOT NULL DEFAULT 0,
  tempo_estimado_minutos int NOT NULL DEFAULT 0,
  tecnico_responsavel text,
  observacoes_tecnicas text,
  posicao_destino text,
  pneu_novo_id uuid,
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_servico_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordens_servico_itens_select" ON public.ordens_servico_itens FOR SELECT USING (true);
CREATE POLICY "ordens_servico_itens_insert" ON public.ordens_servico_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "ordens_servico_itens_update" ON public.ordens_servico_itens FOR UPDATE USING (true);
CREATE POLICY "ordens_servico_itens_delete" ON public.ordens_servico_itens FOR DELETE USING (true);

CREATE INDEX idx_os_itens_os ON public.ordens_servico_itens(ordem_servico_id);
CREATE INDEX idx_os_itens_pneu ON public.ordens_servico_itens(pneu_id);

-- =======================================================
-- 5. TRIGGER PARA RECALCULAR TOTAIS DA OS
-- =======================================================
CREATE OR REPLACE FUNCTION public.recalcular_totais_os()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  os_id uuid;
BEGIN
  os_id := COALESCE(NEW.ordem_servico_id, OLD.ordem_servico_id);
  
  UPDATE public.ordens_servico
  SET 
    custo_total = COALESCE((SELECT SUM(custo_unitario) FROM public.ordens_servico_itens WHERE ordem_servico_id = os_id), 0),
    tempo_total_minutos = COALESCE((SELECT SUM(tempo_estimado_minutos) FROM public.ordens_servico_itens WHERE ordem_servico_id = os_id), 0),
    updated_at = now()
  WHERE id = os_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalcular_totais_os
AFTER INSERT OR UPDATE OR DELETE ON public.ordens_servico_itens
FOR EACH ROW EXECUTE FUNCTION public.recalcular_totais_os();

-- =======================================================
-- 6. TRIGGER PARA UPDATED_AT
-- =======================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_os()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_ordens_servico_updated_at
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_os();

-- =======================================================
-- 7. POPULAR LAYOUTS DOS 13 TIPOS DE VEÍCULO
-- =======================================================
-- Convenção de posições:
--   1E, 1D = eixo 1 esquerda/direita simples
--   2EE, 2EI, 2DI, 2DE = eixo 2 (duplo): Esq-Externo, Esq-Interno, Dir-Interno, Dir-Externo
-- "tipo_eixo": direcional | tracao | livre | morto
-- "duplo": true = roda dupla (4 pneus no eixo); false = roda simples (2 pneus)

INSERT INTO public.layouts_pneus_veiculo (tipo_veiculo, nome_exibicao, qtd_eixos, qtd_pneus, layout_json) VALUES

('CARRO', 'Carro / Utilitário', 2, 4, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "tracao", "duplo": false, "posicoes": ["2E","2D"]}
  ]
}'::jsonb),

('VAN', 'Van / Furgão', 2, 4, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "tracao", "duplo": false, "posicoes": ["2E","2D"]}
  ]
}'::jsonb),

('VUC', '3/4 (VUC)', 2, 6, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "tracao", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]}
  ]
}'::jsonb),

('TOCO', 'Toco', 2, 6, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "tracao", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]}
  ]
}'::jsonb),

('TRUCK', 'Truck', 3, 10, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "tracao", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]},
    {"numero": 3, "tipo": "tracao", "duplo": true, "posicoes": ["3EE","3EI","3DI","3DE"]}
  ]
}'::jsonb),

('BITRUCK', 'Bitruck', 4, 10, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "direcional", "duplo": false, "posicoes": ["2E","2D"]},
    {"numero": 3, "tipo": "tracao", "duplo": true, "posicoes": ["3EE","3EI","3DI","3DE"]},
    {"numero": 4, "tipo": "tracao", "duplo": true, "posicoes": ["4EE","4EI","4DI","4DE"]}
  ]
}'::jsonb),

('CAVALO_4X2', 'Cavalo Mecânico 4x2', 2, 6, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "tracao", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]}
  ]
}'::jsonb),

('CAVALO_6X2', 'Cavalo Mecânico 6x2', 3, 10, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "morto", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]},
    {"numero": 3, "tipo": "tracao", "duplo": true, "posicoes": ["3EE","3EI","3DI","3DE"]}
  ]
}'::jsonb),

('CAVALO_6X4', 'Cavalo Mecânico 6x4', 3, 10, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "tracao", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]},
    {"numero": 3, "tipo": "tracao", "duplo": true, "posicoes": ["3EE","3EI","3DI","3DE"]}
  ]
}'::jsonb),

('CARRETA', 'Carreta (Semirreboque)', 3, 12, '{
  "eixos": [
    {"numero": 1, "tipo": "livre", "duplo": true, "posicoes": ["1EE","1EI","1DI","1DE"]},
    {"numero": 2, "tipo": "livre", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]},
    {"numero": 3, "tipo": "livre", "duplo": true, "posicoes": ["3EE","3EI","3DI","3DE"]}
  ]
}'::jsonb),

('BITREM', 'Bitrem', 6, 24, '{
  "eixos": [
    {"numero": 1, "tipo": "livre", "duplo": true, "posicoes": ["1EE","1EI","1DI","1DE"]},
    {"numero": 2, "tipo": "livre", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]},
    {"numero": 3, "tipo": "livre", "duplo": true, "posicoes": ["3EE","3EI","3DI","3DE"]},
    {"numero": 4, "tipo": "livre", "duplo": true, "posicoes": ["4EE","4EI","4DI","4DE"]},
    {"numero": 5, "tipo": "livre", "duplo": true, "posicoes": ["5EE","5EI","5DI","5DE"]},
    {"numero": 6, "tipo": "livre", "duplo": true, "posicoes": ["6EE","6EI","6DI","6DE"]}
  ]
}'::jsonb),

('RODOTREM', 'Rodotrem', 9, 36, '{
  "eixos": [
    {"numero": 1, "tipo": "livre", "duplo": true, "posicoes": ["1EE","1EI","1DI","1DE"]},
    {"numero": 2, "tipo": "livre", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]},
    {"numero": 3, "tipo": "livre", "duplo": true, "posicoes": ["3EE","3EI","3DI","3DE"]},
    {"numero": 4, "tipo": "livre", "duplo": true, "posicoes": ["4EE","4EI","4DI","4DE"]},
    {"numero": 5, "tipo": "livre", "duplo": true, "posicoes": ["5EE","5EI","5DI","5DE"]},
    {"numero": 6, "tipo": "livre", "duplo": true, "posicoes": ["6EE","6EI","6DI","6DE"]},
    {"numero": 7, "tipo": "livre", "duplo": true, "posicoes": ["7EE","7EI","7DI","7DE"]},
    {"numero": 8, "tipo": "livre", "duplo": true, "posicoes": ["8EE","8EI","8DI","8DE"]},
    {"numero": 9, "tipo": "livre", "duplo": true, "posicoes": ["9EE","9EI","9DI","9DE"]}
  ]
}'::jsonb),

('ONIBUS', 'Ônibus Rodoviário', 3, 10, '{
  "eixos": [
    {"numero": 1, "tipo": "direcional", "duplo": false, "posicoes": ["1E","1D"]},
    {"numero": 2, "tipo": "tracao", "duplo": true, "posicoes": ["2EE","2EI","2DI","2DE"]},
    {"numero": 3, "tipo": "tracao", "duplo": true, "posicoes": ["3EE","3EI","3DI","3DE"]}
  ]
}'::jsonb);