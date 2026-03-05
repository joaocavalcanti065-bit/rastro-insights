
-- Tabela de pneus individuais (ativos com identidade única permanente)
CREATE TABLE public.pneus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_unico text NOT NULL UNIQUE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  marca text NOT NULL DEFAULT 'Michelin',
  modelo_pneu text,
  medida text DEFAULT '295/80 R22.5',
  valor_aquisicao numeric DEFAULT 3200,
  data_aquisicao date DEFAULT CURRENT_DATE,
  localizacao text NOT NULL DEFAULT 'estoque',
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  posicao_atual text,
  numero_recapagens integer DEFAULT 0,
  vida_atual integer DEFAULT 1,
  sulco_inicial numeric DEFAULT 16,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de movimentações de pneus
CREATE TABLE public.movimentacoes_pneus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pneu_id uuid NOT NULL REFERENCES public.pneus(id) ON DELETE CASCADE,
  tipo_movimentacao text NOT NULL,
  origem text,
  destino text,
  veiculo_origem_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  veiculo_destino_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  posicao_destino text,
  data_movimentacao date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pneus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_pneus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de pneus" ON public.pneus FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de pneus" ON public.pneus FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de pneus" ON public.pneus FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de pneus" ON public.pneus FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de movimentacoes" ON public.movimentacoes_pneus FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de movimentacoes" ON public.movimentacoes_pneus FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de movimentacoes" ON public.movimentacoes_pneus FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de movimentacoes" ON public.movimentacoes_pneus FOR DELETE USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pneus;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_pneus;
