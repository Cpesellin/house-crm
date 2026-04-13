-- =====================================================================
-- House CRM — Mensajes vinculados a negocios por contexto
-- =====================================================================
-- contexto_tipo: 'moderacion','interes','cita','negocio','general'
-- tipo_mensaje: 'texto','sistema','declinacion'
-- =====================================================================

ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS contexto_tipo TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS contexto_id UUID;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS tipo_mensaje TEXT DEFAULT 'texto';

CREATE INDEX IF NOT EXISTS idx_msg_contexto ON mensajes(contexto_tipo, contexto_id)
  WHERE contexto_tipo IS NOT NULL;
