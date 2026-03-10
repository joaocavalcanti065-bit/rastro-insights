
CREATE TABLE public.locais_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  almoxarifado text NOT NULL,
  setor text,
  corredor text,
  prateleira text,
  capacidade integer DEFAULT 0,
  ocupacao_atual integer DEFAULT 0,
  medida_preferencial text,
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.locais_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locais_estoque_select" ON public.locais_estoque FOR SELECT TO public USING (true);
CREATE POLICY "locais_estoque_insert" ON public.locais_estoque FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "locais_estoque_update" ON public.locais_estoque FOR UPDATE TO public USING (true);
CREATE POLICY "locais_estoque_delete" ON public.locais_estoque FOR DELETE TO public USING (true);
