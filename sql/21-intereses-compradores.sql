-- ============================================================
-- HOUSE CRM — Migración #21: Intereses de compradores (Fase 3)
-- Ejecutar en Supabase SQL Editor
-- ============================================================
--
-- Tabla nueva donde los clientes (compradores/arrendatarios) registran
-- formalmente su interés en un inmueble. Reemplaza el botón "Me interesa"
-- que antes solo abría el chat por un formulario estructurado con
-- presupuesto, fecha ideal y mensaje libre.
--
-- Flujo:
--   nuevo            → cliente acaba de expresar interés (Fase 3)
--   calificado       → admin lo revisó y dio score verde (Fase 4)
--   descartado       → admin lo descartó (no califica, ya no disponible…)
--   convertido_cita  → se generó una cita a partir de este interés (Fase 5)
--
-- ────────────────────────────────────────────────────────────
-- 1. TABLA intereses_compradores
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intereses_compradores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inmueble_id     UUID NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Datos declarados por el comprador
  presupuesto_max NUMERIC,           -- tope que puede pagar (NULL = no declarado)
  fecha_ideal     DATE,              -- cuándo quiere mudarse / cerrar
  modalidad       TEXT,              -- 'arriendo' | 'compra'
  mensaje         TEXT,              -- texto libre del comprador

  -- Calificación admin (Fase 4 — por ahora NULL)
  score           TEXT,              -- 'verde' | 'amarillo' | 'rojo'
  calificado_por  UUID REFERENCES usuarios(id),
  calificado_at   TIMESTAMPTZ,
  motivo_score    TEXT,

  -- Flujo
  estado          TEXT NOT NULL DEFAULT 'nuevo',
                  -- 'nuevo' | 'calificado' | 'descartado' | 'convertido_cita'

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un usuario solo puede tener 1 interés activo por inmueble.
  -- Si quiere actualizar su interés, hacemos UPDATE en vez de INSERT.
  CONSTRAINT uq_inmueble_usuario UNIQUE (inmueble_id, usuario_id)
);

COMMENT ON TABLE intereses_compradores IS
  'Intereses estructurados de compradores sobre inmuebles. Reemplaza el chat genérico "Me interesa" por un formulario con presupuesto/fecha/mensaje. Fase 4 los califica.';

-- ────────────────────────────────────────────────────────────
-- 2. ÍNDICES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_intereses_inmueble
  ON intereses_compradores (inmueble_id);

CREATE INDEX IF NOT EXISTS idx_intereses_usuario
  ON intereses_compradores (usuario_id);

-- Cola de calificación admin (Fase 4): nuevos primero, más viejos al frente
CREATE INDEX IF NOT EXISTS idx_intereses_cola
  ON intereses_compradores (created_at)
  WHERE estado = 'nuevo';

-- ────────────────────────────────────────────────────────────
-- 3. RLS — sin restricciones (auth es custom, se filtra en cliente)
-- ────────────────────────────────────────────────────────────

ALTER TABLE intereses_compradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_intereses" ON intereses_compradores
  FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN
-- ────────────────────────────────────────────────────────────

SELECT 'tabla intereses_compradores' AS verificacion,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'intereses_compradores'
  ) AS existe;

SELECT 'indice idx_intereses_cola' AS verificacion,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_intereses_cola'
  ) AS existe;
