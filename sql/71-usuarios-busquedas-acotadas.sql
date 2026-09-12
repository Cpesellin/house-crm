-- ============================================================
-- HOUSE CRM — Migración #71 · Fase 0.4a
-- Búsquedas acotadas de usuario para el login y el registro
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → proyecto HOUSE CRM (ref keasjfgcjkskvdcudoml).
--
-- POR QUÉ
--   La tabla `usuarios` sigue legible con la llave pública: nombre,
--   correo y rol de 47 personas, sin iniciar sesión. No se puede cerrar
--   de golpe porque tres cosas la leen ANTES de que exista sesión:
--
--     · el login, que busca a la persona por usuario o correo para
--       saber a qué correo autenticar;
--     · los tres formularios de registro, que miran si el correo ya
--       existe;
--     · el portafolio y la ficha pública, que muestran el nombre y la
--       foto del asesor.
--
--   Medido en el navegador sin sesión: esas son TODAS las lecturas.
--
-- QUÉ HACE ESTA MIGRACIÓN
--   Crea dos funciones que responden por UNA persona cada vez, y sólo
--   con los campos que ese flujo necesita. Así el login y el registro
--   dejan de necesitar leer la tabla entera.
--
--   NO cierra nada todavía. El cierre va en la migración 72, y sólo
--   después de desplegar el código que ya usa estas funciones. En este
--   orden, en ningún momento queda el login roto.
--
-- RIESGO QUE QUEDA, dicho claro
--   Quien conozca el usuario o el correo de alguien puede saber si
--   existe y a qué correo corresponde. Es enumeración, y hay que frenarla
--   con límite de intentos en la fase de endurecimiento. Pero es
--   incomparablemente menos que hoy: hoy se descarga la lista completa de
--   todos, con correo y rol, en una sola petición y sin saber nada.
--
-- ES REPETIBLE.
-- ============================================================

DO $$ BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'PROYECTO EQUIVOCADO. Esto es de HOUSE CRM (ref keasjfgcjkskvdcudoml).';
  END IF;
END $$;

BEGIN;

-- ── Login ───────────────────────────────────────────────────
-- Exactamente lo que pedía loginWithCredentials:
--   select id, email, usuario, auth_migrated, activo
--   where usuario ilike X or email ilike X, activo = true, limit 1
CREATE OR REPLACE FUNCTION public.login_buscar_usuario(p_identificador text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id text;
  r record;
BEGIN
  v_id := lower(btrim(coalesce(p_identificador, '')));
  -- Un identificador vacío o con caracteres de sintaxis no busca nada.
  --
  -- La comparación es de igualdad exacta (no ilike), así que aquí ni '%'
  -- ni '_' serían comodines. Se rechazan igual los de sintaxis de filtro
  -- por defensa en profundidad. El '_' NO se rechaza: aparece en datos
  -- reales (un usuario y un correo lo llevan) y bloquearlo dejaría a esa
  -- persona sin poder entrar.
  IF v_id = '' OR v_id ~ '[%,()*\\]' THEN
    RETURN NULL;
  END IF;

  SELECT id, email, usuario, auth_migrated, activo
    INTO r
    FROM usuarios
   WHERE (lower(usuario) = v_id OR lower(email) = v_id)
     AND activo = true
   LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', r.id, 'email', r.email, 'usuario', r.usuario,
    'auth_migrated', r.auth_migrated, 'activo', r.activo
  );
END $$;

-- ── Registro ────────────────────────────────────────────────
-- Lo que pedían los tres formularios: si el correo existe, su id, si
-- está activo y de qué tipo es (para no convertir a un interno en
-- cliente del público al "reactivarlo").
CREATE OR REPLACE FUNCTION public.registro_buscar_email(p_email text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  r record;
BEGIN
  v_email := lower(btrim(coalesce(p_email, '')));
  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id, activo, tipo_usuario
    INTO r
    FROM usuarios
   WHERE lower(email) = v_email
   LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object('id', r.id, 'activo', r.activo, 'tipo_usuario', r.tipo_usuario);
END $$;

GRANT EXECUTE ON FUNCTION public.login_buscar_usuario(text)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registro_buscar_email(text) TO anon, authenticated;

COMMIT;

-- ============================================================
-- VERIFICACIÓN (no expone a nadie: el editor ya tiene acceso total)
-- ============================================================

SELECT public.login_buscar_usuario('cristhian.admin')  IS NOT NULL AS login_encuentra,
       public.login_buscar_usuario('%')                IS NULL     AS comodin_bloqueado,
       public.login_buscar_usuario('')                 IS NULL     AS vacio_bloqueado,
       public.registro_buscar_email('no-existe@x.co')  IS NULL     AS registro_no_existe;

-- Se esperan las cuatro en true.
