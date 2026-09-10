-- ══════════════════════════════════════════════════════════════════════
-- HOUSE CRM — Panel SaaS · PARTE 2 (lo que faltó)
-- ══════════════════════════════════════════════════════════════════════
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → New query → pegar todo → Run.
--
-- POR QUÉ ESTE SEGUNDO ARCHIVO
--   Del bloque anterior entraron 8 de las 10 funciones. Se cortó justo
--   antes del último tramo (era el más largo del archivo, empezaba en la
--   línea 528 de 658). Faltan sólo éstas dos:
--
--     check_slug_available(p_slug)      → valida el slug al registrar
--     cron_alertar_trials_venciendo()   → avisa antes de que venza la prueba
--
--   Se comprobó que no falla por dependencias: las once columnas de
--   `notificaciones` que usa existen todas.
--
-- YA APLICADAS, no hace falta repetirlas
--   get_tenant_by_slug · is_superadmin · superadmin_list_tenants
--   superadmin_create_tenant · superadmin_pause_tenant
--   superadmin_reactivate_tenant · cron_suspender_tenants_vencidos
--   signup_tenant
--
-- Es repetible: todo es CREATE OR REPLACE.
--
-- SOBRE EL "false" QUE TE DEVOLVIÓ
--   Era la consulta de verificación `SELECT is_superadmin()`. Da false
--   porque el SQL Editor no corre como un usuario con sesión: no hay
--   auth.uid() que comparar. No es un error.
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
  -- lower() PRIMERO y limpieza después.
  --
  -- Al revés —que es como estaba— la limpieza borra las mayúsculas antes
  -- de que lower() llegue a convertirlas: "MiCasa" quedaba en "iasa" y el
  -- registro le decía a la persona que su nombre estaba disponible con
  -- una dirección que no había escrito.
  v_slug := regexp_replace(lower(trim(coalesce(p_slug,''))), '[^a-z0-9-]', '', 'g');

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
  -- El candado anti-repetición mira `contexto_id`, así que ahí va el id
  -- de la SUSCRIPCIÓN, que es lo que busca. Antes se guardaba el id de la
  -- inmobiliaria: la comprobación no encontraba nunca el aviso anterior y
  -- el admin habría recibido el mismo mensaje todos los días.
  WITH pendientes AS (
    SELECT s.id AS suscripcion_id, s.inmobiliaria_id, s.proximo_cobro, i.nombre, i.slug,
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
    'Regulariza el pago para no perder el acceso a ' || nombre || '. Puedes hacerlo desde Facturación.',
    '⏰', '#f59e0b', 'suscripcion', suscripcion_id::text, 'alta'
  FROM pendientes
  WHERE admin_id IS NOT NULL;
  GET DIAGNOSTICS n_alertas_3d = ROW_COUNT;

  -- 1 día antes: aviso urgente
  WITH pendientes AS (
    SELECT s.id AS suscripcion_id, s.inmobiliaria_id, s.proximo_cobro, i.nombre, i.slug,
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
    'Si no regularizas hoy, mañana perderás el acceso a ' || nombre || '.',
    '🚨', '#ef4444', 'suscripcion', suscripcion_id::text, 'alta'
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
