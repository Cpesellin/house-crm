-- ============================================================
-- HOUSE CRM — Migración #39: Lockdown de password_hash (FASE B.1)
-- Revoca el acceso de lectura de password_hash para anon y authenticated.
-- Solo service_role (Edge Functions) retiene acceso.
--
-- Impacto:
--   - Un atacante con anon key ya NO puede dumpear los 41 password hashes
--   - El cliente del frontend nunca necesita leer password_hash tras commit 3ba3cc8
--   - migrate-user (service_role) sigue leyendo password_hash para validar
--     credenciales legacy durante la migración
--
-- Cierra parcialmente CRÍTICO-03 (hash SHA-256 expuesto) del security audit.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

-- 1. Revocar SELECT a nivel de tabla
REVOKE SELECT ON public.usuarios FROM anon, authenticated;

-- 2. Re-otorgar SELECT explícitamente a TODAS las columnas EXCEPTO password_hash
GRANT SELECT (
  id, usuario, email, nombre, rol, activo, foto, created_at,
  telefono_contacto, es_gestor_arriendos, tipo_usuario,
  notificaciones_email, perfiles_publicos,
  comprador_credito_aprobado, comprador_monto_credito,
  comprador_tipo_pago, comprador_proposito, comprador_notas_admin,
  comprador_calificado, comprador_calificado_at, comprador_calificado_por,
  puede_publicar, puede_referir, intencion_registro,
  telefono, foto_url, estado_usuario, ultimo_login, creado_por, notas_admin,
  auth_migrated, auth_migrated_at, needs_password_reset
) ON public.usuarios TO anon, authenticated;

-- 3. Verificación
SELECT
  has_column_privilege('anon', 'public.usuarios', 'password_hash', 'SELECT') AS anon_hash,
  has_column_privilege('authenticated', 'public.usuarios', 'password_hash', 'SELECT') AS auth_hash,
  has_column_privilege('anon', 'public.usuarios', 'nombre', 'SELECT') AS anon_nombre,
  has_column_privilege('authenticated', 'public.usuarios', 'email', 'SELECT') AS auth_email,
  has_column_privilege('service_role', 'public.usuarios', 'password_hash', 'SELECT') AS service_hash;
-- Resultado esperado: false, false, true, true, true
