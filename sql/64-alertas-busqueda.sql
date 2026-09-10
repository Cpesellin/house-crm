-- ============================================================
-- HOUSE CRM — Migración #64
-- Alertas de búsqueda: "avísenme cuando entre algo así"
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → New query → pegar todo → Run.
--   NO va en la terminal.
--
-- POR QUÉ
--   La ficha pública tenía un solo camino: "Me interesa este inmueble",
--   que exige crear cuenta. Quien mira una ficha y decide que ese no es
--   el suyo, se va y no vuelve — aunque la semana siguiente entre el que
--   sí era. Con un inventario que rota como éste, eso es perder al
--   cliente por una cuestión de tiempo.
--
--   Esto guarda lo que la persona busca (ciudad, tipo, negocio y un
--   rango de precio derivado del inmueble que estaba viendo) con su
--   nombre y su WhatsApp. Sin registro.
--
-- POR QUÉ UNA FUNCIÓN Y NO UN INSERT DIRECTO
--   El rol `anon` de este proyecto es a la vez el visitante público y el
--   asesor con sesión (el login legacy no usa Supabase Auth). Abrirle la
--   escritura a la tabla le abriría también la lectura a cualquiera con
--   la llave pública, que está en el navegador: los teléfonos de todos
--   los interesados quedarían a la vista.
--
--   Por eso se escribe SÓLO a través de esta función SECURITY DEFINER:
--   entra el dato, no sale nada. Leer la tabla queda para el equipo.
--
-- ES REPETIBLE: todo es IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

CREATE TABLE IF NOT EXISTS alerta_busqueda (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inmobiliaria_id  uuid REFERENCES inmobiliaria(id) ON DELETE CASCADE,

  -- Contacto
  nombre           text NOT NULL,
  telefono         text NOT NULL,

  -- Qué busca
  ciudad           text,
  tipo             text,
  negocio          text CHECK (negocio IN ('venta', 'arriendo')),
  precio_min       bigint,
  precio_max       bigint,

  -- De qué ficha salió (para saber qué le gustó)
  inmueble_id      uuid REFERENCES inmuebles(id) ON DELETE SET NULL,

  estado           text NOT NULL DEFAULT 'activa'
                   CHECK (estado IN ('activa', 'contactado', 'cerrada')),
  notas            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- El equipo la consulta por inmobiliaria y por fecha; y se busca por
-- teléfono al devolver la llamada.
CREATE INDEX IF NOT EXISTS ix_alerta_busqueda_inmo   ON alerta_busqueda (inmobiliaria_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_alerta_busqueda_tel    ON alerta_busqueda (telefono);
CREATE INDEX IF NOT EXISTS ix_alerta_busqueda_activa ON alerta_busqueda (estado, ciudad, tipo);

ALTER TABLE alerta_busqueda ENABLE ROW LEVEL SECURITY;

-- Sin policy de INSERT a propósito: nadie escribe directo, sólo la
-- función de abajo. Y la de lectura es ADITIVA (no RESTRICTIVE): una
-- policy restrictiva no otorga acceso, sólo recorta el que ya existe —
-- ese error tumbó el login en producción una vez.
DROP POLICY IF EXISTS alerta_busqueda_lectura ON alerta_busqueda;
CREATE POLICY alerta_busqueda_lectura ON alerta_busqueda
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- FUNCIÓN DE ESCRITURA
-- ============================================================
--
-- Devuelve jsonb (no la fila) para no filtrar de vuelta lo que hay en
-- la tabla. Si la misma persona repite la misma búsqueda, se actualiza
-- la que ya existe en vez de acumular duplicados: el asesor no tiene
-- por qué ver tres veces al mismo señor.

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
  v_nombre text;
  v_tel    text;
  v_inmo   uuid;
  v_id     uuid;
BEGIN
  v_nombre := nullif(btrim(coalesce(p_nombre, '')), '');
  -- Sólo dígitos: la gente escribe "310 592 27 63", "+57 310..." y
  -- "(310) 5922763". Guardar el texto tal cual haría imposible
  -- reconocer que son el mismo número.
  v_tel := regexp_replace(coalesce(p_telefono, ''), '[^0-9]', '', 'g');
  -- Colombia: los móviles llevan 10 dígitos, con o sin el 57 delante.
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

  -- ¿Ya pidió lo mismo? Se refresca, no se duplica.
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
    RETURN jsonb_build_object('ok', true, 'repetida', true);
  END IF;

  INSERT INTO alerta_busqueda (
    inmobiliaria_id, nombre, telefono, ciudad, tipo, negocio,
    precio_min, precio_max, inmueble_id
  ) VALUES (
    v_inmo, v_nombre, v_tel, nullif(btrim(coalesce(p_ciudad, '')), ''),
    nullif(btrim(coalesce(p_tipo, '')), ''), p_negocio,
    p_precio_min, p_precio_max, p_inmueble_id
  );

  RETURN jsonb_build_object('ok', true, 'repetida', false);
END $$;

GRANT EXECUTE ON FUNCTION crear_alerta_busqueda(text, text, text, text, text, bigint, bigint, uuid, text)
  TO anon, authenticated;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT crear_alerta_busqueda('Prueba Claude', '+57 310 592 27 63', 'Pereira', 'Casa', 'venta', 200000000, 400000000)
       AS primera,
       crear_alerta_busqueda('Prueba Claude', '3105922763', 'Pereira', 'Casa', 'venta', 300000000, 500000000)
       AS repetida,
       crear_alerta_busqueda('Prueba Claude', '123', 'Pereira', 'Casa', 'venta')
       AS telefono_malo;

-- Se espera:
--   primera       {"ok": true,  "repetida": false}
--   repetida      {"ok": true,  "repetida": true}   ← el mismo número escrito de otra forma
--   telefono_malo {"ok": false, "error": "telefono_invalido"}

SELECT nombre, telefono, ciudad, tipo, negocio, precio_min, precio_max, estado
  FROM alerta_busqueda WHERE nombre = 'Prueba Claude';

-- Y para dejar limpio después de mirarlo:
-- DELETE FROM alerta_busqueda WHERE nombre = 'Prueba Claude';
