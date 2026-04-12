-- =====================================================================
-- House CRM — Campos de publicación en inmuebles
-- =====================================================================
ALTER TABLE inmuebles ADD COLUMN IF NOT EXISTS publicado_por_tipo TEXT;
ALTER TABLE inmuebles ADD COLUMN IF NOT EXISTS comisionista_id UUID REFERENCES usuarios(id);
ALTER TABLE inmuebles ADD COLUMN IF NOT EXISTS comision_split TEXT;
