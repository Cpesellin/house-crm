-- ============================================================
-- HOUSE CRM — Migración #69
-- Separar al administrador de la PLATAFORMA del de la inmobiliaria
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → proyecto HOUSE CRM (ref keasjfgcjkskvdcudoml).
--   El bloque se detiene solo si es el proyecto equivocado.
--
-- POR QUÉ (riesgo R5 de docs/AUDITORIA-SAAS-MULTITENANT.md)
--   Hoy `is_superadmin()` dice esto:
--
--     el usuario es admin  Y  su inmobiliaria es 'house'
--
--   Es decir: **ser administrador de Inmobiliaria House otorga el
--   control de toda la plataforma** — listar, crear, pausar y reactivar
--   inmobiliarias ajenas. Hoy coincide porque House es la casa, pero:
--
--     · El día que House sea un cliente más, su admin seguiría
--       gobernando la plataforma.
--     · Nombrar a alguien admin dentro de House —una decisión operativa
--       de la inmobiliaria, que se toma sin pensar en el SaaS— lo
--       convierte en administrador de la plataforma sin que nadie lo
--       decida. Eso es escalada de privilegios por la puerta de atrás.
--
--   Esto hay que cerrarlo ANTES de vender el primer acceso, porque
--   después habría datos de terceros al alcance.
--
-- QUÉ HACE
--   1. Crea `plataforma_admin`: la lista EXPLÍCITA de quién gobierna el
--      SaaS. Pertenecer a House deja de dar poderes.
--   2. Siembra la lista con los admins de House que existen hoy, para
--      que nadie pierda el acceso de golpe.
--   3. Comprueba que la lista NO quedó vacía y, sólo entonces, cambia
--      `is_superadmin()` para que lea de ahí.
--
--   El paso 3 es un candado a propósito: si la semilla no encontrara a
--   nadie, cambiar la función dejaría el panel central inaccesible para
--   todo el mundo — sin forma de entrar a arreglarlo desde la interfaz.
--   Preferimos que el bloque falle entero y no cambie nada.
--
-- LO QUE ESTO NO HACE
--   No reduce a nadie todavía: quien era superadmin sigue siéndolo. Lo
--   que cambia es que ahora es una lista que se decide a mano, en vez
--   de un efecto secundario del rol dentro de una inmobiliaria. Al
--   final del archivo está la consulta para quitar a quien no deba
--   estar; esa decisión es del dueño del SaaS, no mía.
--
-- ES REPETIBLE.
-- ============================================================

DO $$ BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'PROYECTO EQUIVOCADO. Esto es de HOUSE CRM (ref keasjfgcjkskvdcudoml).';
  END IF;
END $$;

BEGIN;

-- ── 1. La lista ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plataforma_admin (
  usuario_id     uuid PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Tres niveles desde el principio, aunque hoy sólo se use el primero.
  -- Añadir el campo después obliga a migrar filas; dejarlo puesto no
  -- cuesta nada y evita que "todos los administradores lo pueden todo"
  -- se convierta en la única opción posible.
  rol_plataforma text NOT NULL DEFAULT 'superadmin'
                 CHECK (rol_plataforma IN ('superadmin', 'soporte', 'facturacion')),

  activo         boolean NOT NULL DEFAULT true,
  nota           text,
  creado_por     uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE plataforma_admin IS
  'Quién gobierna la PLATAFORMA (no una inmobiliaria). Se edita a mano, a propósito.';

-- Sin policies de lectura: a esta tabla sólo llegan las funciones
-- SECURITY DEFINER. Una lista de quién manda no se publica en la API.
ALTER TABLE plataforma_admin ENABLE ROW LEVEL SECURITY;

-- ── 2. Semilla: los admins de House de hoy ───────────────────
INSERT INTO plataforma_admin (usuario_id, rol_plataforma, nota)
SELECT u.id, 'superadmin',
       'Semilla 2026-09-12: era admin de House cuando se separó la plataforma'
  FROM usuarios u
  JOIN inmobiliaria i ON i.id = u.inmobiliaria_id
 WHERE i.slug = 'house'
   AND u.rol = 'admin'
   AND u.activo = true
ON CONFLICT (usuario_id) DO NOTHING;

-- ── 3. El candado ────────────────────────────────────────────
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM plataforma_admin WHERE activo = true AND rol_plataforma = 'superadmin';
  IF n = 0 THEN
    RAISE EXCEPTION
      'La semilla no encontró ningún admin activo de House. No se cambia is_superadmin(): dejaría el panel central sin acceso para nadie y sin forma de entrar a arreglarlo.';
  END IF;
  RAISE NOTICE 'plataforma_admin sembrada con % superadmin(s).', n;
END $$;

-- ── 4. Quién es quién, ahora por la lista ────────────────────
CREATE OR REPLACE FUNCTION public.es_admin_plataforma(p_rol text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v boolean;
BEGIN
  SELECT true INTO v
    FROM plataforma_admin
   WHERE usuario_id = auth.uid()
     AND activo = true
     -- Un superadmin puede todo lo de soporte y facturación; lo
     -- contrario no. Sin esto habría que inscribir a la misma persona
     -- tres veces.
     AND (p_rol IS NULL OR rol_plataforma = p_rol OR rol_plataforma = 'superadmin')
   LIMIT 1;
  RETURN COALESCE(v, false);
END $$;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.es_admin_plataforma('superadmin');
END $$;

GRANT EXECUTE ON FUNCTION public.es_admin_plataforma(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated;

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
--
-- ⚠️ `SELECT is_superadmin()` devuelve false en el editor y es CORRECTO:
-- no hay sesión de usuario, así que no hay auth.uid() que buscar.

SELECT u.nombre, u.email, u.usuario, pa.rol_plataforma, pa.activo
  FROM plataforma_admin pa
  JOIN usuarios u ON u.id = pa.usuario_id
 ORDER BY pa.rol_plataforma, u.nombre;

-- ============================================================
-- LA DECISIÓN QUE QUEDA PENDIENTE (no la corras sin pensarla)
-- ============================================================
--
-- Arriba está la lista de quién gobierna la plataforma. Si en ella hay
-- alguien que administra la INMOBILIARIA pero no debería administrar el
-- SaaS, se le quita así:
--
--   UPDATE plataforma_admin SET activo = false
--    WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'correo@ejemplo.com');
--
-- Se desactiva, no se borra: queda el rastro de que estuvo.
--
-- Y para sumar a alguien más adelante:
--
--   INSERT INTO plataforma_admin (usuario_id, rol_plataforma, nota)
--   SELECT id, 'soporte', 'motivo' FROM usuarios WHERE email = 'correo@ejemplo.com';
--
-- ============================================================
-- REVERSIÓN
-- ============================================================
--
-- CREATE OR REPLACE FUNCTION is_superadmin() RETURNS boolean
-- LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM usuarios u
--     JOIN inmobiliaria i ON i.id = u.inmobiliaria_id
--     WHERE u.id = auth.uid() AND u.rol = 'admin' AND i.slug = 'house'
--   );
-- $$;
