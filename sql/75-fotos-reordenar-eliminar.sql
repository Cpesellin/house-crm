-- ============================================================
-- HOUSE CRM — Migración #75
-- Reordenar y eliminar fotos con permiso explícito y resultado real
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → proyecto HOUSE CRM (ref keasjfgcjkskvdcudoml).
--
-- EL PROBLEMA
--   En el panel de fotos no se podía eliminar ni cambiar el orden "con
--   éxito". Dos de las causas están en cómo se escribía en la base:
--
--   1. PANTALLA Y BASE NO COINCIDÍAN EN QUIÉN PUEDE EDITAR.
--      La pantalla deja editar fotos a: admin, oficina, el captador del
--      inmueble y el gestor de arriendos. Las policies de `fotos` sólo
--      permitían al captador y al admin. A oficina y a los gestores se
--      les ofrecían los botones y la base rechazaba la operación.
--
--   2. EL RECHAZO ERA SILENCIOSO.
--      PostgREST responde "OK" a un DELETE o UPDATE que la seguridad de
--      filas bloquea: simplemente toca cero filas. La pantalla quitaba la
--      foto de la vista y decía "Orden actualizado", pero en la base no
--      había cambiado nada. Al recargar, todo volvía a estar como antes.
--      Además `update_foto_orden`, la función que intentaba usar para
--      ordenar, no está en ninguna migración y en la base da error.
--
-- QUÉ HACE
--   · puede_editar_fotos(inmueble): la MISMA regla que la pantalla, en
--     un único sitio.
--   · fotos_reordenar(inmueble, ids): recibe el orden completo y lo
--     aplica en UNA transacción — o se guarda entero o no se guarda.
--   · fotos_eliminar(inmueble, ids): borra y deja el orden de las que
--     quedan sin huecos, para que la portada sea siempre la primera.
--
--   Las dos devuelven cuántas fotos tocaron de verdad. La pantalla ya no
--   puede decir "listo" si no pasó nada.
--
-- AISLAMIENTO
--   Todas exigen que el inmueble sea de la misma inmobiliaria que quien
--   llama, y sólo tocan fotos que pertenezcan a ESE inmueble: aunque
--   alguien mande ids de fotos ajenas, no las mueve ni las borra.
--
-- LO QUE NO RESUELVE
--   Borrar la fila no borra el archivo en Cloudinary (el preset sin firma
--   no permite borrar). Ya era así antes; queda para el endurecimiento.
--
-- ES REPETIBLE.
-- ============================================================

DO $$ BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'PROYECTO EQUIVOCADO. Esto es de HOUSE CRM (ref keasjfgcjkskvdcudoml).';
  END IF;
END $$;

BEGIN;

-- ── ¿Puede esta persona editar las fotos de este inmueble? ──
--
-- Replica permisos() de detail-modal-v2.js:
--   admin u oficina → sí          (modo B)
--   captador del inmueble → sí    (modo A)
--   gestor de arriendos → sí      (modo C)
--   el resto → no                 (modo D)
-- más dos condiciones que la pantalla no puede garantizar:
--   · sesión real, usuario activo e interno;
--   · misma inmobiliaria que el inmueble.
CREATE OR REPLACE FUNCTION public.puede_editar_fotos(p_inmueble uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u record;
  i record;
BEGIN
  IF auth.uid() IS NULL OR p_inmueble IS NULL THEN RETURN false; END IF;

  SELECT id, rol, activo, tipo_usuario, es_gestor_arriendos, inmobiliaria_id
    INTO u FROM usuarios WHERE id = auth.uid() LIMIT 1;
  IF NOT FOUND OR u.activo IS NOT TRUE
     OR coalesce(u.tipo_usuario, 'interno') <> 'interno' THEN
    RETURN false;
  END IF;

  SELECT id, captador_id, inmobiliaria_id
    INTO i FROM inmuebles WHERE id = p_inmueble AND eliminado = false LIMIT 1;
  IF NOT FOUND OR i.inmobiliaria_id IS DISTINCT FROM u.inmobiliaria_id THEN
    RETURN false;
  END IF;

  RETURN u.rol IN ('admin', 'oficina')
      OR i.captador_id = u.id
      OR coalesce(u.es_gestor_arriendos, false);
END $$;

-- ── Reordenar ────────────────────────────────────────────────
--
-- Recibe TODOS los ids en el orden deseado. La posición en el arreglo es
-- el nuevo `orden` (0 = portada).
--
-- Se exige el conjunto completo a propósito: si se aceptara un orden
-- parcial y la pantalla tenía una lista desactualizada (otra persona
-- subió una foto mientras tanto), quedarían dos fotos con el mismo número
-- y la portada sería impredecible.
CREATE OR REPLACE FUNCTION public.fotos_reordenar(p_inmueble uuid, p_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actuales uuid[];
  v_n integer;
BEGIN
  IF NOT public.puede_editar_fotos(p_inmueble) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_permiso');
  END IF;

  SELECT coalesce(array_agg(id ORDER BY id), '{}') INTO v_actuales
    FROM fotos WHERE inmueble_id = p_inmueble;

  IF coalesce(array_length(p_ids, 1), 0) <> coalesce(array_length(v_actuales, 1), 0)
     OR (SELECT array_agg(x ORDER BY x) FROM unnest(p_ids) AS x) IS DISTINCT FROM v_actuales THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lista_desactualizada');
  END IF;

  UPDATE fotos f
     SET orden = o.pos - 1
    FROM unnest(p_ids) WITH ORDINALITY AS o(id, pos)
   WHERE f.id = o.id AND f.inmueble_id = p_inmueble;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- La vista previa de WhatsApp usa updated_at como versión: sin tocarla,
  -- el enlace compartido seguiría mostrando la portada vieja.
  UPDATE inmuebles SET updated_at = now() WHERE id = p_inmueble;

  RETURN jsonb_build_object('ok', true, 'actualizadas', v_n);
END $$;

-- ── Eliminar ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fotos_eliminar(p_inmueble uuid, p_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_n integer;
BEGIN
  IF NOT public.puede_editar_fotos(p_inmueble) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_permiso');
  END IF;
  IF coalesce(array_length(p_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object('ok', true, 'eliminadas', 0);
  END IF;

  -- Sólo fotos de ESTE inmueble, aunque lleguen ids de otro.
  DELETE FROM fotos WHERE inmueble_id = p_inmueble AND id = ANY(p_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- Orden sin huecos: si se borra la portada, la siguiente pasa a ser la 0.
  UPDATE fotos f
     SET orden = r.nuevo
    FROM (SELECT id, row_number() OVER (ORDER BY orden, id) - 1 AS nuevo
            FROM fotos WHERE inmueble_id = p_inmueble) r
   WHERE f.id = r.id AND f.orden IS DISTINCT FROM r.nuevo;

  UPDATE inmuebles SET updated_at = now() WHERE id = p_inmueble;

  RETURN jsonb_build_object('ok', true, 'eliminadas', v_n);
END $$;

GRANT EXECUTE ON FUNCTION public.puede_editar_fotos(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.fotos_reordenar(uuid, uuid[])   TO authenticated;
GRANT EXECUTE ON FUNCTION public.fotos_eliminar(uuid, uuid[])    TO authenticated;

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- En el editor no hay sesión de usuario, así que las tres responden "sin
-- permiso". Es lo correcto: la prueba real es desde la app.

SELECT public.puede_editar_fotos('00000000-0000-0000-0000-000000000000') AS sin_sesion_no_puede,
       public.fotos_reordenar('00000000-0000-0000-0000-000000000000', '{}') AS reordenar_sin_sesion,
       public.fotos_eliminar('00000000-0000-0000-0000-000000000000', '{}')  AS eliminar_sin_sesion;

-- Se espera: false · {"ok": false, "error": "sin_permiso"} · {"ok": false, "error": "sin_permiso"}
