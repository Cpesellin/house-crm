-- =====================================================================
-- House CRM — Comisiones flexibles: N participantes con % libres
-- =====================================================================
DROP TABLE IF EXISTS participantes_comision;

CREATE TABLE participantes_comision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id UUID NOT NULL REFERENCES cierres(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  nombre_externo TEXT,
  telefono_externo TEXT,
  rol_comision TEXT NOT NULL CHECK (rol_comision IN (
    'house','comisionista_inmueble','comisionista_comprador',
    'asesor_captador','referidor','otro'
  )),
  porcentaje NUMERIC(5,2) NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 0,
  pago_estado TEXT DEFAULT 'pendiente' CHECK (pago_estado IN ('pendiente','pagado','parcial')),
  pago_fecha TIMESTAMPTZ,
  pago_referencia TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_part_comision_cierre ON participantes_comision(cierre_id);
CREATE INDEX idx_part_comision_pendientes ON participantes_comision(pago_estado) WHERE pago_estado = 'pendiente';

ALTER TABLE participantes_comision ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_part_comision" ON participantes_comision FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cierres ADD COLUMN IF NOT EXISTS comision_porcentaje NUMERIC(5,2);
