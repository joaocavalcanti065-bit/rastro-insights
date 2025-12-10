-- Tabela: Clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contato TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: Veículos
CREATE TABLE public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  placa TEXT NOT NULL,
  modelo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: ColetaManualPneus
CREATE TABLE public.coleta_manual_pneus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE NOT NULL,
  data_medicao DATE NOT NULL DEFAULT CURRENT_DATE,
  posicao_pneu TEXT NOT NULL,
  sulco_atual NUMERIC(5,2) NOT NULL,
  sulco_anterior NUMERIC(5,2),
  sulco_variacao NUMERIC(5,2),
  pressao_atual NUMERIC(5,1) NOT NULL,
  pressao_recomendada NUMERIC(5,1) NOT NULL DEFAULT 100,
  pressao_diferenca NUMERIC(5,1),
  km_atual INTEGER NOT NULL,
  km_anterior INTEGER,
  km_periodo INTEGER,
  km_por_mm NUMERIC(10,2),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coleta_manual_pneus ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para permitir leitura e escrita (MVP sem autenticação)
CREATE POLICY "Permitir leitura de clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de clientes" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de clientes" ON public.clientes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de clientes" ON public.clientes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de veículos" ON public.veiculos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de veículos" ON public.veiculos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de veículos" ON public.veiculos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de veículos" ON public.veiculos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de coleta" ON public.coleta_manual_pneus FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de coleta" ON public.coleta_manual_pneus FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de coleta" ON public.coleta_manual_pneus FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de coleta" ON public.coleta_manual_pneus FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.coleta_manual_pneus;