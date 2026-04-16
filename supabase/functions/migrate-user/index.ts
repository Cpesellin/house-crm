// ============================================================
// HOUSE CRM — Edge Function: migrate-user
//
// Migra un usuario del sistema legacy (SHA-256 + salt hardcodeado)
// al sistema Supabase Auth nativo, preservando su UUID.
//
// FLUJO:
//   1. Frontend llama con { email, password }
//   2. Valida SHA-256 contra usuarios.password_hash
//   3. Si coincide: crea auth.users con el MISMO id = usuarios.id
//   4. Marca auth_migrated = true
//   5. Retorna { ok: true } → frontend hace signInWithPassword
//
// SEGURIDAD:
//   - Solo funciona para usuarios con auth_migrated = false
//   - No expone password_hash en respuestas
//   - Rate limiting a nivel Supabase (default 60/min por IP)
// ============================================================

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const PWD_SALT = 'HOUSE_CRM_SALT_2026'; // legacy — mismo que src/core/auth.js

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Hash SHA-256 compatible con el legacy de auth.js
async function hashLegacy(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + PWD_SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SB = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const usuarioOrEmail = String(body?.usuario || email).trim().toLowerCase();

    if (!password || !usuarioOrEmail) {
      return json({ ok: false, error: 'missing_credentials' }, 400);
    }

    // 1. Buscar usuario por email O por usuario
    const { data: userRow, error: eFind } = await SB
      .from('usuarios')
      .select('id, email, usuario, password_hash, activo, auth_migrated, nombre')
      .or(`email.eq.${usuarioOrEmail},usuario.eq.${usuarioOrEmail}`)
      .eq('activo', true)
      .maybeSingle();

    if (eFind) return json({ ok: false, error: 'db_error', detail: eFind.message }, 500);
    if (!userRow) return json({ ok: false, error: 'user_not_found' }, 404);

    // Ya estaba migrado — el frontend debe usar signInWithPassword directo
    if (userRow.auth_migrated) {
      return json({ ok: true, already_migrated: true, email: userRow.email }, 200);
    }

    // 2. Validar password contra el hash legacy
    const h = await hashLegacy(password);
    if (h !== userRow.password_hash) {
      return json({ ok: false, error: 'invalid_credentials' }, 401);
    }

    // 3. Crear (o actualizar) en auth.users con el MISMO UUID
    //    - email_confirm: true → no requiere confirmación por email
    //    - id explícito → mantiene el UUID de usuarios
    const emailReal = userRow.email || `${userRow.usuario}@house.local`;
    const { data: created, error: eCreate } = await SB.auth.admin.createUser({
      id: userRow.id,
      email: emailReal,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre: userRow.nombre,
        migrated_from_legacy: true,
      },
    });

    if (eCreate) {
      // Si ya existe en auth.users (raro, quizá se migró parcialmente antes),
      // actualizamos password y marcamos como migrado
      if (/already registered|duplicate|exists/i.test(eCreate.message || '')) {
        await SB.auth.admin.updateUserById(userRow.id, { password: password });
      } else {
        return json({ ok: false, error: 'auth_create_failed', detail: eCreate.message }, 500);
      }
    }

    // 4. Marcar como migrado vía RPC (SECURITY DEFINER)
    const { error: eMark } = await SB.rpc('marcar_usuario_migrado', { p_user_id: userRow.id });
    if (eMark) {
      console.warn('[migrate-user] marcar_usuario_migrado failed:', eMark.message);
      // No fatal — podemos continuar, pero lo reportamos
    }

    return json({
      ok: true,
      migrated: true,
      email: emailReal,
      user_id: userRow.id,
    }, 200);

  } catch (e: any) {
    console.error('[migrate-user] exception', e);
    return json({ ok: false, error: 'exception', detail: e?.message || String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
