-- ============================================================
-- HOUSE CRM — Migración #61
-- Datos de marca del inquilino que el home necesita
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → New query → pegar todo → Run.
--   NO va en la terminal.
--
-- POR QUÉ NO LO APLIQUÉ YO POR API
--   La tabla `inmobiliaria` no admite escritura con la llave pública:
--   el PATCH devuelve 204 y cero filas afectadas. Ojo con eso — un 204
--   de PostgREST NO significa que haya escrito. Hay que pedir
--   `Prefer: return=representation` y contar las filas.
--
-- QUÉ HACE
--   1. Corrige dos datos de Inmobiliaria House.
--   2. Agrega cinco columnas que el home de marca blanca necesita.
--
-- ============================================================
-- 1. CORRECCIONES A LOS DATOS DE HOUSE
-- ============================================================
--
-- color_primario era '#1d4ed8', un azul que NO es el de sus propias
-- piezas gráficas. El home deriva toda su paleta de este campo, así que
-- con el valor viejo el home de House habría salido del color
-- equivocado — y nadie lo habría notado hasta verlo publicado.
--
-- direccion y logo_url estaban vacíos, y el home muestra los dos.

UPDATE inmobiliaria
   SET color_primario = '#0d2a52',
       logo_url       = COALESCE(logo_url, '/img/logo.png'),
       direccion      = COALESCE(direccion, 'Calle 14 #14-09, Pereira, Risaralda')
 WHERE slug = 'house';

-- ============================================================
-- 2. COLUMNAS NUEVAS PARA EL HOME
-- ============================================================
--
-- Todas opcionales: si el inquilino no las llena, la sección
-- correspondiente del home simplemente no se pinta. Ninguna rompe nada
-- de lo que ya funciona.

ALTER TABLE inmobiliaria
  ADD COLUMN IF NOT EXISTS lema           text,   -- el acento manuscrito
  ADD COLUMN IF NOT EXISTS hero_foto_url  text,   -- fotografía del hero
  ADD COLUMN IF NOT EXISTS og_imagen_url  text,   -- miniatura de WhatsApp
  ADD COLUMN IF NOT EXISTS horario        text,   -- "Lun a vie 8–6, sáb 9–1"
  ADD COLUMN IF NOT EXISTS redes          jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN inmobiliaria.lema          IS 'Frase de marca del home (acento manuscrito). Ej: Más que inmuebles, creamos hogares';
COMMENT ON COLUMN inmobiliaria.hero_foto_url IS 'Foto a sangre del hero. Se elige a mano: es la única imagen que no puede fallar';
COMMENT ON COLUMN inmobiliaria.og_imagen_url IS 'Miniatura 1200x630 para compartir por WhatsApp';
COMMENT ON COLUMN inmobiliaria.horario       IS 'Horario de atención, texto libre';
COMMENT ON COLUMN inmobiliaria.redes         IS 'Enlaces de redes. Ej: {"instagram":"https://...","facebook":"https://..."}';

-- Valores de House para las columnas nuevas
UPDATE inmobiliaria
   SET lema = COALESCE(lema, 'Más que inmuebles, creamos hogares')
 WHERE slug = 'house';

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

SELECT nombre, slug, color_primario, logo_url, direccion, lema,
       hero_foto_url, og_imagen_url, horario, redes
  FROM inmobiliaria
 ORDER BY created_at;

-- Se espera para House:
--   color_primario  #0d2a52
--   logo_url        /img/logo.png
--   direccion       Calle 14 #14-09, Pereira, Risaralda
--   lema            Más que inmuebles, creamos hogares
--   hero_foto_url   NULL  (se define al elegir la foto del hero)
--   og_imagen_url   NULL  (se define al generar la miniatura)

-- ============================================================
-- PENDIENTE DE DECIDIR — no se toca aquí
-- ============================================================
--
--   Al dar de alta una inmobiliaria nueva, ¿qué campos son obligatorios?
--   El home necesita como mínimo nombre, ciudad, telefono, direccion y
--   color_primario. Sin logo se puede vivir (se muestra la inicial en un
--   cuadro con el color de marca), pero sin dirección el bloque de
--   confianza pierde su argumento: "tenemos oficina, puedes venir".
--
--   Eso se decide cuando se construya el alta de inquilinos, no ahora.
