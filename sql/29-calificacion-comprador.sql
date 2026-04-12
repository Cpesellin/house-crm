-- =====================================================================
-- House CRM — Campos de calificación del comprador
-- =====================================================================
ALTER TABLE intereses_compradores ADD COLUMN IF NOT EXISTS credito_aprobado TEXT;
ALTER TABLE intereses_compradores ADD COLUMN IF NOT EXISTS tipo_pago TEXT;
ALTER TABLE intereses_compradores ADD COLUMN IF NOT EXISTS proposito TEXT;
ALTER TABLE intereses_compradores ADD COLUMN IF NOT EXISTS score_auto INT;

COMMENT ON COLUMN intereses_compradores.credito_aprobado IS 'si, no, en_tramite, no_sabe';
COMMENT ON COLUMN intereses_compradores.tipo_pago IS 'credito, efectivo, mixto';
COMMENT ON COLUMN intereses_compradores.proposito IS 'vivienda, inversion, comercial';
COMMENT ON COLUMN intereses_compradores.score_auto IS 'Puntaje automático 0-100 calculado al guardar';
