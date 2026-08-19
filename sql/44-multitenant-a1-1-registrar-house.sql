-- ============================================================
-- HOUSE CRM — Migración #44 · Multitenant Fase A1.1
-- Registrar Inmobiliaria House como tenant #1
-- ============================================================
--
-- OBJETIVO:
--   Poblar las tablas de billing (inmobiliaria, plan, suscripcion)
--   con el tenant fundador. Sin este registro, ninguna de las
--   próximas migraciones (A1.2, A1.3) tiene a quién apuntar.
--
-- SEGURIDAD:
--   Todo en transacción (rollback si falla).
--   Idempotente (ON CONFLICT DO NOTHING / DO UPDATE).
--   No cambia comportamiento de la app.
--
-- REQUISITO PREVIO:
--   Ya deben existir las tablas: inmobiliaria, plan, suscripcion.
--
-- ROLLBACK:
--   Al final del archivo, comentado.
--
-- STATUS: ✅ Ejecutado exitosamente el 2026-08-08
-- ============================================================

BEGIN;

-- 1. Plan Enterprise (Founder tier: precio 0, incluye todo)
INSERT INTO plan (id, nombre, precio_mensual_cop, incluye_crm, incluye_admin, activo, orden)
VALUES ('enterprise', 'Enterprise (Founder)', 0, true, true, true, 1)
ON CONFLICT (id) DO UPDATE SET
  nombre        = EXCLUDED.nombre,
  incluye_crm   = EXCLUDED.incluye_crm,
  incluye_admin = EXCLUDED.incluye_admin,
  activo        = EXCLUDED.activo;

-- 2. Inmobiliaria House (tenant #1)
INSERT INTO inmobiliaria (
  slug, nombre, email_admin, telefono, ciudad, color_primario, activo, metadata
)
VALUES (
  'house',
  'Inmobiliaria House',
  'info@inmobiliariahouse.com.co',
  '+573105922763',
  'Pereira',
  '#1d4ed8',
  true,
  jsonb_build_object(
    'dominio_custom', 'inmobiliariahouse.com.co',
    'es_founder',     true,
    'notas',          'Tenant #1 - inmobiliaria fundadora, sin cobro'
  )
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Suscripción activa "perpetua" (proximo_cobro en 2099 = no cobra)
INSERT INTO suscripcion (
  inmobiliaria_id, plan_id, estado, inicio, proximo_cobro, precio_congelado_cop
)
SELECT
  id, 'enterprise', 'activa', CURRENT_DATE, '2099-12-31'::date, 0
FROM inmobiliaria
WHERE slug = 'house'
  AND NOT EXISTS (
    SELECT 1 FROM suscripcion WHERE inmobiliaria_id = inmobiliaria.id
  );

COMMIT;

-- ============================================================
-- VERIFICACIÓN (esperado: 1 fila en cada query, acceso_permitido=true)
-- ============================================================

SELECT * FROM v_acceso WHERE slug = 'house';
SELECT id, slug, nombre, activo, metadata FROM inmobiliaria;
SELECT s.id, i.slug, s.plan_id, s.estado, s.inicio, s.proximo_cobro
FROM suscripcion s
JOIN inmobiliaria i ON i.id = s.inmobiliaria_id;

-- ============================================================
-- ROLLBACK (descomentar SOLO si necesitás deshacer todo)
-- ============================================================
-- BEGIN;
-- DELETE FROM suscripcion  WHERE inmobiliaria_id IN (SELECT id FROM inmobiliaria WHERE slug='house');
-- DELETE FROM inmobiliaria WHERE slug='house';
-- DELETE FROM plan         WHERE id='enterprise';
-- COMMIT;
