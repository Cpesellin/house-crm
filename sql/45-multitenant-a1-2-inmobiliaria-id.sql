-- ============================================================
-- HOUSE CRM — Migración #45 · Multitenant Fase A1.2
-- Agregar inmobiliaria_id a 45 tablas base + backfill
-- ============================================================
--
-- OBJETIVO:
--   Preparar el schema para multi-tenant real. Cada tabla del CRM
--   necesita saber a qué inmobiliaria pertenece cada fila.
--
--   Esta migración:
--     1. ALTER TABLE ... ADD COLUMN inmobiliaria_id (nullable + FK)
--     2. Backfill: todas las filas existentes = tenant 'house'
--     3. CREATE INDEX en las tablas más consultadas
--
-- SEGURIDAD:
--   Todo en transacción (rollback si falla).
--   Idempotente (ADD COLUMN IF NOT EXISTS).
--   Nullable + FK RESTRICT → no cambia comportamiento actual.
--
-- REQUISITO PREVIO:
--   Correr primero 44-multitenant-a1-1-registrar-house.sql
--
-- ROLLBACK:
--   Al final del archivo, comentado.
--
-- STATUS: pendiente de ejecutar
-- ============================================================

BEGIN;

-- ─── PARTE 1: ADD COLUMN (31 CRM core + 14 pv_*) ────────────────────
-- Se excluyen 2 vistas: intereses_compradores, usuarios_pub
-- (heredan columnas de sus tablas base)

-- CRM Core (31)
ALTER TABLE agenda                   ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE alertas                  ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE anotaciones              ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE cierres                  ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE citas_inmueble           ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE eventos_usuario          ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE favoritos                ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE fotos                    ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE historial                ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE historial_roles_usuario  ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE inmuebles                ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE inmuebles_interesados    ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE interesados              ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE interesados_historial    ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE intereses_inmueble       ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE logros_referidor         ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE logros_usuario           ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE mensajes                 ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE metodos_pago             ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE negocios_cerrados        ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE niveles_referidor        ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE notificaciones           ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE participantes_comision   ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE permisos_rol             ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE preferencias_calculadas  ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE referidos                ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE registro_solicitudes     ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE solicitudes              ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE sugerencias_enviadas     ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE usuarios                 ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE visitas_agendadas        ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;

-- Posventa (14)
ALTER TABLE pv_alertas               ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_casos                 ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_categorias            ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_checklist             ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_checklist_plantillas  ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_evidencias            ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_historial             ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_inquilinos            ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_mensajes              ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_problemas             ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_profesionales         ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_propiedades           ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_propietarios          ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;
ALTER TABLE pv_usuarios              ADD COLUMN IF NOT EXISTS inmobiliaria_id uuid REFERENCES inmobiliaria(id) ON DELETE RESTRICT;

-- ─── PARTE 2: BACKFILL (todas las filas existentes = House) ─────────
DO $$
DECLARE house_id uuid;
BEGIN
  SELECT id INTO house_id FROM inmobiliaria WHERE slug = 'house';
  IF house_id IS NULL THEN
    RAISE EXCEPTION 'Tenant "house" no encontrado. Corré 44-multitenant-a1-1-registrar-house.sql primero.';
  END IF;

  UPDATE agenda                  SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE alertas                 SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE anotaciones             SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE cierres                 SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE citas_inmueble          SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE eventos_usuario         SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE favoritos               SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE fotos                   SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE historial               SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE historial_roles_usuario SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE inmuebles               SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE inmuebles_interesados   SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE interesados             SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE interesados_historial   SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE intereses_inmueble      SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE logros_referidor        SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE logros_usuario          SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE mensajes                SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE metodos_pago            SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE negocios_cerrados       SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE niveles_referidor       SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE notificaciones          SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE participantes_comision  SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE permisos_rol            SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE preferencias_calculadas SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE referidos               SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE registro_solicitudes    SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE solicitudes             SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE sugerencias_enviadas    SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE usuarios                SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE visitas_agendadas       SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;

  UPDATE pv_alertas              SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_casos                SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_categorias           SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_checklist            SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_checklist_plantillas SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_evidencias           SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_historial            SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_inquilinos           SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_mensajes             SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_problemas            SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_profesionales        SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_propiedades          SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_propietarios         SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
  UPDATE pv_usuarios             SET inmobiliaria_id = house_id WHERE inmobiliaria_id IS NULL;
END $$;

-- ─── PARTE 3: ÍNDICES (performance en queries por tenant) ───────────
CREATE INDEX IF NOT EXISTS idx_inmuebles_inmobiliaria      ON inmuebles(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_inmobiliaria       ON usuarios(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_cierres_inmobiliaria        ON cierres(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_referidos_inmobiliaria      ON referidos(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_inmobiliaria ON notificaciones(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_interesados_inmobiliaria    ON interesados(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_fotos_inmobiliaria          ON fotos(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_inmobiliaria       ON mensajes(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_pv_casos_inmobiliaria       ON pv_casos(inmobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_favoritos_inmobiliaria      ON favoritos(inmobiliaria_id);

COMMIT;

-- ============================================================
-- ROLLBACK (descomentar SOLO si necesitás deshacer todo)
-- ============================================================
-- BEGIN;
-- ALTER TABLE agenda                   DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE alertas                  DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE anotaciones              DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE cierres                  DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE citas_inmueble           DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE eventos_usuario          DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE favoritos                DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE fotos                    DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE historial                DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE historial_roles_usuario  DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE inmuebles                DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE inmuebles_interesados    DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE interesados              DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE interesados_historial    DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE intereses_inmueble       DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE logros_referidor         DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE logros_usuario           DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE mensajes                 DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE metodos_pago             DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE negocios_cerrados        DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE niveles_referidor        DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE notificaciones           DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE participantes_comision   DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE permisos_rol             DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE preferencias_calculadas  DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE referidos                DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE registro_solicitudes     DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE solicitudes              DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE sugerencias_enviadas     DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE usuarios                 DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE visitas_agendadas        DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_alertas               DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_casos                 DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_categorias            DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_checklist             DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_checklist_plantillas  DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_evidencias            DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_historial             DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_inquilinos            DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_mensajes              DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_problemas             DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_profesionales         DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_propiedades           DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_propietarios          DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- ALTER TABLE pv_usuarios              DROP COLUMN IF EXISTS inmobiliaria_id CASCADE;
-- COMMIT;
