-- ============================================================
-- HOUSE CRM — Migración #72 · Fase 0.4b
-- `usuarios` deja de ser legible por el público
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → proyecto HOUSE CRM (ref keasjfgcjkskvdcudoml).
--
-- ⛔ ORDEN OBLIGATORIO
--   1. Desplegar el código que usa las búsquedas acotadas (auth.js y
--      functions.js del commit que acompaña a este archivo).
--   2. Correr la migración 71 (las funciones de búsqueda).
--   3. Probar que el login funciona.
--   4. Recién entonces, esta.
--
--   Si se corre antes, el login cae en su consulta de respaldo, que pide
--   correo y usuario; esas columnas ya no estarán permitidas y NADIE podrá
--   entrar. Por eso el bloque se niega a correr si la función del login no
--   existe.
--
-- POR QUÉ
--   Hoy cualquiera con la llave del navegador descarga nombre, correo y
--   rol de 47 personas —asesores y clientes del público— en una petición.
--
-- QUÉ NECESITA DE VERDAD EL PÚBLICO
--   Medido en el navegador, sin sesión, recorriendo portafolio, ficha y
--   home: sólo el nombre, la foto y el teléfono del ASESOR que captó el
--   inmueble, embebidos en la consulta de inmuebles. Nunca correo, rol ni
--   usuario. Y nunca datos de otros clientes.
--
-- QUÉ HACE
--   · Columnas: el público sólo puede leer id, nombre, foto, foto_url y
--     teléfono de contacto (+ activo y tipo_usuario, que usa la regla de
--     filas). Los usuarios con sesión conservan sus 34 columnas.
--   · Filas: el público sólo ve a los asesores activos. Los clientes que
--     se registraron en la marketplace dejan de ser visibles para otros.
--
-- LO QUE NO SE CIERRA TODAVÍA
--   El alta con Google (functions.js, selectProfile) lee el perfil
--   completo por correo. Hoy no corre porque el proveedor de Google está
--   deshabilitado en Supabase; cuando se active, lo hará con sesión real y
--   no dependerá de esta lectura pública.
--
-- CÓMO SE REVIERTE: al final del archivo.
-- ============================================================

DO $$ BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'PROYECTO EQUIVOCADO. Esto es de HOUSE CRM (ref keasjfgcjkskvdcudoml).';
  END IF;
  IF to_regprocedure('public.login_buscar_usuario(text)') IS NULL
     OR to_regprocedure('public.registro_buscar_email(text)') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 71. Correrla ANTES que ésta: sin las búsquedas acotadas, cerrar usuarios deja a todos sin poder iniciar sesión.';
  END IF;
END $$;

BEGIN;

-- ── Columnas ────────────────────────────────────────────────
-- Permiso de tabla gana sobre el de columna, así que primero se quita
-- el de tabla y luego se concede columna por columna.
REVOKE SELECT ON public.usuarios FROM anon;
GRANT SELECT (id, nombre, foto, foto_url, telefono_contacto, activo, tipo_usuario)
  ON public.usuarios TO anon;

-- ── Filas ───────────────────────────────────────────────────
DROP POLICY IF EXISTS anon_read_usuarios ON public.usuarios;
DROP POLICY IF EXISTS anon_lectura_asesores ON public.usuarios;
CREATE POLICY anon_lectura_asesores ON public.usuarios
  FOR SELECT TO anon
  USING (coalesce(tipo_usuario, 'interno') = 'interno' AND activo = true);

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- La prueba que vale es desde fuera, con la llave pública: pedir `email`
-- debe dar 401, y pedir `nombre` debe devolver sólo asesores activos.

SELECT grantee, string_agg(column_name, ', ' ORDER BY column_name) AS columnas
  FROM information_schema.column_privileges
 WHERE table_name = 'usuarios' AND privilege_type = 'SELECT' AND grantee = 'anon'
 GROUP BY grantee;

-- ============================================================
-- REVERSIÓN
-- ============================================================
-- DROP POLICY IF EXISTS anon_lectura_asesores ON public.usuarios;
-- CREATE POLICY anon_read_usuarios ON public.usuarios FOR SELECT TO anon USING (true);
-- GRANT SELECT (
--   id, usuario, email, nombre, rol, activo, foto, created_at,
--   telefono_contacto, es_gestor_arriendos, tipo_usuario,
--   notificaciones_email, perfiles_publicos,
--   comprador_credito_aprobado, comprador_monto_credito, comprador_tipo_pago,
--   comprador_proposito, comprador_notas_admin, comprador_calificado,
--   comprador_calificado_at, comprador_calificado_por,
--   puede_publicar, puede_referir, intencion_registro,
--   telefono, foto_url, estado_usuario, ultimo_login, creado_por,
--   notas_admin, auth_migrated, auth_migrated_at, needs_password_reset,
--   inmobiliaria_id
-- ) ON public.usuarios TO anon;
