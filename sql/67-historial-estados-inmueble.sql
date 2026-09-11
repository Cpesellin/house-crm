-- ============================================================
-- HOUSE CRM — Migración #67
-- Historial de estados del inmueble + desactivar con motivo
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → New query → pegar todo → Run.
--
-- POR QUÉ
--   Un inmueble se saca de la vitrina y meses después toca volver a
--   activarlo. Hoy no queda rastro: la tabla `inmuebles` sólo guarda
--   `fecha_estado`, o sea CUÁNDO fue el último cambio. Ni quién, ni por
--   qué, ni cuántas veces. Al reactivar se pierde hasta esa fecha.
--
--   Sin eso no se puede responder a lo básico: "¿este apartamento por
--   qué lo bajamos en marzo?", "¿quién lo desactivó?", "¿es la tercera
--   vez que el dueño lo retira?".
--
-- POR QUÉ UN TRIGGER Y NO ESCRIBIRLO DESDE LA APP
--   En este repo el estado se escribe desde varios sitios (la función
--   cambiar_estado_inmueble, el UPDATE de reserva, el flujo de
--   solicitudes, el de cierres). Si el historial dependiera de que cada
--   uno se acuerde de registrarlo, tarde o temprano habría cambios sin
--   registrar — y un historial con huecos no sirve para decidir.
--
--   El trigger lo captura TODO, venga de donde venga, incluso de un
--   UPDATE hecho a mano en el editor.
--
-- ES REPETIBLE.
-- ============================================================

-- ── 1. El libro ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inmueble_estado_historial (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE CASCADE,
  inmueble_id     uuid NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,

  estado_anterior text,
  estado_nuevo    text NOT NULL,

  -- Por qué. El motivo es de una lista para poder contarlos después
  -- ("el 40% los retira el dueño"); la nota es texto libre.
  motivo          text,
  nota            text,

  -- Quién. Puede quedar en NULL si el cambio lo hizo un proceso
  -- automático (el cron que inactiva no-renovaciones, por ejemplo).
  usuario_id      uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre  text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Se consulta casi siempre por inmueble y en orden cronológico inverso.
CREATE INDEX IF NOT EXISTS ix_inm_hist_inmueble ON inmueble_estado_historial (inmueble_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_inm_hist_estado   ON inmueble_estado_historial (estado_nuevo, created_at DESC);

ALTER TABLE inmueble_estado_historial ENABLE ROW LEVEL SECURITY;

-- Sólo el equipo. Un historial de por qué se bajó un inmueble puede
-- decir cosas del dueño que no son del público ("no contesta",
-- "problemas de escrituras").
--
-- Se apoya en es_usuario_interno() (migración 65): `authenticated` NO
-- basta, porque los clientes que se registran en la marketplace
-- también lo son.
DROP POLICY IF EXISTS inm_hist_lectura ON inmueble_estado_historial;
CREATE POLICY inm_hist_lectura ON inmueble_estado_historial
  FOR SELECT TO authenticated
  USING (public.es_usuario_interno());

-- Nadie escribe a mano: escribe el trigger, que corre con los permisos
-- de la función. Un historial que se puede editar no es un historial.

-- ── 2. Quién hizo el cambio y por qué ────────────────────────
--
-- El trigger no puede recibir parámetros, así que el motivo se deja
-- justo antes del UPDATE en una variable de sesión y el trigger la
-- recoge. Es el mecanismo estándar de Postgres para esto.
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado_inmueble()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_motivo text;
  v_nota   text;
  v_uid    uuid;
  v_nom    text;
BEGIN
  -- Sólo interesa el cambio de estado.
  IF TG_OP = 'UPDATE' AND NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  -- current_setting con `true` devuelve NULL en vez de reventar cuando
  -- la variable no está puesta — que es lo normal en los cambios que no
  -- pasan por la función de desactivar.
  v_motivo := nullif(current_setting('app.motivo_estado', true), '');
  v_nota   := nullif(current_setting('app.nota_estado', true), '');

  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    SELECT nombre INTO v_nom FROM usuarios WHERE id = v_uid LIMIT 1;
  END IF;

  INSERT INTO inmueble_estado_historial (
    inmobiliaria_id, inmueble_id, estado_anterior, estado_nuevo,
    motivo, nota, usuario_id, usuario_nombre
  ) VALUES (
    NEW.inmobiliaria_id, NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.estado ELSE NULL END,
    NEW.estado, v_motivo, v_nota, v_uid, v_nom
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_historial_estado ON inmuebles;
CREATE TRIGGER trg_historial_estado
  AFTER INSERT OR UPDATE OF estado ON inmuebles
  FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_estado_inmueble();

-- ── 3. Desactivar / reactivar, con motivo ────────────────────
--
-- No se toca cambiar_estado_inmueble (sql/58): añadirle parámetros
-- crearía una segunda versión de la misma función y PostgREST empieza a
-- devolver 404 por ambigüedad de firma. Esta es una función aparte para
-- una acción distinta.
CREATE OR REPLACE FUNCTION desactivar_inmueble(
  p_id     uuid,
  p_motivo text,
  p_nota   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  fila inmuebles;
BEGIN
  IF NOT public.es_usuario_interno() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_permiso');
  END IF;
  IF nullif(btrim(coalesce(p_motivo, '')), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'falta_motivo');
  END IF;

  -- Se dejan para el trigger.
  PERFORM set_config('app.motivo_estado', p_motivo, true);
  PERFORM set_config('app.nota_estado', coalesce(p_nota, ''), true);

  UPDATE inmuebles
     SET estado = 'Retirado', fecha_estado = now(), updated_at = now()
   WHERE id = p_id
     AND inmobiliaria_id = current_tenant()
     AND eliminado = false
  RETURNING * INTO fila;

  IF fila.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inmueble_no_encontrado');
  END IF;
  RETURN jsonb_build_object('ok', true, 'estado', fila.estado);
END $$;

CREATE OR REPLACE FUNCTION reactivar_inmueble(
  p_id   uuid,
  p_nota text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  fila inmuebles;
BEGIN
  IF NOT public.es_usuario_interno() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_permiso');
  END IF;

  PERFORM set_config('app.motivo_estado', 'reactivado', true);
  PERFORM set_config('app.nota_estado', coalesce(p_nota, ''), true);

  -- Vuelve como "Verificar Disponibilidad", no como "Disponible".
  --
  -- Un inmueble que estuvo meses fuera de la vitrina no se puede dar
  -- por disponible sin preguntar: el dueño pudo venderlo, cambiar el
  -- precio o no querer seguir. Publicarlo como disponible sin confirmar
  -- es exponer al asesor a llevar un cliente a una visita imposible.
  UPDATE inmuebles
     SET estado = 'Verificar Disponibilidad', fecha_estado = now(), updated_at = now()
   WHERE id = p_id
     AND inmobiliaria_id = current_tenant()
     AND eliminado = false
  RETURNING * INTO fila;

  IF fila.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inmueble_no_encontrado');
  END IF;
  RETURN jsonb_build_object('ok', true, 'estado', fila.estado);
END $$;

GRANT EXECUTE ON FUNCTION desactivar_inmueble(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivar_inmueble(uuid, text)        TO authenticated;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
--
-- ⚠️ El editor corre por encima de la RLS y sin sesión de usuario, así
-- que aquí sólo se comprueba que los objetos existen y que el trigger
-- registra. La prueba de permisos la hago desde fuera.

SELECT tgname AS trigger FROM pg_trigger WHERE tgname = 'trg_historial_estado';

SELECT policyname, cmd, roles::text
  FROM pg_policies WHERE tablename = 'inmueble_estado_historial';

SELECT count(*) AS filas_de_historial FROM inmueble_estado_historial;

-- Se espera: el trigger existe, una policy de SELECT para
-- {authenticated}, y 0 filas (el historial arranca vacío: empieza a
-- llenarse con el próximo cambio de estado, no reconstruye el pasado).
