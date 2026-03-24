
-- Normalize positions for DAH4726 (Truck, 3 axles)
UPDATE pneus SET posicao_atual = 'D1E' WHERE posicao_atual = 'Pneu Motorista' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'D1D' WHERE posicao_atual = 'Pneu Passageiro' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'T2EI' WHERE posicao_atual = 'Motorista Traseiro Eixo1 Dentro' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'T2EE' WHERE posicao_atual = 'Motorista Traseiro Eixo1 Fora' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'T3EI' WHERE posicao_atual = 'Motorista Traseiro Eixo2 Dentro' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'T3EE' WHERE posicao_atual = 'Motorista Traseiro Eixo2 Fora' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'T2DI' WHERE posicao_atual = 'Passageiro Traseiro Eixo1 Dentro' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'T2DE' WHERE posicao_atual = 'Passageiro Traseiro Eixo1 Fora' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'T3DI' WHERE posicao_atual = 'Passageiro Traseiro Eixo2 Dentro' AND id_unico LIKE 'GIOVI-DAH4726%';
UPDATE pneus SET posicao_atual = 'T3DE' WHERE posicao_atual = 'Passageiro Traseiro Eixo2 Fora' AND id_unico LIKE 'GIOVI-DAH4726%';

-- Normalize for MURO7176A (Toco, 2 axles: D1 + T2)
UPDATE pneus SET posicao_atual = 'D1E' WHERE posicao_atual = 'Dianteiro Motorista' AND id_unico LIKE 'GIOVI-MURO1518%';
UPDATE pneus SET posicao_atual = 'D1D' WHERE posicao_atual = 'Lado Passageiro' AND id_unico LIKE 'GIOVI-MURO1518%';
UPDATE pneus SET posicao_atual = 'T2EI' WHERE posicao_atual = 'Lado de Dentro' AND id_unico LIKE 'GIOVI-MURO1518%';
UPDATE pneus SET posicao_atual = 'T2EE' WHERE posicao_atual = 'Traseiro Motorista lado de fora' AND id_unico LIKE 'GIOVI-MURO1518%';
UPDATE pneus SET posicao_atual = 'T2DE' WHERE posicao_atual = 'Lado de Fora' AND id_unico LIKE 'GIOVI-MURO1518%';
UPDATE pneus SET posicao_atual = 'T2DI' WHERE posicao_atual = 'Traseiro lado do passageiro Dentro' AND id_unico LIKE 'GIOVI-MURO1518%';

-- Normalize for MURO7176B (Toco, 2 axles: D1 + T2)
UPDATE pneus SET posicao_atual = 'D1E' WHERE posicao_atual = 'Dianteiro Motorista' AND id_unico LIKE 'GIOVI-MURO17250%';
UPDATE pneus SET posicao_atual = 'D1D' WHERE posicao_atual = 'Lado Passageiro' AND id_unico LIKE 'GIOVI-MURO17250%';
UPDATE pneus SET posicao_atual = 'T2EI' WHERE posicao_atual = 'Lado de Dentro' AND id_unico LIKE 'GIOVI-MURO17250%';
UPDATE pneus SET posicao_atual = 'T2EE' WHERE posicao_atual = 'Traseiro Motorista lado de fora' AND id_unico LIKE 'GIOVI-MURO17250%';
UPDATE pneus SET posicao_atual = 'T2DE' WHERE posicao_atual = 'Lado de Fora' AND id_unico LIKE 'GIOVI-MURO17250%';
UPDATE pneus SET posicao_atual = 'T2DI' WHERE posicao_atual = 'Traseiro lado do passageiro Dentro' AND id_unico LIKE 'GIOVI-MURO17250%';

-- Normalize for KCF5D61 (Cavalo Mecânico - has tractor front + rear dual)
-- Fix quantidade_eixos to 2 for pure tractor
-- Front axle
UPDATE pneus SET posicao_atual = 'D1E' WHERE posicao_atual = 'Dianteiro Motorista' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'D1D' WHERE posicao_atual = 'Lado Passageiro' AND id_unico LIKE 'GIOVI-KCF5D61%';
-- Rear axle (traction) - T2
UPDATE pneus SET posicao_atual = 'T2EI' WHERE posicao_atual = 'Cavalo1 Dentro Motorista' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'T2EE' WHERE posicao_atual = 'Cavalo1 Fora Motorista' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'T2DI' WHERE posicao_atual = 'Cavalo1 Dentro Passageiro' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'T2DE' WHERE posicao_atual = 'Cavalo1 Fora Passageiro' AND id_unico LIKE 'GIOVI-KCF5D61%';
-- Remaining positions from trailer - map to trailer axles L3, L4, L5...
UPDATE pneus SET posicao_atual = 'L3EI' WHERE posicao_atual = 'Cavalo2 Dentro Motorista' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L3EE' WHERE posicao_atual = 'Cavalo2 Fora Motorista' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L3DI' WHERE posicao_atual = 'Cavalo2 Dentro Passageiro' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L3DE' WHERE posicao_atual = 'Cavalo2 Fora Passageiro' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L4EI' WHERE posicao_atual = 'Cavalo3 Dentro Motorista' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L4EE' WHERE posicao_atual = 'Cavalo3 Fora Motorista' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L4DI' WHERE posicao_atual = 'Cavalo3 Dentro Passageiro' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L4DE' WHERE posicao_atual = 'Cavalo3 Fora Passageiro' AND id_unico LIKE 'GIOVI-KCF5D61%';
-- Remaining loose positions
UPDATE pneus SET posicao_atual = 'L5EI' WHERE posicao_atual = 'Lado de Dentro' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L5EE' WHERE posicao_atual = 'Traseiro Motorista Fora' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L5DE' WHERE posicao_atual = 'Lado de Fora' AND id_unico LIKE 'GIOVI-KCF5D61%';
UPDATE pneus SET posicao_atual = 'L5DI' WHERE posicao_atual = 'Traseiro Passageiro Dentro' AND id_unico LIKE 'GIOVI-KCF5D61%';

-- Update KCF5D61 vehicle to have correct eixos count (front + 4 trailer axles = 5)
UPDATE veiculos SET quantidade_eixos = 5 WHERE placa = 'KCF5D61';
