/**
 * HOUSE CRM — ProtectedRoute (Auth Guard)
 *
 * Controls app visibility based on authentication state.
 * If no user is logged in, shows LoginView.
 * If logged in, shows the main app and calls the onReady callback.
 *
 * Uso:
 *   import { ProtectedRoute } from './ProtectedRoute.js';
 *
 *   ProtectedRoute.init({
 *     onAuthenticated: (user) => { startApp(user); },
 *     onLogout: () => { cleanupApp(); }
 *   });
 */

import { initAuth, onAuthEvent, AUTH_EVENTS } from '../core/auth.js';
import { userStore } from '../core/user.js';
import { LoginView } from './LoginView.js';

// ─── State ───────────────────────────────────────────────────────

let _loginView = null;
let _options = {};
let _appStarted = false;

// ─── Public API ──────────────────────────────────────────────────

const ProtectedRoute = {

  /**
   * Initialize the auth guard.
   * - If session exists: hides login, calls onAuthenticated
   * - If no session: shows login, waits for auth
   *
   * @param {Object} options
   * @param {Function} options.onAuthenticated - Called with user when auth succeeds
   * @param {Function} [options.onLogout]       - Called when user logs out
   * @param {HTMLElement} [options.appContainer] - Main app element (default: #mhdr)
   * @param {HTMLElement} [options.loginContainer] - Where to mount login (default: body)
   */
  init(options = {}) {
    _options = options;

    // Create login view
    _loginView = new LoginView({
      container: options.loginContainer || document.body,
      onSuccess: (user) => _handleAuth(user),
    });

    // Subscribe to future auth events
    onAuthEvent(({ event, detail }) => {
      if (event === AUTH_EVENTS.LOGOUT) {
        _appStarted = false;
        _hideApp();
        _loginView.show();
        if (_options.onLogout) _options.onLogout();
      }
    });

    // Initialize auth (tries to restore session + starts Google One Tap)
    const { hasSession } = initAuth({
      googleButtonContainer: null, // LoginView handles this after mount
    });

    if (hasSession) {
      // Session restored — skip login
      const user = userStore.get();
      _handleAuth(user);
    } else {
      // No session — show login
      _hideApp();
      _loginView.show();
    }
  },

  /**
   * Check if user is authenticated right now.
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!userStore.get();
  },

  /**
   * Require a specific role. Returns true if the current user has it.
   *
   * @param {string|string[]} roles - 'admin', 'oficina', 'asesor' or array
   * @returns {boolean}
   */
  requireRole(roles) {
    const user = userStore.get();
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.rol);
  },

  /**
   * Get the LoginView instance (for external control if needed).
   * @returns {LoginView|null}
   */
  getLoginView() {
    return _loginView;
  },
};


// ─── Internal helpers ────────────────────────────────────────────

function _handleAuth(user) {
  if (_appStarted) return; // prevent double-init
  _appStarted = true;

  // Hide login
  if (_loginView) _loginView.hide();

  // Show app
  _showApp();

  // Callback
  if (_options.onAuthenticated) {
    _options.onAuthenticated(user);
  }
}

function _showApp() {
  // Show main header and status bar (same as original sApp flow)
  const hdr = document.getElementById('mhdr');
  const stbar = document.getElementById('stbar');
  if (hdr) hdr.style.display = 'block';
  if (stbar) stbar.style.display = 'block';
}

function _hideApp() {
  const hdr = document.getElementById('mhdr');
  const stbar = document.getElementById('stbar');
  if (hdr) hdr.style.display = 'none';
  if (stbar) stbar.style.display = 'none';
}


// ─── Simple function-based guard ─────────────────────────────────
// For code that just needs a quick "is there a user?" check.

/**
 * Verify user is authenticated. If not, shows login.
 * Returns the user if authenticated, null if not.
 *
 * @returns {Object|null} Current user or null
 *
 * @example
 *   const user = requireAuth();
 *   if (!user) return; // Login was shown, abort current action
 *   // proceed with user...
 */
export function requireAuth() {
  const user = userStore.get();
  if (user) return user;

  // No user — show login if we have a LoginView
  if (_loginView) _loginView.show();
  return null;
}

/**
 * Require a specific role. Shows nothing if unauthorized (just returns false).
 *
 * @param {string|string[]} roles
 * @returns {boolean}
 */
export function requireRole(roles) {
  return ProtectedRoute.requireRole(roles);
}


// ─── Backward compatibility ──────────────────────────────────────

if (typeof window !== 'undefined') {
  window.ProtectedRoute = ProtectedRoute;
  window.requireAuth = requireAuth;
  window.requireRole = requireRole;
}

export { ProtectedRoute };
export default ProtectedRoute;
