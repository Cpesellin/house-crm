-- ============================================================
-- HOUSE CRM — Migración #35: Sistema de Sugerencias Inteligentes
-- Tracking de comportamiento + Preferencias inferidas + Anti-duplicados.
-- Ejecutar en Supabase SQL Editor.
-- ============================================================
-- NOTA: Se eliminan tablas previas por si hubo versión incompleta.
--       No hay datos de negocio aquí (tracking y sugerencias se regeneran).

DROP TABLE IF EXISTS sugerencias_enviadas CASCADE;
DROP TABLE IF EXISTS preferencias_calculadas CASCADE;
DROP TABLE IF EXISTS eventos_usuario CASCADE;

-- ────────────────────────────────────────────────────────────
-- 1. EVENTOS DE USUARIO (tracking de comportamiento)
-- ────────────────────────────────────────────────────────────

CREATE TABLE eventos_usuario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'view_card','dwell_card','filter','search','favorito_add','favorito_remove',
    'interes','compartir_wa','llamar','cita_solicitada'
  )),
  inmueble_id UUID REFERENCES inmuebles(id) ON DELETE SET NULL,
  ciudad TEXT,
  barrio TEXT,
  tipo_inmueble TEXT,
  negociacion TEXT,
  precio NUMERIC,
  habitaciones INTEGER,
  filtro_payload JSONB,
  search_text TEXT,
  dwell_ms INTEGER,
  peso INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ev_usr_fecha ON eventos_usuario(usuario_id, created_at DESC);
CREATE INDEX idx_ev_usr_tipo ON eventos_usuario(usuario_id, tipo);
CREATE INDEX idx_ev_usr_inm ON eventos_usuario(inmueble_id) WHERE inmueble_id IS NOT NULL;
ALTER TABLE eventos_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_eventos" ON eventos_usuario FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 2. PREFERENCIAS CALCULADAS (perfil inferido)
-- ────────────────────────────────────────────────────────────

CREATE TABLE preferencias_calculadas (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  negociacion TEXT,
  tipos_preferidos JSONB DEFAULT '[]',
  ciudades JSONB DEFAULT '[]',
  barrios JSONB DEFAULT '[]',
  precio_min NUMERIC,
  precio_max NUMERIC,
  habitaciones_min INTEGER,
  habitaciones_max INTEGER,
  engagement_score INTEGER DEFAULT 0,
  eventos_totales INTEGER DEFAULT 0,
  ultimo_evento_at TIMESTAMPTZ,
  muestra_eventos INTEGER DEFAULT 0,
  calculado_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pref_engagement ON preferencias_calculadas(engagement_score DESC);
CREATE INDEX idx_pref_calculado ON preferencias_calculadas(calculado_at);
ALTER TABLE preferencias_calculadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_prefs" ON preferencias_calculadas FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. SUGERENCIAS ENVIADAS (anti-duplicados y throttling)
-- ────────────────────────────────────────────────────────────

CREATE TABLE sugerencias_enviadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  inmueble_id UUID NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  razones JSONB DEFAULT '[]',
  notificacion_id UUID,
  resultado TEXT DEFAULT 'enviada',
  abierta_at TIMESTAMPTZ,
  convertida_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, inmueble_id)
);
CREATE INDEX idx_sug_usr_fecha ON sugerencias_enviadas(usuario_id, created_at DESC);
CREATE INDEX idx_sug_score ON sugerencias_enviadas(score DESC);
ALTER TABLE sugerencias_enviadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_sug" ON sugerencias_enviadas FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN
-- ────────────────────────────────────────────────────────────

SELECT 'eventos_usuario' AS tabla, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='eventos_usuario') AS existe
UNION ALL
SELECT 'preferencias_calculadas', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='preferencias_calculadas')
UNION ALL
SELECT 'sugerencias_enviadas', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='sugerencias_enviadas');
