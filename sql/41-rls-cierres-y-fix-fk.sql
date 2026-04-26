-- ============================================================
-- HOUSE CRM — Migración #41: RLS estricto en cierres + fix FK
-- ============================================================
-- Bug histórico arreglado en este SQL:
--   participantes_comision.negocio_id apuntaba a una tabla
--   abandonada `negocios_cerrados` en vez de `cierres`. Esto causaba
--   error 400 PGRST200 al embebir participantes desde queries en
--   /mis-negocios. Ambas tablas están vacías → fix sin pérdida de datos.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Fix de FK rota
-- ────────────────────────────────────────────────────────────

ALTER TABLE participantes_comision
  DROP CONSTRAINT IF EXISTS participantes_comision_negocio_id_fkey;

ALTER TABLE participantes_comision
  ADD CONSTRAINT participantes_comision_negocio_id_fkey
  FOREIGN KEY (negocio_id) REFERENCES cierres(id) ON DELETE CASCADE;

-- Refrescar el schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────
-- 2. RLS estricto en cierres
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "open_cierres" ON public.cierres;

-- SELECT: admin/oficina + captador del cierre + participantes vinculados
CREATE POLICY "cierres_select" ON public.cierres FOR SELECT
  USING (
    public.is_admin_or_oficina()
    OR captador_id = auth.uid()
    OR cerrado_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.participantes_comision pc
      WHERE pc.negocio_id = cierres.id AND pc.usuario_id = auth.uid()
    )
  );

-- INSERT: admin/oficina o captador del inmueble
CREATE POLICY "cierres_insert" ON public.cierres FOR INSERT
  WITH CHECK (
    public.is_admin_or_oficina()
    OR captador_id = auth.uid()
  );

-- UPDATE: admin/oficina o captador
CREATE POLICY "cierres_update" ON public.cierres FOR UPDATE
  USING (
    public.is_admin_or_oficina()
    OR captador_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin_or_oficina()
    OR captador_id = auth.uid()
  );

-- DELETE: solo admin
CREATE POLICY "cierres_delete" ON public.cierres FOR DELETE
  USING (public.current_user_rol() = 'admin');

-- ────────────────────────────────────────────────────────────
-- 3. Verificación
-- ────────────────────────────────────────────────────────────

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'cierres'
ORDER BY policyname;
-- Debe devolver 4 filas

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'participantes_comision'::regclass
  AND conname = 'participantes_comision_negocio_id_fkey';
-- Debe mostrar FK apuntando a cierres(id)
