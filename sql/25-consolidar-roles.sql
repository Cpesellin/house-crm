-- =====================================================================
-- House CRM — Consolidación de roles: eliminar asesor_externo/cliente
-- =====================================================================
-- Modelo definitivo:
--   tipo_usuario = 'interno' | 'publico'
--   perfiles_publicos TEXT[] = '{comprador,vendedor,comisionista}'
-- =====================================================================

-- 1. Add perfiles_publicos array
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfiles_publicos TEXT[] DEFAULT '{}'::text[];

-- 2. Migrate all external users to tipo_usuario='publico' + populate perfiles
UPDATE usuarios SET
  tipo_usuario = 'publico',
  perfiles_publicos = CASE
    WHEN puede_publicar AND puede_referir THEN '{comprador,vendedor,comisionista}'::text[]
    WHEN puede_publicar THEN '{comprador,vendedor}'::text[]
    ELSE '{comprador}'::text[]
  END
WHERE tipo_usuario IN ('cliente','vendedor_externo','propietario','pendiente');

-- 3. Update CHECK constraint to only allow interno/publico
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check
  CHECK (tipo_usuario = ANY (ARRAY['interno','publico']));
