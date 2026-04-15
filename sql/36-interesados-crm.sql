-- ============================================================
-- HOUSE CRM — Migración #36: Módulo Interesados/Leads (consolidado)
-- Consolida intereses_compradores + nuevo CRM de leads.
-- Mantiene compat vía VIEW para no romper código existente.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLA PRINCIPAL: interesados (consolidada)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interesados (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inmueble_id             UUID NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
  asesor_creador_id       UUID REFERENCES usuarios(id),
  asesor_asignado_id      UUID REFERENCES usuarios(id),
  usuario_id              UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre_completo         TEXT,
  telefono                TEXT,
  email                   TEXT,
  tipificacion            TEXT NOT NULL DEFAULT 'nuevo'
    CHECK (tipificacion IN (
      'nuevo','contactado','visita_agendada','visita_realizada',
      'negociacion','cierre_ganado','cierre_perdido','en_seguimiento'
    )),
  canal_origen            TEXT DEFAULT 'whatsapp'
    CHECK (canal_origen IN ('whatsapp','web','referido','llameya','publico','otro')),
  presupuesto_min         NUMERIC,
  presupuesto_max         NUMERIC,
  motivo_busqueda         TEXT,
  urgencia                TEXT,
  fecha_ideal             DATE,
  modalidad               TEXT,
  interes_tipo            TEXT DEFAULT 'comprador',
  credito_aprobado        TEXT,
  tipo_pago               TEXT,
  proposito               TEXT,
  score_auto              INT,
  score_calificacion      INT DEFAULT 0,
  mensaje                 TEXT,
  score                   TEXT,
  calificado_por          UUID REFERENCES usuarios(id),
  calificado_at           TIMESTAMPTZ,
  motivo_score            TEXT,
  nota_inicial            TEXT,
  fecha_ultima_actividad  TIMESTAMPTZ DEFAULT NOW(),
  fecha_cierre_estimada   DATE,
  estado                  TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo','pausado','convertido','perdido','descartado')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interesados_inmueble  ON interesados(inmueble_id);
CREATE INDEX IF NOT EXISTS idx_interesados_asesor    ON interesados(asesor_asignado_id);
CREATE INDEX IF NOT EXISTS idx_interesados_creador   ON interesados(asesor_creador_id);
CREATE INDEX IF NOT EXISTS idx_interesados_usuario   ON interesados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_interesados_tipif     ON interesados(tipificacion);
CREATE INDEX IF NOT EXISTS idx_interesados_estado    ON interesados(estado);
CREATE INDEX IF NOT EXISTS idx_interesados_actividad ON interesados(fecha_ultima_actividad DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_interesados_usr_inm
  ON interesados(usuario_id, inmueble_id) WHERE usuario_id IS NOT NULL;

ALTER TABLE interesados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_interesados" ON interesados;
CREATE POLICY "open_interesados" ON interesados FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 2. HISTORIAL (timeline)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interesados_historial (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interesado_id          UUID NOT NULL REFERENCES interesados(id) ON DELETE CASCADE,
  asesor_id              UUID NOT NULL REFERENCES usuarios(id),
  tipo_actividad         TEXT NOT NULL
    CHECK (tipo_actividad IN (
      'nota','llamada','whatsapp','email','visita_agendada','visita_realizada',
      'cambio_tipificacion','mencion','creacion','cambio_asesor'
    )),
  descripcion            TEXT NOT NULL,
  tipificacion_anterior  TEXT,
  tipificacion_nueva     TEXT,
  menciones_usuarios     JSONB DEFAULT '[]',
  menciones_inmuebles    JSONB DEFAULT '[]',
  fecha_hora             TIMESTAMPTZ DEFAULT NOW(),
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hist_int_interesado ON interesados_historial(interesado_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hist_int_asesor     ON interesados_historial(asesor_id);

ALTER TABLE interesados_historial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_hist_int" ON interesados_historial;
CREATE POLICY "open_hist_int" ON interesados_historial FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. PIVOTE: inmuebles adicionales de interés
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inmuebles_interesados (
  interesado_id   UUID REFERENCES interesados(id) ON DELETE CASCADE,
  inmueble_id     UUID REFERENCES inmuebles(id) ON DELETE CASCADE,
  fecha_agregado  TIMESTAMPTZ DEFAULT NOW(),
  asesor_id       UUID REFERENCES usuarios(id),
  nota            TEXT,
  PRIMARY KEY (interesado_id, inmueble_id)
);

CREATE INDEX IF NOT EXISTS idx_inmint_interesado ON inmuebles_interesados(interesado_id);
CREATE INDEX IF NOT EXISTS idx_inmint_inmueble   ON inmuebles_interesados(inmueble_id);

ALTER TABLE inmuebles_interesados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_inmint" ON inmuebles_interesados;
CREATE POLICY "open_inmint" ON inmuebles_interesados FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 4. VISITAS AGENDADAS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visitas_agendadas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interesado_id        UUID NOT NULL REFERENCES interesados(id) ON DELETE CASCADE,
  inmueble_id          UUID NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
  asesor_id            UUID NOT NULL REFERENCES usuarios(id),
  fecha_visita         DATE NOT NULL,
  hora_visita          TIME NOT NULL,
  tipo_visita          TEXT DEFAULT 'presencial'
    CHECK (tipo_visita IN ('presencial','virtual')),
  estado               TEXT DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','realizada','cancelada','reprogramada','no_asistio')),
  notas_visita         TEXT,
  recordatorio_enviado BOOLEAN DEFAULT FALSE,
  agenda_id            UUID REFERENCES agenda(id) ON DELETE SET NULL,
  fecha_creacion       TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vis_interesado ON visitas_agendadas(interesado_id);
CREATE INDEX IF NOT EXISTS idx_vis_fecha      ON visitas_agendadas(fecha_visita);
CREATE INDEX IF NOT EXISTS idx_vis_asesor     ON visitas_agendadas(asesor_id, fecha_visita);
CREATE INDEX IF NOT EXISTS idx_vis_estado     ON visitas_agendadas(estado);

ALTER TABLE visitas_agendadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_visitas" ON visitas_agendadas;
CREATE POLICY "open_visitas" ON visitas_agendadas FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 5. MIGRACIÓN DE DATOS: intereses_compradores → interesados
-- ────────────────────────────────────────────────────────────

INSERT INTO interesados (
  id, inmueble_id, usuario_id, asesor_creador_id, asesor_asignado_id,
  nombre_completo, telefono, email,
  tipificacion, canal_origen,
  presupuesto_max, fecha_ideal, modalidad,
  interes_tipo, credito_aprobado, tipo_pago, proposito, score_auto,
  mensaje, score, calificado_por, calificado_at, motivo_score,
  estado, fecha_ultima_actividad, created_at, updated_at
)
SELECT
  ic.id, ic.inmueble_id, ic.usuario_id, ic.usuario_id,
  COALESCE(i.captador_id, ic.usuario_id),
  u.nombre, u.telefono_contacto, u.email,
  CASE ic.estado
    WHEN 'nuevo'           THEN 'nuevo'
    WHEN 'calificado'      THEN 'contactado'
    WHEN 'pedir_info'      THEN 'contactado'
    WHEN 'descartado'      THEN 'cierre_perdido'
    WHEN 'convertido'      THEN 'cierre_ganado'
    WHEN 'convertido_cita' THEN 'visita_agendada'
    ELSE 'nuevo'
  END,
  'publico',
  ic.presupuesto_max, ic.fecha_ideal, ic.modalidad,
  ic.interes_tipo, ic.credito_aprobado, ic.tipo_pago, ic.proposito, ic.score_auto,
  ic.mensaje, ic.score, ic.calificado_por, ic.calificado_at, ic.motivo_score,
  CASE ic.estado
    WHEN 'descartado' THEN 'descartado'
    WHEN 'convertido' THEN 'convertido'
    ELSE 'activo'
  END,
  ic.updated_at, ic.created_at, ic.updated_at
FROM intereses_compradores ic
LEFT JOIN inmuebles i ON i.id = ic.inmueble_id
LEFT JOIN usuarios u  ON u.id = ic.usuario_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO interesados_historial (interesado_id, asesor_id, tipo_actividad, descripcion, created_at)
SELECT i.id, COALESCE(i.asesor_creador_id, i.asesor_asignado_id),
  'creacion', 'Interés migrado desde intereses_compradores (canal público).', i.created_at
FROM interesados i
WHERE NOT EXISTS (
  SELECT 1 FROM interesados_historial h WHERE h.interesado_id = i.id AND h.tipo_actividad = 'creacion'
);

-- ────────────────────────────────────────────────────────────
-- 6. VIEW DE COMPATIBILIDAD
-- ────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS intereses_compradores CASCADE;

CREATE OR REPLACE VIEW intereses_compradores AS
SELECT
  id, inmueble_id, usuario_id,
  presupuesto_max, fecha_ideal, modalidad, mensaje,
  score, calificado_por, calificado_at, motivo_score,
  CASE tipificacion
    WHEN 'nuevo'            THEN 'nuevo'
    WHEN 'contactado'       THEN 'calificado'
    WHEN 'visita_agendada'  THEN 'convertido_cita'
    WHEN 'visita_realizada' THEN 'convertido_cita'
    WHEN 'negociacion'      THEN 'calificado'
    WHEN 'cierre_ganado'    THEN 'convertido'
    WHEN 'cierre_perdido'   THEN 'descartado'
    WHEN 'en_seguimiento'   THEN 'calificado'
    ELSE 'nuevo'
  END AS estado,
  created_at, updated_at,
  interes_tipo, credito_aprobado, tipo_pago, proposito, score_auto
FROM interesados
WHERE usuario_id IS NOT NULL;

COMMENT ON VIEW intereses_compradores IS
  'VIEW de compatibilidad. Tabla real: interesados.';

-- Verificación
SELECT 'interesados' AS t, COUNT(*) AS filas FROM interesados
UNION ALL SELECT 'interesados_historial', COUNT(*) FROM interesados_historial
UNION ALL SELECT 'inmuebles_interesados', COUNT(*) FROM inmuebles_interesados
UNION ALL SELECT 'visitas_agendadas',     COUNT(*) FROM visitas_agendadas
UNION ALL SELECT 'view_legacy_ic',        COUNT(*) FROM intereses_compradores;
