-- ============================================================
-- HOUSE CRM — Migración #20: Cola de moderación + Pedir cambios (Fase 2)
-- Ejecutar en Supabase SQL Editor
-- ============================================================
--
-- Añade soporte para el flujo "Pedir cambios" sobre inmuebles externos
-- en revisión. El admin puede solicitar al propietario que corrija PII
-- u otros problemas detectados antes de aprobar.
--
-- Estado del flujo:
--   en_revision         → recién publicado, esperando moderación
--   cambios_solicitados → admin pidió cambios, esperando al propietario
--   aprobado            → publicado en el portal público
--   rechazado           → no se publica
--
-- ────────────────────────────────────────────────────────────
-- 1. COLUMNAS NUEVAS EN inmuebles
-- ────────────────────────────────────────────────────────────

-- Motivo libre escrito por el admin al pedir cambios.
-- Estructura sugerida (texto plano con saltos de línea):
--   "Eliminar dirección exacta\nEliminar teléfono\nOtros: ..."
ALTER TABLE inmuebles
  ADD COLUMN IF NOT EXISTS motivo_cambios TEXT;

-- Marca de tiempo de cuándo se solicitaron los cambios (para mostrar
-- "hace X horas" y para que el captador vea la urgencia).
ALTER TABLE inmuebles
  ADD COLUMN IF NOT EXISTS cambios_solicitados_at TIMESTAMPTZ;

COMMENT ON COLUMN inmuebles.motivo_cambios IS
  'Motivo escrito por el admin al solicitar cambios sobre un inmueble en revisión. NULL si nunca se pidieron cambios.';
COMMENT ON COLUMN inmuebles.cambios_solicitados_at IS
  'Timestamp del último UPDATE estado_revision=cambios_solicitados. Permite mostrar "hace X horas" al propietario.';

-- ────────────────────────────────────────────────────────────
-- 2. ÍNDICE para la cola de moderación
-- ────────────────────────────────────────────────────────────
-- Acelera el listado del admin: trae items en revisión + cambios solicitados
-- ordenados por antigüedad (más viejos primero).

CREATE INDEX IF NOT EXISTS idx_inmuebles_cola_moderacion
  ON inmuebles (created_at)
  WHERE estado_revision IN ('en_revision', 'cambios_solicitados') AND eliminado = false;

-- ────────────────────────────────────────────────────────────
-- 3. VERIFICACIÓN
-- ────────────────────────────────────────────────────────────

SELECT 'columna motivo_cambios' AS verificacion,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inmuebles' AND column_name = 'motivo_cambios'
  ) AS existe;

SELECT 'columna cambios_solicitados_at' AS verificacion,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inmuebles' AND column_name = 'cambios_solicitados_at'
  ) AS existe;

SELECT 'indice cola moderacion' AS verificacion,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_inmuebles_cola_moderacion'
  ) AS existe;
