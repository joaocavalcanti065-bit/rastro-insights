-- Create reservas_pneu table
CREATE TABLE IF NOT EXISTS public.reservas_pneu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pneu_id UUID REFERENCES public.pneus(id) NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id),
  motivo TEXT NOT NULL DEFAULT 'instalacao_programada',
  destino_descricao TEXT,
  veiculo_destino_id UUID REFERENCES public.veiculos(id),
  comprador_nome TEXT,
  data_prevista DATE,
  responsavel TEXT,
  ativa BOOLEAN DEFAULT TRUE,
  cancelada_em TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reservas_pneu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservas_select" ON public.reservas_pneu FOR SELECT USING (true);
CREATE POLICY "reservas_insert" ON public.reservas_pneu FOR INSERT WITH CHECK (true);
CREATE POLICY "reservas_update" ON public.reservas_pneu FOR UPDATE USING (true);
CREATE POLICY "reservas_delete" ON public.reservas_pneu FOR DELETE USING (true);

-- Add status 'reservado' support - no schema change needed, just data convention