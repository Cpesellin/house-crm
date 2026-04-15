-- ============================================================
-- HOUSE CRM — Migración #37: Leads privados (proteger contacto admin)
-- Agrega columna privado en interesados. Si un admin crea el lead,
-- se marca privado=true y otros no-admin no lo ven (excepto el creador).
-- El admin siempre ve todos los leads (supervisor).
-- ============================================================

ALTER TABLE interesados
  ADD COLUMN IF NOT EXISTS privado BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_interesados_privado
  ON interesados(asesor_creador_id) WHERE privado = true;

COMMENT ON COLUMN interesados.privado IS
  'Si true, solo el creador y admins pueden ver el lead. Se aplica automáticamente cuando el creador es admin.';

SELECT 'columna privado' AS verif,
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_name='interesados' AND column_name='privado') AS existe;
