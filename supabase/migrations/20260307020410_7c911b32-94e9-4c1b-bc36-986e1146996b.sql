-- Generate RG codes for existing pneus that don't have one
UPDATE public.pneus
SET rg_code = 'RG-' || UPPER(SUBSTRING(md5(id::text) FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(md5(id::text || 'salt') FROM 1 FOR 4))
WHERE rg_code IS NULL;

-- Function to auto-generate RG code on insert
CREATE OR REPLACE FUNCTION public.generate_rg_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_rg TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.rg_code IS NULL OR NEW.rg_code = '' THEN
    LOOP
      new_rg := 'RG-' || UPPER(SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 4));
      IF NOT EXISTS (SELECT 1 FROM public.pneus WHERE rg_code = new_rg) THEN
        NEW.rg_code := new_rg;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique RG code';
      END IF;
    END LOOP;
  END IF;
  
  -- Auto-generate QR code
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    NEW.qr_code := NEW.rg_code;
  END IF;
  
  -- Parse medida to extract dimensions
  IF NEW.medida IS NOT NULL THEN
    DECLARE
      parts TEXT[];
    BEGIN
      parts := REGEXP_MATCHES(NEW.medida, '(\d+)/(\d+)\s*R?\s*(\d+\.?\d*)');
      IF parts IS NOT NULL THEN
        NEW.largura_nominal := parts[1]::INT;
        NEW.perfil_nominal := parts[2]::INT;
        NEW.aro_nominal := parts[3]::NUMERIC;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_rg_code
  BEFORE INSERT ON public.pneus
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_rg_code();