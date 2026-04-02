/**
 * House CRM - Root Application Component
 * Renders the full app shell and wires up global helpers.
 */

import { ROUTES } from './router.js';

// ---------------------------------------------------------------------------
// Sidebar menu builder
// ---------------------------------------------------------------------------

function buildMenuItems() {
  // Order for the sidebar menu
  const menuOrder = [
    'inv', 'mis', 'reg', 'alertas', 'portales',
    'dash', 'agenda', 'conc', 'users', 'perfil', 'papelera',
  ];

  return menuOrder
    .map((key) => {
      const r = ROUTES[key];
      if (!r || !r.section) return '';
      const rolesAttr = r.roles ? ` data-roles="${r.roles.join(',')}"` : '';
      return `<div class="mn-item" data-route="${key}"${rolesAttr} onclick="go('${key}')">
        <span class="mn-icon">${r.icon}</span>
        <span class="mn-label">${r.label}</span>
      </div>`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// Section containers builder
// ---------------------------------------------------------------------------

function buildSections() {
  return Object.entries(ROUTES)
    .filter(([, cfg]) => cfg.section)
    .map(([, cfg]) => `<div id="${cfg.section}" class="sec" style="display:none"></div>`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Shell HTML
// ---------------------------------------------------------------------------

function renderShell(container) {
  container.innerHTML = `
    <!-- ============ HEADER ============ -->
    <header id="mhdr" class="mhdr">
      <div class="hdr-left">
        <button class="hbtn menu-toggle" id="btnMenu" onclick="omenu()" aria-label="Menu">
          <span class="hamburger"></span>
        </button>
        <div class="logo" onclick="go('inv')">
          <img src="/img/logo.svg" alt="House CRM" class="logo-img" />
          <span class="logo-text">House CRM</span>
        </div>
      </div>
      <nav class="hdr-nav" id="hdrNav"></nav>
      <div class="hdr-right">
        <button class="hbtn" id="btnAlerts" onclick="go('alertas')" aria-label="Alertas">
          <span class="bell-icon">\u{1F514}</span>
          <span class="badge" id="alertBadge" style="display:none">0</span>
        </button>
        <button class="hbtn" id="btnTheme" onclick="tTh()" aria-label="Tema">
          <span id="themeIcon">\u{1F319}</span>
        </button>
        <div class="avatar-wrap" id="avatarWrap" onclick="go('perfil')">
          <img id="avatarImg" class="avatar" src="/img/avatar-default.svg" alt="Avatar" />
        </div>
      </div>
    </header>

    <!-- ============ MOBILE SIDEBAR ============ -->
    <div id="mov" class="mov" onclick="cmenu()"></div>
    <aside id="mpnl" class="mpnl">
      <div class="mpnl-head">
        <span class="mpnl-title">Menu</span>
        <button class="hbtn" onclick="cmenu()">\u2715</button>
      </div>
      <div class="mpnl-body">
        ${buildMenuItems()}
      </div>
      <div class="mpnl-foot">
        <button class="btn btn-outline btn-sm" id="btnLogout" onclick="window.logout && window.logout()">Cerrar sesi\u00F3n</button>
      </div>
    </aside>

    <!-- ============ STATUS BAR ============ -->
    <div id="stbar" class="stbar" style="display:none">
      <span id="stbarMsg"></span>
    </div>

    <!-- ============ SECTIONS ============ -->
    <main class="main-content">
      ${buildSections()}
    </main>

    <!-- ============ LOGIN OVERLAY ============ -->
    <div id="lov" class="lov">
      <div class="lov-card">
        <div class="lov-logo">
          <img src="/img/logo.svg" alt="House CRM" />
        </div>
        <h2>Iniciar Sesi\u00F3n</h2>
        <div id="loginContent"></div>
      </div>
    </div>

    <!-- ============ MODAL ============ -->
    <div id="mdl" class="mdl" style="display:none">
      <div class="mdl-overlay" onclick="window.cMdl && window.cMdl()"></div>
      <div class="mdl-content" id="mdlContent"></div>
    </div>

    <!-- ============ CONFIRM DIALOG ============ -->
    <div id="cfdlg" class="cfdlg" style="display:none">
      <div class="cfdlg-overlay"></div>
      <div class="cfdlg-box">
        <p id="cfdlgMsg"></p>
        <div class="cfdlg-actions">
          <button class="btn btn-outline" onclick="cfCancel()">Cancelar</button>
          <button class="btn btn-danger" id="cfdlgOk">Aceptar</button>
        </div>
      </div>
    </div>

    <!-- ============ TOASTS ============ -->
    <div id="toasts" class="toasts"></div>
  `;
}

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

let darkMode = localStorage.getItem('theme') === 'dark';

function applyTheme() {
  document.documentElement.classList.toggle('dark', darkMode);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = darkMode ? '\u2600\uFE0F' : '\u{1F319}';
  localStorage.setItem('theme', darkMode ? 'dark' : 'light');
}

/** Toggle theme */
function tTh() {
  darkMode = !darkMode;
  applyTheme();
}

/** Initialise theme from storage */
function iTh() {
  darkMode = localStorage.getItem('theme') === 'dark';
  applyTheme();
}

// ---------------------------------------------------------------------------
// Sidebar open / close
// ---------------------------------------------------------------------------

function omenu() {
  document.getElementById('mov')?.classList.add('open');
  document.getElementById('mpnl')?.classList.add('open');
}

function cmenu() {
  document.getElementById('mov')?.classList.remove('open');
  document.getElementById('mpnl')?.classList.remove('open');
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastId = 0;

/**
 * Show a toast notification.
 * @param {string} msg   - Message text
 * @param {'info'|'ok'|'warn'|'error'} type - Visual style
 * @param {number} duration - Auto-dismiss ms (default 3500)
 */
function toast(msg, type = 'info', duration = 3500) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;

  const id = `toast-${++toastId}`;
  const el = document.createElement('div');
  el.id = id;
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  wrap.appendChild(el);

  // Trigger enter animation
  requestAnimationFrame(() => el.classList.add('show'));

  if (duration > 0) {
    setTimeout(() => {
      el.classList.remove('show');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
      // Fallback removal
      setTimeout(() => el.remove(), 500);
    }, duration);
  }

  return id;
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

let cfResolve = null;

/**
 * Show a confirmation dialog. Returns a Promise<boolean>.
 */
function cfShow(msg) {
  const dlg = document.getElementById('cfdlg');
  const msgEl = document.getElementById('cfdlgMsg');
  const okBtn = document.getElementById('cfdlgOk');
  if (!dlg || !msgEl || !okBtn) return Promise.resolve(false);

  msgEl.textContent = msg;
  dlg.style.display = '';

  return new Promise((resolve) => {
    cfResolve = resolve;
    okBtn.onclick = () => {
      dlg.style.display = 'none';
      cfResolve = null;
      resolve(true);
    };
  });
}

function cfCancel() {
  const dlg = document.getElementById('cfdlg');
  if (dlg) dlg.style.display = 'none';
  if (cfResolve) {
    cfResolve(false);
    cfResolve = null;
  }
}

// ---------------------------------------------------------------------------
// Status bar helper
// ---------------------------------------------------------------------------

function sApp(msg, show = true) {
  const bar = document.getElementById('stbar');
  const msgEl = document.getElementById('stbarMsg');
  if (!bar || !msgEl) return;
  msgEl.textContent = msg || '';
  bar.style.display = show && msg ? '' : 'none';
}

// ---------------------------------------------------------------------------
// Data loader placeholder
// ---------------------------------------------------------------------------

async function load() {
  try {
    sApp('Cargando datos...');
    // Delegate to the globally registered loader if present
    if (typeof window._loadData === 'function') {
      await window._loadData();
    }
    sApp('', false);
  } catch (err) {
    console.error('[App] load error:', err);
    sApp('Error al cargar datos', true);
    toast('Error al cargar datos', 'error');
  }
}

// ---------------------------------------------------------------------------
// initApp  (main export)
// ---------------------------------------------------------------------------

async function initApp(container) {
  if (!container) {
    console.error('[App] No container element provided');
    return;
  }

  // 1. Render the shell
  renderShell(container);

  // 2. Apply saved theme
  iTh();

  // 3. Initialise auth
  try {
    const { initAuth, onAuthEvent, AUTH_EVENTS } = await import('./core/auth.js');
    await initAuth();

    onAuthEvent(AUTH_EVENTS.LOGIN, async () => {
      // Hide login overlay
      const lov = document.getElementById('lov');
      if (lov) lov.style.display = 'none';
      await load();
    });

    onAuthEvent(AUTH_EVENTS.LOGOUT, () => {
      const lov = document.getElementById('lov');
      if (lov) lov.style.display = '';
      sApp('', false);
    });
  } catch (err) {
    console.error('[App] Auth init failed:', err);
  }

  // 4. If a session already exists, load data
  if (window.userStore?.get()) {
    const lov = document.getElementById('lov');
    if (lov) lov.style.display = 'none';
    await load();
  }
}

// ---------------------------------------------------------------------------
// Backward compatibility  (window globals)
// ---------------------------------------------------------------------------

window.sApp   = sApp;
window.load   = load;
window.go     = (route) => {
  // router.js also sets window.go, but App.js may load first
  const { navigateTo } = window.__router || {};
  if (navigateTo) {
    navigateTo(route);
  } else {
    location.hash = `#/${route}`;
  }
};
window.omenu  = omenu;
window.cmenu  = cmenu;
window.tTh    = tTh;
window.iTh    = iTh;
window.toast  = toast;
window.cfShow = cfShow;
window.cfCancel = cfCancel;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { initApp, sApp, load, toast, cfShow, cfCancel, omenu, cmenu, tTh, iTh };
