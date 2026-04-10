/**
 * HOUSE CRM — Authentication Module
 *
 * Handles Google One Tap + credential-based login.
 * Extracted from the monolithic HTML: iAuth(), hLog(), loginCred(), logout(), hashPwd()
 *
 * Uso:
 *   import { initAuth, loginWithCredentials, logout, AUTH_EVENTS } from './auth.js';
 *
 *   // At startup:
 *   initAuth({ onSuccess: () => loadApp(), onError: (msg) => showError(msg) });
 *
 *   // Manual credential login:
 *   await loginWithCredentials('user', 'pass');
 *
 *   // Logout:
 *   logout();
 */

import { userStore } from './user.js';

// ─── Environment variables ───────────────────────────────────────
// Vite: import.meta.env.VITE_*
// Fallback: window.__ENV__ for non-Vite setups

function getEnv(key) {
  // Vite
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // Runtime injection (for the monolithic HTML during migration)
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  return null;
}

const SUPA_URL   = getEnv('VITE_SUPA_URL');
const SUPA_KEY   = getEnv('VITE_SUPA_KEY');
const GID        = getEnv('VITE_GID');

// Debug: log env status at load time
console.log('[auth] ENV check:', {
  SUPA_URL: SUPA_URL ? SUPA_URL.slice(0, 30) + '...' : 'MISSING',
  SUPA_KEY: SUPA_KEY ? SUPA_KEY.slice(0, 20) + '...' : 'MISSING',
  GID: GID ? GID.slice(0, 20) + '...' : 'MISSING',
});

// ─── Supabase client (lazy singleton) ────────────────────────────

let _sb = null;

function getSB() {
  if (_sb) return _sb;

  if (!SUPA_URL || !SUPA_KEY) {
    throw new Error(
      '[auth] Missing Supabase credentials. ' +
      'Set VITE_SUPA_URL and VITE_SUPA_KEY in .env or window.__ENV__'
    );
  }

  if (typeof window.supabase === 'undefined') {
    throw new Error('[auth] Supabase JS SDK not loaded. Include the CDN script before this module.');
  }

  _sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  return _sb;
}

/**
 * Expose Supabase client for other modules (data loading, etc.)
 * @returns {SupabaseClient}
 */
export function getSupabase() {
  return getSB();
}

// ─── Auth Events ─────────────────────────────────────────────────

/**
 * Event types emitted by the auth system.
 * Subscribe with onAuthEvent().
 */
export const AUTH_EVENTS = {
  LOGIN_SUCCESS:  'auth:login_success',
  LOGIN_ERROR:    'auth:login_error',
  LOGOUT:         'auth:logout',
  SESSION_RESTORED: 'auth:session_restored',
};

const _authListeners = new Set();

function _emitAuth(event, detail = null) {
  const payload = { event, detail, timestamp: Date.now() };
  _authListeners.forEach(fn => {
    try { fn(payload); } catch (e) { console.error('[auth] event listener error:', e); }
  });
}

/**
 * Subscribe to auth events.
 *
 * @param {Function} fn - Callback receives { event, detail, timestamp }
 * @returns {Function} Unsubscribe
 *
 * @example
 *   onAuthEvent(({ event, detail }) => {
 *     if (event === AUTH_EVENTS.LOGIN_SUCCESS) loadData();
 *     if (event === AUTH_EVENTS.LOGIN_ERROR) showError(detail);
 *   });
 */
export function onAuthEvent(fn) {
  _authListeners.add(fn);
  return () => _authListeners.delete(fn);
}


// ─── Password hashing ────────────────────────────────────────────
// Preserved EXACTLY from original: SHA-256 with hardcoded salt.
// NOTE: This is weak by modern standards — the salt is public.
// Future improvement: move to server-side bcrypt via Supabase Edge Function.

const PWD_SALT = 'HOUSE_CRM_SALT_2026';

/**
 * Hash a password using SHA-256 + fixed salt.
 * Identical to the original hashPwd() in the HTML.
 *
 * @param {string} pwd - Plain text password
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function hashPwd(pwd) {
  const data = new TextEncoder().encode(pwd + PWD_SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}


// ─── Google One Tap callback ─────────────────────────────────────
// Preserved from original hLog()

async function _handleGoogleCredential(response) {
  const token = response.credential;
  const SB = getSB();

  try {
    // Decode JWT payload (same as original — client-side decode of Google ID token)
    const parts = token.split('.');
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    const email = payload.email;

    // Lookup user in BD
    const { data: usr } = await SB
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('activo', true)
      .single();

    if (!usr) {
      // New external user — show onboarding modal instead of rejecting
      if (typeof window.showOnboarding === 'function') {
        window.showOnboarding({ email, nombre: payload.name || '', foto: payload.picture || '' });
      } else {
        _emitAuth(AUTH_EVENTS.LOGIN_ERROR, 'Acceso denegado. Tu email no está registrado.');
      }
      return;
    }

    // Build user object
    const userData = {
      id: usr.id,
      email: usr.email,
      nombre: usr.nombre,
      rol: usr.rol,
      foto: payload.picture || usr.foto || '',
      usuario: usr.usuario || '',
      telefono_contacto: usr.telefono_contacto || '',
      es_gestor_arriendos: usr.es_gestor_arriendos || false,
      tipo_usuario: usr.tipo_usuario || 'interno',
      token: 'google:' + email,
      puede_publicar: usr.puede_publicar || false,
      puede_referir: usr.puede_referir !== false,
    };

    // Update profile photo if changed
    if (payload.picture && payload.picture !== usr.foto) {
      await SB.from('usuarios').update({ foto: payload.picture }).eq('id', usr.id);
    }

    // Persist and notify
    userStore.set(userData);
    _emitAuth(AUTH_EVENTS.LOGIN_SUCCESS, userData);

  } catch (e) {
    console.error('[auth] Google login error:', e);
    _emitAuth(AUTH_EVENTS.LOGIN_ERROR, 'Error de conexión');
  }
}


// ─── Credential login ────────────────────────────────────────────
// Preserved from original loginCred()

/**
 * Login with username + password.
 * Returns a result object (does NOT throw on auth failure).
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function loginWithCredentials(username, password) {
  const usr = (username || '').trim().toLowerCase();
  const pwd = (password || '').trim();

  if (!usr || !pwd) {
    const msg = 'Ingresa usuario y contraseña';
    _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
    return { success: false, error: msg };
  }

  const SB = getSB();

  try {
    const h = await hashPwd(pwd);

    const { data: user } = await SB
      .from('usuarios')
      .select('*')
      .eq('usuario', usr)
      .eq('activo', true)
      .single();

    if (!user || user.password_hash !== h) {
      const msg = 'Usuario o contraseña incorrectos';
      _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
      return { success: false, error: msg };
    }

    const userData = {
      id: user.id,
      email: user.email || '',
      nombre: user.nombre,
      rol: user.rol,
      foto: user.foto || '',
      usuario: user.usuario,
      telefono_contacto: user.telefono_contacto || '',
      es_gestor_arriendos: user.es_gestor_arriendos || false,
      tipo_usuario: user.tipo_usuario || 'interno',
      token: 'cred:' + user.usuario + ':' + h,
      puede_publicar: user.puede_publicar || false,
      puede_referir: user.puede_referir !== false,
    };

    userStore.set(userData);
    _emitAuth(AUTH_EVENTS.LOGIN_SUCCESS, userData);
    return { success: true };

  } catch (e) {
    console.error('[auth] Credential login error:', e);
    const msg = 'Error de conexión';
    _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
    return { success: false, error: msg };
  }
}


// ─── Logout ──────────────────────────────────────────────────────

/**
 * Clear session and reload page.
 * Identical behavior to original logout().
 */
export function logout() {
  userStore.clear();
  _emitAuth(AUTH_EVENTS.LOGOUT);
  location.reload();
}


// ─── Get current user (convenience) ──────────────────────────────

/**
 * @returns {Object|null} Current user or null
 */
export function getCurrentUser() {
  return userStore.get();
}


// ─── Init ────────────────────────────────────────────────────────

let _initialized = false;

/**
 * Initialize the auth system.
 * - Restores session from sessionStorage
 * - Initializes Google One Tap (if GID is set)
 *
 * Call once at app startup.
 *
 * @param {Object} [options]
 * @param {HTMLElement} [options.googleButtonContainer] - Element to render Google button into
 * @param {boolean} [options.autoSelect=true] - Google auto-select returning users
 *
 * @returns {{ hasSession: boolean }} Whether a previous session was found
 */
export function initAuth(options = {}) {
  if (_initialized) {
    console.warn('[auth] Already initialized');
    return { hasSession: !!userStore.get() };
  }
  _initialized = true;
  console.log('[auth] initAuth() starting...');

  // 1. Try to restore existing session
  const restored = userStore.restore();
  console.log('[auth] Session restored:', restored, restored ? userStore.get()?.nombre : 'none');
  if (restored) {
    _emitAuth(AUTH_EVENTS.SESSION_RESTORED, userStore.get());
  }

  // 2. Initialize Google One Tap
  console.log('[auth] Initializing Google One Tap...');
  _initGoogle(options);

  return { hasSession: restored };
}

function _initGoogle(options) {
  if (!GID) {
    console.warn('[auth] No VITE_GID set — Google login disabled');
    return;
  }

  // Google GSI may not be loaded yet — retry
  if (typeof google === 'undefined' || !google.accounts) {
    console.log('[auth] Google GSI not ready, retrying in 200ms...');
    setTimeout(() => _initGoogle(options), 200);
    return;
  }
  console.log('[auth] Google GSI loaded, initializing...');

  google.accounts.id.initialize({
    client_id: GID,
    callback: _handleGoogleCredential,
    auto_select: options.autoSelect !== false,
  });

  // Render button if container provided
  const container = options.googleButtonContainer ||
    document.getElementById('g_id_signin');

  if (container) {
    google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      width: 260,
      text: 'signin_with',
      shape: 'pill',
    });
  }
}


// ─── Backward compatibility ──────────────────────────────────────
// Expose on window during migration. Remove once fully modular.

if (typeof window !== 'undefined') {
  window.initAuth = initAuth;
  window.loginWithCredentials = loginWithCredentials;
  window.loginCred = async function () {
    const usr = (document.getElementById('lin_usr')?.value || '').trim();
    const pwd = (document.getElementById('lin_pwd')?.value || '').trim();
    const btn = document.getElementById('lin_btn');
    const errEl = document.getElementById('lerr');

    if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
    if (errEl) errEl.style.display = 'none';

    const result = await loginWithCredentials(usr, pwd);

    if (!result.success && errEl) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
    }

    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
  };
  window.logout = logout;
  window.hashPwd = hashPwd;
  window.getCurrentUser = getCurrentUser;
  window.getSupabase = getSupabase;
}

export default {
  initAuth,
  loginWithCredentials,
  logout,
  getCurrentUser,
  getSupabase,
  hashPwd,
  onAuthEvent,
  AUTH_EVENTS,
};
