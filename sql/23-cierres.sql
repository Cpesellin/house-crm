-- =====================================================================
-- House CRM — Fase 6: Cierres + Comisiones (split 50/50 captador/casa)
-- =====================================================================
-- Modelo de comisión:
--   Arriendo: 10% del canon mensual (una vez), en 2 fases:
--     Fase A: $50.000 al firmar contrato con propietario
--     Fase B: (10% canon - $50.000) al arrendar efectivamente
--   Venta: 3% del precio de venta, pago único al cerrar
--   Reparto: 50% captador + 50% casa (oficina)
-- =====================================================================

CREATE TABLE IF NOT EXISTS cierres (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inmueble_id     UUID NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('arriendo','venta')),
  estado          TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','reabierto','anulado')),

  -- Captura del cierre
  precio_final        NUMERIC NOT NULL CHECK (precio_final >= 0),
  fecha_cierre        DATE    NOT NULL,
  contraparte_nombre  TEXT,           -- arrendatario o comprador
  duracion_meses      INT,            -- solo arriendo
  interes_id          UUID REFERENCES intereses_compradores(id) ON DELETE SET NULL,
  nota                TEXT,

  -- Snapshot de comisión al momento del cierre
  comision_total      NUMERIC NOT NULL CHECK (comision_total >= 0),
  comision_captador   NUMERIC NOT NULL CHECK (comision_captador >= 0),
  comision_casa       NUMERIC NOT NULL CHECK (comision_casa >= 0),

  -- Tracking de pago — arriendos (2 fases)
  fase_a_pagada       BOOLEAN NOT NULL DEFAULT FALSE,
  fase_a_pagada_at    TIMESTAMPTZ,
  fase_b_pagada       BOOLEAN NOT NULL DEFAULT FALSE,
  fase_b_pagada_at    TIMESTAMPTZ,

  -- Tracking de pago — ventas (pago único)
  pagada              BOOLEAN NOT NULL DEFAULT FALSE,
  pagada_at           TIMESTAMPTZ,

  -- Auditoría
  captador_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  cerrado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices --------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cierres_inmueble    ON cierres(inmueble_id);
CREATE INDEX IF NOT EXISTS idx_cierres_captador    ON cierres(captador_id);
CREATE INDEX IF NOT EXISTS idx_cierres_fecha       ON cierres(fecha_cierre DESC);
CREATE INDEX IF NOT EXISTS idx_cierres_pendientes  ON cierres(estado)
  WHERE estado = 'activo' AND (
    (fase_a_pagada = FALSE) OR (fase_b_pagada = FALSE) OR (pagada = FALSE)
  );

-- RLS abierto (auth custom, filtro en cliente) -------------------------
ALTER TABLE cierres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_cierres" ON cierres;
CREATE POLICY "open_cierres" ON cierres
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at ---------------------------------------------------
CREATE OR REPLACE FUNCTION cierres_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cierres_updated_at ON cierres;
CREATE TRIGGER trg_cierres_updated_at
  BEFORE UPDATE ON cierres
  FOR EACH ROW
  EXECUTE FUNCTION cierres_set_updated_at();
