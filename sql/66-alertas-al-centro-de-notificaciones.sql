-- ============================================================
-- HOUSE CRM — Migración #66
-- Que la alerta de búsqueda AVISE al equipo donde ya trabaja
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → New query → pegar todo → Run.
--
-- POR QUÉ
--   La 64 guarda la alerta en su tabla, y ahí se queda. Nadie se
--   entera. Un interesado que deja su teléfono y no recibe llamada es
--   peor que no haberlo pedido.
--
--   En vez de una pantalla nueva que el equipo tendría que acordarse de
--   abrir, la alerta entra por el mismo sitio que todo lo demás: el
--   centro de Alertas (la campana), que ya se revisa a diario, con su
--   pestaña propia y su conteo de no leídas.
--
--   Se hace en la base y no en el navegador porque quien deja la alerta
--   es un visitante anónimo: no puede escribir en `notificaciones`. La
--   función corre como SECURITY DEFINER, así que sí puede.
--
-- QUÉ HACE
--   1. Añade la categoría 'busqueda' a las permitidas.
--   2. crear_alerta_busqueda ahora avisa a todos los internos activos.
--
-- ES REPETIBLE.
-- ============================================================

-- ── 1. Categoría nueva ───────────────────────────────────────
-- La tabla valida la categoría con un CHECK; sin esto el INSERT de la
-- notificación falla y se llevaría por delante la alerta entera.
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_categoria_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_categoria_check
  CHECK (categoria IN (
    'inmueble', 'referido', 'solicitud', 'pago', 'sistema', 'agenda', 'mensaje',
    'favorito', 'general', 'inmueble_nuevo', 'perfil_nuevo', 'moderacion',
    'calificacion', 'cita', 'cierre',
    'busqueda'
  ));

-- ── 2. La función, con aviso ─────────────────────────────────
CREATE OR REPLACE FUNCTION crear_alerta_busqueda(
  p_nombre      text,
  p_telefono    text,
  p_ciudad      text DEFAULT NULL,
  p_tipo        text DEFAULT NULL,
  p_negocio     text DEFAULT NULL,
  p_precio_min  bigint DEFAULT NULL,
  p_precio_max  bigint DEFAULT NULL,
  p_inmueble_id uuid DEFAULT NULL,
  p_slug        text DEFAULT 'house'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre  text;
  v_tel     text;
  v_inmo    uuid;
  v_id      uuid;
  v_alerta  uuid;
  v_titulo  text;
  v_mensaje text;
  v_rango   text;
BEGIN
  v_nombre := nullif(btrim(coalesce(p_nombre, '')), '');
  v_tel := regexp_replace(coalesce(p_telefono, ''), '[^0-9]', '', 'g');
  v_tel := regexp_replace(v_tel, '^57(?=[0-9]{10}$)', '');

  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'falta_nombre');
  END IF;
  IF length(v_tel) < 7 OR length(v_tel) > 13 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'telefono_invalido');
  END IF;

  SELECT id INTO v_inmo FROM inmobiliaria
   WHERE slug = lower(coalesce(p_slug, 'house')) AND activo = true
   LIMIT 1;

  SELECT id INTO v_id FROM alerta_busqueda
   WHERE telefono = v_tel
     AND coalesce(ciudad, '')  = coalesce(p_ciudad, '')
     AND coalesce(tipo, '')    = coalesce(p_tipo, '')
     AND coalesce(negocio, '') = coalesce(p_negocio, '')
     AND estado <> 'cerrada'
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE alerta_busqueda
       SET nombre = v_nombre, precio_min = p_precio_min, precio_max = p_precio_max,
           inmueble_id = coalesce(p_inmueble_id, inmueble_id),
           estado = 'activa', updated_at = now()
     WHERE id = v_id;
    -- No se vuelve a avisar: la misma persona pidiendo lo mismo otra vez
    -- no es un cliente nuevo, y llenar la campana de repetidos hace que
    -- se dejen de leer.
    RETURN jsonb_build_object('ok', true, 'repetida', true);
  END IF;

  INSERT INTO alerta_busqueda (
    inmobiliaria_id, nombre, telefono, ciudad, tipo, negocio,
    precio_min, precio_max, inmueble_id
  ) VALUES (
    v_inmo, v_nombre, v_tel, nullif(btrim(coalesce(p_ciudad, '')), ''),
    nullif(btrim(coalesce(p_tipo, '')), ''), p_negocio,
    p_precio_min, p_precio_max, p_inmueble_id
  )
  RETURNING id INTO v_alerta;

  -- ── Aviso al equipo ──
  --
  -- El título lleva lo que hace falta para decidir si se atiende ahora:
  -- qué busca y dónde. El teléfono va en el mensaje, para poder llamar
  -- sin abrir nada más.
  v_rango := CASE
    WHEN p_precio_min IS NOT NULL AND p_precio_max IS NOT NULL
      THEN ' · entre $' || to_char(p_precio_min, 'FM999,999,999,999') ||
           ' y $' || to_char(p_precio_max, 'FM999,999,999,999')
    ELSE ''
  END;

  v_titulo := '🔎 ' || v_nombre || ' busca ' ||
              coalesce(nullif(btrim(coalesce(p_tipo, '')), ''), 'inmueble') ||
              CASE WHEN coalesce(p_negocio, '') <> '' THEN ' en ' || p_negocio ELSE '' END ||
              CASE WHEN coalesce(p_ciudad, '') <> '' THEN ' · ' || p_ciudad ELSE '' END;

  v_mensaje := 'Dejó su WhatsApp en la ficha para que le avisemos cuando entre algo así. ' ||
               'Tel: ' || v_tel || v_rango || '.';

  BEGIN
    INSERT INTO notificaciones (
      destinatario_id, tipo, categoria, prioridad, titulo, mensaje,
      icono, color, accion_tipo, accion_seccion, contexto_tipo, contexto_id
    )
    SELECT u.id, 'busqueda_cliente', 'busqueda', 'alta', v_titulo, v_mensaje,
           '🔎', '#0ea5e9', 'abrir_seccion', 'alertas', 'alerta_busqueda', v_alerta::text
      FROM usuarios u
     WHERE u.activo = true
       AND coalesce(u.tipo_usuario, 'interno') = 'interno';
  EXCEPTION WHEN others THEN
    -- Si el aviso falla, la alerta YA quedó guardada. Perder el aviso es
    -- malo; perder el teléfono del cliente es peor.
    RAISE WARNING 'alerta guardada pero sin aviso: %', SQLERRM;
  END;

  RETURN jsonb_build_object('ok', true, 'repetida', false);
END $$;

GRANT EXECUTE ON FUNCTION crear_alerta_busqueda(text, text, text, text, text, bigint, bigint, uuid, text)
  TO anon, authenticated;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT crear_alerta_busqueda('Prueba Aviso', '315 777 88 99', 'Pereira', 'Apartamento', 'arriendo', 900000, 1500000) AS creada;

SELECT titulo, mensaje, categoria, prioridad
  FROM notificaciones
 WHERE tipo = 'busqueda_cliente'
 ORDER BY created_at DESC
 LIMIT 1;

SELECT count(*) AS avisos_enviados
  FROM notificaciones WHERE tipo = 'busqueda_cliente';

-- Se espera:
--   creada           {"ok": true, "repetida": false}
--   titulo           🔎 Prueba Aviso busca Apartamento en arriendo · Pereira
--   avisos_enviados  = número de usuarios internos activos
--
-- Para dejar limpio después de verlo:
-- DELETE FROM notificaciones WHERE tipo = 'busqueda_cliente' AND titulo LIKE '%Prueba Aviso%';
-- DELETE FROM alerta_busqueda WHERE nombre LIKE 'Prueba %';
