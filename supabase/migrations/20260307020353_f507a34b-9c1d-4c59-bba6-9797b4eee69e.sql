-- Add new columns to pneus table for RG do Pneu
ALTER TABLE public.pneus
  ADD COLUMN IF NOT EXISTS rg_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS largura_nominal INTEGER,
  ADD COLUMN IF NOT EXISTS perfil_nominal INTEGER,
  ADD COLUMN IF NOT EXISTS aro_nominal NUMERIC,
  ADD COLUMN IF NOT EXISTS dot_data_fabricacao DATE,
  ADD COLUMN IF NOT EXISTS dot_alerta_vencimento BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tipo_construcao TEXT DEFAULT 'Radial',
  ADD COLUMN IF NOT EXISTS indice_velocidade TEXT,
  ADD COLUMN IF NOT EXISTS desgaste_observado TEXT DEFAULT 'uniforme',
  ADD COLUMN IF NOT EXISTS valor_venda_sugerido NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nota_fiscal TEXT,
  ADD COLUMN IF NOT EXISTS fornecedor_origem_id UUID REFERENCES public.fornecedores(id),
  ADD COLUMN IF NOT EXISTS local_estoque_id UUID;

-- Create vendas_pneu table
CREATE TABLE IF NOT EXISTS public.vendas_pneu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pneu_id UUID REFERENCES public.pneus(id),
  empresa_id UUID REFERENCES public.empresas(id),
  tipo_comprador TEXT,
  comprador_nome TEXT,
  comprador_documento TEXT,
  comprador_contato TEXT,
  comprador_email TEXT,
  valor_venda NUMERIC(10,2),
  custo_acumulado_na_venda NUMERIC(10,2),
  resultado_financeiro NUMERIC(10,2),
  forma_pagamento TEXT,
  numero_nota_fiscal TEXT,
  data_venda TIMESTAMPTZ DEFAULT NOW(),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendas_pneu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendas_pneu_select" ON public.vendas_pneu FOR SELECT USING (true);
CREATE POLICY "vendas_pneu_insert" ON public.vendas_pneu FOR INSERT WITH CHECK (true);
CREATE POLICY "vendas_pneu_update" ON public.vendas_pneu FOR UPDATE USING (true);
CREATE POLICY "vendas_pneu_delete" ON public.vendas_pneu FOR DELETE USING (true);