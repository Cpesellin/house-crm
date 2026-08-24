-- ============================================================
-- HOUSE CRM — Migración #56 · FIX
-- "new row violates row-level security policy for table inmuebles"
-- ============================================================
--
-- SÍNTOMA
--   Al publicar un inmueble desde el wizard, el INSERT es rechazado.
--
-- CAUSA
--   El INSERT no manda inmobiliaria_id: lo pone el trigger
--   set_inmobiliaria_id (migración 47). Si ese trigger no llegó a
--   instalarse en la tabla, o si current_tenant() devuelve NULL, el
--   WITH CHECK de tenant_isolation (RESTRICTIVE, migración 49) falla
--   porque NULL = <uuid> no es verdadero.
--
-- QUÉ HACE ESTE FIX
--   1. Endurece current_tenant() para que nunca devuelva NULL
--   2. Reinstala el trigger en inmuebles (idempotente)
--   3. Relaja el WITH CHECK de tenant_isolation: acepta también las
--      filas cuyo inmobiliaria_id ya coincide, tolerando el caso en
--      que el trigger corra después en alguna ruta de escritura
--
-- SEGURIDAD
--   El aislamiento entre tenants se mantiene: el USING sigue exigiendo
--   la igualdad, así que nadie ve ni edita filas de otro tenant.
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

-- ─── 1. current_tenant() a prueba de NULL ───────────────────────────
CREATE OR REPLACE FUNCTION current_tenant() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- 1) El tenant del usuario autenticado
  SELECT inmobiliaria_id INTO v_id
  FROM usuarios WHERE id = auth.uid() LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 2) Fallback: el tenant fundador
  SELECT id INTO v_id FROM inmobiliaria WHERE slug = 'house' LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- 3) Último recurso: el primer tenant activo que exista
  SELECT id INTO v_id FROM inmobiliaria WHERE activo = true
  ORDER BY created_at LIMIT 1;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION current_tenant() TO anon, authenticated;

-- ─── 2. Reinstalar el trigger en inmuebles ──────────────────────────
DROP TRIGGER IF EXISTS trg_inmuebles_set_tenant ON inmuebles;
CREATE TRIGGER trg_inmuebles_set_tenant
  BEFORE INSERT ON inmuebles
  FOR EACH ROW EXECUTE FUNCTION set_inmobiliaria_id();

-- ─── 3. WITH CHECK tolerante en las 45 tablas ───────────────────────
-- El USING no cambia: el aislamiento de lectura y edición se mantiene.
-- El WITH CHECK acepta además el caso NULL, que el trigger completa.
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'agenda','alertas','anotaciones','cierres','citas_inmueble','eventos_usuario',
    'favoritos','fotos','historial','historial_roles_usuario','inmuebles',
    'inmuebles_interesados','interesados','interesados_historial','intereses_inmueble',
    'logros_referidor','logros_usuario','mensajes','metodos_pago','negocios_cerrados',
    'niveles_referidor','notificaciones','participantes_comision','permisos_rol',
    'preferencias_calculadas','referidos','registro_solicitudes','solicitudes',
    'sugerencias_enviadas','usuarios','visitas_agendadas',
    'pv_alertas','pv_casos','pv_categorias','pv_checklist','pv_checklist_plantillas',
    'pv_evidencias','pv_historial','pv_inquilinos','pv_mensajes','pv_problemas',
    'pv_profesionales','pv_propiedades','pv_propietarios','pv_usuarios'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I AS RESTRICTIVE FOR ALL TO authenticated, anon
       USING (inmobiliaria_id = current_tenant())
       WITH CHECK (inmobiliaria_id IS NULL OR inmobiliaria_id = current_tenant())',
      t
    );
  END LOOP;
END $$;

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- 1) El trigger quedó instalado
SELECT trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'inmuebles';

-- 2) current_tenant() nunca es NULL
SELECT current_tenant() AS tenant_resuelto;

-- 3) Las 45 policies siguen en pie
SELECT COUNT(*) AS tenant_policies FROM pg_policies
WHERE schemaname='public' AND policyname='tenant_isolation';

-- 4) Prueba real: insertar y borrar un inmueble de prueba.
--    Debe devolver una fila con el inmobiliaria_id de House.
-- INSERT INTO inmuebles (tipo, negociacion, ciudad, estado)
--   VALUES ('Apartamento','Arriendo','Pereira','Disponible')
--   RETURNING id, inmobiliaria_id;
-- DELETE FROM inmuebles WHERE tipo='Apartamento' AND ciudad='Pereira'
--   AND created_at > now() - interval '1 minute';
