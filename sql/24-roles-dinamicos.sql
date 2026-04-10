-- =====================================================================
-- House CRM — Fase 9: Roles dinámicos (comprador+vendedor+comisionista)
-- =====================================================================
-- Un mismo usuario externo puede actuar como comprador, vendedor y
-- comisionista simultáneamente. En vez de cambiar tipo_usuario,
-- se usan flags booleanos independientes.
-- =====================================================================

-- Flag: puede publicar inmuebles (vendedor)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puede_publicar BOOLEAN NOT NULL DEFAULT FALSE;

-- Flag: puede referir arriendos (comisionista)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puede_referir BOOLEAN NOT NULL DEFAULT TRUE;

-- Migrar usuarios existentes: vendedor_externo y propietario ya pueden publicar
UPDATE usuarios
SET puede_publicar = TRUE
WHERE tipo_usuario IN ('vendedor_externo', 'propietario')
  AND puede_publicar = FALSE;

-- Todos los clientes activos pueden referir (ya lo hacen)
UPDATE usuarios
SET puede_referir = TRUE
WHERE tipo_usuario IN ('cliente', 'vendedor_externo', 'propietario')
  AND puede_referir = FALSE;
