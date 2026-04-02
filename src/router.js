/**
 * House CRM - Hash-based SPA Router
 * Replaces legacy go() function with a proper router.
 */

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------
const ROUTES = {
  'inv':      { section: 'sec-inv',      label: 'Inventario',     icon: '\u{1F3E0}', auth: true },
  'mis':      { section: 'sec-mis',      label: 'Mis Inmuebles',  icon: '\u{1F500}', auth: true },
  'reg':      { section: 'sec-reg',      label: 'Registrar',      icon: '\u2795',    auth: true },
  'alertas':  { section: 'sec-alertas',  label: 'Alertas',        icon: '\u{1F514}', auth: true },
  'portales': { section: 'sec-portales', label: 'Portales',       icon: '\u{1F310}', auth: true },
  'dash':     { section: 'sec-dash',     label: 'Dashboard',      icon: '\u{1F4CA}', auth: true },
  'agenda':   { section: 'sec-agenda',   label: 'Agenda',         icon: '\u{1F4C5}', auth: true, roles: ['admin', 'oficina', 'gestor'] },
  'conc':     { section: 'sec-conc',     label: 'Portales M\u00B2/FR', icon: '\u{1F504}', auth: true },
  'users':    { section: 'sec-users',    label: 'Usuarios',       icon: '\u{1F465}', auth: true, roles: ['admin'] },
  'perfil':   { section: 'sec-perfil',   label: 'Mi Perfil',      icon: '\u2699\uFE0F', auth: true },
  'papelera': { section: 'sec-papelera', label: 'Papelera',       icon: '\u{1F5D1}\uFE0F', auth: true, roles: ['admin'] },
  'ver':      { section: null,           label: 'Vista P\u00FAblica', auth: false },
};

// Map of route keys to the global render functions they should invoke
const ROUTE_RENDERERS = {
  'inv':      'rInv',
  'mis':      'rPipe',
  'reg':      'rReg',
  'alertas':  'rAl',
  'portales': 'rPort',
  'dash':     'rDash',
  'agenda':   'rAgenda',
  'conc':     'rConc',
  'users':    'rUsers',
  'perfil':   'rPerfil',
  'papelera': 'rPapelera',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the current location.hash and return the route key.
 * Expected format: #/routeKey  or  #/routeKey/...params
 * Falls back to 'inv' (home / inventory).
 */
function getCurrentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const key = hash.split('/')[0] || 'inv';
  return ROUTES[key] ? key : 'inv';
}

// ---------------------------------------------------------------------------
// Core navigation
// ---------------------------------------------------------------------------

/**
 * Navigate to a route by key.
 * Sets location.hash, hides all section divs, shows the target, updates
 * the sidebar active state, invokes the route's render function, and scrolls
 * to the top of the page.
 */
function navigateTo(route) {
  // Normalise: strip leading #/ if someone passes the full hash
  route = (route || 'inv').replace(/^#\/?/, '');

  const cfg = ROUTES[route];
  if (!cfg) {
    route = 'inv';
  }

  const routeCfg = ROUTES[route];

  // --- Auth guard ---
  if (routeCfg.auth && !window.userStore?.get()) {
    // Not authenticated -> fall back to inv (the login overlay will handle it)
    route = 'inv';
  }

  // --- Role guard ---
  if (routeCfg.roles && routeCfg.roles.length) {
    const user = window.userStore?.get();
    if (user && !routeCfg.roles.includes(user.rol)) {
      route = 'inv';
    }
  }

  // Update hash silently (won't re-trigger if already the same)
  const desired = `#/${route}`;
  if (location.hash !== desired) {
    location.hash = desired;
    // hashchange listener will call navigateTo again, so bail here
    return;
  }

  // --- Hide all sections ---
  const sections = document.querySelectorAll('[id^="sec-"]');
  sections.forEach((el) => {
    el.style.display = 'none';
    el.classList.remove('sec-active');
  });

  // --- Show target section ---
  const targetCfg = ROUTES[route];
  if (targetCfg && targetCfg.section) {
    const target = document.getElementById(targetCfg.section);
    if (target) {
      target.style.display = '';
      target.classList.add('sec-active');
    }
  }

  // --- Sidebar active state ---
  document.querySelectorAll('#mpnl .mn-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.route === route);
  });

  // --- Close mobile sidebar if open ---
  const overlay = document.getElementById('mov');
  if (overlay) overlay.classList.remove('open');
  const panel = document.getElementById('mpnl');
  if (panel) panel.classList.remove('open');

  // --- Call the route's render function (window global) ---
  const rendererName = ROUTE_RENDERERS[route];
  if (rendererName && typeof window[rendererName] === 'function') {
    try {
      window[rendererName]();
    } catch (err) {
      console.error(`[Router] Error in renderer ${rendererName}:`, err);
    }
  }

  // --- Scroll to top ---
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

function init() {
  // React to hash changes
  window.addEventListener('hashchange', () => {
    navigateTo(getCurrentRoute());
  });

  // If the DOM is already loaded, navigate to the initial hash immediately.
  // Otherwise wait for DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      navigateTo(getCurrentRoute());
    });
  } else {
    navigateTo(getCurrentRoute());
  }
}

// ---------------------------------------------------------------------------
// Backward compatibility
// ---------------------------------------------------------------------------
window.go = navigateTo;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export { navigateTo, getCurrentRoute, init, ROUTES };
