/**
 * HOUSE CRM — User State Store
 *
 * Reemplaza la variable global `U` con un store reactivo simple.
 * Persiste automáticamente en sessionStorage.
 *
 * Uso:
 *   import { userStore } from './user.js';
 *
 *   userStore.set(userData);         // login
 *   userStore.get();                 // → { id, nombre, rol, ... } o null
 *   userStore.clear();               // logout
 *   userStore.isAdmin();             // → boolean
 *   userStore.subscribe(callback);   // reaccionar a cambios
 */

const STORAGE_KEY = 'hcrm';

// ─── Internal state ──────────────────────────────────────────────

let _user = null;
const _listeners = new Set();

// ─── Notify subscribers ──────────────────────────────────────────

function _notify() {
  const snapshot = _user ? { ..._user } : null;
  _listeners.forEach(fn => {
    try { fn(snapshot); } catch (e) { console.error('[userStore] subscriber error:', e); }
  });
}

// ─── Persistence ─────────────────────────────────────────────────

function _persist() {
  if (_user) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(_user));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function _restore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      _user = JSON.parse(raw);
      return true;
    }
  } catch (e) {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return false;
}

// ─── Public API ──────────────────────────────────────────────────

const userStore = {

  /**
   * Set the current user after successful login.
   *
   * @param {Object} data - User data from BD + auth provider
   * @param {string} data.id          - UUID del usuario
   * @param {string} data.email       - Email
   * @param {string} data.nombre      - Nombre completo
   * @param {string} data.rol         - 'admin' | 'oficina' | 'asesor'
   * @param {string} [data.foto]      - URL de foto de perfil
   * @param {string} [data.usuario]   - Username para login con credenciales
   * @param {string} [data.telefono_contacto] - WhatsApp
   * @param {boolean} [data.es_gestor_arriendos] - Flag de gestor
   * @param {string} [data.tipo_usuario] - 'interno' | 'cliente' | 'vendedor_externo' | 'pendiente'
   * @param {string} [data.token]     - Token interno (no JWT real)
   */
  set(data) {
    if (!data || !data.id || !data.nombre || !data.rol) {
      console.error('[userStore] set() requires at least: id, nombre, rol');
      return;
    }

    _user = {
      id: data.id,
      email: data.email || '',
      nombre: data.nombre,
      rol: data.rol,
      foto: data.foto || '',
      usuario: data.usuario || '',
      telefono_contacto: data.telefono_contacto || '',
      es_gestor_arriendos: data.es_gestor_arriendos || false,
      tipo_usuario: data.tipo_usuario || 'interno',
      token: data.token || '',
    };

    _persist();
    _notify();
  },

  /**
   * Get current user (frozen copy to prevent mutation).
   * @returns {Object|null}
   */
  get() {
    return _user ? { ..._user } : null;
  },

  /**
   * Clear user (logout).
   */
  clear() {
    _user = null;
    _persist();
    _notify();
  },

  /**
   * Update specific fields of the current user.
   * Useful for profile edits without full re-auth.
   *
   * @param {Object} partial - Fields to update
   */
  update(partial) {
    if (!_user) return;
    Object.assign(_user, partial);
    _persist();
    _notify();
  },

  /**
   * Try to restore session from sessionStorage.
   * Call once at app startup, before initAuth().
   *
   * @returns {boolean} true if a session was restored
   */
  restore() {
    const restored = _restore();
    if (restored) _notify();
    return restored;
  },

  // ── Role checks ──────────────────────────────────────────────

  isAdmin() {
    return _user?.rol === 'admin';
  },

  isOficina() {
    return _user?.rol === 'oficina';
  },

  isAdminOrOficina() {
    return _user?.rol === 'admin' || _user?.rol === 'oficina';
  },

  isAsesor() {
    return _user?.rol === 'asesor';
  },

  isGestorArriendos() {
    return !!_user?.es_gestor_arriendos;
  },

  isExterno() {
    const t = _user?.tipo_usuario;
    return t === 'cliente' || t === 'vendedor_externo' || t === 'propietario' || t === 'pendiente';
  },

  isCliente() {
    return _user?.tipo_usuario === 'cliente';
  },

  isPropietario() {
    return _user?.tipo_usuario === 'vendedor_externo' || _user?.tipo_usuario === 'propietario';
  },

  isPendiente() {
    return _user?.tipo_usuario === 'pendiente';
  },

  isInterno() {
    return !_user?.tipo_usuario || _user.tipo_usuario === 'interno';
  },

  // ── Permission checks ────────────────────────────────────────

  /**
   * Can the current user edit this property?
   * Owner (captador) or admin/oficina.
   *
   * @param {Object} property - inmueble record
   * @returns {boolean}
   */
  canEditProperty(property) {
    if (!_user || !property) return false;
    return property.captador_id === _user.id ||
           _user.rol === 'admin' ||
           _user.rol === 'oficina';
  },

  /**
   * Can the current user see the real (private) address?
   * Owner, admin/oficina, or gestor de arriendos on arriendo properties.
   *
   * @param {Object} property - inmueble record
   * @returns {boolean}
   */
  canSeeRealAddress(property) {
    if (!_user || !property) return false;
    if (property.captador_id === _user.id) return true;
    if (_user.rol === 'admin' || _user.rol === 'oficina') return true;
    if (_user.es_gestor_arriendos) {
      return (property.negociacion || '').toLowerCase().includes('arriendo');
    }
    return false;
  },

  // ── Subscription ─────────────────────────────────────────────

  /**
   * Subscribe to user state changes (login, logout, update).
   *
   * @param {Function} fn - Callback receives (user|null)
   * @returns {Function} Unsubscribe function
   *
   * @example
   *   const unsub = userStore.subscribe(user => {
   *     if (user) showApp();
   *     else showLogin();
   *   });
   *   // later: unsub();
   */
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

// ─── Backward compatibility: global U ────────────────────────────
// During migration, keep window.U in sync.
// Remove this block once all code imports userStore directly.

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'U', {
    get() { return userStore.get(); },
    set(val) {
      if (val) userStore.set(val);
      else userStore.clear();
    },
    configurable: true,
  });

  window.userStore = userStore;
}

export { userStore };
export default userStore;
