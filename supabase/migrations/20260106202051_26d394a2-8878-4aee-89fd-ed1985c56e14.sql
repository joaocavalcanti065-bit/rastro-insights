-- Create table for manual fuel control
CREATE TABLE public.coleta_manual_combustivel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  veiculo_id UUID NOT NULL,
  data_abastecimento DATE NOT NULL DEFAULT CURRENT_DATE,
  km_atual INTEGER NOT NULL,
  km_anterior INTEGER,
  km_rodado INTEGER,
  litros_abastecidos NUMERIC NOT NULL,
  valor_total_pago NUMERIC NOT NULL,
  preco_litro NUMERIC,
  consumo_km_por_litro NUMERIC,
  custo_por_km NUMERIC,
  tipo_combustivel TEXT NOT NULL DEFAULT 'Diesel S10',
  posto TEXT,
  observacoes TEXT,
  status_eficiencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coleta_manual_combustivel ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Permitir leitura de combustivel" 
ON public.coleta_manual_combustivel 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de combustivel" 
ON public.coleta_manual_combustivel 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de combustivel" 
ON public.coleta_manual_combustivel 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de combustivel" 
ON public.coleta_manual_combustivel 
FOR DELETE 
USING (true);