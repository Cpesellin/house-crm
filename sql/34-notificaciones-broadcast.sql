-- ============================================================
-- HOUSE CRM — Migración #34: Alertas Broadcast + Emisor cache
-- Extiende notificaciones para soportar comunicados masivos,
-- avatar/nombre del emisor cacheado y filtros por perfil destino.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. NUEVAS COLUMNAS
-- ────────────────────────────────────────────────────────────

ALTER TABLE notificaciones
  ADD COLUMN IF NOT EXISTS broadcast_id UUID,
  ADD COLUMN IF NOT EXISTS broadcast_tipo TEXT,
  ADD COLUMN IF NOT EXISTS emisor_nombre TEXT,
  ADD COLUMN IF NOT EXISTS emisor_foto TEXT,
  ADD COLUMN IF NOT EXISTS perfil_destino TEXT;

COMMENT ON COLUMN notificaciones.broadcast_id IS 'UUID compartido por todas las copias de un comunicado masivo.';
COMMENT ON COLUMN notificaciones.broadcast_tipo IS 'masivo | segmentado | individual';
COMMENT ON COLUMN notificaciones.emisor_nombre IS 'Nombre del emisor cacheado en el momento del envío.';
COMMENT ON COLUMN notificaciones.emisor_foto IS 'URL de la foto/avatar del emisor cacheada al enviar.';
COMMENT ON COLUMN notificaciones.perfil_destino IS 'Perfil del destinatario al enviar: comprador, vendedor, comisionista, referenciador, asesor, gestor, oficina, admin, publico.';

-- ────────────────────────────────────────────────────────────
-- 2. EXPANDIR CHECK constraints
-- ────────────────────────────────────────────────────────────

-- Categoría: agregar nuevos tipos del sistema de alertas
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_categoria_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_categoria_check
  CHECK (categoria IN (
    'inmueble', 'referido', 'solicitud', 'pago', 'sistema', 'agenda', 'mensaje',
    'favorito', 'general', 'inmueble_nuevo', 'perfil_nuevo', 'moderacion',
    'calificacion', 'cita', 'cierre'
  ));

-- Acción: agregar nuevos destinos
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_accion_tipo_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_accion_tipo_check
  CHECK (accion_tipo IN (
    'abrir_inmueble', 'abrir_referido', 'abrir_solicitud', 'abrir_pago',
    'abrir_agenda', 'abrir_mensaje', 'abrir_seccion', 'abrir_usuario',
    'abrir_comunicado', 'abrir_favorito', 'abrir_inmueble_nuevo', 'abrir_perfil_nuevo'
  ));

-- ────────────────────────────────────────────────────────────
-- 3. ÍNDICES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notif_broadcast ON notificaciones(broadcast_id) WHERE broadcast_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_perfil_destino ON notificaciones(perfil_destino) WHERE perfil_destino IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN
-- ────────────────────────────────────────────────────────────

SELECT 'columnas agregadas' AS verificacion, COUNT(*) AS total
FROM information_schema.columns
WHERE table_name = 'notificaciones'
  AND column_name IN ('broadcast_id','broadcast_tipo','emisor_nombre','emisor_foto','perfil_destino');

SELECT 'indice broadcast' AS verificacion,
  EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notif_broadcast') AS existe;
