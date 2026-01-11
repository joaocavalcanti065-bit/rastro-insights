-- Adicionar campos avançados à tabela veiculos
ALTER TABLE public.veiculos 
ADD COLUMN IF NOT EXISTS tipo_veiculo text DEFAULT 'Truck',
ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'Pesado',
ADD COLUMN IF NOT EXISTS quantidade_eixos integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS possui_estepe boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quantidade_estepes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pneus_rodantes integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS total_pneus integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS km_medio_mensal integer DEFAULT 12000;

-- Comentários explicativos
COMMENT ON COLUMN public.veiculos.tipo_veiculo IS 'Tipo do veículo: Carro, SUV, Van, Caminhão 3/4, Toco, Truck, Bi-Truck, Cavalo Mecânico, Carreta, Rodotrem, Bitrem';
COMMENT ON COLUMN public.veiculos.categoria IS 'Categoria do veículo: Leve, Médio, Pesado';
COMMENT ON COLUMN public.veiculos.quantidade_eixos IS 'Quantidade total de eixos do veículo';
COMMENT ON COLUMN public.veiculos.possui_estepe IS 'Indica se o veículo possui estepe';
COMMENT ON COLUMN public.veiculos.quantidade_estepes IS 'Quantidade de estepes do veículo';
COMMENT ON COLUMN public.veiculos.total_pneus_rodantes IS 'Total de pneus rodantes (sem contar estepes)';
COMMENT ON COLUMN public.veiculos.total_pneus IS 'Total geral de pneus (rodantes + estepes)';
COMMENT ON COLUMN public.veiculos.km_medio_mensal IS 'Km médio mensal rodado pelo veículo';