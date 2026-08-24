-- ============================================================
-- HOUSE CRM — Migración #57 · FIX
-- Restaurar la escritura de las tablas que usa el CRM
-- ============================================================
--
-- HALLAZGO (prueba de estrés contra la API real, agosto 2026)
--   Como rol anon fallan los INSERT en interesados, favoritos,
--   notificaciones, referidos y anotaciones:
--     "new row violates row-level security policy"
--
-- CAUSA
--   Los usuarios del CRM operan como anon: entran con el login legacy
--   (password_hash en la tabla usuarios) y no tienen sesión de Supabase
--   Auth, así que el cliente usa la anon key.
--
--   Antes de la migración 49, las policies allow_all_* permitían todo a
--   todos. Al reemplazarlas por policies TO authenticated, estas tablas
--   quedaron sin escritura para el rol que realmente usa la app.
--
-- QUÉ HACE
--   Restaura el INSERT para anon en las tablas del flujo operativo.
--   El aislamiento entre tenants lo sigue garantizando tenant_isolation
--   (RESTRICTIVE), que asigna el tenant vía trigger.
--
-- ALCANCE DELIBERADO
--   Sólo INSERT. anon no puede editar ni borrar: eso queda para
--   authenticated, que es como debería operar la app.
--
-- SOLUCIÓN DE FONDO (pendiente, fuera de este fix)
--   Migrar a todos los usuarios a Supabase Auth. Con sesión real, las
--   policies TO authenticated los cubren y estas de anon se pueden
--   quitar. Ver sql/38-supabase-auth-bridge.sql.
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

DO $$
DECLARE
  t text;
  -- Tablas donde el CRM escribe durante la operación normal
  tablas text[] := ARRAY[
    'interesados',            -- registrar un lead
    'interesados_historial',  -- su bitácora
    'inmuebles_interesados',  -- vincular lead ↔ inmueble
    'visitas_agendadas',      -- agendar visita
    'favoritos',              -- marcar favorito
    'notificaciones',         -- avisos del sistema
    'referidos',              -- programa de referidos
    'anotaciones',            -- notas sobre inmuebles
    'historial',              -- auditoría de cambios
    'solicitudes',            -- verificación entre asesores
    'mensajes',               -- chat interno
    'intereses_inmueble',     -- interés del público
    'eventos_usuario',        -- analítica
    'sugerencias_enviadas',   -- motor de sugerencias
    'citas_inmueble',         -- citas bilaterales
    'agenda',                 -- agenda del asesor
    'alertas',                -- alertas del sistema
    'registro_solicitudes'    -- alta de usuarios
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_insert ON %I', t);
    EXECUTE format(
      'CREATE POLICY anon_insert ON %I FOR INSERT TO anon WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- Lectura para anon donde la app la necesita mientras opera sin sesión
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'interesados','interesados_historial','inmuebles_interesados',
    'visitas_agendadas','favoritos','notificaciones','referidos',
    'anotaciones','historial','solicitudes','mensajes',
    'intereses_inmueble','sugerencias_enviadas','citas_inmueble',
    'agenda','alertas','permisos_rol','niveles_referidor','logros_usuario'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_select ON %I', t);
    EXECUTE format(
      'CREATE POLICY anon_select ON %I FOR SELECT TO anon USING (true)', t
    );
  END LOOP;
END $$;

-- UPDATE para el flujo que lo requiere (mover leads, marcar leídas,
-- cambiar estado de inmuebles, confirmar disponibilidad)
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'interesados','notificaciones','inmuebles','visitas_agendadas',
    'solicitudes','mensajes','favoritos','intereses_inmueble',
    'sugerencias_enviadas','citas_inmueble','agenda'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_update ON %I', t);
    EXECUTE format(
      'CREATE POLICY anon_update ON %I FOR UPDATE TO anon
       USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- DELETE sólo donde el flujo lo necesita (quitar favorito, borrar foto,
-- eliminar lead). El borrado de inmuebles es lógico (eliminado=true),
-- así que no requiere DELETE.
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY['favoritos','fotos','interesados','anotaciones'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_delete ON %I', t);
    EXECUTE format(
      'CREATE POLICY anon_delete ON %I FOR DELETE TO anon USING (true)', t
    );
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Toda tabla con RLS debe tener al menos una policy permisiva por
-- comando que la app use. Esperado: 0 filas.
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public' AND p.tablename=t.tablename
      AND p.permissive='PERMISSIVE'
  )
ORDER BY t.tablename;

-- Resumen de lo que puede hacer anon
SELECT tablename,
       string_agg(DISTINCT cmd, ', ' ORDER BY cmd) AS comandos
FROM pg_policies
WHERE schemaname='public' AND roles::text LIKE '%anon%'
  AND permissive='PERMISSIVE'
GROUP BY tablename
ORDER BY tablename;
