/**
 * HOUSE CRM — LoginView Component
 *
 * Self-contained login UI extracted from the monolithic HTML div#lov.
 * Generates the entire login screen DOM dynamically.
 *
 * Uso:
 *   import { LoginView } from './LoginView.js';
 *
 *   const login = new LoginView({
 *     container: document.body,
 *     onSuccess: (user) => startApp(user),
 *   });
 *   login.show();
 */

import { loginWithCredentials, onAuthEvent, AUTH_EVENTS } from '../core/auth.js';
import { escapeHtml } from '../utils/sanitizer.js';

// ─── Logo SVG (exact brand from original) ────────────────────────

const LOGO_SVG = `<img src="/img/logo.png" alt="House" style="width:64px;height:64px;object-fit:contain">`;


// ─── State ───────────────────────────────────────────────────────

const STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
};


// ─── Component ───────────────────────────────────────────────────

class LoginView {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - Where to mount (default: document.body)
   * @param {Function} [options.onSuccess] - Called with user data on login success
   */
  constructor(options = {}) {
    this._container = options.container || document.body;
    this._onSuccess = options.onSuccess || (() => {});
    this._state = STATE.IDLE;
    this._errorMsg = '';
    this._el = null;
    this._unsubAuth = null;
  }

  // ── Public API ─────────────────────────────────────────────────

  show() {
    this._mount();
    this._bindEvents();
    this._subscribeAuth();
  }

  hide() {
    if (this._el) {
      this._el.style.display = 'none';
    }
  }

  destroy() {
    if (this._unsubAuth) this._unsubAuth();
    if (this._el) this._el.remove();
    this._el = null;
  }

  // ── DOM generation ─────────────────────────────────────────────

  _mount() {
    // If already mounted, just show
    if (this._el) {
      this._el.style.display = 'flex';
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'lov';
    overlay.innerHTML = this._template();
    this._container.prepend(overlay);
    this._el = overlay;
  }

  _template() {
    return `<div class="lbox">
      <div class="logo-login" style="display:flex;justify-content:center;margin-bottom:20px">${LOGO_SVG}</div>
      <div class="lbr">House</div>
      <div class="lsb">Gestión Inmobiliaria Inteligente</div>
      <div id="g_id_signin"></div>
      <div class="lor"><span>o ingresa con</span></div>
      <div class="lfrm">
        <input id="lin_usr" type="text" placeholder="Usuario" autocomplete="username">
        <input id="lin_pwd" type="password" placeholder="Contraseña" autocomplete="current-password">
        <button id="lin_btn" type="button">Ingresar</button>
      </div>
      <div class="ldiv"></div>
      <div class="lfooter">Ingresa con Google o con tus credenciales</div>
      <div id="lerr"></div>
    </div>`;
  }

  // ── Event binding ──────────────────────────────────────────────

  _bindEvents() {
    const btn = document.getElementById('lin_btn');
    const pwdInput = document.getElementById('lin_pwd');

    if (btn) {
      btn.addEventListener('click', () => this._handleCredentialSubmit());
    }

    if (pwdInput) {
      pwdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this._handleCredentialSubmit();
      });
    }
  }

  async _handleCredentialSubmit() {
    const usr = (document.getElementById('lin_usr')?.value || '').trim();
    const pwd = (document.getElementById('lin_pwd')?.value || '').trim();

    this._setState(STATE.LOADING);

    const result = await loginWithCredentials(usr, pwd);

    if (!result.success) {
      this._setState(STATE.ERROR, result.error);
    }
    // On success, the auth event handler will call _setState(SUCCESS)
  }

  // ── Auth event subscription ────────────────────────────────────

  _subscribeAuth() {
    this._unsubAuth = onAuthEvent(({ event, detail }) => {
      switch (event) {
        case AUTH_EVENTS.LOGIN_SUCCESS:
          this._setState(STATE.SUCCESS);
          this.hide();
          this._onSuccess(detail);
          break;

        case AUTH_EVENTS.LOGIN_ERROR:
          this._setState(STATE.ERROR, detail);
          break;

        case AUTH_EVENTS.SESSION_RESTORED:
          this._setState(STATE.SUCCESS);
          this.hide();
          this._onSuccess(detail);
          break;
      }
    });
  }

  // ── State management ───────────────────────────────────────────

  _setState(state, errorMsg = '') {
    this._state = state;
    this._errorMsg = errorMsg;
    this._render();
  }

  _render() {
    const btn = document.getElementById('lin_btn');
    const errEl = document.getElementById('lerr');

    if (btn) {
      btn.disabled = this._state === STATE.LOADING;
      btn.textContent = this._state === STATE.LOADING ? 'Verificando...' : 'Ingresar';
    }

    if (errEl) {
      if (this._state === STATE.ERROR && this._errorMsg) {
        errEl.textContent = this._errorMsg;
        errEl.style.display = 'block';
      } else {
        errEl.style.display = 'none';
      }
    }
  }
}


// ─── Backward compatibility ──────────────────────────────────────

if (typeof window !== 'undefined') {
  window.LoginView = LoginView;
}

export { LoginView };
export default LoginView;
