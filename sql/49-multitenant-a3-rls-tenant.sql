-- ============================================================
-- HOUSE CRM — Migración #49 · Multitenant Fase A3
-- Aislamiento tenant vía RLS (RESTRICTIVE policies)
-- ============================================================
--
-- OBJETIVO:
--   Cerrar el círculo del multi-tenant real. Después de A3:
--   - Ninguna query puede ver datos de otro tenant
--   - Las policies granulares existentes (admin/dueño/etc.) siguen funcionando
--   - El fallback a House hace que la app siga funcional con 1 solo tenant
--
-- CÓMO FUNCIONA:
--   1. Actualiza current_tenant() con fallback a House para usuarios anón
--   2. Habilita RLS en 7 tablas donde estaba OFF
--   3. Mata las policies "bomba" (allow_all_*, open_*, all_pv_*)
--   4. Instala tenant_isolation RESTRICTIVE en las 45 tablas
--      → se AND-ea con las policies granulares existentes
--
-- SEGURIDAD:
--   Con 1 solo tenant (House), la app funciona idéntico.
--   Cuando se agregue tenant B, sus datos son 100% invisibles a House.
--
-- REQUISITO PREVIO:
--   ✅ A1 completa (columna + backfill + NOT NULL)
--   ✅ A2 completa (triggers instalados)
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

-- ─── 1. current_tenant() con fallback a House ───────────────────────
CREATE OR REPLACE FUNCTION current_tenant() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT inmobiliaria_id FROM usuarios WHERE id = auth.uid() LIMIT 1),
    (SELECT id FROM inmobiliaria WHERE slug = 'house' LIMIT 1)
  );
$$;

-- ─── 2. Habilitar RLS en las tablas donde estaba OFF ────────────────
ALTER TABLE favoritos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE logros_referidor      ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_pago          ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveles_referidor     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_referidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE referidos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_solicitudes  ENABLE ROW LEVEL SECURITY;

-- ─── 3. Matar policies "bomba" (permiten TODO) ──────────────────────
DROP POLICY IF EXISTS allow_all_agenda           ON agenda;
DROP POLICY IF EXISTS allow_all_alertas          ON alertas;
DROP POLICY IF EXISTS allow_all_anotaciones      ON anotaciones;
DROP POLICY IF EXISTS open_cierres               ON cierres;
DROP POLICY IF EXISTS allow_all_fotos            ON fotos;
DROP POLICY IF EXISTS allow_all_historial        ON historial;
DROP POLICY IF EXISTS open_hist_roles            ON historial_roles_usuario;
DROP POLICY IF EXISTS allow_all_inmuebles        ON inmuebles;
DROP POLICY IF EXISTS open_permisos_rol          ON permisos_rol;
DROP POLICY IF EXISTS open_prefs                 ON preferencias_calculadas;
DROP POLICY IF EXISTS allow_all_solicitudes      ON solicitudes;
DROP POLICY IF EXISTS open_sug                   ON sugerencias_enviadas;
DROP POLICY IF EXISTS allow_all_usuarios         ON usuarios;

-- pv_* (14)
DROP POLICY IF EXISTS all_pv_alertas             ON pv_alertas;
DROP POLICY IF EXISTS all_pv_casos               ON pv_casos;
DROP POLICY IF EXISTS all_pv_categorias          ON pv_categorias;
DROP POLICY IF EXISTS all_pv_checklist           ON pv_checklist;
DROP POLICY IF EXISTS all_pv_checklist_pl        ON pv_checklist_plantillas;
DROP POLICY IF EXISTS all_pv_evidencias          ON pv_evidencias;
DROP POLICY IF EXISTS all_pv_historial           ON pv_historial;
DROP POLICY IF EXISTS all_pv_inquilinos          ON pv_inquilinos;
DROP POLICY IF EXISTS all_pv_mensajes            ON pv_mensajes;
DROP POLICY IF EXISTS all_pv_problemas           ON pv_problemas;
DROP POLICY IF EXISTS all_pv_profesionales       ON pv_profesionales;
DROP POLICY IF EXISTS all_pv_propiedades         ON pv_propiedades;
DROP POLICY IF EXISTS all_pv_propietarios        ON pv_propietarios;
DROP POLICY IF EXISTS all_pv_usuarios            ON pv_usuarios;

-- ─── 4. Instalar tenant_isolation RESTRICTIVE en 45 tablas ─────────
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'agenda','alertas','anotaciones','cierres','citas_inmueble','eventos_usuario',
    'favoritos','fotos','historial','historial_roles_usuario','inmuebles',
    'inmuebles_interesados','interesados','interesados_historial','intereses_inmueble',
    'logros_referidor','logros_usuario','mensajes','metodos_pago','negocios_cerrados',
    'niveles_referidor','notificaciones','participantes_comision','permisos_rol',
    'preferencias_calculadas','referidos','registro_solicitudes','solicitudes',
    'sugerencias_enviadas','usuarios','visitas_agendadas',
    'pv_alertas','pv_casos','pv_categorias','pv_checklist','pv_checklist_plantillas',
    'pv_evidencias','pv_historial','pv_inquilinos','pv_mensajes','pv_problemas',
    'pv_profesionales','pv_propiedades','pv_propietarios','pv_usuarios'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- Idempotente
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    -- RESTRICTIVE = se AND-ea con las policies granulares existentes
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I AS RESTRICTIVE FOR ALL TO authenticated, anon
       USING (inmobiliaria_id = current_tenant())
       WITH CHECK (inmobiliaria_id = current_tenant())',
      t
    );
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- 1) Contar policies tenant_isolation creadas (esperado: 45)
SELECT COUNT(*) AS tenant_policies_creadas
FROM pg_policies
WHERE schemaname='public' AND policyname='tenant_isolation';

-- 2) Confirmar que NO quedan policies "bomba" (esperado: 0)
SELECT COUNT(*) AS policies_bomba_restantes
FROM pg_policies
WHERE schemaname='public'
  AND (policyname LIKE 'allow_all_%'
    OR policyname LIKE 'open_%'
    OR policyname LIKE 'all_pv_%');

-- 3) RLS habilitado en las 7 tablas que estaban OFF (esperado: 7 con rowsecurity=true)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('favoritos','logros_referidor','metodos_pago','niveles_referidor',
                    'pagos_referidos','referidos','registro_solicitudes')
ORDER BY tablename;

-- 4) Test funcional: current_tenant() con y sin auth
SELECT current_tenant() AS tenant_actual;

-- ============================================================
-- ROLLBACK (descomentar SOLO si necesitás deshacer)
-- ============================================================
-- BEGIN;
-- -- Volver a current_tenant() sin fallback
-- CREATE OR REPLACE FUNCTION current_tenant() RETURNS uuid
-- LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
-- AS $$ SELECT inmobiliaria_id FROM usuarios WHERE id = auth.uid() LIMIT 1; $$;
-- -- Drop tenant_isolation en las 45 tablas
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOR t IN
--     SELECT tablename FROM pg_policies
--     WHERE schemaname='public' AND policyname='tenant_isolation'
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
--   END LOOP;
-- END $$;
-- -- Restaurar allow_all_* (si necesario para diagnóstico)
-- CREATE POLICY allow_all_inmuebles ON inmuebles FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY allow_all_usuarios  ON usuarios  FOR ALL USING (true) WITH CHECK (true);
-- -- (etc para las demás)
-- COMMIT;
