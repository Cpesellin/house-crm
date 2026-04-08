-- ============================================================
-- HOUSE CRM — Migración #19: Auto-moderación PII
-- Almacena el reporte del analizador de contenido (Fase 1)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. COLUMNA alertas_moderacion EN inmuebles
-- ────────────────────────────────────────────────────────────
--
-- JSONB con la forma:
-- {
--   "alertas": [
--     { "tipo": "direccion", "match": "Cra 50 #25-30", "posicion": 42,
--       "severidad": "alta", "label": "Dirección exacta", "emoji": "📍" },
--     ...
--   ],
--   "score": 50,
--   "color": "amarillo",
--   "total_alertas": 2,
--   "por_tipo": { "direccion": 1, "celular": 1 },
--   "analizado_at": "2026-04-07T18:00:00.000Z"
-- }
--
-- Si el inmueble no tiene PII detectada → { score: 100, color: "verde",
-- alertas: [], ... }. Si nunca se analizó → NULL.

ALTER TABLE inmuebles
  ADD COLUMN IF NOT EXISTS alertas_moderacion JSONB;

COMMENT ON COLUMN inmuebles.alertas_moderacion IS
  'Reporte del analizador PII (src/core/contentModerator.js). NULL = nunca analizado. Score 0-100, color verde/amarillo/rojo.';

-- ────────────────────────────────────────────────────────────
-- 2. ÍNDICE para la cola de moderación (Fase 2)
-- ────────────────────────────────────────────────────────────
-- Permite filtrar rápido por inmuebles con alertas pendientes
-- (los que tienen score < 100 y están en revisión).

CREATE INDEX IF NOT EXISTS idx_inmuebles_alertas_pendientes
  ON inmuebles ((alertas_moderacion->>'color'))
  WHERE estado_revision = 'en_revision' AND eliminado = false;

-- ────────────────────────────────────────────────────────────
-- 3. VERIFICACIÓN
-- ────────────────────────────────────────────────────────────

SELECT 'columna alertas_moderacion' AS verificacion,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inmuebles' AND column_name = 'alertas_moderacion'
  ) AS existe;

SELECT 'indice cola moderacion' AS verificacion,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_inmuebles_alertas_pendientes'
  ) AS existe;
