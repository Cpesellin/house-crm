-- ============================================================
-- HOUSE CRM — Fase F3 · Quitar el fallback a House de current_tenant()
-- ============================================================
-- 🚫 NO EJECUTAR HASTA COMPLETAR F1 (claim en el JWT) Y F2 (todos los operadores
--    con sesión Supabase Auth real: Google habilitado, 0 usuarios sin migrar).
--    Si se corre antes, cualquier request sin auth.uid() → current_tenant() NULL →
--    TODAS las policies RLS fallan → lockout total de la app.
--
-- QUÉ HACE
--   Reduce current_tenant() a: el claim del JWT (F1) → si no, el lookup por auth.uid().
--   ELIMINA el fallback a House (y el "primer tenant activo"). Así un request sin
--   sesión real ya NO se trata como House → cierra el hueco de aislamiento #1.
--
-- PRERREQUISITOS VERIFICABLES ANTES DE CORRER (en vivo):
--   · select count(*) from usuarios where activo and coalesce(auth_migrated,false)=false;  -- debe ser 0
--   · Ninguna ruta pública/anon debe depender de escribir/leer datos de tenant vía current_tenant().
--   · F1 aplicado + hook activo (los tokens ya llevan app_metadata.tenant_id).
--
-- STATUS: pendiente (bloqueada por F1+F2). Reversible (rollback abajo).
-- ============================================================

begin;

create or replace function current_tenant() returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- 1) Claim autoritativo del token (F1)
  begin
    v_id := nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid;
  exception when others then
    v_id := null;
  end;
  if v_id is not null then return v_id; end if;

  -- 2) Lookup por usuario autenticado
  select inmobiliaria_id into v_id from usuarios where id = auth.uid() limit 1;
  -- 3) Sin fallback: si no hay sesión/tenant, devuelve NULL (RLS niega) — YA NO cae a House.
  return v_id;
end $$;

grant execute on function current_tenant() to anon, authenticated;

commit;

-- ============================================================
-- ROLLBACK (restaurar el fallback a House si algo se rompe)
-- ============================================================
-- begin;
-- create or replace function current_tenant() returns uuid
-- language plpgsql stable security definer set search_path = public as $$
-- declare v_id uuid;
-- begin
--   begin v_id := nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id','')::uuid; exception when others then v_id := null; end;
--   if v_id is not null then return v_id; end if;
--   select inmobiliaria_id into v_id from usuarios where id = auth.uid() limit 1;
--   if v_id is not null then return v_id; end if;
--   select id into v_id from inmobiliaria where slug='house' limit 1;
--   if v_id is not null then return v_id; end if;
--   select id into v_id from inmobiliaria where activo=true order by created_at limit 1;
--   return v_id;
-- end $$;
-- commit;
