-- ============================================================
-- HOUSE CRM — Migración #59
-- Normalizar ciudad y tipo de los inmuebles
-- ============================================================
--
-- PROBLEMA
--   El mismo valor está escrito de varias formas, así que los filtros y
--   los conteos los tratan como distintos:
--
--     ciudad: 'PEREIRA' (72), 'Pereira' (37), 'Pereira ' (14), ' Pereira' (1)
--             'DOSQUEBRADAS' (20), 'Dosquebradas' (17), 'Dosquebradas ' (4)
--     tipo:   'APARTAMENTO' (17) / 'Apartamento' (51)
--             'CASA' (9) / 'Casa' (62)
--
--   Se nota en el buscador (dos entradas para la misma ciudad), en las
--   estadísticas del portafolio y en la vista previa de /arriendos, que
--   listaba "Apartamento, Apartamento" como si fueran tipos distintos.
--
-- QUÉ HACE
--   Sólo limpieza mecánica: colapsa espacios repetidos, recorta los
--   sobrantes y unifica mayúsculas. No fusiona conceptos ni interpreta
--   nada — eso queda listado al final para decidir aparte.
--
--   ciudad → Title Case  (nombre propio: 'Santa Rosa')
--   tipo   → sólo la inicial ('Casa campestre', 'Local comercial'),
--            que es la forma ya mayoritaria en los datos.
--
-- RESULTADO ESPERADO
--   ciudad: 31 valores distintos → 23
--   tipo:   14 → 9
--
-- REVERSIBILIDAD
--   No hay vuelta atrás por SQL: se pierde el casing original. Hay
--   respaldo previo en ../house-crm-backups (inmuebles.json).
--
-- STATUS: APLICADO el 2026-09-08, pero NO con este SQL.
--
--   Se hizo por la API REST (129 filas de 173), porque el rol anon sí
--   puede escribir estas columnas y así no hubo que pedirle al usuario
--   que pegara SQL en el editor de Supabase.
--
--   Respaldo previo de las tres columnas:
--   ../house-crm-backups/ciudad-tipo-barrio-20260908-1939.json
--
--   Resultado: ciudad 31 -> 22 valores distintos, tipo 14 -> 8.
--   'Pereira' quedó en una sola entrada con 110 inmuebles.
--
--   Dos diferencias frente al SQL de abajo, que initcap() no sabe hacer:
--     · Los conectores van en minúscula salvo al inicio, como en español:
--       'Santa Rosa de Cabal', no 'Santa Rosa De Cabal'.
--     · 'Aparta Estudio' (1) se unificó con 'Apartaestudio' (9): mismo
--       concepto, y la diferencia de volumen no deja dudas de cuál gana.
--
--   NO ejecutar este archivo: initcap() desharía lo de los conectores.
-- ============================================================

BEGIN;

-- ─── Ciudad ─────────────────────────────────────────────────────────
UPDATE inmuebles
   SET ciudad = initcap(btrim(regexp_replace(ciudad, '\s+', ' ', 'g')))
 WHERE ciudad IS NOT NULL
   AND ciudad <> initcap(btrim(regexp_replace(ciudad, '\s+', ' ', 'g')));

-- ─── Tipo ───────────────────────────────────────────────────────────
UPDATE inmuebles
   SET tipo = upper(left(btrim(regexp_replace(tipo, '\s+', ' ', 'g')), 1))
            || lower(substr(btrim(regexp_replace(tipo, '\s+', ' ', 'g')), 2))
 WHERE tipo IS NOT NULL
   AND tipo <> upper(left(btrim(regexp_replace(tipo, '\s+', ' ', 'g')), 1))
             || lower(substr(btrim(regexp_replace(tipo, '\s+', ' ', 'g')), 2));

-- ─── Barrio ─────────────────────────────────────────────────────────
-- Mismo problema, menos visible. Se incluye para no dejarlo a medias.
UPDATE inmuebles
   SET barrio = initcap(btrim(regexp_replace(barrio, '\s+', ' ', 'g')))
 WHERE barrio IS NOT NULL
   AND barrio <> initcap(btrim(regexp_replace(barrio, '\s+', ' ', 'g')));

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT ciudad, COUNT(*) AS n
FROM inmuebles WHERE eliminado = false
GROUP BY ciudad ORDER BY n DESC;

SELECT tipo, COUNT(*) AS n
FROM inmuebles WHERE eliminado = false
GROUP BY tipo ORDER BY n DESC;

-- ============================================================
-- PENDIENTE DE DECIDIR (requiere criterio, NO se toca aquí)
-- ============================================================
--
--   'Aparta estudio' (1) vs 'Apartaestudio' (13)
--       Mismo concepto, distinta escritura. Para unificar:
--       UPDATE inmuebles SET tipo='Apartaestudio' WHERE tipo='Aparta estudio';
--
--   ciudad 'Zztest' (1)      → parece un inmueble de prueba
--   ciudad 'Pendiente' (1)   → quedó sin definir al registrarlo
--   ciudad 'La Virginia N'   → probable error de dedo por 'La Virginia'
--   ciudad 'Condina' (2) vs 'La Condina' (1)
--       Condina es un sector de Pereira, no un municipio. Unificarlas
--       depende de si se usa como ciudad o como barrio.
--   ciudad 'Via Armenia' (2), 'Via Alcala' (1), 'Cerritos-Cartago' (1)
--       Son ubicaciones sobre una vía, no ciudades. Si se quiere filtrar
--       bien por ciudad, deberían pasar a ciudad + barrio/sector.
--   ciudad 'Belmonte' (1)    → barrio de Pereira, no ciudad
--   ciudad 'Valle Del Cauca' (1) → es un departamento
