-- ============================================================
-- HOUSE CRM — Migración #47 · Multitenant Fase A2
-- Función current_tenant() + triggers BEFORE INSERT en 45 tablas
-- ============================================================
--
-- OBJETIVO:
--   Que cada INSERT nuevo reciba automáticamente el inmobiliaria_id
--   correcto sin que el frontend tenga que pasarlo. Preparación
--   necesaria antes de SET NOT NULL (A1.3).
--
-- CÓMO FUNCIONA:
--   1. current_tenant() lee el inmobiliaria_id del usuario logueado
--      (auth.uid() → usuarios.inmobiliaria_id)
--   2. set_inmobiliaria_id() es un trigger que:
--      - Si el INSERT ya trae inmobiliaria_id → lo respeta
--      - Si viene NULL → intenta current_tenant()
--      - Si tampoco hay (usuario anon) → fallback a House
--   3. Se instalan 45 triggers, uno por tabla, con nombre estándar.
--
-- SEGURIDAD:
--   Idempotente (DROP TRIGGER IF EXISTS + CREATE).
--   Nada se rompe: si el frontend ya pasa inmobiliaria_id, se respeta.
--
-- REQUISITO PREVIO:
--   Correr 44 y 45 (House existe + tablas tienen la columna backfilled)
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

-- ─── 1. Función current_tenant() ────────────────────────────────────
CREATE OR REPLACE FUNCTION current_tenant() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT inmobiliaria_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── 2. Trigger function genérica ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_inmobiliaria_id() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.inmobiliaria_id IS NULL THEN
    NEW.inmobiliaria_id := current_tenant();
    -- Fallback: si no hay usuario logueado (anon), va a House
    IF NEW.inmobiliaria_id IS NULL THEN
      SELECT id INTO NEW.inmobiliaria_id FROM inmobiliaria WHERE slug = 'house' LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 3. Instalar triggers en las 45 tablas ──────────────────────────
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    -- CRM Core (31)
    'agenda','alertas','anotaciones','cierres','citas_inmueble','eventos_usuario',
    'favoritos','fotos','historial','historial_roles_usuario','inmuebles',
    'inmuebles_interesados','interesados','interesados_historial','intereses_inmueble',
    'logros_referidor','logros_usuario','mensajes','metodos_pago','negocios_cerrados',
    'niveles_referidor','notificaciones','participantes_comision','permisos_rol',
    'preferencias_calculadas','referidos','registro_solicitudes','solicitudes',
    'sugerencias_enviadas','usuarios','visitas_agendadas',
    -- Posventa (14)
    'pv_alertas','pv_casos','pv_categorias','pv_checklist','pv_checklist_plantillas',
    'pv_evidencias','pv_historial','pv_inquilinos','pv_mensajes','pv_problemas',
    'pv_profesionales','pv_propiedades','pv_propietarios','pv_usuarios'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_set_tenant ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_set_tenant BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION set_inmobiliaria_id()',
      t, t
    );
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- VERIFICACIÓN (esperado: 45 triggers instalados)
-- ============================================================

-- 1) Contar triggers instalados
SELECT COUNT(*) AS total_triggers_instalados
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'trg_%_set_tenant';

-- 2) Test funcional: la función devuelve algo sensato
SELECT current_tenant() AS tenant_visible_para_este_query;

-- 3) Simulación: INSERT sin inmobiliaria_id → trigger lo puebla
-- (comentado para no ensuciar la DB; podés probarlo manualmente)
-- INSERT INTO agenda (usuario_id, titulo, fecha_hora)
--   VALUES ((SELECT id FROM usuarios WHERE tipo_usuario='admin' LIMIT 1),'test',NOW())
--   RETURNING inmobiliaria_id;

-- ============================================================
-- ROLLBACK (descomentar SOLO si necesitás deshacer todo)
-- ============================================================
-- BEGIN;
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOR t IN
--     SELECT event_object_table FROM information_schema.triggers
--     WHERE trigger_schema='public' AND trigger_name LIKE 'trg_%_set_tenant'
--   LOOP
--     EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_set_tenant ON %I', t, t);
--   END LOOP;
-- END $$;
-- DROP FUNCTION IF EXISTS set_inmobiliaria_id();
-- DROP FUNCTION IF EXISTS current_tenant();
-- COMMIT;
