-- ============================================================
-- HOUSE CRM — Migración #63
-- Foto del hero de Inmobiliaria House
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → New query → pegar → Run.
--
-- POR QUÉ
--   La migración 61 creó la columna hero_foto_url pero quedó vacía. La
--   app hoy lee la ficha por defecto del código (el multi-tenant está
--   apagado), así que la foto ya funciona; esto la deja también en la
--   base para cuando el multi-tenant se encienda.
--
-- QUÉ FOTO ES
--   HOUSE-109, casa campestre en Pereira al atardecer: casa iluminada,
--   piscina y palmeras. Elegida a mano entre las candidatas del
--   portafolio — automatizar la elección habría puesto un cuarto de
--   lavado en la portada, que es literalmente lo que salió al revisar
--   las candidatas por precio.
--
--   Recortada a 1600x900 con encuadre automático de Cloudinary y formato
--   negociado con el navegador (f_auto).
--
-- CONTRASTE VERIFICADO
--   Con el velo de marca al 74%, en el peor caso posible (que la foto
--   fuera blanco puro justo detrás del texto):
--     titular blanco     6,32:1
--     subtítulo #cfe0f2  4,69:1
--   Los dos por encima del 4,5:1 exigido. Medido, no estimado.
-- ============================================================

UPDATE inmobiliaria
   SET hero_foto_url = 'https://res.cloudinary.com/dfelsbmbo/image/upload/w_1600,h_900,c_fill,g_auto,q_auto:good,f_auto/v1776981590/fichas_inmobiliarias/hxbvfxdvfjetdfigucgp.png'
 WHERE slug = 'house';

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT nombre, hero_foto_url IS NOT NULL AS tiene_hero, lema, direccion
  FROM inmobiliaria WHERE slug = 'house';

-- ============================================================
-- PENDIENTE: og_imagen_url
-- ============================================================
--   Sigue vacía. Es la miniatura 1200x630 para compartir por WhatsApp,
--   y hay que componerla (foto + logo + franja con el nombre). Se hace
--   cuando se sirva el home en la raíz del dominio.
