-- ============================================================
-- HOUSE CRM — Migración #68 · Fase 0.2
-- Cerrar a `anon` lo que ya no necesita leer, editar ni borrar
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → proyecto HOUSE CRM (ref keasjfgcjkskvdcudoml).
--   El bloque se detiene solo si es el proyecto equivocado.
--
-- POR QUÉ
--   Medido contra producción con la llave pública (la que va dentro del
--   navegador de cualquier visitante, sin iniciar sesión):
--
--     interesados     31 leads, 29 con teléfono, 22 marcados privados
--     anotaciones     30, de las cuales 26 son "privada — solo admin y yo"
--     notificaciones  1.723 mensajes internos del equipo
--     mensajes        chat interno
--
--   Además, `anon` podía ESCRIBIR: cambiar cualquier inmueble
--   (`inmuebles.anon_update USING(true)`), y borrar leads, fotos y notas.
--
-- POR QUÉ SE PUEDE CERRAR AHORA
--   Esas policies se crearon en la migración 57, cuando los asesores
--   entraban con el login antiguo y operaban como `anon`. Hoy el login
--   termina en Supabase Auth: quien entra queda como `authenticated`, y
--   para ese rol YA existe cobertura, verificada policy por policy:
--
--     anotaciones, agenda, favoritos, solicitudes → authenticated_access
--     inmuebles                                   → authenticated_write_inmuebles
--     notificaciones                              → policies por destinatario
--     interesados, mensajes, visitas_agendadas    → policies `public` que
--        filtran de verdad (por rol y por auth.uid(), no `true`)
--
-- ALCANCE DELIBERADO
--   Sólo se quitan SELECT, UPDATE y DELETE de `anon`, y sólo en las
--   tablas cuya cobertura para `authenticated` está comprobada.
--
--   NO se tocan los INSERT: hay formularios públicos que escriben sin
--   sesión (interés en un inmueble, solicitud de registro). Cerrarlos
--   sin revisar uno por uno rompería la captación.
--
--   NO se toca `usuarios`: el login lo consulta ANTES de autenticar, y
--   cerrarlo dejaría a todo el mundo fuera. Necesita antes una función
--   de búsqueda acotada. Es el paso siguiente.
--
--   NO se tocan historial, alertas, permisos_rol, referidos ni las demás
--   sin cobertura verificada. Van en otro bloque, después de mirarlas.
--
-- CÓMO SE REVIERTE, si algo se rompe
--   Al final del archivo, sin comentar el bloque: son CREATE POLICY con
--   el mismo nombre y condición que tenían.
-- ============================================================

DO $$ BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'PROYECTO EQUIVOCADO. Esto es de HOUSE CRM (ref keasjfgcjkskvdcudoml).';
  END IF;
END $$;

BEGIN;

-- ── Lecturas ────────────────────────────────────────────────
DROP POLICY IF EXISTS anon_select ON interesados;
DROP POLICY IF EXISTS anon_select ON anotaciones;
DROP POLICY IF EXISTS anon_select ON notificaciones;
DROP POLICY IF EXISTS anon_select ON mensajes;
DROP POLICY IF EXISTS anon_select ON agenda;
DROP POLICY IF EXISTS anon_select ON favoritos;
DROP POLICY IF EXISTS anon_select ON solicitudes;
DROP POLICY IF EXISTS anon_select ON visitas_agendadas;

-- Redundante: al lado está `fotos_lectura_publica`, que ya deja ver las
-- fotos del catálogo. Ésta sobra y confunde.
DROP POLICY IF EXISTS anon_read_fotos ON fotos;

-- ── Escrituras ──────────────────────────────────────────────
-- `inmuebles.anon_update` es la más grave de todas: permitía a
-- cualquiera cambiar el precio, el estado o la dirección de cualquier
-- inmueble publicado.
DROP POLICY IF EXISTS anon_update ON inmuebles;
DROP POLICY IF EXISTS anon_update ON interesados;
DROP POLICY IF EXISTS anon_update ON notificaciones;
DROP POLICY IF EXISTS anon_update ON mensajes;
DROP POLICY IF EXISTS anon_update ON agenda;
DROP POLICY IF EXISTS anon_update ON favoritos;
DROP POLICY IF EXISTS anon_update ON solicitudes;
DROP POLICY IF EXISTS anon_update ON visitas_agendadas;

-- ── Borrados ────────────────────────────────────────────────
DROP POLICY IF EXISTS anon_delete ON interesados;
DROP POLICY IF EXISTS anon_delete ON anotaciones;
DROP POLICY IF EXISTS anon_delete ON favoritos;
DROP POLICY IF EXISTS anon_delete ON fotos;

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
--
-- ⚠️ Esto sólo dice qué policies quedan. La prueba que vale es
-- consultar la API con la llave pública desde fuera del editor, que es
-- lo que hace cualquiera con el navegador.

SELECT tablename, policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
   AND 'anon' = ANY(roles)
   AND cmd IN ('SELECT','UPDATE','DELETE')
 ORDER BY tablename, cmd;

-- Se espera que NO aparezcan interesados, anotaciones, notificaciones,
-- mensajes, agenda, favoritos, solicitudes ni visitas_agendadas.
--
-- Sí deben seguir apareciendo (son correctas o van en otro bloque):
--   inmuebles · Lectura pública inmuebles  (filtra: publicado y aprobado)
--   fotos     · Lectura pública fotos      (filtra: del inmueble publicado)
--   usuarios  · anon_read_usuarios         (lo necesita el login, paso siguiente)
--   historial, alertas, permisos_rol, referidos, y otras sin verificar

-- ============================================================
-- REVERSIÓN (correr sólo si algo se rompió)
-- ============================================================
--
-- CREATE POLICY anon_select ON interesados       FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_select ON anotaciones       FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_select ON notificaciones    FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_select ON mensajes          FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_select ON agenda            FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_select ON favoritos         FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_select ON solicitudes       FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_select ON visitas_agendadas FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_read_fotos ON fotos         FOR SELECT TO anon USING (true);
-- CREATE POLICY anon_update ON inmuebles         FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_update ON interesados       FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_update ON notificaciones    FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_update ON mensajes          FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_update ON agenda            FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_update ON favoritos         FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_update ON solicitudes       FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_update ON visitas_agendadas FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_delete ON interesados       FOR DELETE TO anon USING (true);
-- CREATE POLICY anon_delete ON anotaciones       FOR DELETE TO anon USING (true);
-- CREATE POLICY anon_delete ON favoritos         FOR DELETE TO anon USING (true);
-- CREATE POLICY anon_delete ON fotos             FOR DELETE TO anon USING (true);
