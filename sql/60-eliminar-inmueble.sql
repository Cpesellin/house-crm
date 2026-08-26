-- ============================================================
-- HOUSE CRM — Migración #60
-- Permitir eliminar (y restaurar) inmuebles
-- ============================================================
--
-- SÍNTOMA
--   Marcar un inmueble como eliminado devuelve 401:
--     PATCH inmuebles {"eliminado": true}
--       → "new row violates row-level security policy"
--   Un DELETE real devuelve 204 pero no borra nada — no hay policy de
--   DELETE para anon sobre inmuebles, así que afecta a cero filas y el
--   404 silencioso se confunde con éxito.
--
-- CAUSA
--   La misma de la migración 58: la única policy de SELECT del rol anon
--   exige `eliminado = false`, así que al marcar la fila como eliminada
--   deja de ser legible para el rol que la está escribiendo.
--   Ver también sql/58 y la nota sobre anon con doble rol.
--
-- EFECTO
--   Los asesores no pueden dar de baja un inmueble. Sumado a que tampoco
--   podían cerrarlo (migración 58), el inventario sólo crecía.
--
-- QUÉ HACE
--   Dos funciones SECURITY DEFINER simétricas, con el mismo patrón que
--   cambiar_estado_inmueble: saltan la RLS de forma controlada y filtran
--   por current_tenant(), así que el aislamiento entre inmobiliarias se
--   mantiene. El borrado sigue siendo LÓGICO — no se pierde el historial,
--   ni los leads ni las fotos asociadas.
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

-- ─── Dar de baja ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION eliminar_inmueble(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encontrado uuid;
BEGIN
  UPDATE inmuebles
     SET eliminado  = true,
         updated_at = now()
   WHERE id = p_id
     AND inmobiliaria_id = current_tenant()
  RETURNING id INTO encontrado;

  IF encontrado IS NULL THEN
    RAISE EXCEPTION 'inmueble_no_encontrado';
  END IF;
  RETURN true;
END $$;

-- ─── Restaurar ──────────────────────────────────────────────────────
-- Sin esto, un borrado por error sólo se deshace desde el panel de
-- Supabase: la fila ya no es legible para la app.
CREATE OR REPLACE FUNCTION restaurar_inmueble(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encontrado uuid;
BEGIN
  UPDATE inmuebles
     SET eliminado  = false,
         updated_at = now()
   WHERE id = p_id
     AND inmobiliaria_id = current_tenant()
  RETURNING id INTO encontrado;

  IF encontrado IS NULL THEN
    RAISE EXCEPTION 'inmueble_no_encontrado';
  END IF;
  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION eliminar_inmueble(uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION restaurar_inmueble(uuid) TO anon, authenticated;

COMMIT;

-- ============================================================
-- LIMPIEZA — inmueble de prueba
-- ============================================================
-- HOUSE-249 ('ZZ prueba') lo creé yo comprobando que el registro
-- funcionaba, y no pude retirarlo justamente por este bloqueo.
-- Esta línea lo da de baja:

SELECT eliminar_inmueble(id) FROM inmuebles WHERE codigo_house = 'HOUSE-249';

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT proname, prosecdef AS security_definer
FROM pg_proc
WHERE proname IN ('eliminar_inmueble', 'restaurar_inmueble', 'cambiar_estado_inmueble');

-- No debe quedar rastro de las pruebas
SELECT codigo_house, direccion, eliminado
FROM inmuebles
WHERE direccion ILIKE 'ZZ%' OR ciudad = 'ZZTEST';
