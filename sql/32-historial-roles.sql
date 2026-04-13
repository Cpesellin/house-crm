-- =====================================================================
-- House CRM — Historial de cambios de rol + campos admin en usuarios
-- =====================================================================

CREATE TABLE IF NOT EXISTS historial_roles_usuario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  rol_anterior TEXT NOT NULL,
  rol_nuevo TEXT NOT NULL,
  tipo_anterior TEXT,
  tipo_nuevo TEXT,
  direccion TEXT NOT NULL CHECK (direccion IN ('upgrade','downgrade','lateral')),
  cambiado_por UUID NOT NULL REFERENCES usuarios(id),
  motivo TEXT NOT NULL,
  inmuebles_reasignados INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hist_roles_usuario ON historial_roles_usuario(usuario_id);

ALTER TABLE historial_roles_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_hist_roles" ON historial_roles_usuario;
CREATE POLICY "open_hist_roles" ON historial_roles_usuario FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado_usuario TEXT DEFAULT 'activo';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES usuarios(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS notas_admin TEXT;
