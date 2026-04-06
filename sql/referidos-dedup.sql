-- ============================================================================
-- Referidos · Capas anti-duplicado 4, 6 y 7
-- Pegar en el SQL editor de Supabase y ejecutar.
-- Idempotente: usa IF NOT EXISTS donde aplica.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CAPA 4 — UNIQUE INDEX parcial sobre teléfono
-- Evita race conditions: dos referidores enviando el mismo número en paralelo.
-- Solo cuenta los referidos no rechazados (los rechazados pueden re-intentarse
-- según el tipo, ver capa 6).
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS referidos_tel_activo_uniq
  ON public.referidos (propietario_telefono)
  WHERE estado <> 'rechazado';

-- Índice equivalente para email (solo cuando email no es null)
CREATE UNIQUE INDEX IF NOT EXISTS referidos_email_activo_uniq
  ON public.referidos (propietario_email)
  WHERE estado <> 'rechazado' AND propietario_email IS NOT NULL;


-- ----------------------------------------------------------------------------
-- CAPA 6 — Categorización del rechazo
-- 'objetivo' = bloqueo permanente (datos falsos, ya en inventario, etc.)
-- 'subjetivo' = el referidor puede reintentar después de N días
-- ----------------------------------------------------------------------------
ALTER TABLE public.referidos
  ADD COLUMN IF NOT EXISTS tipo_rechazo TEXT
  CHECK (tipo_rechazo IN ('objetivo', 'subjetivo') OR tipo_rechazo IS NULL);

-- Backfill: clasificar rechazos existentes según el texto del motivo
UPDATE public.referidos
SET tipo_rechazo = CASE
  WHEN motivo_rechazo ILIKE '%datos falsos%'
    OR motivo_rechazo ILIKE '%inventario%'
    OR motivo_rechazo ILIKE '%impedimentos legales%'
    OR motivo_rechazo ILIKE '%inexistente%'
  THEN 'objetivo'
  WHEN estado = 'rechazado'
  THEN 'subjetivo'
  ELSE NULL
END
WHERE estado = 'rechazado' AND tipo_rechazo IS NULL;


-- ----------------------------------------------------------------------------
-- CAPA 7 — Hash de la foto del aviso
-- Permite detectar el copy-paste de la misma captura por varios referidores.
-- El hash lo calcula el cliente (MD5/SHA1 del archivo) y lo manda en el INSERT.
-- ----------------------------------------------------------------------------
ALTER TABLE public.referidos
  ADD COLUMN IF NOT EXISTS foto_hash TEXT;

CREATE INDEX IF NOT EXISTS referidos_foto_hash_idx
  ON public.referidos (foto_hash)
  WHERE foto_hash IS NOT NULL;


-- ----------------------------------------------------------------------------
-- Verificación
-- ----------------------------------------------------------------------------
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename='referidos';
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name='referidos' AND column_name IN ('tipo_rechazo','foto_hash');
