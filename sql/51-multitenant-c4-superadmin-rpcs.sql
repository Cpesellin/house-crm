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
