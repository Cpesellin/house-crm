-- ============================================================
-- HOUSE CRM — Migración #18: Autenticación Progresiva
-- Campo notificaciones_email (opt-in email) + Policies RLS
-- para lectura pública (anon) de inmuebles, fotos, pagos y niveles.
-- ============================================================

-- 1. Campo opt-in de notificaciones por email
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS notificaciones_email BOOLEAN DEFAULT false;

COMMENT ON COLUMN usuarios.notificaciones_email IS
  'Opt-in explícito para recibir notificaciones por email. false por defecto.';

-- 2. Policies de lectura pública (rol anon)
-- Nota: las políticas solo permiten SELECT. El frontend se encarga de
-- no pedir campos sensibles (direccion_real, propietario_*, etc.) en
-- las queries anónimas.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Lectura pública inmuebles'
      AND tablename = 'inmuebles'
  ) THEN
    CREATE POLICY "Lectura pública inmuebles"
      ON inmuebles FOR SELECT TO anon
      USING (
        eliminado = false
        AND estado IN ('Disponible', 'Aún Disponible')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Lectura pública fotos'
      AND tablename = 'fotos'
  ) THEN
    CREATE POLICY "Lectura pública fotos"
      ON fotos FOR SELECT TO anon
      USING (
        EXISTS (
          SELECT 1 FROM inmuebles
          WHERE inmuebles.id = fotos.inmueble_id
            AND inmuebles.eliminado = false
            AND inmuebles.estado IN ('Disponible', 'Aún Disponible')
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Lectura pública pagos referidos'
      AND tablename = 'pagos_referidos'
  ) THEN
    CREATE POLICY "Lectura pública pagos referidos"
      ON pagos_referidos FOR SELECT TO anon
      USING (estado = 'pagado');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Lectura pública niveles'
      AND tablename = 'niveles_referidor'
  ) THEN
    CREATE POLICY "Lectura pública niveles"
      ON niveles_referidor FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

-- 3. Verificación
SELECT 'campo notificaciones_email' AS verificacion,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'notificaciones_email'
  ) AS existe;

SELECT 'policy anon inmuebles' AS verificacion,
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública inmuebles') AS existe;

SELECT 'policy anon fotos' AS verificacion,
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública fotos') AS existe;

SELECT 'policy anon pagos referidos' AS verificacion,
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública pagos referidos') AS existe;

SELECT 'policy anon niveles' AS verificacion,
  EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública niveles') AS existe;
