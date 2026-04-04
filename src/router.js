/**
 * House CRM - Hash-based SPA Router
 * Replaces legacy go() function with a proper router.
 */

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------
// Internal CRM routes
const ROUTES_INTERNAL = ['inv','mis','reg','alertas','portales','dash','agenda','conc','users','perfil','papelera'];
// External user routes
const ROUTES_CLIENTE = ['portafolio','favoritos','cuenta'];
const ROUTES_PROPIETARIO = ['portafolio','favoritos','cuenta','mis-pub','publicar'];
const ROUTES_PENDIENTE = ['espera'];

const ROUTES = {
  'inv':      { section: 'sec-inv',      label: 'Inventario',     icon: '\u{1F3E0}', auth: true, internal: true },
  'mis':      { section: 'sec-mis',      label: 'Mis Inmuebles',  icon: '\u{1F500}', auth: true, internal: true },
  'reg':      { section: 'sec-reg',      label: 'Registrar',      icon: '\u2795',    auth: true, internal: true },
  'alertas':  { section: 'sec-alertas',  label: 'Alertas',        icon: '\u{1F514}', auth: true, internal: true },
  'portales': { section: 'sec-portales', label: 'Portales',       icon: '\u{1F310}', auth: true, internal: true },
  'dash':     { section: 'sec-dash',     label: 'Dashboard',      icon: '\u{1F4CA}', auth: true, internal: true },
  'agenda':   { section: 'sec-agenda',   label: 'Agenda',         icon: '\u{1F4C5}', auth: true, internal: true, roles: ['admin', 'oficina', 'gestor'] },
  'conc':     { section: 'sec-conc',     label: 'Portales M\u00B2/FR', icon: '\u{1F504}', auth: true, internal: true },
  'users':    { section: 'sec-users',    label: 'Usuarios',       icon: '\u{1F465}', auth: true, internal: true, roles: ['admin'] },
  'perfil':   { section: 'sec-perfil',   label: 'Mi Perfil',      icon: '\u2699\uFE0F', auth: true, internal: true },
  'papelera': { section: 'sec-papelera', label: 'Papelera',       icon: '\u{1F5D1}\uFE0F', auth: true, internal: true, roles: ['admin'] },
  'ver':      { section: null,           label: 'Vista P\u00FAblica', auth: false },
  // External user routes
  'portafolio': { section: 'sec-portafolio', sectionLoggedIn: 'sec-inv', label: 'Explorar', icon: '\u{1F50D}', auth: false },
  'favoritos':  { section: 'sec-favoritos',  label: 'Favoritos',       icon: '\u2764\uFE0F', auth: true, tipos: ['cliente','vendedor_externo','propietario'] },
  'cuenta':     { section: 'sec-cuenta',     label: 'Mi Cuenta',       icon: '\u2699\uFE0F', auth: true, tipos: ['cliente','vendedor_externo','propietario'] },
  'mis-pub':    { section: 'sec-mis-pub',    label: 'Mis Publicaciones', icon: '\u{1F3E0}', auth: true, tipos: ['vendedor_externo','propietario'] },
  'publicar':   { section: 'sec-publicar',   label: 'Publicar',        icon: '\u2795',    auth: true, tipos: ['vendedor_externo','propietario'] },
  'mensajes':   { section: 'sec-mensajes',   label: 'Mensajes',        icon: '\u{1F4AC}', auth: true, tipos: ['cliente','vendedor_externo','propietario'] },
  'mis-inm':    { section: 'sec-mis-inm',    label: 'Mis Inmuebles',   icon: '\u{1F3E0}', auth: true, tipos: ['vendedor_externo','propietario'] },
  'espera':     { section: 'sec-espera',     label: 'En Espera',       icon: '\u23F3',    auth: true, tipos: ['pendiente'] },
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
  // External
  'portafolio': 'rPortafolio',
  'favoritos':  'rFavoritos',
  'cuenta':     'rCuenta',
  'mis-pub':    'rMisPub',
  'publicar':   'rPublicar',
  'espera':     'rEspera',
  'mensajes':   'renderMensajes',
  'mis-inm':    'renderMisInmueblesExt',
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
  const key = hash.split('/')[0] || '';
  if (ROUTES[key]) return key;
  // Default based on user type
  const user = window.userStore?.get();
  const tipo = user?.tipo_usuario || 'interno';
  if (tipo === 'pendiente') return 'espera';
  if (tipo === 'cliente' || tipo === 'vendedor_externo' || tipo === 'propietario') return 'portafolio';
  return 'inv';
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

  let routeCfg = ROUTES[route];
  const user = window.userStore?.get();
  const tipoU = user?.tipo_usuario || 'interno';
  const isExterno = tipoU === 'cliente' || tipoU === 'vendedor_externo' || tipoU === 'propietario' || tipoU === 'pendiente';
  const defaultRoute = isExterno ? (tipoU === 'pendiente' ? 'espera' : 'portafolio') : 'inv';

  // --- Auth guard ---
  if (routeCfg.auth && !user) {
    route = 'portafolio'; // unauthenticated → public portal
    routeCfg = ROUTES[route];
  }

  // --- Tipo usuario guard (external users can't access internal routes) ---
  if (user && isExterno && routeCfg.internal) {
    route = defaultRoute;
    routeCfg = ROUTES[route];
  }

  // --- Tipo guard for external routes ---
  if (routeCfg.tipos && routeCfg.tipos.length && user) {
    if (!routeCfg.tipos.includes(tipoU)) {
      route = defaultRoute;
      routeCfg = ROUTES[route];
    }
  }

  // --- Internal users can't access external-only routes (except portafolio) ---
  if (user && !isExterno && routeCfg.tipos && !routeCfg.tipos.includes('interno') && route !== 'portafolio') {
    route = 'inv';
    routeCfg = ROUTES[route];
  }

  // --- Role guard (for internal users) ---
  if (routeCfg.roles && routeCfg.roles.length && user) {
    const userRoles = [user.rol];
    if (user.es_gestor_arriendos) userRoles.push('gestor');
    if (!routeCfg.roles.some(r => userRoles.includes(r))) {
      route = defaultRoute;
      routeCfg = ROUTES[route];
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
  document.querySelectorAll('.sec').forEach((el) => {
    el.classList.remove('act');
    el.style.display = 'none';
  });

  // --- Show target section ---
  const targetCfg = ROUTES[route];
  if (targetCfg) {
    // Use sectionLoggedIn if user is logged in and the route has it
    const sectionId = (user && targetCfg.sectionLoggedIn) ? targetCfg.sectionLoggedIn : targetCfg.section;
    if (sectionId) {
      const target = document.getElementById(sectionId);
      if (target) {
        target.style.display = '';
        target.classList.add('act');
      }
    }
  }

  // --- Sidebar active state (uses original .mi buttons with data-s) ---
  document.querySelectorAll('.mi').forEach((btn) => {
    btn.classList.toggle('act', btn.dataset.s === route);
  });

  // --- Close mobile sidebar if open ---
  const overlay = document.getElementById('mov');
  if (overlay) overlay.classList.remove('op');
  const panel = document.getElementById('mpnl');
  if (panel) panel.classList.remove('op');

  // --- Call the route's render function (window global) ---
  let rendererName = ROUTE_RENDERERS[route];
  // For logged-in external users on portafolio, use rInv (CRM inventory renderer)
  if (route === 'portafolio' && user && (user.tipo_usuario === 'cliente' || user.tipo_usuario === 'vendedor_externo' || user.tipo_usuario === 'propietario')) {
    rendererName = 'rInv';
  }
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
