
-- Empresas table
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresas_select" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "empresas_insert" ON public.empresas FOR INSERT WITH CHECK (true);
CREATE POLICY "empresas_update" ON public.empresas FOR UPDATE USING (true);
CREATE POLICY "empresas_delete" ON public.empresas FOR DELETE USING (true);

-- Fornecedores table
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'recapadora',
  cnpj TEXT,
  contato TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornecedores_select" ON public.fornecedores FOR SELECT USING (true);
CREATE POLICY "fornecedores_insert" ON public.fornecedores FOR INSERT WITH CHECK (true);
CREATE POLICY "fornecedores_update" ON public.fornecedores FOR UPDATE USING (true);
CREATE POLICY "fornecedores_delete" ON public.fornecedores FOR DELETE USING (true);

-- Add new columns to pneus table
ALTER TABLE public.pneus 
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS id_interno TEXT,
  ADD COLUMN IF NOT EXISTS numero_fogo TEXT,
  ADD COLUMN IF NOT EXISTS dot TEXT,
  ADD COLUMN IF NOT EXISTS indice_carga TEXT,
  ADD COLUMN IF NOT EXISTS tipo_aplicacao TEXT DEFAULT 'rodoviario',
  ADD COLUMN IF NOT EXISTS tipo_eixo TEXT DEFAULT 'tracao',
  ADD COLUMN IF NOT EXISTS tipo_pneu TEXT DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS km_inicial INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_atual INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pressao_ideal NUMERIC DEFAULT 110,
  ADD COLUMN IF NOT EXISTS pressao_atual NUMERIC,
  ADD COLUMN IF NOT EXISTS local_atual TEXT DEFAULT 'estoque',
  ADD COLUMN IF NOT EXISTS custo_aquisicao NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_acumulado NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_recapagens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fornecedor_recapagem_id UUID REFERENCES public.fornecedores(id),
  ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add empresa_id to veiculos
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS empresa_id_ref UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS frota TEXT,
  ADD COLUMN IF NOT EXISTS marca TEXT,
  ADD COLUMN IF NOT EXISTS ano INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- Estoque table
CREATE TABLE IF NOT EXISTS public.estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  pneu_id UUID REFERENCES public.pneus(id) ON DELETE CASCADE,
  condicao TEXT DEFAULT 'novo',
  quantidade INTEGER DEFAULT 1,
  local_fisico TEXT,
  endereco_estoque TEXT,
  status TEXT DEFAULT 'disponivel',
  custo_unitario NUMERIC DEFAULT 0,
  destino_previsto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estoque_select" ON public.estoque FOR SELECT USING (true);
CREATE POLICY "estoque_insert" ON public.estoque FOR INSERT WITH CHECK (true);
CREATE POLICY "estoque_update" ON public.estoque FOR UPDATE USING (true);
CREATE POLICY "estoque_delete" ON public.estoque FOR DELETE USING (true);

-- Recapagens table
CREATE TABLE IF NOT EXISTS public.recapagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pneu_id UUID REFERENCES public.pneus(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero_ciclo INTEGER DEFAULT 1,
  classificacao_carcaca TEXT DEFAULT 'em_analise',
  aprovada BOOLEAN,
  motivo_reprovacao TEXT,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  data_envio DATE,
  previsao_retorno DATE,
  data_retorno_real DATE,
  custo_recapagem NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'aguardando',
  foto_antes JSONB DEFAULT '[]'::jsonb,
  foto_depois JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recapagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recapagens_select" ON public.recapagens FOR SELECT USING (true);
CREATE POLICY "recapagens_insert" ON public.recapagens FOR INSERT WITH CHECK (true);
CREATE POLICY "recapagens_update" ON public.recapagens FOR UPDATE USING (true);
CREATE POLICY "recapagens_delete" ON public.recapagens FOR DELETE USING (true);

-- Manutencoes table
CREATE TABLE IF NOT EXISTS public.manutencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pneu_id UUID REFERENCES public.pneus(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'inspecao',
  causa TEXT,
  km_no_momento INTEGER,
  custo NUMERIC DEFAULT 0,
  responsavel_id UUID,
  ordem_servico TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manutencoes_select" ON public.manutencoes FOR SELECT USING (true);
CREATE POLICY "manutencoes_insert" ON public.manutencoes FOR INSERT WITH CHECK (true);
CREATE POLICY "manutencoes_update" ON public.manutencoes FOR UPDATE USING (true);
CREATE POLICY "manutencoes_delete" ON public.manutencoes FOR DELETE USING (true);

-- Alertas table
CREATE TABLE IF NOT EXISTS public.alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  pneu_id UUID REFERENCES public.pneus(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  tipo_alerta TEXT NOT NULL,
  gravidade TEXT DEFAULT 'informativo',
  mensagem TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  responsavel_id UUID,
  acao_sugerida TEXT,
  tratado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alertas_select" ON public.alertas FOR SELECT USING (true);
CREATE POLICY "alertas_insert" ON public.alertas FOR INSERT WITH CHECK (true);
CREATE POLICY "alertas_update" ON public.alertas FOR UPDATE USING (true);
CREATE POLICY "alertas_delete" ON public.alertas FOR DELETE USING (true);

-- Configuracoes table
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  valor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "configuracoes_select" ON public.configuracoes FOR SELECT USING (true);
CREATE POLICY "configuracoes_insert" ON public.configuracoes FOR INSERT WITH CHECK (true);
CREATE POLICY "configuracoes_update" ON public.configuracoes FOR UPDATE USING (true);
CREATE POLICY "configuracoes_delete" ON public.configuracoes FOR DELETE USING (true);

-- Analises IA (persist AI analysis results)
CREATE TABLE IF NOT EXISTS public.analises_ia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  dados_entrada JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analises_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analises_ia_select" ON public.analises_ia FOR SELECT USING (true);
CREATE POLICY "analises_ia_insert" ON public.analises_ia FOR INSERT WITH CHECK (true);

-- Add movimentacoes columns
ALTER TABLE public.movimentacoes_pneus
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS km_no_momento INTEGER,
  ADD COLUMN IF NOT EXISTS sulco_no_momento NUMERIC,
  ADD COLUMN IF NOT EXISTS pressao_no_momento NUMERIC,
  ADD COLUMN IF NOT EXISTS responsavel_id UUID;
