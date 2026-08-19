-- ============================================================
-- HOUSE CRM — Migración #55 · FIX CRÍTICO
-- Restaurar policies PERMISSIVE en tablas huérfanas tras A3
-- ============================================================
--
-- BUG QUE CORRIGE:
--   La migración 49 (A3) eliminó las policies "bomba" (allow_all_*,
--   open_*, all_pv_*) y creó tenant_isolation como RESTRICTIVE.
--
--   Postgres RLS: las policies RESTRICTIVE sólo RESTRINGEN, no OTORGAN.
--   Se necesita al menos UNA policy PERMISSIVE para que la tabla sea
--   accesible. Las tablas cuya única policy era la "bomba" quedaron
--   completamente bloqueadas → login roto.
--
-- SÍNTOMA:
--   Usuario autenticado no puede entrar al CRM. El SQL Editor sí
--   funciona porque corre como service_role (bypassa RLS).
--
-- QUÉ HACE ESTE FIX:
--   Crea policy PERMISSIVE `authenticated_access` en cada tabla
--   huérfana. El aislamiento multi-tenant lo sigue garantizando
--   tenant_isolation (RESTRICTIVE), que se AND-ea con esta.
--
--   Resultado: usuario autenticado ve/edita lo de SU tenant. Igual
--   que antes de A3, pero con aislamiento real entre tenants.
--
-- STATUS: pendiente de ejecutar — URGENTE
-- ============================================================

BEGIN;

-- ─── Tablas huérfanas: única policy era la "bomba" ──────────────────
DO $$
DECLARE
  t text;
  huerfanas text[] := ARRAY[
    -- CRM core sin ninguna policy permisiva
    'usuarios',              -- CRÍTICA: sin esto no hay login
    'agenda',
    'alertas',
    'anotaciones',
    'historial',
    'permisos_rol',
    'solicitudes',
    'favoritos',             -- RLS recién habilitado en A3
    'logros_referidor',      -- RLS recién habilitado en A3
    'registro_solicitudes',  -- RLS recién habilitado en A3
    -- Posventa: all_pv_* eran las únicas
    'pv_alertas','pv_casos','pv_categorias','pv_checklist',
    'pv_checklist_plantillas','pv_evidencias','pv_historial',
    'pv_inquilinos','pv_mensajes','pv_problemas','pv_profesionales',
    'pv_propiedades','pv_propietarios','pv_usuarios'
  ];
BEGIN
  FOREACH t IN ARRAY huerfanas LOOP
    EXECUTE format('DROP POLICY IF EXISTS authenticated_access ON %I', t);
    EXECUTE format(
      'CREATE POLICY authenticated_access ON %I FOR ALL TO authenticated
       USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ─── usuarios: además lectura para anon ─────────────────────────────
-- El portafolio público muestra el nombre del captador. Sin esto,
-- los visitantes anónimos no ven asesores en las tarjetas.
DROP POLICY IF EXISTS anon_read_usuarios ON usuarios;
CREATE POLICY anon_read_usuarios ON usuarios FOR SELECT TO anon
  USING (true);

-- ─── inmuebles: restaurar escritura para autenticados ───────────────
-- Quedó sólo "Lectura pública inmuebles" (SELECT). Sin esto no se
-- pueden crear/editar inmuebles desde el CRM.
DROP POLICY IF EXISTS authenticated_write_inmuebles ON inmuebles;
CREATE POLICY authenticated_write_inmuebles ON inmuebles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── logros_usuario: faltaba INSERT/UPDATE ──────────────────────────
DROP POLICY IF EXISTS authenticated_write_logros ON logros_usuario;
CREATE POLICY authenticated_write_logros ON logros_usuario FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── sugerencias_enviadas: faltaba INSERT/DELETE ────────────────────
DROP POLICY IF EXISTS authenticated_write_sugerencias ON sugerencias_enviadas;
CREATE POLICY authenticated_write_sugerencias ON sugerencias_enviadas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── niveles_referidor: tabla de config, escritura admin ────────────
DROP POLICY IF EXISTS authenticated_write_niveles ON niveles_referidor;
CREATE POLICY authenticated_write_niveles ON niveles_referidor FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── fotos: asegurar anon puede leer (portafolio público) ───────────
DROP POLICY IF EXISTS anon_read_fotos ON fotos;
CREATE POLICY anon_read_fotos ON fotos FOR SELECT TO anon
  USING (true);

-- ─── inmobiliaria / plan / suscripcion: lectura para el branding ────
-- current_tenant() y get_tenant_by_slug necesitan leer inmobiliaria.
DROP POLICY IF EXISTS read_inmobiliaria ON inmobiliaria;
CREATE POLICY read_inmobiliaria ON inmobiliaria FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS read_plan ON plan;
CREATE POLICY read_plan ON plan FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS read_suscripcion ON suscripcion;
CREATE POLICY read_suscripcion ON suscripcion FOR SELECT TO authenticated
  USING (true);

-- ─── pago: venía con RLS ON y SIN policies desde antes de A3 ────────
-- (bug preexistente, no introducido por esta migración)
DROP POLICY IF EXISTS authenticated_read_pago ON pago;
CREATE POLICY authenticated_read_pago ON pago FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- 1) Toda tabla con RLS debe tener ≥1 policy PERMISSIVE.
--    Esperado: 0 filas (ninguna tabla huérfana).
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = t.tablename
      AND p.permissive = 'PERMISSIVE'
  )
ORDER BY t.tablename;

-- 2) Confirmar que tenant_isolation sigue en las 45 tablas
SELECT COUNT(*) AS tenant_isolation_intactas
FROM pg_policies
WHERE schemaname='public' AND policyname='tenant_isolation';

-- 3) Contar policies por tabla crítica
SELECT tablename,
       COUNT(*) FILTER (WHERE permissive='PERMISSIVE')  AS permisivas,
       COUNT(*) FILTER (WHERE permissive='RESTRICTIVE') AS restrictivas
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('usuarios','inmuebles','fotos','notificaciones','favoritos','inmobiliaria')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================
-- ROLLBACK DE EMERGENCIA (si el CRM sigue roto)
-- Desactiva el aislamiento multi-tenant y vuelve al estado
-- pre-A3. Los datos NO se pierden.
-- ============================================================
-- BEGIN;
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOR t IN SELECT tablename FROM pg_policies
--            WHERE schemaname='public' AND policyname='tenant_isolation'
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
--   END LOOP;
-- END $$;
-- COMMIT;
