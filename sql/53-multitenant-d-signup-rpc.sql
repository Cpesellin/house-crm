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
