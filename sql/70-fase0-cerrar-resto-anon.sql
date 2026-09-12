-- ============================================================
-- HOUSE CRM — Migración #70 · Fase 0.3
-- El resto de las lecturas de `anon`, cerradas con comprobación
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → proyecto HOUSE CRM (ref keasjfgcjkskvdcudoml).
--
-- QUÉ QUEDA POR CERRAR
--   La migración 68 cerró las ocho tablas cuya cobertura para usuarios
--   con sesión había verificado a mano. Quedaron once más:
--
--     historial · alertas · permisos_rol · referidos · citas_inmueble
--     intereses_inmueble · logros_usuario · sugerencias_enviadas
--     inmuebles_interesados · interesados_historial · niveles_referidor
--
-- POR QUÉ ESTE BLOQUE SE COMPRUEBA SOLO
--   Quitar una policy de `anon` es seguro únicamente si los usuarios con
--   sesión tienen otra que les permita lo mismo. Comprobarlo a mano tabla
--   por tabla es lento y, peor, es donde se cuela el error: basta una que
--   se me pase para dejar una pantalla del CRM sin cargar.
--
--   Así que el bloque lo verifica él: para cada policy de `anon` busca si
--   existe otra PERMISIVA para `authenticated` o `public` que cubra la
--   misma operación. Si la hay, la de `anon` sobra y se quita. Si no la
--   hay, NO se toca y se reporta al final. Cerrar a ciegas ahí dejaría a
--   los asesores sin acceso a esa tabla.
--
-- LO QUE NO TOCA, A PROPÓSITO
--   · Los INSERT. Hay formularios públicos que escriben sin sesión
--     (interés en un inmueble, solicitud de registro). Van aparte.
--   · `usuarios`. El login la consulta ANTES de autenticar; cerrarla
--     deja a todo el mundo fuera. Necesita primero una función de
--     búsqueda acotada.
--   · Las policies de lectura pública legítimas — "Lectura pública
--     inmuebles", "Lectura pública fotos", "Lectura pública niveles",
--     "Lectura pública pagos referidos" —: no empiezan por `anon_`, y
--     el filtro las respeta.
--   · `tenant_isolation`, que es RESTRICTIVE y no otorga nada.
--
-- ES REPETIBLE: lo ya cerrado no vuelve a aparecer.
-- ============================================================

DO $$ BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'PROYECTO EQUIVOCADO. Esto es de HOUSE CRM (ref keasjfgcjkskvdcudoml).';
  END IF;
END $$;

BEGIN;

-- ⚠️ SIN TABLA TEMPORAL, a propósito.
--
-- La primera versión guardaba el reporte en una TEMP TABLE y lo leía al
-- final. En el SQL Editor de Supabase falló con "relation _resultado
-- does not exist": el editor ejecuta cada sentencia por una conexión
-- distinta del pooler, y una tabla temporal sólo existe en la conexión
-- que la creó. El cierre SÍ se aplicó (verificado desde fuera: diez
-- tablas pasaron a 0 filas); lo que se perdió fue el reporte.
--
-- Ahora el reporte es un SELECT normal sobre pg_policies, después del
-- cambio. No depende de estado entre sentencias.

DO $$
DECLARE
  r record;
  n integer;
  objetivo text[] := ARRAY[
    'historial', 'alertas', 'permisos_rol', 'referidos', 'citas_inmueble',
    'intereses_inmueble', 'logros_usuario', 'sugerencias_enviadas',
    'inmuebles_interesados', 'interesados_historial', 'niveles_referidor'
  ];
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = ANY(objetivo)
       AND permissive = 'PERMISSIVE'
       -- Sólo las que son EXCLUSIVAMENTE de anon: si la policy también
       -- cubre a authenticated, quitarla dejaría sin acceso a la app.
       AND roles::text = '{anon}'
       -- Sólo lo que se lee o se modifica. Los INSERT van aparte.
       AND cmd IN ('SELECT', 'UPDATE', 'DELETE')
       -- Las de lectura pública legítima tienen nombre propio.
       AND policyname LIKE 'anon\_%'
     ORDER BY tablename, cmd
  LOOP
    -- ¿Tiene la app otra puerta para hacer lo mismo con sesión?
    SELECT count(*) INTO n
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = r.tablename
       AND permissive = 'PERMISSIVE'
       AND (cmd = r.cmd OR cmd = 'ALL')
       AND (roles::text LIKE '%authenticated%' OR roles::text LIKE '%public%');

    IF n > 0 THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
      RAISE NOTICE 'CERRADA  %.% (%): cubierta por % policy(s) para usuarios con sesión',
        r.tablename, r.policyname, r.cmd, n;
    ELSE
      RAISE NOTICE 'se deja  %.% (%): NO hay policy para usuarios con sesión',
        r.tablename, r.policyname, r.cmd;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- RESULTADO
-- ============================================================
--
-- Lo que queda de `anon` en esas tablas. Deberían quedar sólo los
-- INSERT (no se tocan) y la lectura pública legítima. Un anon_select o
-- anon_update aquí significa que esa tabla no tenía cobertura para
-- usuarios con sesión y se dejó a propósito.

SELECT tablename, policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
   AND 'anon' = ANY(roles)
   AND tablename = ANY(ARRAY['historial','alertas','permisos_rol','referidos','citas_inmueble',
                             'intereses_inmueble','logros_usuario','sugerencias_enviadas',
                             'inmuebles_interesados','interesados_historial','niveles_referidor'])
 ORDER BY tablename, cmd;

-- ============================================================
-- ESTADO DE QUIÉN GOBIERNA LA PLATAFORMA
-- ============================================================
--
-- De paso, para confirmar que el UPDATE de la migración 69 surtió
-- efecto (un UPDATE sin RETURNING no dice cuántas filas tocó).

SELECT u.nombre, u.email, pa.rol_plataforma, pa.activo
  FROM plataforma_admin pa
  JOIN usuarios u ON u.id = pa.usuario_id
 ORDER BY pa.activo DESC, u.nombre;

-- ============================================================
-- LO QUE SIGUE PENDIENTE DESPUÉS DE ESTO
-- ============================================================
--   1. `usuarios`: sustituir la consulta del login por una función
--      acotada y cerrar `anon_read_usuarios`. Hoy expone nombre, correo
--      y rol de 47 personas (el hash ya está cerrado).
--   2. Los INSERT de `anon`: revisar uno por uno qué formulario público
--      los necesita de verdad.
--   3. `current_tenant()`: quitar el respaldo a House, que es lo que
--      hace que un visitante sin sesión sea tratado como House.
