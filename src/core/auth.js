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

// ─── Recovery mode detection (CRITICAL: debe correr ANTES que Supabase consuma el hash) ──
// Cuando el usuario hace click en un magic link de reset password, Supabase envía:
//   https://site.com/#access_token=...&refresh_token=...&type=recovery
// Extraemos los tokens manualmente y los guardamos para restaurar la sesión de recovery
// explícitamente en initAuth (el detectSessionInUrl de Supabase no es confiable con
// nuestro hash-routing).
if (typeof window !== 'undefined' && typeof location !== 'undefined') {
  const hashStr = location.hash || '';
  if (/type=recovery/.test(hashStr)) {
    window._inPasswordRecovery = true;
    window._bootInRecovery = true;
    // Parsear tokens del hash
    try {
      const params = new URLSearchParams(hashStr.startsWith('#') ? hashStr.slice(1) : hashStr);
      window._recoveryTokens = {
        access_token:  params.get('access_token'),
        refresh_token: params.get('refresh_token'),
        expires_at:    params.get('expires_at'),
        expires_in:    params.get('expires_in'),
        type:          params.get('type'),
      };
      console.log('[auth] 🔐 Recovery link detected — tokens parsed, will show reset UI');
    } catch (e) {
      console.warn('[auth] Failed to parse recovery hash:', e);
    }
  }
}

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
      perfiles_publicos: usr.perfiles_publicos || [],
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
// ─── Helper: llamar Edge Function migrate-user ──────────────────
async function _callMigrateUser(emailOrUsername, password) {
  try {
    const url = getEnv('VITE_SUPA_URL');
    const anon = getEnv('VITE_SUPA_KEY');
    if (!url || !anon) return { ok: false, error: 'no_env' };
    const r = await fetch(`${url}/functions/v1/migrate-user`, {
      method: 'POST',
      headers: { 'apikey': anon, 'Authorization': `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrUsername, usuario: emailOrUsername, password }),
    });
    return await r.json();
  } catch (e) {
    console.warn('[auth] migrate-user call failed:', e);
    return { ok: false, error: 'network' };
  }
}

// ─── Helper: hidratar userStore desde BD ────────────────────────
async function _hydrateUserStoreFromDB(userId, authToken = null) {
  const SB = getSB();
  const { data: user, error } = await SB
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .eq('activo', true)
    .maybeSingle();
  if (error || !user) return null;
  const userData = {
    id: user.id,
    email: user.email || '',
    nombre: user.nombre,
    rol: user.rol,
    foto: user.foto || '',
    usuario: user.usuario || '',
    telefono_contacto: user.telefono_contacto || '',
    es_gestor_arriendos: user.es_gestor_arriendos || false,
    tipo_usuario: user.tipo_usuario || 'interno',
    token: authToken || 'sbauth:' + user.id,
    puede_publicar: user.puede_publicar || false,
    puede_referir: user.puede_referir !== false,
    perfiles_publicos: user.perfiles_publicos || [],
  };
  userStore.set(userData);
  return userData;
}

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
    // ── PASO 1: Lookup ligero SIN password_hash (preparación para RLS estricto) ──
    // El password nunca se valida en el cliente. La validación sucede en:
    //   - Supabase Auth (si auth_migrated=true)
    //   - Edge Function migrate-user con service_role (si auth_migrated=false)
    const { data: userRow } = await SB
      .from('usuarios')
      .select('id, email, usuario, auth_migrated, activo')
      .or(`usuario.eq.${usr},email.eq.${usr}`)
      .eq('activo', true)
      .maybeSingle();

    if (!userRow) {
      const msg = 'Usuario o contraseña incorrectos';
      _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
      return { success: false, error: msg };
    }

    const emailReal = userRow.email || `${userRow.usuario}@house.local`;

    // ── PASO 2: Si ya está migrado, ir directo a Supabase Auth ──
    if (userRow.auth_migrated) {
      const { data: sess, error: eAuth } = await SB.auth.signInWithPassword({
        email: emailReal, password: pwd,
      });
      if (eAuth || !sess?.session) {
        const msg = 'Usuario o contraseña incorrectos';
        _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
        return { success: false, error: msg };
      }
      const userData = await _hydrateUserStoreFromDB(userRow.id, sess.session.access_token);
      if (!userData) {
        const msg = 'Error cargando perfil';
        _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
        return { success: false, error: msg };
      }
      _emitAuth(AUTH_EVENTS.LOGIN_SUCCESS, userData);
      return { success: true, viaSupabaseAuth: true };
    }

    // ── PASO 3: No migrado — la Edge Function valida password + migra ──
    // migrate-user ejecuta con service_role y tiene acceso a password_hash
    // sin exponerlo al cliente. Es el único path que aún depende de SHA-256.
    const mig = await _callMigrateUser(usr, pwd);
    if (!mig.ok) {
      // Credenciales inválidas, user no existe, o edge function caída
      const msg = mig.error === 'invalid_credentials'
        ? 'Usuario o contraseña incorrectos'
        : 'Error de autenticación. Intenta de nuevo.';
      console.warn('[auth] migrate-user denied:', mig.error, mig.detail);
      _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
      return { success: false, error: msg };
    }

    // Migración ok → iniciar sesión con Supabase Auth
    const { data: sess, error: eSess } = await SB.auth.signInWithPassword({
      email: mig.email || emailReal, password: pwd,
    });
    if (eSess || !sess?.session) {
      console.warn('[auth] Post-migration signIn failed:', eSess);
      const msg = 'Error iniciando sesión tras migración. Intenta de nuevo.';
      _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
      return { success: false, error: msg };
    }

    const userData = await _hydrateUserStoreFromDB(userRow.id, sess.session.access_token);
    if (!userData) {
      const msg = 'Error cargando perfil';
      _emitAuth(AUTH_EVENTS.LOGIN_ERROR, msg);
      return { success: false, error: msg };
    }

    console.log('[auth] ✨ Usuario migrado a Supabase Auth');
    _emitAuth(AUTH_EVENTS.LOGIN_SUCCESS, userData);
    return { success: true, migrated: true, viaSupabaseAuth: true };

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
export async function logout() {
  // Cerrar sesión en Supabase Auth si hay una activa
  try {
    const SB = getSB();
    await SB.auth.signOut();
  } catch (e) {
    console.warn('[auth] SB.auth.signOut failed:', e);
  }
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

  // 1. Si estamos en recovery (magic link clickeado), NO restaurar sesión.
  //    Mostrar el panel de reset de contraseña en fase 2 y esperar al usuario.
  if (window._bootInRecovery) {
    console.log('[auth] Boot in password recovery — skipping session restore');
    const setupRecoveryUI = () => {
      try {
        // Ocultar shell y mostrar pantalla de login con panel reset en fase 2
        const shell = document.getElementById('shell');
        if (shell) shell.style.display = 'none';
        const lov = document.getElementById('lov');
        if (lov) { lov.style.display = 'flex'; }
        const loginPanel = document.getElementById('lov_login');
        const regPanel = document.getElementById('lov_register');
        const resetPanel = document.getElementById('lov_reset');
        if (loginPanel) loginPanel.style.display = 'none';
        if (regPanel) regPanel.style.display = 'none';
        if (resetPanel) resetPanel.style.display = '';
        // Cambiar UI del panel reset a fase 2: ocultar email, mostrar pwd+pwd2
        const rstEmail = document.getElementById('rst_email');
        const rstPwd = document.getElementById('rst_pwd');
        const rstPwd2 = document.getElementById('rst_pwd2');
        const rstTitle = document.getElementById('rst_title');
        const rstHint = document.getElementById('rst_hint');
        const rstBtn = document.getElementById('rst_btn');
        if (rstEmail) rstEmail.style.display = 'none';
        const pwdWrap = document.getElementById('rst_pwd_wrap');
        const pwd2Wrap = document.getElementById('rst_pwd2_wrap');
        if (pwdWrap) pwdWrap.style.display = '';
        if (pwd2Wrap) pwd2Wrap.style.display = '';
        if (rstPwd) rstPwd.style.display = '';
        if (rstPwd2) rstPwd2.style.display = '';
        if (rstTitle) rstTitle.textContent = '🔐 Nueva contraseña';
        if (rstHint) rstHint.textContent = 'Escribe tu nueva contraseña. Mínimo 6 caracteres.';
        if (rstBtn) rstBtn.textContent = '🔒 Guardar nueva contraseña';
        setTimeout(() => rstPwd?.focus(), 100);
      } catch (e) { console.warn('[auth] Recovery UI setup failed:', e); }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupRecoveryUI);
    } else {
      // Dar un tick para que App.js ya haya montado el DOM
      setTimeout(setupRecoveryUI, 50);
    }
    // Setear la sesión de recovery manualmente con los tokens parseados del hash
    // (no confiamos en detectSessionInUrl porque nuestro hash-routing lo interfiere)
    (async () => {
      try {
        const SB = getSB();
        const tk = window._recoveryTokens;
        if (tk?.access_token && tk?.refresh_token) {
          const { data, error } = await SB.auth.setSession({
            access_token: tk.access_token,
            refresh_token: tk.refresh_token,
          });
          if (error) {
            console.error('[auth] setSession recovery failed:', error);
          } else {
            console.log('[auth] ✅ Recovery session set manually, user:', data.session?.user?.email);
          }
          // Limpiar hash de la URL (seguridad + UX)
          try { history.replaceState(null, '', location.pathname + location.search); } catch {}
        }
      } catch (e) { console.warn('[auth] Recovery setSession exception:', e); }
    })();
  } else {
    // 2. Flujo normal: restaurar sesión Supabase o legacy
    (async () => {
      try {
        const SB = getSB();
        const { data } = await SB.auth.getSession();
        if (data?.session?.user?.id) {
          const userData = await _hydrateUserStoreFromDB(data.session.user.id, data.session.access_token);
          if (userData) {
            console.log('[auth] Session restored from Supabase Auth:', userData.nombre);
            _emitAuth(AUTH_EVENTS.SESSION_RESTORED, userData);
            return;
          }
        }
      } catch (e) { console.warn('[auth] Supabase getSession failed:', e); }

      // Fallback: sesión legacy desde sessionStorage
      const restored = userStore.restore();
      console.log('[auth] Session restored from sessionStorage:', restored, restored ? userStore.get()?.nombre : 'none');
      if (restored) {
        _emitAuth(AUTH_EVENTS.SESSION_RESTORED, userStore.get());
      }
    })();
  }

  // 3. Auto-sync userStore cuando Supabase Auth cambia de estado
  try {
    const SB = getSB();
    SB.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Si Supabase cierra sesión pero userStore aún la tiene (legacy), no hacemos nada
        // El logout explícito se encarga de limpiar ambos
      } else if (event === 'TOKEN_REFRESHED' && session?.user?.id) {
        // Actualizar token en userStore silenciosamente
        const u = userStore.get();
        if (u && u.id === session.user.id) {
          u.token = session.access_token;
          userStore.set(u);
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        // Usuario clickeó el magic link del email de reset
        // Mostramos el panel de reset en modo "fase 2" (nueva contraseña)
        console.log('[auth] Password recovery session detected');
        window._inPasswordRecovery = true;
        try {
          // Ocultar formulario de login, mostrar panel de reset en modo fase 2
          document.getElementById('lov_login')?.style && (document.getElementById('lov_login').style.display = 'none');
          document.getElementById('lov_register')?.style && (document.getElementById('lov_register').style.display = 'none');
          const panel = document.getElementById('lov_reset');
          if (panel) panel.style.display = 'block';
          // Cambiar UI a fase 2: ocultar email, mostrar pwd + pwd2
          const rstEmail = document.getElementById('rst_email');
          const rstPwd = document.getElementById('rst_pwd');
          const rstPwd2 = document.getElementById('rst_pwd2');
          const rstTitle = document.getElementById('rst_title');
          const rstHint = document.getElementById('rst_hint');
          const rstBtn = document.getElementById('rst_btn');
          if (rstEmail) rstEmail.style.display = 'none';
          const pwdWrap = document.getElementById('rst_pwd_wrap');
          const pwd2Wrap = document.getElementById('rst_pwd2_wrap');
          if (pwdWrap) pwdWrap.style.display = '';
          if (pwd2Wrap) pwd2Wrap.style.display = '';
          if (rstPwd) rstPwd.style.display = 'block';
          if (rstPwd2) rstPwd2.style.display = 'block';
          if (rstTitle) rstTitle.textContent = '🔐 Nueva contraseña';
          if (rstHint) rstHint.textContent = 'Escribe tu nueva contraseña. Mínimo 6 caracteres.';
          if (rstBtn) rstBtn.textContent = '🔒 Guardar nueva contraseña';
          setTimeout(() => rstPwd?.focus(), 100);
        } catch (uiErr) { console.warn('[auth] UI switch for recovery failed:', uiErr); }
      }
    });
  } catch (e) { console.warn('[auth] onAuthStateChange setup failed:', e); }

  // 4. Initialize Google One Tap
  console.log('[auth] Initializing Google One Tap...');
  _initGoogle(options);

  return { hasSession: !!userStore.get() };
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
