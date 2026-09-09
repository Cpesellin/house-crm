-- ============================================================
-- HOUSE CRM — Migración #62
-- get_tenant_by_slug devuelve los campos que el home necesita
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → New query → pegar todo → Run.
--
-- POR QUÉ
--   La migración 61 agregó lema, direccion, hero_foto_url, og_imagen_url,
--   horario y redes a la tabla. Pero get_tenant_by_slug se escribió ANTES
--   y arma su respuesta con jsonb_build_object campo por campo, así que
--   las columnas nuevas no salían: comprobado, el RPC devolvía nueve
--   campos y ninguno de los seis nuevos.
--
--   Consecuencia si no se corrige: al encender el multi-tenant, el home
--   recibiría la dirección y el lema vacíos, y el bloque de confianza
--   ("tenemos oficina, puedes venir") se quedaría sin su dato.
--
-- ADEMÁS
--   El color por defecto pasa de '#1d4ed8' a NULL. Ese azul era un
--   relleno que no corresponde a ninguna marca; si un inquilino no eligió
--   color, es mejor que el front aplique su propio neutro que pintarle
--   una marca ajena.
--
-- ES SEGURO REPETIRLO: CREATE OR REPLACE.
-- ============================================================

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
    'color_primario',  i.color_primario,
    'telefono',        i.telefono,
    'ciudad',          i.ciudad,
    'dominio_custom',  i.metadata->>'dominio_custom',
    -- Campos del home (migración 61)
    'direccion',       i.direccion,
    'email',           i.email_admin,
    'lema',            i.lema,
    'hero_foto_url',   i.hero_foto_url,
    'og_imagen_url',   i.og_imagen_url,
    'horario',         i.horario,
    'redes',           COALESCE(i.redes, '{}'::jsonb),
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

GRANT EXECUTE ON FUNCTION get_tenant_by_slug(text) TO anon, authenticated;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT get_tenant_by_slug('house');

-- Se esperan 16 campos, entre ellos:
--   direccion  "Calle 14 #14-09, Pereira, Risaralda"
--   lema       "Más que inmuebles, creamos hogares"
--   email      "info@inmobiliariahouse.com.co"
--   redes      {}
