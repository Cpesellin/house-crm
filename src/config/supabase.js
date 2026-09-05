/**
 * HOUSE CRM — Supabase Client Singleton
 *
 * Single source of truth for the Supabase client.
 * Both auth.js and inventoryService.js import from here.
 */

function getEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) return import.meta.env[key];
  if (typeof window !== 'undefined' && window.__ENV__?.[key]) return window.__ENV__[key];
  return null;
}

let _client = null;

export function getSupabaseClient() {
  if (_client) return _client;

  const url = getEnv('VITE_SUPA_URL');
  const key = getEnv('VITE_SUPA_KEY');

  if (!url || !key) {
    throw new Error('[supabase] Missing VITE_SUPA_URL or VITE_SUPA_KEY');
  }
  if (typeof window.supabase === 'undefined') {
    throw new Error('[supabase] SDK not loaded');
  }

  // Este es el ÚNICO cliente de la aplicación. No crear otro con
  // createClient() en ningún módulo: dos clientes comparten la llave de
  // almacenamiento de la sesión, compiten al renovar el token y acaban
  // cerrando la sesión del usuario (ver el comentario en core/auth.js).
  //
  // Las opciones van explícitas aunque coincidan con las de por defecto:
  // de ellas depende que la sesión sobreviva a una recarga, y un cambio
  // silencioso en el valor por defecto del SDK devolvería el problema.
  _client = window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,     // guardar la sesión (localStorage)
      autoRefreshToken: true,   // renovarla antes de que caduque
    },
  });
  return _client;
}

// Backward compat
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'SB', {
    get() { return getSupabaseClient(); },
    configurable: true,
  });
}
