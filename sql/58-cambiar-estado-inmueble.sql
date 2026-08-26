-- ============================================================
-- HOUSE CRM — Migración #58
-- Permitir cerrar negocios: marcar un inmueble Vendido/Arrendado/Retirado
-- ============================================================
--
-- SÍNTOMA
--   Ningún asesor puede cambiar el estado de un inmueble a otra cosa que
--   'Disponible'. Comprobado contra la API como rol anon:
--
--     Disponible                → 204 OK
--     Verificar Disponibilidad  → 401
--     Vendido / Arrendado / Retirado → 401
--       "new row violates row-level security policy"
--
--   Por eso los 195 inmuebles de producción están TODOS en Disponible o
--   Aún Disponible, y no existe un solo cierre registrado. No es que
--   nadie los marque: la base no lo permite.
--
-- CAUSA
--   La única policy de SELECT que tiene anon es "Lectura pública
--   inmuebles", que exige estado IN ('Disponible','Aún Disponible').
--   Al escribir un estado final la fila deja de ser legible para el rol
--   que la está escribiendo, y el UPDATE se rechaza.
--
--   La raíz es más profunda: anon hace de cliente anónimo Y de asesor
--   logueado a la vez, porque los usuarios entran con el login legacy sin
--   sesión de Supabase Auth. Una sola policy no puede servir a los dos.
--
-- POR QUÉ NO SE RELAJA LA LECTURA
--   Abrir el SELECT de anon a todos los estados haría visible el
--   inventario cerrado a cualquiera con la anon key, que es justo lo que
--   se acaba de corregir en el portafolio. La restricción de lectura es
--   correcta; lo que falta es una vía de escritura que no dependa de ella.
--
-- QUÉ HACE
--   Una función SECURITY DEFINER que cambia el estado saltándose RLS,
--   pero validando el estado contra la lista canónica y respetando el
--   aislamiento por inmobiliaria. La lectura pública queda intacta.
--
-- SEGURIDAD
--   Concede a anon la capacidad de cambiar estados. No es una apertura
--   nueva: anon ya podía hacer UPDATE de cualquier otra columna de
--   inmuebles (migración 57). El aislamiento entre tenants se mantiene,
--   porque la función filtra por current_tenant().
--
-- SOLUCIÓN DE FONDO (pendiente)
--   Migrar los usuarios a Supabase Auth. Con sesión real, el rol
--   authenticated ya tiene escritura completa y esta función sobra.
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION cambiar_estado_inmueble(p_id uuid, p_estado text)
RETURNS inmuebles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fila inmuebles;
BEGIN
  -- Lista blanca: un estado no contemplado no entra.
  IF p_estado NOT IN (
    'Disponible', 'Aún Disponible', 'Verificar Disponibilidad',
    'Arrendado', 'Vendido', 'Retirado'
  ) THEN
    RAISE EXCEPTION 'estado_invalido: %', p_estado
      USING HINT = 'Estados válidos: Disponible, Aún Disponible, Verificar Disponibilidad, Arrendado, Vendido, Retirado';
  END IF;

  -- El filtro por tenant es lo que sustituye a la RLS que estamos saltando.
  -- fecha_estado y updated_at se mantienen porque los UPDATE que esta
  -- función reemplaza ya los escribían: sin ellos se perdería la
  -- trazabilidad de cuándo cambió el estado.
  UPDATE inmuebles
     SET estado       = p_estado,
         fecha_estado = now(),
         updated_at   = now()
   WHERE id = p_id
     AND inmobiliaria_id = current_tenant()
     AND eliminado = false
  RETURNING * INTO fila;

  IF fila.id IS NULL THEN
    RAISE EXCEPTION 'inmueble_no_encontrado';
  END IF;

  RETURN fila;
END $$;

GRANT EXECUTE ON FUNCTION cambiar_estado_inmueble(uuid, text) TO anon, authenticated;

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Ojo: el SQL Editor corre como service_role y se salta RLS, así que
-- aquí todo parecerá funcionar. La prueba que cuenta es cambiar el estado
-- desde la app, ya con sesión iniciada.

-- 1) La función existe y es SECURITY DEFINER
SELECT proname,
       prosecdef AS security_definer,
       pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'cambiar_estado_inmueble';

-- 2) Estados actuales del inventario. Antes de esta migración sólo
--    aparecían 'Disponible' y 'Aún Disponible'.
SELECT estado, COUNT(*) AS n
FROM inmuebles
WHERE eliminado = false
GROUP BY estado
ORDER BY n DESC;
