-- =====================================================================
-- House CRM — Identificación dinámica de roles: tipo de interés
-- =====================================================================
-- Diferencia si el interés es directo (comprador) o referido (comisionista)
-- =====================================================================

ALTER TABLE intereses_compradores ADD COLUMN IF NOT EXISTS interes_tipo TEXT DEFAULT 'comprador';
ALTER TABLE intereses_compradores ADD COLUMN IF NOT EXISTS referido_nombre TEXT;
ALTER TABLE intereses_compradores ADD COLUMN IF NOT EXISTS referido_telefono TEXT;
