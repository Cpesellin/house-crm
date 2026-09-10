-- ============================================================
-- HOUSE CRM — Migración #65
-- Las alertas de búsqueda las ve SÓLO el equipo, y las gestiona
-- ============================================================
--
-- DÓNDE SE CORRE
--   SQL Editor de Supabase → New query → pegar todo → Run.
--
-- POR QUÉ, SI LA 64 YA PUSO UNA POLICY DE LECTURA
--   La 64 dejó la lectura abierta a `authenticated`, dando por hecho que
--   eso significa "el equipo". No es así: cuando un cliente del público
--   crea su cuenta desde la marketplace, TAMBIÉN queda authenticated. Con
--   esa policy, cualquiera que se registrara podía leer el nombre y el
--   teléfono de todos los interesados usando la llave que va en el
--   navegador.
--
--   Lo pillamos antes de construir la pantalla interna, así que nadie
--   alcanzó a leer nada: hasta hoy la tabla no la consultaba ninguna
--   pantalla. Pero la ventana estaba abierta.
--
-- QUÉ HACE
--   1. Un helper que responde si quien pregunta es del equipo.
--   2. Cambia la lectura: sólo usuarios internos.
--   3. Permite al equipo gestionarlas (marcar contactado, anotar).
--
-- ES REPETIBLE.
-- ============================================================

-- ── 1. ¿Es del equipo? ───────────────────────────────────────
--
-- Mismo patrón que current_user_rol / is_admin_or_oficina (sql/40):
-- SECURITY DEFINER para poder mirar `usuarios` sin que el que pregunta
-- tenga acceso a esa tabla.
--
-- Se apoya en tipo_usuario ('interno' | 'publico', sql/25). Los
-- registros antiguos sin ese campo se tratan como internos, que es lo
-- que eran: el público llegó después.
CREATE OR REPLACE FUNCTION public.es_usuario_interno()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT COALESCE(tipo_usuario, 'interno') = 'interno'
       FROM public.usuarios WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION public.es_usuario_interno IS
  'Helper RLS: true si quien consulta es del equipo de la inmobiliaria, no un cliente del público.';

-- ── 2. Lectura: sólo el equipo ───────────────────────────────
DROP POLICY IF EXISTS alerta_busqueda_lectura ON alerta_busqueda;
CREATE POLICY alerta_busqueda_lectura ON alerta_busqueda
  FOR SELECT TO authenticated
  USING (public.es_usuario_interno());

-- ── 3. Gestión: marcar contactado, anotar ────────────────────
DROP POLICY IF EXISTS alerta_busqueda_gestion ON alerta_busqueda;
CREATE POLICY alerta_busqueda_gestion ON alerta_busqueda
  FOR UPDATE TO authenticated
  USING (public.es_usuario_interno())
  WITH CHECK (public.es_usuario_interno());

-- Sin policy de DELETE a propósito: un interesado no se borra, se
-- cierra. Si se borrara, se perdería el rastro de a quién se le dijo
-- que lo llamaríamos.

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
--
-- ⚠️ El SQL Editor NO sirve para comprobar RLS: corre por encima de las
-- policies. Aquí sólo se comprueba que los objetos existen; la prueba
-- de verdad la hago yo desde fuera, con la llave pública.

SELECT proname AS funcion FROM pg_proc WHERE proname = 'es_usuario_interno';

SELECT polname AS policy, cmd, roles::text
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
 WHERE c.relname = 'alerta_busqueda'
 ORDER BY polname;

-- Se esperan dos policies: alerta_busqueda_gestion (UPDATE) y
-- alerta_busqueda_lectura (SELECT), las dos para {authenticated}.
