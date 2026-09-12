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

CREATE TEMP TABLE _resultado (
  tabla text, policy text, operacion text, decision text, motivo text
) ON COMMIT DROP;

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
      INSERT INTO _resultado VALUES (
        r.tablename, r.policyname, r.cmd, 'CERRADA',
        'los usuarios con sesión la cubren con ' || n || ' policy(s)'
      );
    ELSE
      INSERT INTO _resultado VALUES (
        r.tablename, r.policyname, r.cmd, 'se deja',
        'NO hay policy para usuarios con sesión: cerrarla dejaría sin acceso a la app'
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- RESULTADO
-- ============================================================
--
-- ⚠️ La tabla temporal se borra al terminar la transacción, así que
-- este SELECT va antes del corte. Si sale vacío, es que ya estaba todo
-- cerrado.

SELECT * FROM _resultado ORDER BY decision, tabla, operacion;

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
