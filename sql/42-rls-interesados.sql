-- ============================================================
-- HOUSE CRM — Migración #42: RLS estricto en interesados
-- ============================================================
-- Tabla con datos personales de prospectos (nombre, email, teléfono).
-- Respeta el flag privado=true creado por admin (proteger contacto).
-- ============================================================

DROP POLICY IF EXISTS "open_interesados" ON public.interesados;

-- SELECT: respeta privacidad
--   - Admin SIEMPRE ve todo (incluyendo privados)
--   - Oficina/gestor ven los NO privados
--   - Internos: ven leads donde son creador/asignado o (si privado=true) creador
--   - Público (usuario_id): ve su propio interés
CREATE POLICY "interesados_select" ON public.interesados FOR SELECT
  USING (
    public.current_user_rol() = 'admin'
    OR (
      NOT COALESCE(privado, false)
      AND public.current_user_rol() IN ('oficina','gestor')
    )
    OR (
      (NOT COALESCE(privado, false) OR asesor_creador_id = auth.uid())
      AND (
        asesor_creador_id = auth.uid()
        OR asesor_asignado_id = auth.uid()
        OR usuario_id = auth.uid()
      )
    )
  );

-- INSERT: cualquier usuario interno autenticado o el propio prospecto público
CREATE POLICY "interesados_insert" ON public.interesados FOR INSERT
  WITH CHECK (
    public.is_admin_oficina_or_gestor()
    OR asesor_creador_id = auth.uid()
    OR usuario_id = auth.uid()
  );

-- UPDATE: admin/oficina, creador o asignado
CREATE POLICY "interesados_update" ON public.interesados FOR UPDATE
  USING (
    public.is_admin_or_oficina()
    OR asesor_creador_id = auth.uid()
    OR asesor_asignado_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin_or_oficina()
    OR asesor_creador_id = auth.uid()
    OR asesor_asignado_id = auth.uid()
  );

-- DELETE: solo admin (la app usa soft delete vía estado='descartado')
CREATE POLICY "interesados_delete" ON public.interesados FOR DELETE
  USING (public.current_user_rol() = 'admin');

-- Verificación
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'interesados'
ORDER BY policyname;
