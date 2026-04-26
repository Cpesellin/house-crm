-- ============================================================
-- HOUSE CRM — Migración #43: RLS estricto en 7 tablas dependientes
-- ============================================================
-- Cierra el último grupo de tablas con RLS abierto.
-- Patrón: cada tabla restringe a admin/oficina, dueño del registro,
-- y cuando aplica, usuarios relacionados via FKs.
-- ============================================================

-- ── interesados_historial (timeline del lead) ─────────────────
DROP POLICY IF EXISTS "open_hist_int" ON public.interesados_historial;

CREATE POLICY "hist_int_select" ON public.interesados_historial FOR SELECT
  USING (
    public.is_admin_or_oficina()
    OR EXISTS (
      SELECT 1 FROM public.interesados i
      WHERE i.id = interesados_historial.interesado_id
    )
  );

CREATE POLICY "hist_int_insert" ON public.interesados_historial FOR INSERT
  WITH CHECK (
    public.is_admin_oficina_or_gestor()
    OR asesor_id = auth.uid()
  );

-- ── inmuebles_interesados (pivote N:M) ────────────────────────
DROP POLICY IF EXISTS "open_inmint" ON public.inmuebles_interesados;

CREATE POLICY "inmint_select" ON public.inmuebles_interesados FOR SELECT
  USING (
    public.is_admin_or_oficina()
    OR asesor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.interesados i
      WHERE i.id = inmuebles_interesados.interesado_id
    )
  );

CREATE POLICY "inmint_insert" ON public.inmuebles_interesados FOR INSERT
  WITH CHECK (
    public.is_admin_oficina_or_gestor()
    OR asesor_id = auth.uid()
  );

CREATE POLICY "inmint_delete" ON public.inmuebles_interesados FOR DELETE
  USING (
    public.is_admin_or_oficina()
    OR asesor_id = auth.uid()
  );

-- ── visitas_agendadas ────────────────────────────────────────
DROP POLICY IF EXISTS "open_visitas" ON public.visitas_agendadas;

CREATE POLICY "visitas_select" ON public.visitas_agendadas FOR SELECT
  USING (
    public.is_admin_or_oficina()
    OR asesor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.interesados i
      WHERE i.id = visitas_agendadas.interesado_id
    )
  );

CREATE POLICY "visitas_insert" ON public.visitas_agendadas FOR INSERT
  WITH CHECK (
    public.is_admin_oficina_or_gestor()
    OR asesor_id = auth.uid()
  );

CREATE POLICY "visitas_update" ON public.visitas_agendadas FOR UPDATE
  USING (public.is_admin_or_oficina() OR asesor_id = auth.uid())
  WITH CHECK (public.is_admin_or_oficina() OR asesor_id = auth.uid());

CREATE POLICY "visitas_delete" ON public.visitas_agendadas FOR DELETE
  USING (public.current_user_rol() = 'admin');

-- ── eventos_usuario (tracking comportamiento) ─────────────────
DROP POLICY IF EXISTS "open_eventos" ON public.eventos_usuario;

CREATE POLICY "eventos_select" ON public.eventos_usuario FOR SELECT
  USING (public.is_admin_or_oficina() OR usuario_id = auth.uid());

CREATE POLICY "eventos_insert" ON public.eventos_usuario FOR INSERT
  WITH CHECK (usuario_id = auth.uid() OR public.is_admin_or_oficina());

-- ── preferencias_calculadas (perfil inferido) ─────────────────
DROP POLICY IF EXISTS "open_prefs" ON public.preferencias_calculadas;

CREATE POLICY "prefs_select" ON public.preferencias_calculadas FOR SELECT
  USING (public.is_admin_or_oficina() OR usuario_id = auth.uid());

CREATE POLICY "prefs_write" ON public.preferencias_calculadas FOR ALL
  USING (public.is_admin_or_oficina() OR usuario_id = auth.uid())
  WITH CHECK (public.is_admin_or_oficina() OR usuario_id = auth.uid());

-- ── sugerencias_enviadas ──────────────────────────────────────
DROP POLICY IF EXISTS "open_sug" ON public.sugerencias_enviadas;

CREATE POLICY "sug_select" ON public.sugerencias_enviadas FOR SELECT
  USING (public.is_admin_or_oficina() OR usuario_id = auth.uid());

CREATE POLICY "sug_update" ON public.sugerencias_enviadas FOR UPDATE
  USING (public.is_admin_or_oficina() OR usuario_id = auth.uid())
  WITH CHECK (public.is_admin_or_oficina() OR usuario_id = auth.uid());

-- ── historial_roles_usuario (audit) ───────────────────────────
DROP POLICY IF EXISTS "open_hist_roles" ON public.historial_roles_usuario;

CREATE POLICY "hist_roles_select" ON public.historial_roles_usuario FOR SELECT
  USING (public.is_admin_or_oficina());

CREATE POLICY "hist_roles_insert" ON public.historial_roles_usuario FOR INSERT
  WITH CHECK (public.is_admin_or_oficina());

-- ────────────────────────────────────────────────────────────
-- Verificación
-- ────────────────────────────────────────────────────────────

SELECT tablename, COUNT(*) AS num_policies
FROM pg_policies
WHERE tablename IN (
  'interesados_historial', 'inmuebles_interesados', 'visitas_agendadas',
  'eventos_usuario', 'preferencias_calculadas', 'sugerencias_enviadas',
  'historial_roles_usuario'
)
GROUP BY tablename
ORDER BY tablename;
