-- ============================================================
-- HOUSE CRM — Migración #48 · Multitenant Fase A1.3
-- SET NOT NULL en inmobiliaria_id (punto de no retorno)
-- ============================================================
--
-- OBJETIVO:
--   Endurecer la columna. Después de esta migración es IMPOSIBLE
--   tener una fila sin inmobiliaria_id. La DB lo garantiza.
--
-- PRE-REQUISITOS:
--   ✅ A1.1 — House existe como tenant
--   ✅ A1.2 — inmobiliaria_id agregado + backfill (0 nulls)
--   ✅ A2  — triggers auto-populan en INSERT
--
-- SEGURIDAD:
--   Antes de SET NOT NULL, verifica que NO haya nulls en la tabla.
--   Si encuentra alguno, aborta con error claro.
--   Todo en transacción (rollback si falla en cualquier tabla).
--
-- IMPACTO:
--   Ninguno en la app — los triggers de A2 cubren todos los INSERTs.
--   Si algún path no pasa por trigger (impossibile con triggers BEFORE),
--   ese INSERT fallará con error explícito "null value in column".
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

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
  nulls_count integer;
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- Verificación previa: NO deben haber nulls
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE inmobiliaria_id IS NULL', t) INTO nulls_count;
    IF nulls_count > 0 THEN
      RAISE EXCEPTION 'Tabla "%" tiene % filas con inmobiliaria_id NULL. Ejecutá A1.2 primero.', t, nulls_count;
    END IF;
    -- SET NOT NULL
    EXECUTE format('ALTER TABLE %I ALTER COLUMN inmobiliaria_id SET NOT NULL', t);
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- VERIFICACIÓN (esperado: 45 tablas con NOT NULL)
-- ============================================================

SELECT COUNT(*) AS tablas_con_not_null
FROM information_schema.columns
WHERE table_schema='public'
  AND column_name='inmobiliaria_id'
  AND is_nullable='NO';

-- Ver detalle por tabla
SELECT table_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND column_name='inmobiliaria_id'
ORDER BY is_nullable DESC, table_name;

-- ============================================================
-- ROLLBACK (descomentar SOLO si necesitás deshacer)
-- Volver a nullable no borra datos — es seguro.
-- ============================================================
-- BEGIN;
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOR t IN
--     SELECT table_name FROM information_schema.columns
--     WHERE table_schema='public' AND column_name='inmobiliaria_id' AND is_nullable='NO'
--   LOOP
--     EXECUTE format('ALTER TABLE %I ALTER COLUMN inmobiliaria_id DROP NOT NULL', t);
--   END LOOP;
-- END $$;
-- COMMIT;
