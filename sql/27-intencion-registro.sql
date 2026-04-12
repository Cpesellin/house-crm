-- =====================================================================
-- House CRM — Intención de registro (landing → registro con contexto)
-- =====================================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intencion_registro TEXT;
COMMENT ON COLUMN usuarios.intencion_registro IS
  'comprador, vendedor, arriendo_admin, arriendo_pub, comisionista';
