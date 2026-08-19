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
