-- ============================================================
-- HOUSE CRM — Migración #38: Bridge hacia Supabase Auth
-- Agrega columnas de tracking para la migración. NO toca RLS ni flujos.
-- Cero impacto en operación actual.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. COLUMNAS DE TRACKING
-- ────────────────────────────────────────────────────────────
-- auth_migrated: true cuando el usuario ya tiene cuenta en auth.users
--                vinculada y su login usa Supabase Auth nativo.
-- auth_migrated_at: fecha de la migración (para auditoría).
-- needs_password_reset: usuarios antiguos sin SHA-256 válido que
--                       deben resetear su contraseña al primer login.
-- ────────────────────────────────────────────────────────────

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS auth_migrated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auth_migrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS needs_password_reset BOOLEAN DEFAULT false;

COMMENT ON COLUMN usuarios.auth_migrated IS
  'true cuando existe auth.users.id = usuarios.id (cuenta linked a Supabase Auth nativo).';
COMMENT ON COLUMN usuarios.auth_migrated_at IS
  'Timestamp del link con Supabase Auth (audit trail).';
COMMENT ON COLUMN usuarios.needs_password_reset IS
  'Marcar true para forzar reset en próximo login (usuario bloqueado o migración fallida).';

-- ────────────────────────────────────────────────────────────
-- 2. ÍNDICE PARA QUERIES DEL BRIDGE
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_migrated
  ON usuarios(auth_migrated) WHERE auth_migrated = false;

-- ────────────────────────────────────────────────────────────
-- 3. FUNCIÓN HELPER: marcar usuario como migrado (SECURITY DEFINER)
-- ────────────────────────────────────────────────────────────
-- Se llama desde la Edge Function `migrate-user` con el service_role.
-- SECURITY DEFINER le permite bypasear RLS cuando sea estricto en el futuro.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION marcar_usuario_migrado(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE usuarios
    SET auth_migrated = true,
        auth_migrated_at = NOW(),
        needs_password_reset = false,
        updated_at = NOW()
    WHERE id = p_user_id AND activo = true;
  RETURN FOUND;
END; $$;

COMMENT ON FUNCTION marcar_usuario_migrado IS
  'Llamada por Edge Function migrate-user tras crear auth.users exitosamente.';

-- ────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN
-- ────────────────────────────────────────────────────────────

SELECT 'columnas agregadas' AS verif, COUNT(*) AS total
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN ('auth_migrated','auth_migrated_at','needs_password_reset');
-- debe devolver 3

SELECT 'índice creado' AS verif,
  EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usuarios_auth_migrated') AS existe;
-- debe devolver true

SELECT 'función creada' AS verif,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'marcar_usuario_migrado') AS existe;
-- debe devolver true

-- Cuántos usuarios quedan por migrar (al inicio son todos los activos):
SELECT COUNT(*) AS usuarios_pendientes_migrar
FROM usuarios WHERE auth_migrated = false AND activo = true;
