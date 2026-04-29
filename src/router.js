/**
 * House CRM - Hash-based SPA Router
 * Replaces legacy go() function with a proper router.
 */

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------
// Internal CRM routes
const ROUTES_INTERNAL = ['inv','mis','reg','alertas','portales','dash','comando','agenda','citas','mis-negocios','users','perfil','papelera'];
// Public user routes (tipo_usuario === 'publico')
const ROUTES_PUBLICO = ['portafolio','favoritos','mis-intereses','mis-citas','cuenta','mis-pub','publicar','mis-negocios','mis-inm','mensajes','referir','mis-referidos'];

const ROUTES = {
  'inv':      { section: 'sec-inv',      label: 'Inventario',     icon: '\u{1F3E0}', auth: true, internal: true },
  'mis':      { section: 'sec-mis',      label: 'Mis Inmuebles',  icon: '\u{1F500}', auth: true, internal: true },
  'reg':      { section: 'sec-reg',      label: 'Registrar',      icon: '\u2795',    auth: true, internal: true },
  'alertas':  { section: 'sec-alertas',  label: 'Alertas',        icon: '\u{1F514}', auth: true, internal: true },
  'portales': { section: 'sec-portales', label: 'Portales',       icon: '\u{1F310}', auth: true, internal: true },
  'dash':     { section: 'sec-dash',     label: 'Dashboard',      icon: '\u{1F4CA}', auth: true, internal: true },
  'agenda':   { section: 'sec-agenda',   label: 'Agenda',         icon: '\u{1F4C5}', auth: true, internal: true, roles: ['admin', 'oficina', 'gestor'] },
  'users':    { section: 'sec-users',    label: 'Usuarios',       icon: '\u{1F465}', auth: true, internal: true, roles: ['admin'] },
  'perfil':   { section: 'sec-perfil',   label: 'Mi Perfil',      icon: '\u2699\uFE0F', auth: true, internal: true },
  'papelera': { section: 'sec-papelera', label: 'Papelera',       icon: '\u{1F5D1}\uFE0F', auth: true, internal: true, roles: ['admin'] },
  'ver':      { section: null,           label: 'Vista P\u00FAblica', auth: false },
  // v2 \u2014 nueva ficha de propiedad editorial. Hash: #/p/HOUSE-178
  'p':        { section: 'sec-property-detail', label: 'Propiedad',  auth: false },
  // v2 \u2014 portfolio list (home p\u00fablica editorial). Hash: #/v2
  'v2':       { section: 'sec-portfolio-list',  label: 'Portafolio v2', auth: false },
  // External user routes
  'portafolio': { section: 'sec-portafolio', sectionLoggedIn: 'sec-inv', label: 'Explorar', icon: '\u{1F50D}', auth: false },
  'favoritos':  { section: 'sec-favoritos',  label: 'Favoritos',       icon: '\u2764\uFE0F', auth: true },
  'mis-intereses': { section: 'sec-mis-intereses', label: 'Mis Intereses', icon: '\u{1F499}', auth: true, tipos: ['publico'] },
  'mis-citas':     { section: 'sec-mis-citas',     label: 'Mis Citas',     icon: '\u{1F4C5}', auth: true, tipos: ['publico'] },
  'citas':         { section: 'sec-citas',         label: 'Citas',          icon: '\u{1F4C5}', auth: true, internal: true },
  'comando':       { section: 'sec-comando',        label: 'Centro Comando', icon: '\u{1F3AF}', auth: true, internal: true, roles: ['admin'] },
  'negocios-admin':{ section: 'sec-negocios-admin', label: 'Negocios',       icon: '\u{1F4BC}', auth: true, internal: true, roles: ['admin'] },
  'arriendos-admin':{ section: 'sec-arriendos-admin',label: 'Arriendos',     icon: '\u{1F511}', auth: true, internal: true, roles: ['admin'] },
  'config-usuarios':{ section: 'sec-config-usuarios',label: 'Config Usuarios',icon: '\u2699\uFE0F', auth: true, internal: true, roles: ['admin'] },
  'sugerencias-admin':{ section: 'sec-sugerencias-admin',label: 'Sugerencias',icon: '\u{1F3AF}', auth: true, internal: true, roles: ['admin'] },
  'interesados':   { section: 'sec-interesados',     label: 'Interesados',     icon: '\u{1F464}', auth: true, internal: true },
  'mis-negocios':  { section: 'sec-mis-negocios',  label: 'Mis Negocios',   icon: '\u{1F3C6}', auth: true },
  'cuenta':     { section: 'sec-cuenta',     label: 'Mi Cuenta',       icon: '\u2699\uFE0F', auth: true, tipos: ['publico'] },
  'mis-pub':    { section: 'sec-mis-pub',    label: 'Mis Publicaciones', icon: '\u{1F3E0}', auth: true, tipos: ['publico'] },
  'publicar':   { section: 'sec-publicar',   label: 'Publicar',        icon: '\u2795',    auth: true, tipos: ['publico'] },
  'mensajes':   { section: 'sec-mensajes',   label: 'Mensajes',        icon: '\u{1F4AC}', auth: true, tipos: ['publico'] },
  'mis-inm':    { section: 'sec-mis-inm',    label: 'Mis Inmuebles',   icon: '\u{1F3E0}', auth: true, tipos: ['publico'] },
  'espera':     { section: 'sec-espera',     label: 'En Espera',       icon: '\u23F3',    auth: true, tipos: ['publico'] },
  'propietarios': { section: 'sec-propietarios', label: 'Propietarios', icon: '\u{1F3E0}', auth: false },
  'referidos-landing': { section: 'sec-referidos-landing', label: 'Programa Referidos', icon: '\u{1F4B0}', auth: false },
  'registro':          { section: 'sec-landing-roles',    label: 'Registro',           icon: '\u{1F4DD}', auth: false },
  'metodo-pago':  { section: 'sec-metodo-pago', label: 'M\u00E9todo de pago', icon: '\u{1F4B3}', auth: true },
  'admin-pagos':  { section: 'sec-admin-pagos', label: 'Pagos',          icon: '\u{1F4B0}', auth: true, roles: ['admin'] },
  'referir':    { section: 'sec-referir',   label: 'Referir',         icon: '\u{1F91D}', auth: true },
  'mis-referidos': { section: 'sec-misref', label: 'Mis Referidos',   icon: '\u{1F4B0}', auth: true },
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
  'users':    'rUsers',
  'perfil':   'rPerfil',
  'papelera': 'rPapelera',
  // External
  'portafolio': 'rPortafolio',
  'favoritos':  'rFavoritos',
  'mis-intereses': 'rMisIntereses',
  'mis-citas': 'rMisCitas',
  'citas':     'rCitasInternal',
  'comando':      'rComando',
  'negocios-admin': 'rNegociosAdmin',
  'arriendos-admin': 'rArriendosAdmin',
  'config-usuarios': 'rConfigUsuarios',
  'sugerencias-admin': 'rSugerenciasAdmin',
  'interesados': 'rInteresados',
  'mis-negocios': 'rMisNegocios',
  'cuenta':     'rCuenta',
  'mis-pub':    'rMisPub',
  'publicar':   'rPublicar',
  'espera':     'rEspera',
  'mensajes':   'renderMensajes',
  'mis-inm':    'renderMisInmueblesExt',
  'propietarios': 'renderPropietariosLanding',
  'referidos-landing': 'renderReferidosLanding',
  'registro':          'renderLandingRoles',
  'metodo-pago':  'renderPaymentSetup',
  'admin-pagos':  'renderAdminPaymentPanel',
  'referir':    'renderReferralForm',
  'mis-referidos': 'renderMisReferidos',
  // v2 ficha + portfolio
  'p':                'rPropertyV2',
  'v2':               'rPortfolioListV2',
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
  if (tipo === 'publico') return 'portafolio';
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
  const isExterno = tipoU === 'publico';
  const defaultRoute = isExterno ? 'portafolio' : 'inv';

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

  // --- Internal users can't access external-only routes ---
  if (user && !isExterno) {
    if (route === 'portafolio') { route = 'inv'; routeCfg = ROUTES[route]; }
    else if (routeCfg.tipos && !routeCfg.tipos.includes('interno')) { route = 'inv'; routeCfg = ROUTES[route]; }
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
  // Si el hash actual ya empieza con la ruta correcta (incluyendo params,
  // p.ej. #/p/HOUSE-178), lo dejamos tal cual para no perder los params.
  const desired = `#/${route}`;
  const currentRouteKey = location.hash.replace(/^#\/?/, '').split('/')[0];
  if (currentRouteKey !== route) {
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
    // For /portafolio use sec-inv for ALL (visitors + logged-in externals)
    // so the filter UX is identical. Visitor-specific UI differences
    // (hide Míos, gate Favs) are handled inside rInv/load flow.
    const useLoggedInSection = (route === 'portafolio') || (user && targetCfg.sectionLoggedIn);
    const sectionId = useLoggedInSection ? (targetCfg.sectionLoggedIn || targetCfg.section) : targetCfg.section;
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
  // For /portafolio use rInv (CRM inventory renderer) for ALL users including visitors.
  // rPortafolio se mantiene como no-op para no romper nada.
  if (route === 'portafolio') {
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
