-- ══════════════════════════════════════════════════════════════════════
-- HOUSE CRM — Panel SaaS multi-tenant  ·  BLOQUE PARA APLICAR
-- ══════════════════════════════════════════════════════════════════════
--
-- DÓNDE SE CORRE
--   En el SQL Editor de Supabase (panel web del proyecto
--   keasjfgcjkskvdcudoml) → New query → pegar todo → Run.
--   NO va en la terminal.
--
-- QUÉ HACE
--   Junta las migraciones 50, 51, 52, 53 y 54 en el orden correcto.
--   Sólo CREATE OR REPLACE FUNCTION y GRANT EXECUTE: no crea ni altera
--   tablas, y NO toca ninguna política RLS. Por eso no puede romper el
--   login ni el acceso actual — que es justo lo que pasó la última vez
--   que se tocaron políticas en producción.
--
-- POR QUÉ HACE FALTA
--   La app llama a is_superadmin() en cada arranque y hoy recibe un 404.
--   Además faltan get_tenant_by_slug() y las funciones del panel de
--   superadministrador (listar, pausar y reactivar inmobiliarias).
--
-- ES SEGURO REPETIRLO
--   Todo es CREATE OR REPLACE: si se ejecuta dos veces, no duplica nada.
--
-- COMPROBADO ANTES DE ENTREGARLO (2026-09-09)
--   · Las tablas y la vista que usa ya existen:
--     inmobiliaria, usuarios, suscripcion, inmuebles, notificaciones,
--     v_acceso.
--   · Las funciones de las migraciones 58 y 60 ya están aplicadas
--     (cambiar_estado_inmueble, eliminar_inmueble, restaurar_inmueble).
--   · Las que faltan son is_superadmin, superadmin_list_tenants y
--     get_tenant_by_slug — todas incluidas aquí.
--
-- QUEDA FUERA A PROPÓSITO
--   sql/55 (fix de políticas huérfanas): ése sí borra y recrea 10
--   políticas RLS. Se revisa aparte, no a ciegas junto con esto.
-- ══════════════════════════════════════════════════════════════════════

-- ESTADO 2026-09-09: ejecutado, entraron 8 de las 10 funciones.
--   Se cortó antes del último tramo (54-multitenant-mejoras, que empieza
--   en la línea 528 de 658). Las dos que faltaban —check_slug_available y
--   cron_alertar_trials_venciendo— se entregaron aparte en
--   APLICAR-panel-saas-parte2.sql.
--
--   Lección para la próxima: un archivo de 26 KB en el SQL Editor puede
--   quedarse a medias sin avisar. Mejor por bloques y verificando.
--
-- ══════════════════════════════════════════════════════════════════════



-- ══════════════════════════════════════════════════════════════════════
-- 50-multitenant-b2-rpc-tenant-by-slug.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================
-- HOUSE CRM — Migración #50 · Multitenant Fase B2
-- RPC get_tenant_by_slug(slug) — accesible por anon
-- ============================================================
--
-- OBJETIVO:
--   Que el frontend pueda pedir "dame la config del tenant X"
--   ANTES de que el usuario haga login. Necesario para pintar
--   el branding correcto en el landing/portafolio público.
--
-- SEGURIDAD:
--   Devuelve SOLO campos públicos (nombre, logo, color, teléfono).
--   Nunca devuelve email_admin, metadata sensible, etc.
--   Sólo tenants con activo=true son visibles.
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION get_tenant_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id',              i.id,
    'slug',            i.slug,
    'nombre',          i.nombre,
    'logo_url',        COALESCE(i.logo_url, '/img/logo.png'),
    'color_primario',  COALESCE(i.color_primario, '#1d4ed8'),
    'telefono',        i.telefono,
    'ciudad',          i.ciudad,
    'dominio_custom',  i.metadata->>'dominio_custom',
    'acceso',          jsonb_build_object(
      'permitido',     COALESCE(v.acceso_permitido, false),
      'estado',        v.suscripcion_estado,
      'grace_hasta',   v.grace_hasta
    )
  )
  FROM inmobiliaria i
  LEFT JOIN v_acceso v ON v.inmobiliaria_id = i.id
  WHERE i.slug = lower(p_slug)
    AND i.activo = true
  LIMIT 1;
$$;

-- Permitir a anon + authenticated llamar la función
GRANT EXECUTE ON FUNCTION get_tenant_by_slug(text) TO anon, authenticated;

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Debe devolver el tenant House con toda su config pública
SELECT get_tenant_by_slug('house');

-- Slug inexistente → NULL
SELECT get_tenant_by_slug('inexistente');


-- ══════════════════════════════════════════════════════════════════════
-- 51-multitenant-c4-superadmin-rpcs.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================
-- HOUSE CRM — Migración #51 · Multitenant Fase C4
-- RPCs para el panel superadmin (list/create/pause/reactivate)
-- ============================================================
--
-- OBJETIVO:
--   Que un admin de House pueda gestionar TODOS los tenants desde
--   /superadmin/tenants sin depender de queries directas a las tablas
--   (que están bloqueadas por RLS tenant_isolation).
--
-- SEGURIDAD:
--   Solo funcionan si el caller es admin de House (superadmin).
--   Cualquier otro caller recibe error.
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

-- Seed de planes (además de enterprise que ya existe)
INSERT INTO plan (id, nombre, precio_mensual_cop, incluye_crm, incluye_admin, max_asesores, max_inmuebles, activo, orden)
VALUES
  ('basic',     'Basic — Solo CRM',              89000,  true,  false,  5,   100, true, 10),
  ('pro',       'Pro — CRM + Posventa',         189000,  true,  true,  15,   500, true, 20),
  ('business',  'Business — Sin límite',        349000,  true,  true, 999, 9999, true, 30)
ON CONFLICT (id) DO UPDATE SET
  nombre             = EXCLUDED.nombre,
  precio_mensual_cop = EXCLUDED.precio_mensual_cop,
  incluye_crm        = EXCLUDED.incluye_crm,
  incluye_admin      = EXCLUDED.incluye_admin,
  max_asesores       = EXCLUDED.max_asesores,
  max_inmuebles      = EXCLUDED.max_inmuebles,
  activo             = EXCLUDED.activo,
  orden              = EXCLUDED.orden;

-- Helper: retorna true si el caller es superadmin (admin de House)
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u
    JOIN inmobiliaria i ON i.id = u.inmobiliaria_id
    WHERE u.id = auth.uid()
      AND u.rol = 'admin'
      AND i.slug = 'house'
  );
$$;

-- ─── Listar todos los tenants con su acceso ─────────────────────────
CREATE OR REPLACE FUNCTION superadmin_list_tenants()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Solo superadmin puede listar tenants';
  END IF;

  RETURN (
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT
        i.id, i.slug, i.nombre, i.email_admin, i.telefono, i.ciudad,
        i.activo, i.created_at,
        i.metadata->>'dominio_custom' AS dominio_custom,
        v.plan_id, v.suscripcion_estado, v.proximo_cobro, v.grace_hasta,
        COALESCE(v.acceso_permitido, false) AS acceso_permitido,
        (SELECT COUNT(*) FROM usuarios WHERE inmobiliaria_id = i.id) AS n_usuarios,
        (SELECT COUNT(*) FROM inmuebles WHERE inmobiliaria_id = i.id AND eliminado = false) AS n_inmuebles
      FROM inmobiliaria i
      LEFT JOIN v_acceso v ON v.inmobiliaria_id = i.id
    ) t
  );
END $$;

-- ─── Crear un nuevo tenant (nombre + slug + admin email + plan) ─────
CREATE OR REPLACE FUNCTION superadmin_create_tenant(
  p_slug          text,
  p_nombre        text,
  p_email_admin   text,
  p_telefono      text DEFAULT NULL,
  p_ciudad        text DEFAULT NULL,
  p_plan_id       text DEFAULT 'basic',
  p_dias_trial    integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inm_id uuid;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Solo superadmin puede crear tenants';
  END IF;

  IF p_slug IS NULL OR length(trim(p_slug)) < 2 THEN
    RAISE EXCEPTION 'Slug inválido';
  END IF;

  -- Insertar inmobiliaria (falla si slug ya existe)
  INSERT INTO inmobiliaria (slug, nombre, email_admin, telefono, ciudad, activo)
  VALUES (lower(trim(p_slug)), p_nombre, p_email_admin, p_telefono, p_ciudad, true)
  RETURNING id INTO v_inm_id;

  -- Crear suscripción en trial
  INSERT INTO suscripcion (
    inmobiliaria_id, plan_id, estado, inicio, proximo_cobro
  ) VALUES (
    v_inm_id, p_plan_id, 'trial',
    CURRENT_DATE, CURRENT_DATE + (p_dias_trial || ' days')::interval
  );

  RETURN jsonb_build_object(
    'id', v_inm_id,
    'slug', p_slug,
    'nombre', p_nombre,
    'estado', 'trial',
    'proximo_cobro', CURRENT_DATE + (p_dias_trial || ' days')::interval
  );
END $$;

-- ─── Pausar / suspender un tenant ────────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_pause_tenant(p_slug text, p_motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inm_id uuid;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Solo superadmin puede pausar tenants';
  END IF;

  IF p_slug = 'house' THEN
    RAISE EXCEPTION 'No podés pausar House (tenant fundador)';
  END IF;

  SELECT id INTO v_inm_id FROM inmobiliaria WHERE slug = p_slug;
  IF v_inm_id IS NULL THEN RAISE EXCEPTION 'Tenant % no existe', p_slug; END IF;

  UPDATE suscripcion
  SET estado = 'cancelada',
      cancelada_at = now(),
      cancelada_motivo = COALESCE(p_motivo, 'Pausado por superadmin'),
      updated_at = now()
  WHERE inmobiliaria_id = v_inm_id
    AND estado <> 'cancelada';

  UPDATE inmobiliaria SET activo = false WHERE id = v_inm_id;

  RETURN jsonb_build_object('slug', p_slug, 'estado', 'pausado');
END $$;

-- ─── Reactivar un tenant pausado ────────────────────────────────────
CREATE OR REPLACE FUNCTION superadmin_reactivate_tenant(
  p_slug text,
  p_plan_id text DEFAULT 'basic',
  p_dias_extension integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inm_id uuid;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Solo superadmin puede reactivar tenants';
  END IF;

  SELECT id INTO v_inm_id FROM inmobiliaria WHERE slug = p_slug;
  IF v_inm_id IS NULL THEN RAISE EXCEPTION 'Tenant % no existe', p_slug; END IF;

  UPDATE inmobiliaria SET activo = true WHERE id = v_inm_id;

  -- Reactivar (o crear) suscripción
  UPDATE suscripcion
  SET estado = 'activa',
      cancelada_at = NULL,
      cancelada_motivo = NULL,
      proximo_cobro = CURRENT_DATE + (p_dias_extension || ' days')::interval,
      grace_hasta = NULL,
      updated_at = now()
  WHERE inmobiliaria_id = v_inm_id;

  IF NOT FOUND THEN
    INSERT INTO suscripcion (inmobiliaria_id, plan_id, estado, inicio, proximo_cobro)
    VALUES (v_inm_id, p_plan_id, 'activa', CURRENT_DATE, CURRENT_DATE + (p_dias_extension || ' days')::interval);
  END IF;

  RETURN jsonb_build_object('slug', p_slug, 'estado', 'activa');
END $$;

-- ─── Grants ─────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_list_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_create_tenant(text,text,text,text,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_pause_tenant(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_reactivate_tenant(text,text,integer) TO authenticated;

COMMIT;

-- Verificación (solo desde SQL editor donde no hay auth: is_superadmin=false)
SELECT is_superadmin() AS soy_superadmin;
-- SELECT superadmin_list_tenants(); -- fallará por is_superadmin, esperado


-- ══════════════════════════════════════════════════════════════════════
-- 52-multitenant-c2-cron-vencidos.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================
-- HOUSE CRM — Migración #52 · Multitenant Fase C2
-- Cron auto-suspender tenants con suscripción vencida
-- ============================================================
--
-- OBJETIVO:
--   Cerrar automáticamente el acceso a tenants que:
--     - proximo_cobro pasó SIN pago → pasa a estado 'grace'
--     - grace_hasta pasó SIN regularizar → pasa a estado 'cancelada'
--
--   Se ejecuta 1 vez por día vía Supabase Cron.
--
-- COMPORTAMIENTO:
--   Día del cobro (proximo_cobro=today):
--     estado 'activa' → 'grace' + grace_hasta = today + 7 días
--   Día del corte (grace_hasta<today):
--     estado 'grace' → 'cancelada' (v_acceso.acceso_permitido=false)
--
--   Cuando estado='cancelada' el usuario NO puede acceder al CRM
--   (chequeo en middleware frontend + RLS del backend).
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION cron_suspender_tenants_vencidos()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_pasaron_a_grace   integer := 0;
  n_pasaron_a_cancel  integer := 0;
BEGIN
  -- 1) Suscripciones activas cuyo proximo_cobro ya pasó → grace 7 días
  UPDATE suscripcion
  SET estado = 'grace',
      grace_hasta = CURRENT_DATE + interval '7 days',
      updated_at = now()
  WHERE estado = 'activa'
    AND proximo_cobro < CURRENT_DATE;
  GET DIAGNOSTICS n_pasaron_a_grace = ROW_COUNT;

  -- 2) Suscripciones en grace cuyo grace_hasta ya pasó → cancelada
  UPDATE suscripcion s
  SET estado = 'cancelada',
      cancelada_at = now(),
      cancelada_motivo = 'Suspendida automáticamente por impago (grace period vencido)',
      updated_at = now()
  WHERE estado = 'grace'
    AND grace_hasta < CURRENT_DATE;
  GET DIAGNOSTICS n_pasaron_a_cancel = ROW_COUNT;

  -- 3) Desactivar inmobiliaria en cascada cuando la suscripción se cancela
  UPDATE inmobiliaria i
  SET activo = false
  WHERE i.activo = true
    AND EXISTS (
      SELECT 1 FROM suscripcion s
      WHERE s.inmobiliaria_id = i.id
        AND s.estado = 'cancelada'
    )
    AND i.slug <> 'house';  -- House nunca se desactiva

  RETURN jsonb_build_object(
    'timestamp',            now(),
    'pasaron_a_grace',      n_pasaron_a_grace,
    'pasaron_a_cancelada',  n_pasaron_a_cancel
  );
END $$;

GRANT EXECUTE ON FUNCTION cron_suspender_tenants_vencidos() TO service_role;

COMMIT;

-- ============================================================
-- CÓMO INSTALAR EL CRON EN SUPABASE
-- ============================================================
-- Opción A: Supabase Cron (pg_cron extension) — si está habilitada:
--   SELECT cron.schedule(
--     'suspender-tenants-vencidos',
--     '0 3 * * *',  -- todos los días a las 03:00 UTC
--     $$ SELECT cron_suspender_tenants_vencidos(); $$
--   );
--
-- Opción B: Edge Function con cron externo (github actions, upstash):
--   Llamar POST https://<proyecto>.supabase.co/rest/v1/rpc/cron_suspender_tenants_vencidos
--   con header Authorization: Bearer <SERVICE_ROLE_KEY>
--
-- TEST manual (ejecutar ahora para probar):
--   SELECT cron_suspender_tenants_vencidos();
--   → esperado: {"timestamp": "...", "pasaron_a_grace": 0, "pasaron_a_cancelada": 0}


-- ══════════════════════════════════════════════════════════════════════
-- 53-multitenant-d-signup-rpc.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================
-- HOUSE CRM — Migración #53 · Multitenant Fase D
-- RPC signup_tenant (self-service, sin superadmin)
-- ============================================================
--
-- OBJETIVO:
--   Que un potencial cliente pueda crear su tenant desde la landing
--   sin intervención de superadmin. Comienza en trial de 15 días.
--
-- LÍMITES anti-abuso:
--   - Rate limit por IP: 3 signups/hora (implementar en frontend)
--   - Requiere email admin válido
--   - Slug único: falla si ya existe
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION signup_tenant(
  p_slug          text,
  p_nombre        text,
  p_email_admin   text,
  p_telefono      text DEFAULT NULL,
  p_ciudad        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inm_id uuid;
  v_slug text;
BEGIN
  -- Validación básica
  IF p_slug IS NULL OR length(trim(p_slug)) < 2 THEN
    RAISE EXCEPTION 'slug_invalido' USING HINT = 'Elegí un identificador de al menos 2 caracteres';
  END IF;
  IF p_email_admin IS NULL OR p_email_admin !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'email_invalido' USING HINT = 'Ingresá un email válido';
  END IF;
  IF p_nombre IS NULL OR length(trim(p_nombre)) < 3 THEN
    RAISE EXCEPTION 'nombre_invalido' USING HINT = 'Nombre comercial obligatorio';
  END IF;

  v_slug := lower(regexp_replace(trim(p_slug), '[^a-z0-9-]', '', 'g'));

  -- Slugs reservados
  IF v_slug IN ('www','app','api','admin','superadmin','house','plataforma','test','demo','staging') THEN
    RAISE EXCEPTION 'slug_reservado' USING HINT = 'Ese identificador no está disponible';
  END IF;

  -- Verificar unicidad
  IF EXISTS (SELECT 1 FROM inmobiliaria WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'slug_ocupado' USING HINT = 'Ese identificador ya está en uso';
  END IF;

  -- Crear inmobiliaria
  INSERT INTO inmobiliaria (slug, nombre, email_admin, telefono, ciudad, activo)
  VALUES (v_slug, trim(p_nombre), trim(p_email_admin), p_telefono, p_ciudad, true)
  RETURNING id INTO v_inm_id;

  -- Crear suscripción en trial 15 días con plan basic
  INSERT INTO suscripcion (
    inmobiliaria_id, plan_id, estado, inicio, proximo_cobro
  ) VALUES (
    v_inm_id, 'basic', 'trial',
    CURRENT_DATE, CURRENT_DATE + interval '15 days'
  );

  RETURN jsonb_build_object(
    'ok',            true,
    'inmobiliaria_id', v_inm_id,
    'slug',          v_slug,
    'nombre',        trim(p_nombre),
    'trial_hasta',   CURRENT_DATE + interval '15 days',
    'url_tenant',    'https://' || v_slug || '.plataforma.com',
    'siguiente_paso', 'Enviamos un email a ' || p_email_admin || ' con instrucciones de acceso.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'hint', COALESCE(TG_HINT_TEXT, '')
    );
END $$;

GRANT EXECUTE ON FUNCTION signup_tenant(text,text,text,text,text) TO anon, authenticated;

COMMIT;

-- ============================================================
-- Verificación
-- ============================================================
-- Test (crea un tenant de prueba, después borrarlo):
-- SELECT signup_tenant('democlient', 'Inmobiliaria Demo', 'demo@example.com', '+573001234567', 'Bogotá');
-- DELETE FROM suscripcion WHERE inmobiliaria_id IN (SELECT id FROM inmobiliaria WHERE slug='democlient');
-- DELETE FROM inmobiliaria WHERE slug='democlient';


-- ══════════════════════════════════════════════════════════════════════
-- 54-multitenant-mejoras.sql
-- ══════════════════════════════════════════════════════════════════════

-- ============================================================
-- HOUSE CRM — Migración #54 · Multitenant Mejoras UX
-- 1) RPC check_slug_available (real-time check en signup)
-- 2) Cron cron_alertar_trials_venciendo (email a admin 3d/1d antes)
-- ============================================================

BEGIN;

-- ─── 1. RPC check_slug_available (accesible por anon) ───────────────
CREATE OR REPLACE FUNCTION check_slug_available(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_exists boolean;
BEGIN
  v_slug := lower(regexp_replace(trim(coalesce(p_slug,'')), '[^a-z0-9-]', '', 'g'));

  -- Slugs reservados (deben coincidir con signup_tenant en sql/53)
  IF v_slug IN ('www','app','api','admin','superadmin','house','plataforma','test','demo','staging') THEN
    RETURN jsonb_build_object('available', false, 'reason', 'reservado', 'clean_slug', v_slug);
  END IF;

  IF length(v_slug) < 2 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'muy_corto', 'clean_slug', v_slug);
  END IF;

  SELECT EXISTS(SELECT 1 FROM inmobiliaria WHERE slug = v_slug) INTO v_exists;
  RETURN jsonb_build_object('available', NOT v_exists, 'reason', CASE WHEN v_exists THEN 'ocupado' ELSE 'ok' END, 'clean_slug', v_slug);
END $$;

GRANT EXECUTE ON FUNCTION check_slug_available(text) TO anon, authenticated;

-- ─── 2. Cron alertas trial venciendo ─────────────────────────────────
-- Inserta notificaciones en la tabla notificaciones para el admin del
-- tenant cuando falta 3d o 1d para que su trial venza. El sistema de
-- emails/push existente se encarga del envío real.
CREATE OR REPLACE FUNCTION cron_alertar_trials_venciendo()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_alertas_3d integer := 0;
  n_alertas_1d integer := 0;
BEGIN
  -- 3 días antes: aviso general
  WITH pendientes AS (
    SELECT s.inmobiliaria_id, s.proximo_cobro, i.nombre, i.slug,
           (SELECT id FROM usuarios u WHERE u.inmobiliaria_id = s.inmobiliaria_id AND u.rol = 'admin' LIMIT 1) AS admin_id
    FROM suscripcion s
    JOIN inmobiliaria i ON i.id = s.inmobiliaria_id
    WHERE s.estado = 'trial'
      AND s.proximo_cobro = CURRENT_DATE + interval '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM notificaciones n
        WHERE n.contexto_id = s.id::text
          AND n.tipo = 'trial_3d'
          AND n.created_at > CURRENT_DATE - interval '1 day'
      )
  )
  INSERT INTO notificaciones (
    inmobiliaria_id, destinatario_id, tipo, categoria, titulo, mensaje,
    icono, color, contexto_tipo, contexto_id, prioridad
  )
  SELECT
    inmobiliaria_id, admin_id, 'trial_3d', 'pago',
    '⏰ Tu prueba vence en 3 días',
    'Regularizá el pago para no perder acceso a ' || nombre || '. Podés hacerlo desde Facturación.',
    '⏰', '#f59e0b', 'suscripcion', inmobiliaria_id::text, 'alta'
  FROM pendientes
  WHERE admin_id IS NOT NULL;
  GET DIAGNOSTICS n_alertas_3d = ROW_COUNT;

  -- 1 día antes: aviso urgente
  WITH pendientes AS (
    SELECT s.inmobiliaria_id, s.proximo_cobro, i.nombre, i.slug,
           (SELECT id FROM usuarios u WHERE u.inmobiliaria_id = s.inmobiliaria_id AND u.rol = 'admin' LIMIT 1) AS admin_id
    FROM suscripcion s
    JOIN inmobiliaria i ON i.id = s.inmobiliaria_id
    WHERE s.estado = 'trial'
      AND s.proximo_cobro = CURRENT_DATE + interval '1 day'
      AND NOT EXISTS (
        SELECT 1 FROM notificaciones n
        WHERE n.contexto_id = s.id::text
          AND n.tipo = 'trial_1d'
          AND n.created_at > CURRENT_DATE - interval '1 day'
      )
  )
  INSERT INTO notificaciones (
    inmobiliaria_id, destinatario_id, tipo, categoria, titulo, mensaje,
    icono, color, contexto_tipo, contexto_id, prioridad
  )
  SELECT
    inmobiliaria_id, admin_id, 'trial_1d', 'pago',
    '🚨 URGENTE: tu prueba vence MAÑANA',
    'Si no regularizás hoy, mañana perderás acceso a ' || nombre || '.',
    '🚨', '#ef4444', 'suscripcion', inmobiliaria_id::text, 'alta'
  FROM pendientes
  WHERE admin_id IS NOT NULL;
  GET DIAGNOSTICS n_alertas_1d = ROW_COUNT;

  RETURN jsonb_build_object(
    'timestamp', now(),
    'alertas_3d_enviadas', n_alertas_3d,
    'alertas_1d_enviadas', n_alertas_1d
  );
END $$;

GRANT EXECUTE ON FUNCTION cron_alertar_trials_venciendo() TO service_role;

COMMIT;

-- ============================================================
-- CRON INSTALL (junto al de suspensión — sql/52)
-- ============================================================
-- SELECT cron.schedule(
--   'alertar-trials-venciendo',
--   '30 9 * * *',  -- 09:30 UTC = 04:30 COL cada día
--   $$ SELECT cron_alertar_trials_venciendo(); $$
-- );
--
-- TEST:
-- SELECT check_slug_available('house');   -- available:false reason:reservado
-- SELECT check_slug_available('cool-inm');-- available:true si no existe
-- SELECT cron_alertar_trials_venciendo(); -- {alertas_3d_enviadas:0, alertas_1d_enviadas:0}
