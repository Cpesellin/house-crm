-- ============================================================
-- HOUSE CRM — Migración #17: Notificaciones Rediseñadas
-- Reemplaza el sistema de alertas actual
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. NUEVA TABLA DE NOTIFICACIONES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- ── Quién ──
  destinatario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  emisor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  -- ── Qué ──
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL
    CHECK (categoria IN ('inmueble', 'referido', 'solicitud', 'pago', 'sistema', 'agenda', 'mensaje')),
  prioridad TEXT DEFAULT 'normal'
    CHECK (prioridad IN ('critica', 'alta', 'normal', 'baja')),

  -- ── Contenido ──
  titulo TEXT NOT NULL,
  mensaje TEXT,
  icono TEXT DEFAULT '🔔',
  color TEXT DEFAULT '#3b82f6',

  -- ── Navegación contextual ──
  accion_tipo TEXT NOT NULL
    CHECK (accion_tipo IN (
      'abrir_inmueble',
      'abrir_referido',
      'abrir_solicitud',
      'abrir_pago',
      'abrir_agenda',
      'abrir_mensaje',
      'abrir_seccion',
      'abrir_usuario'
    )),
  accion_destino TEXT,
  accion_seccion TEXT,

  -- ── Contexto de agrupación ──
  contexto_tipo TEXT,
  contexto_id UUID,

  -- ── Estado ──
  leida BOOLEAN DEFAULT false,
  leida_at TIMESTAMPTZ,
  actuada BOOLEAN DEFAULT false,
  actuada_at TIMESTAMPTZ,
  descartada BOOLEAN DEFAULT false,

  -- ── Escalamiento ──
  escalable BOOLEAN DEFAULT false,
  escalada BOOLEAN DEFAULT false,
  escalada_at TIMESTAMPTZ,
  horas_para_escalar INTEGER DEFAULT 24,

  -- ── Timestamps ──
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expira_at TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────
-- 2. ÍNDICES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notif_destinatario ON notificaciones(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notif_no_leidas ON notificaciones(destinatario_id, leida) WHERE leida = false;
CREATE INDEX IF NOT EXISTS idx_notif_contexto ON notificaciones(contexto_tipo, contexto_id);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notif_escalable ON notificaciones(escalable, escalada, leida)
  WHERE escalable = true AND escalada = false AND leida = false;

-- ────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario ve sus notificaciones" ON notificaciones;
CREATE POLICY "Usuario ve sus notificaciones"
  ON notificaciones FOR SELECT TO authenticated
  USING (destinatario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios crean notificaciones" ON notificaciones;
CREATE POLICY "Usuarios crean notificaciones"
  ON notificaciones FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuario actualiza sus notificaciones" ON notificaciones;
CREATE POLICY "Usuario actualiza sus notificaciones"
  ON notificaciones FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid());

DROP POLICY IF EXISTS "Admin actualiza notificaciones" ON notificaciones;
CREATE POLICY "Admin actualiza notificaciones"
  ON notificaciones FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'oficina')));

-- ────────────────────────────────────────────────────────────
-- 4. COMENTARIOS
-- ────────────────────────────────────────────────────────────

COMMENT ON TABLE notificaciones IS 'Sistema de notificaciones dirigidas. Cada registro = 1 destinatario. Sin notificaciones grupales.';
COMMENT ON COLUMN notificaciones.accion_tipo IS 'Define a dónde navega el usuario al tocar la notificación';
COMMENT ON COLUMN notificaciones.accion_destino IS 'UUID del objeto destino (inmueble_id, referido_id, solicitud_id)';
COMMENT ON COLUMN notificaciones.contexto_id IS 'Agrupa notificaciones del mismo objeto para mostrar como hilo';
COMMENT ON COLUMN notificaciones.escalable IS 'Si true, se escala al admin después de horas_para_escalar sin leer';
COMMENT ON COLUMN notificaciones.expira_at IS 'Si not null, la notificación desaparece después de esta fecha';

-- ────────────────────────────────────────────────────────────
-- 5. VERIFICACIÓN
-- ────────────────────────────────────────────────────────────

SELECT 'tabla notificaciones' AS verificacion,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notificaciones') AS existe;

SELECT 'RLS activo' AS verificacion,
  relrowsecurity AS activo FROM pg_class WHERE relname = 'notificaciones';

SELECT 'policies' AS verificacion,
  COUNT(*) AS total FROM pg_policies WHERE tablename = 'notificaciones';

SELECT 'indices' AS verificacion,
  COUNT(*) AS total FROM pg_indexes WHERE tablename = 'notificaciones';
