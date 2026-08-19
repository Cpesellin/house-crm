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
