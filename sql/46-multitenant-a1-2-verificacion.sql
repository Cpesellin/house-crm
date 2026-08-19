-- ============================================================
-- HOUSE CRM — Migración #46 · Multitenant Fase A1.2 · Verificación
-- ============================================================
--
-- OBJETIVO:
--   Confirmar que 45-multitenant-a1-2-inmobiliaria-id.sql corrió OK.
--   Sólo consultas SELECT — no cambia nada.
--
-- CORRER DESPUÉS DE:
--   45-multitenant-a1-2-inmobiliaria-id.sql
--
-- QUÉ ESPERAR:
--   Query 1 → sin_tenant = 0 en TODAS las filas
--   Query 2 → n_tenants_distintos = 1, ambos UUIDs coinciden
--   Query 3 → total_tablas_con_columna = 47
--             (45 nuevas + suscripcion + v_acceso que ya tenían)
--   Query 4 → 45 tablas con inmobiliaria_id NOT NULL en al menos 1 fila
-- ============================================================

-- 1) Nulls vs asignados en las 10 tablas más críticas
SELECT 'inmuebles' AS tabla,
       COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL)     AS sin_tenant,
       COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) AS con_tenant
FROM inmuebles
UNION ALL SELECT 'usuarios',       COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM usuarios
UNION ALL SELECT 'cierres',        COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM cierres
UNION ALL SELECT 'referidos',      COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM referidos
UNION ALL SELECT 'notificaciones', COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM notificaciones
UNION ALL SELECT 'fotos',          COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM fotos
UNION ALL SELECT 'interesados',    COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM interesados
UNION ALL SELECT 'favoritos',      COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM favoritos
UNION ALL SELECT 'pv_casos',       COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM pv_casos
UNION ALL SELECT 'mensajes',       COUNT(*) FILTER (WHERE inmobiliaria_id IS NULL), COUNT(*) FILTER (WHERE inmobiliaria_id IS NOT NULL) FROM mensajes
ORDER BY tabla;

-- 2) Todos los inmuebles apuntan a House (esperado: 1 tenant distinto, coincide)
SELECT COUNT(DISTINCT inmobiliaria_id)                     AS n_tenants_distintos,
       (SELECT id FROM inmobiliaria WHERE slug='house')    AS house_id_esperado,
       MAX(inmobiliaria_id)                                AS tenant_en_inmuebles
FROM inmuebles;

-- 3) Total de tablas que tienen la columna (esperado: 47)
SELECT COUNT(*) AS total_tablas_con_columna
FROM information_schema.columns
WHERE table_schema='public' AND column_name='inmobiliaria_id';

-- 4) Lista de las tablas migradas + count de filas con tenant
SELECT
  c.table_name,
  (SELECT COUNT(*) FROM information_schema.tables t
     WHERE t.table_schema='public' AND t.table_name=c.table_name AND t.table_type='BASE TABLE') AS es_tabla
FROM information_schema.columns c
WHERE c.table_schema='public' AND c.column_name='inmobiliaria_id'
ORDER BY c.table_name;
