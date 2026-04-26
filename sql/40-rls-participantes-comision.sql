-- ============================================================
-- HOUSE CRM — Migración #40: RLS estricto en participantes_comision
-- ============================================================
-- FASE B.2 del audit de seguridad: cierra el acceso abierto
-- (USING true) en una tabla con datos bancarios sensibles.
--
-- Pre-requisito: usuarios migrados a Supabase Auth (auth.uid() válido).
-- Ya migrados al ejecutar esto: 3/41 (Cristhian, Albeiro, Johan).
-- El resto se migra automáticamente al hacer login (dual auth flow).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Helpers SECURITY DEFINER para evitar recursión en RLS
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_rol()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_oficina()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1) IN ('admin','oficina'),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_oficina_or_gestor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1) IN ('admin','oficina','gestor'),
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin_or_oficina IS
  'Helper RLS: true si el usuario autenticado tiene rol admin u oficina.';

-- ────────────────────────────────────────────────────────────
-- 2. Limpiar policies preexistentes
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "open_part_comision" ON public.participantes_comision;
DROP POLICY IF EXISTS "Admin gestiona participantes" ON public.participantes_comision;
DROP POLICY IF EXISTS "Participante ve su comisión" ON public.participantes_comision;
DROP POLICY IF EXISTS "Participante ve su comision" ON public.participantes_comision;

-- ────────────────────────────────────────────────────────────
-- 3. Policies estrictas
-- ────────────────────────────────────────────────────────────

-- SELECT: admin/oficina ve todo + el propio participante ve su fila
CREATE POLICY "part_comision_select" ON public.participantes_comision
  FOR SELECT
  USING (
    public.is_admin_or_oficina()
    OR usuario_id = auth.uid()
  );

-- INSERT: solo admin/oficina
CREATE POLICY "part_comision_insert" ON public.participantes_comision
  FOR INSERT
  WITH CHECK (public.is_admin_or_oficina());

-- UPDATE: solo admin/oficina
CREATE POLICY "part_comision_update" ON public.participantes_comision
  FOR UPDATE
  USING (public.is_admin_or_oficina())
  WITH CHECK (public.is_admin_or_oficina());

-- DELETE: solo admin
CREATE POLICY "part_comision_delete" ON public.participantes_comision
  FOR DELETE
  USING (public.current_user_rol() = 'admin');

-- ────────────────────────────────────────────────────────────
-- 4. Verificación
-- ────────────────────────────────────────────────────────────

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'participantes_comision'
ORDER BY policyname;
-- Debe devolver 4 filas: select, insert, update, delete
