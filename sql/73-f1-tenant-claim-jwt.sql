-- ============================================================
-- HOUSE CRM — Fase F1 · Claim de tenant en el JWT (fundación de identidad)
-- ============================================================
-- OBJETIVO
--   Que cada sesión Supabase Auth lleve su tenant (inmobiliaria_id) como claim
--   dentro del JWT, y que current_tenant() lo lea PRIMERO desde el token. Es
--   ADITIVO: mantiene el lookup por `usuarios` y el fallback a House, así el
--   estado actual sigue operando IGUAL (no rompe nada).
--
-- POR QUÉ
--   Hoy current_tenant() (sql/56) resuelve el tenant desde usuarios.inmobiliaria_id
--   por auth.uid(), con FALLBACK a House si no hay sesión. Esto es el hueco #1: un
--   usuario sin sesión real (Google con token falso, o no migrado) cae a House.
--   Con el claim, cualquier usuario con sesión real resuelve su tenant por el token,
--   sin depender del lookup ni del fallback. F1 SOLO agrega el claim; quitar el
--   fallback es la Fase F3 (después de migrar a todos, F2).
--
-- MECANISMO
--   Custom Access Token Hook: función que Supabase Auth ejecuta al emitir CADA token,
--   inyectando app_metadata.tenant_id. No requiere tocar la Edge Function migrate-user
--   ni backfill: el token se enriquece al emitirse (migrados y futuros por igual).
--
-- ⚠️ RIESGO CONTROLADO
--   El hook está en la ruta de emisión de tokens: si fallara, afectaría el login. Por
--   eso: (a) es defensivo (si no hay tenant, devuelve el token sin cambios), (b) se
--   prueba con 1 usuario antes de confiar, (c) ROLLBACK instantáneo = desactivar el
--   hook en el Dashboard (Authentication › Hooks). El bloque SQL es idempotente.
--
-- STATUS: pendiente de ejecutar (DEV primero). Además, activar el hook en el Dashboard.
-- ============================================================

begin;

-- ─── 1. Custom Access Token Hook: inyecta app_metadata.tenant_id ─────
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_claims jsonb;
  v_app    jsonb;
begin
  select inmobiliaria_id into v_tenant
  from public.usuarios
  where id = (event->>'user_id')::uuid
  limit 1;

  v_claims := coalesce(event->'claims', '{}'::jsonb);
  v_app    := coalesce(v_claims->'app_metadata', '{}'::jsonb);

  if v_tenant is not null then
    v_app    := v_app || jsonb_build_object('tenant_id', v_tenant::text);
    v_claims := jsonb_set(v_claims, '{app_metadata}', v_app, true);
  end if;

  -- Si no hay tenant, devuelve el evento intacto (nunca rompe el login).
  return jsonb_set(event, '{claims}', v_claims, true);
end $$;

-- Permisos que exige el hook de Supabase Auth (patrón oficial)
grant usage  on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on table public.usuarios to supabase_auth_admin;  -- el hook lee el tenant

-- ─── 2. current_tenant(): PRIMERO el claim del JWT, luego lookup, ────
--        y como ÚLTIMO recurso el fallback a House (se remueve en F3).
create or replace function current_tenant() returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- 1) Claim autoritativo del token (usuarios con sesión Supabase Auth real)
  begin
    v_id := nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid;
  exception when others then
    v_id := null;
  end;
  if v_id is not null then return v_id; end if;

  -- 2) Lookup por usuario autenticado (sesión aún sin claim / token viejo)
  select inmobiliaria_id into v_id
  from usuarios where id = auth.uid() limit 1;
  if v_id is not null then return v_id; end if;

  -- 3) Fallback a House — TEMPORAL. Se elimina en la Fase F3 cuando no queden
  --    usuarios sin sesión real. NO quitar antes: rompería el acceso actual.
  select id into v_id from inmobiliaria where slug = 'house' limit 1;
  if v_id is not null then return v_id; end if;
  select id into v_id from inmobiliaria where activo = true order by created_at limit 1;
  return v_id;
end $$;

grant execute on function current_tenant() to anon, authenticated;

commit;

-- ============================================================
-- VERIFICACIÓN (tras aplicar el SQL y activar el hook en el Dashboard)
-- ============================================================
-- 1) El hook existe:
--    select proname from pg_proc where proname = 'custom_access_token_hook';
-- 2) current_tenant() sigue resolviendo (no rompe) para el estado actual:
--    select current_tenant();
-- 3) Un usuario MIGRADO, tras cerrar sesión y volver a entrar, trae el claim:
--    (en el cliente) const { data } = await supabase.auth.getSession()
--      JSON.parse(atob(data.session.access_token.split('.')[1])).app_metadata.tenant_id
--    → debe ser su inmobiliaria_id.
--
-- ACTIVAR EL HOOK: Dashboard › Authentication › Hooks › "Custom Access Token" →
--   seleccionar public.custom_access_token_hook → Enable.
-- ROLLBACK: desactivar el hook ahí mismo (instantáneo). El SQL no borra nada.
-- ============================================================
