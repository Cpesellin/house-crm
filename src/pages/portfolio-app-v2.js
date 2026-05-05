/**
 * HOUSE v2 — Portfolio App (webapp.jsx con sidebar)
 *
 * Ruta: #/v2-app
 *
 * Versión "logged-in" del portafolio. Diferencia con #/v2:
 *  - Sidebar a la izquierda con menú + promo card + user info
 *  - AppTopBar con search + ⌘K + sparkle/heart/user
 *  - PortfolioBanner con gradient azul oscuro y stats
 *  - FilterChipBar (chips de Negocio/Ciudad/Tipo/Precio/Asesor) con iconos coloreados
 *  - FeaturedHero antes del grid
 *  - Results header con view toggle (grid/list/map) + sort
 *
 * Mobile (<960px): sidebar se oculta, topbar simplificada.
 */

import { getSupabaseClient } from '../config/supabase.js';
import '../styles/tokens-v2.css';
import '../styles/portfolio-app-v2.css';

const SB = () => getSupabaseClient();
const _esc = (s) =>
  window.escapeHtml
    ? window.escapeHtml(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
      );
const _cld = (u, w) => (window.cldOpt ? window.cldOpt(u, w) : u);

// ICONS — reusando set
const ICONS = {
  bed: '<path d="M3 18v-6h18v6"/><path d="M3 18v3"/><path d="M21 18v3"/><path d="M3 12V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5"/><path d="M7 12v-1a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1"/>',
  bath: '<path d="M4 12h16v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 2-2h1"/><path d="M9 4l2 2"/><path d="M3 20l1 2"/><path d="M21 20l-1 2"/>',
  area: '<path d="M3 8V3h5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="M21 16v5h-5"/>',
  car: '<path d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5"/><rect x="3" y="13" width="18" height="6" rx="1.5"/><circle cx="7.5" cy="19.5" r="1.5"/><circle cx="16.5" cy="19.5" r="1.5"/>',
  star: '<path d="M12 3l2.6 5.7 6.2.6-4.7 4.3 1.4 6.1L12 16.9 6.5 19.7l1.4-6.1L3.2 9.3l6.2-.6z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  mappin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  'chev-r': '<path d="M9 18l6-6-6-6"/>',
  'chev-d': '<path d="M6 9l6 6 6-6"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  sparkle: '<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/>',
  share: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4"/><path d="M8 13l8 4"/>',
  whats: '<path d="M3 21l1.7-5.1a8 8 0 1 1 3.4 3.4z"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  filter: '<path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/>',
};
function icon(name, size = 14, color) {
  const inner = ICONS[name];
  if (!inner) return '';
  const c = color ? `style="color:${color}"` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${c}>${inner}</svg>`;
}

// HELPERS
function fmtCOP(n) { if (!n || n <= 0) return ''; return '$' + Math.round(n).toLocaleString('es-CO'); }
function dealLabel(p) {
  const n = (p.negociacion || '').toLowerCase();
  if (n.includes('arriendo') && n.includes('venta')) return 'venta';
  if (n.includes('arriendo')) return 'arriendo';
  return 'venta';
}
function priceFor(p) {
  const d = dealLabel(p);
  return d === 'arriendo' ? p.precio_arriendo : p.precio_venta;
}
function searchNorm(s) { return window._searchNorm ? window._searchNorm(s) : String(s || '').toLowerCase(); }
function isNew(p) {
  if (!p.created_at) return false;
  return (Date.now() - new Date(p.created_at).getTime()) / 864e5 <= 7;
}
function capitalize(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }

// STATE — multi-select Sets compatibles con window.F del CRM
const state = {
  data: [],
  filtered: [],
  search: '',
  // Sets en lugar de strings: permiten multi-select igual que el CRM existente
  neg: new Set(),    // 'venta', 'arriendo', 'ambas'
  ciu: new Set(),    // 'Pereira', 'Dosquebradas', ...
  tipo: new Set(),   // 'Apartamento', 'Casa', ...
  precioMin: null,
  precioMax: null,
  view: 'grid',
  visibleCount: 12,
  openDropdown: null, // 'neg' | 'ciu' | 'tipo' | 'precio' | null
};

// DATA
async function fetchPortfolio() {
  if (Array.isArray(window.D) && window.D.length) {
    return window.D.filter((p) => !p.eliminado && p.estado !== 'Retirado');
  }
  try {
    const { data } = await SB()
      .from('inmuebles')
      .select(
        'id,codigo_house,tipo,negociacion,ciudad,barrio,direccion_publica,precio_venta,precio_arriendo,habitaciones,banos,area_construida,estrato,parqueaderos,estado,created_at,captador:usuarios!captador_id(id,nombre,foto),fotos(url,url_thumb,orden)'
      )
      .eq('eliminado', false)
      .eq('estado_revision', 'aprobado')
      .in('estado', ['Disponible', 'Aún Disponible'])
      .order('created_at', { ascending: false })
      .limit(200);
    return data || [];
  } catch (e) {
    console.error('[v2/app] fetch error', e);
    return [];
  }
}

// Detectar si un inmueble matchea cada criterio. Mismo patrón que doSearch
// del CRM: compara con .toLowerCase() en ambos lados para tolerar variantes
// de casing en BD (PEREIRA vs Pereira).
function matchesNeg(p) {
  if (state.neg.size === 0) return true;
  const n = (p.negociacion || '').toLowerCase();
  const tieneVenta = n.includes('venta');
  const tieneArriendo = n.includes('arriendo');
  const esAmbas = tieneVenta && tieneArriendo;
  if (state.neg.has('ambas') && esAmbas) return true;
  if (state.neg.has('venta') && tieneVenta) return true;
  if (state.neg.has('arriendo') && tieneArriendo) return true;
  return false;
}
function matchesCiu(p) {
  if (state.ciu.size === 0) return true;
  const c = (p.ciudad || '').toLowerCase();
  for (const v of state.ciu) if (c.includes(v.toLowerCase())) return true;
  return false;
}
function matchesTipo(p) {
  if (state.tipo.size === 0) return true;
  const t = (p.tipo || '').toLowerCase();
  for (const v of state.tipo) if (t.includes(v.toLowerCase())) return true;
  return false;
}
function matchesPrecio(p) {
  const pr = priceFor(p) || 0;
  if (state.precioMin && (pr <= 0 || pr < state.precioMin)) return false;
  if (state.precioMax && (pr <= 0 || pr > state.precioMax)) return false;
  return true;
}

function applyFilters() {
  const q = searchNorm(state.search);
  state.filtered = state.data.filter((p) => {
    if (!matchesNeg(p)) return false;
    if (!matchesCiu(p)) return false;
    if (!matchesTipo(p)) return false;
    if (!matchesPrecio(p)) return false;
    if (q) {
      const idx = p._searchIndex || searchNorm([p.tipo, p.ciudad, p.barrio, p.codigo_house, p.captador?.nombre].filter(Boolean).join(' '));
      if (!q.split(/\s+/).filter(Boolean).every((w) => idx.includes(w))) return false;
    }
    return true;
  });
}

// Cuenta cuántos inmuebles matchearían si agregáramos cada opción al filtro.
// Permite mostrar counts dinámicos en el dropdown.
function countWithOption(group, value) {
  const tmpSet = new Set(state[group]);
  tmpSet.add(value);
  const q = searchNorm(state.search);
  return state.data.filter((p) => {
    // Aplicamos todos los filtros excepto el group, que reemplazamos
    const orig = state[group];
    state[group] = tmpSet;
    let ok;
    if (group === 'neg') ok = matchesNeg(p);
    else if (group === 'ciu') ok = matchesCiu(p);
    else if (group === 'tipo') ok = matchesTipo(p);
    else ok = true;
    state[group] = orig;
    if (!ok) return false;
    // Demás filtros sin tocar
    if (group !== 'neg' && !matchesNeg(p)) return false;
    if (group !== 'ciu' && !matchesCiu(p)) return false;
    if (group !== 'tipo' && !matchesTipo(p)) return false;
    if (!matchesPrecio(p)) return false;
    if (q) {
      const idx = p._searchIndex || searchNorm([p.tipo, p.ciudad, p.barrio, p.codigo_house, p.captador?.nombre].filter(Boolean).join(' '));
      if (!q.split(/\s+/).filter(Boolean).every((w) => idx.includes(w))) return false;
    }
    return true;
  }).length;
}

// Construye opciones del dropdown a partir de la config del CRM (window.NEG_OPTS,
// CIU_OPTS, TIPO_OPTS) + opciones extra encontradas en la data real.
function getOptionsFor(group) {
  if (group === 'neg') {
    return (window.NEG_OPTS || [
      { v: 'venta', l: 'Comprar', e: '🏠', d: 'En venta' },
      { v: 'arriendo', l: 'Arrendar', e: '🔑', d: 'En arriendo' },
      { v: 'ambas', l: 'Las dos', e: '🔄', d: 'Ver todo' },
    ]).map((o) => ({ value: o.v, label: o.l, emoji: o.e, desc: o.d }));
  }
  if (group === 'ciu') {
    const cfg = window.CIU_OPTS || [];
    const fromCfg = cfg.map((o) => ({ value: o.v, label: o.v, emoji: o.e, desc: o.d || '' }));
    // Ciudades de la BD que NO están en la config (Cartago, Armenia, La Virginia, etc.)
    const inCfg = new Set(fromCfg.map((o) => o.value.toLowerCase()));
    const fromData = Array.from(new Set(state.data.map((p) => (p.ciudad || '').trim()).filter(Boolean)))
      .filter((c) => !inCfg.has(c.toLowerCase()))
      .map((c) => ({ value: c, label: c, emoji: '📍', desc: '' }));
    return [...fromCfg, ...fromData];
  }
  if (group === 'tipo') {
    const cfg = window.TIPO_OPTS || [];
    const fromCfg = cfg.map((o) => ({ value: o.v, label: o.l || o.v, emoji: o.e, desc: '' }));
    const inCfg = new Set(fromCfg.map((o) => o.value.toLowerCase()));
    const fromData = Array.from(new Set(state.data.map((p) => (p.tipo || '').trim()).filter(Boolean)))
      .filter((t) => !inCfg.has(t.toLowerCase()))
      .map((t) => ({ value: t, label: t, emoji: '🏠', desc: '' }));
    return [...fromCfg, ...fromData];
  }
  return [];
}

function chipLabel(group) {
  const set = state[group];
  if (group === 'precio') {
    if (state.precioMin || state.precioMax) {
      const min = state.precioMin ? '$' + Math.round(state.precioMin / 1e6) + 'M' : '0';
      const max = state.precioMax ? '$' + Math.round(state.precioMax / 1e6) + 'M' : 'sin tope';
      return `${min} – ${max}`;
    }
    return 'Cualquiera';
  }
  if (set.size === 0) return 'Cualquiera';
  if (set.size === 1) {
    const v = Array.from(set)[0];
    if (group === 'neg') return v === 'ambas' ? 'Las dos' : capitalize(v);
    return v;
  }
  return `${set.size} seleccionados`;
}

// ═══════════════════════════════════════════════════════════════════
// FRAGMENTS
// ═══════════════════════════════════════════════════════════════════
function renderSidebar(user) {
  const u = user || {};
  const ini = u.nombre ? u.nombre.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() : '?';
  const role = u.rol === 'admin' ? 'Admin'
    : u.rol === 'oficina' ? 'Oficina'
    : u.tipo_usuario === 'publico' ? 'Comprador · Publicador'
    : 'Asesor';

  const items = [
    { id: 'v2-app', label: 'Explorar inmuebles', icon: 'search', active: true },
    { id: 'publicar', label: 'Publicar inmueble', icon: 'home' },
    { id: 'favoritos', label: 'Favoritos', icon: 'heart' },
    { id: 'mensajes', label: 'Mensajes', icon: 'whats', badge: u.unread || 0 },
    { id: 'mis-citas', label: 'Citas', icon: 'sparkle' },
    { id: 'mis-pub', label: 'Mis inmuebles', icon: 'menu' },
    { id: 'mis-negocios', label: 'Mis negocios', icon: 'star' },
    { id: 'referir', label: 'Referir arriendo', icon: 'share' },
    { id: 'cuenta', label: 'Mi perfil', icon: 'mappin' },
  ];

  return `
    <aside class="pa-sidebar">
      <a class="pa-sb-logo" href="#/v2-app">
        <span class="pa-sb-logo-mark">${icon('home', 16)}</span>
        <span class="pa-sb-logo-text">Inmobiliaria <strong>House</strong></span>
      </a>
      <nav class="pa-sb-nav">
        ${items.map((it) => `
          <a class="pa-sb-item ${it.active ? 'is-active' : ''}" href="#/${it.id}">
            ${icon(it.icon, 15)}
            <span>${_esc(it.label)}</span>
            ${it.badge ? `<span class="pa-sb-badge">${it.badge}</span>` : ''}
          </a>
        `).join('')}
      </nav>
      <div class="pa-sb-bottom">
        <div class="pa-sb-promo">
          <div class="pa-sb-promo-icon">${icon('sparkle', 13)}</div>
          <div class="pa-sb-promo-title">¿Vas a vender o arrendar?</div>
          <div class="pa-sb-promo-sub">Publica gratis. Avalúo en 48h.</div>
          <a class="pa-sb-promo-btn" href="#/publicar" style="display:inline-block;text-align:center;text-decoration:none">Publicar inmueble</a>
        </div>
        ${user ? `
          <a class="pa-sb-user" href="#/cuenta">
            <div class="pa-sb-user-avatar">${u.foto ? `<img src="${_esc(_cld(u.foto, 'avatar'))}" alt="">` : _esc(ini)}</div>
            <div class="pa-sb-user-info">
              <div class="pa-sb-user-name">${_esc(u.nombre || 'Usuario')}</div>
              <div class="pa-sb-user-role">${_esc(role)}</div>
            </div>
            ${icon('chev-d', 11)}
          </a>
        ` : `
          <a class="pa-sb-user" href="#/portafolio?login=1">
            <div class="pa-sb-user-avatar">?</div>
            <div class="pa-sb-user-info">
              <div class="pa-sb-user-name">Ingresar</div>
              <div class="pa-sb-user-role">o registrarse</div>
            </div>
            ${icon('chev-r', 11)}
          </a>
        `}
      </div>
    </aside>
  `;
}

function renderTopBar(user) {
  const u = user || {};
  const ini = u.nombre ? u.nombre.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() : '?';
  const firstName = (u.nombre || '').split(' ')[0] || 'Tú';
  return `
    <header class="pa-topbar">
      <div class="pa-tb-search">
        ${icon('search', 16)}
        <input id="v2appQ" placeholder="Busca por barrio, código, dirección…" autocomplete="off">
        <kbd class="pa-tb-kbd">⌘ K</kbd>
      </div>
      <div class="pa-tb-actions">
        <button class="pa-tb-icon" type="button" aria-label="Notificaciones">${icon('sparkle', 15, 'var(--v2-amber)')}</button>
        <button class="pa-tb-icon has-dot" type="button" aria-label="Favoritos" onclick="location.hash='#/favoritos'">${icon('heart', 15)}</button>
        <span class="pa-tb-divider"></span>
        ${user ? `
          <a class="pa-tb-user" href="#/cuenta">
            <span class="pa-tb-user-avatar">${u.foto ? `<img src="${_esc(_cld(u.foto, 'avatar'))}" alt="" style="width:100%;height:100%;border-radius:inherit;object-fit:cover">` : _esc(ini)}</span>
            ${_esc(firstName)}
            ${icon('chev-d', 11)}
          </a>
        ` : `
          <a class="pa-tb-user" href="#/portafolio?login=1">
            <span class="pa-tb-user-avatar">?</span>
            Ingresar
            ${icon('chev-r', 11)}
          </a>
        `}
      </div>
    </header>
  `;
}

function renderBanner(stats) {
  return `
    <div class="pa-banner">
      <svg class="pa-banner-dots" viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="paBannerDots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#fff"/>
          </pattern>
        </defs>
        <rect width="240" height="140" fill="url(#paBannerDots)"/>
      </svg>
      <div class="pa-banner-content">
        <div class="pa-banner-eyebrow">Portafolio · Eje Cafetero</div>
        <h1 class="pa-banner-title">Encuentra el inmueble <em>perfecto</em> para ti.</h1>
        <div class="pa-banner-sub">${stats.total} propiedades · Pereira, Dosquebradas y alrededores</div>
      </div>
      <div class="pa-banner-stats">
        <div class="pa-banner-stat"><div class="pa-banner-stat-n">${stats.total}</div><div class="pa-banner-stat-l">Total</div></div>
        <div class="pa-banner-sep"></div>
        <div class="pa-banner-stat"><div class="pa-banner-stat-n" style="color:#93c5fd">${stats.venta}</div><div class="pa-banner-stat-l">Venta</div></div>
        <div class="pa-banner-stat"><div class="pa-banner-stat-n" style="color:#86efac">${stats.arriendo}</div><div class="pa-banner-stat-l">Arriendo</div></div>
        <div class="pa-banner-stat"><div class="pa-banner-stat-n" style="color:#fcd34d">${stats.ambos}</div><div class="pa-banner-stat-l">Ambos</div></div>
      </div>
    </div>
  `;
}

function renderChips() {
  // Cada chip muestra count (cuántos elementos seleccionados) si > 0,
  // y abre un dropdown popover en click. Patrón inspirado en el filtro
  // del CRM existente pero con UX más liviana (sin abrir un panel grande).
  const c = (group) => state[group].size;
  const chipClass = (group) => `pa-chip${state[group].size > 0 ? ' is-active' : ''}`;
  const priceClass = `pa-chip${(state.precioMin || state.precioMax) ? ' is-active' : ''}`;

  return `
    <div class="pa-chips">
      <button class="${chipClass('neg')}" type="button" id="v2appChipNeg">
        ${icon('sparkle', 13, 'var(--v2-amber)')}
        <span class="pa-chip-lab">Negocio</span>
        <span>${_esc(chipLabel('neg'))}</span>
        ${c('neg') > 1 ? `<span class="pa-chip-count">${c('neg')}</span>` : ''}
        ${icon('chev-d', 11)}
      </button>
      <button class="${chipClass('ciu')}" type="button" id="v2appChipCiu">
        ${icon('mappin', 13, 'var(--v2-primary)')}
        <span class="pa-chip-lab">Ciudad</span>
        <span>${_esc(chipLabel('ciu'))}</span>
        ${c('ciu') > 1 ? `<span class="pa-chip-count">${c('ciu')}</span>` : ''}
        ${icon('chev-d', 11)}
      </button>
      <button class="${chipClass('tipo')}" type="button" id="v2appChipTipo">
        ${icon('home', 13, 'var(--v2-green)')}
        <span class="pa-chip-lab">Tipo</span>
        <span>${_esc(chipLabel('tipo'))}</span>
        ${c('tipo') > 1 ? `<span class="pa-chip-count">${c('tipo')}</span>` : ''}
        ${icon('chev-d', 11)}
      </button>
      <button class="${priceClass}" type="button" id="v2appChipPrecio">
        ${icon('star', 13, 'var(--v2-amber)')}
        <span class="pa-chip-lab">Precio</span>
        <span>${_esc(chipLabel('precio'))}</span>
        ${icon('chev-d', 11)}
      </button>
      ${(c('neg') + c('ciu') + c('tipo') + (state.precioMin || state.precioMax ? 1 : 0)) > 0 ? `
        <button class="pa-chip" type="button" id="v2appChipsClear" style="color:var(--v2-red);font-weight:700">
          ✕ Limpiar
        </button>
      ` : ''}
      <span class="pa-chip-divider"></span>
      <a class="pa-chip" href="#/favoritos">
        ${icon('heart', 13, 'var(--v2-red)')}
        Favoritos
      </a>
    </div>
  `;
}

// Renderiza el dropdown popover anclado al chip correspondiente
function renderDropdown(group, anchorRect) {
  if (group === 'precio') return renderPriceDropdown(anchorRect);

  const opts = getOptionsFor(group);
  const titles = { neg: 'Tipo de negocio', ciu: 'Ciudad', tipo: 'Tipo de inmueble' };

  // Preparar items con count
  const items = opts.map((o) => {
    const isSelected = state[group].has(o.value);
    // Count: si NO está seleccionado, qué pasaría si lo agregamos.
    // Si SÍ está seleccionado, cuántos hay actualmente con ese filtro
    // (usamos el count actual del set sin tocarlo y mostramos el que aporta).
    let count;
    if (isSelected) {
      // Count cuántos elementos del filtered actual matchean SOLO esta opción
      count = state.data.filter((p) => {
        // Aplicamos todos los filtros pero sólo esta opción del group
        const single = new Set([o.value]);
        const orig = state[group];
        state[group] = single;
        const ok = matchesNeg(p) && matchesCiu(p) && matchesTipo(p) && matchesPrecio(p);
        state[group] = orig;
        if (!ok) return false;
        return true;
      }).length;
    } else {
      count = countWithOption(group, o.value);
    }
    return { ...o, isSelected, count };
  });

  const left = Math.max(8, Math.min(window.innerWidth - 260, anchorRect.left));
  const top = anchorRect.bottom + 6;

  return `
    <div class="pa-dropdown-back" id="v2appDdBack"></div>
    <div class="pa-dropdown" id="v2appDd" style="left:${left}px;top:${top}px;">
      <div class="pa-dropdown-title">${titles[group] || ''}</div>
      <div class="pa-dropdown-list">
        ${items.map((o) => `
          <button class="pa-dropdown-opt ${o.isSelected ? 'is-selected' : ''}"
                  type="button" data-group="${group}" data-value="${_esc(o.value)}">
            <span class="pa-dropdown-opt-emoji">${_esc(o.emoji || '•')}</span>
            <span class="pa-dropdown-opt-info">
              <span class="pa-dropdown-opt-label">${_esc(o.label)}</span>
              ${o.desc ? `<span class="pa-dropdown-opt-desc">${_esc(o.desc)}</span>` : ''}
            </span>
            <span class="pa-dropdown-opt-count">${o.count}</span>
            <span class="pa-dropdown-opt-check">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg>
            </span>
          </button>
        `).join('')}
      </div>
      <div class="pa-dropdown-foot">
        <button type="button" id="v2appDdClear">Limpiar</button>
        <button type="button" class="is-primary" id="v2appDdClose">Listo</button>
      </div>
    </div>
  `;
}

function renderPriceDropdown(anchorRect) {
  const left = Math.max(8, Math.min(window.innerWidth - 260, anchorRect.left));
  const top = anchorRect.bottom + 6;
  return `
    <div class="pa-dropdown-back" id="v2appDdBack"></div>
    <div class="pa-dropdown" id="v2appDd" style="left:${left}px;top:${top}px;">
      <div class="pa-dropdown-title">Precio</div>
      <div class="pa-dropdown-price">
        <label>Mínimo
          <input type="number" id="v2appPmin" placeholder="0" value="${state.precioMin || ''}" inputmode="numeric">
        </label>
        <label>Máximo
          <input type="number" id="v2appPmax" placeholder="Sin tope" value="${state.precioMax || ''}" inputmode="numeric">
        </label>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <button type="button" class="pa-chip" data-pq="500">Hasta $500M</button>
          <button type="button" class="pa-chip" data-pq="800">Hasta $800M</button>
          <button type="button" class="pa-chip" data-pq="1500">Hasta $1.500M</button>
        </div>
      </div>
      <div class="pa-dropdown-foot">
        <button type="button" id="v2appDdClear">Limpiar</button>
        <button type="button" class="is-primary" id="v2appDdClose">Aplicar</button>
      </div>
    </div>
  `;
}

function renderFeatured() {
  const cand = state.filtered.find((p) => Array.isArray(p.fotos) && p.fotos.length);
  if (!cand) return '';
  const fotos = [...cand.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const img = _cld(fotos[0].url || fotos[0].url_thumb, 1600);
  const deal = dealLabel(cand);
  const precio = priceFor(cand);
  const code = cand.codigo_house || cand.id;
  return `
    <a class="pa-featured" href="#/p/${_esc(code)}">
      <div class="pa-featured-img"><img src="${_esc(img)}" alt="" loading="lazy"></div>
      <div class="pa-featured-overlay"></div>
      <div class="pa-featured-content">
        <div class="pa-featured-pills">
          <span class="pa-pill pa-pill-gold">${icon('star', 12)} Destacado</span>
          ${isNew(cand) ? '<span class="pa-pill pa-pill-dark">Nuevo</span>' : ''}
        </div>
        <h2 class="pa-featured-h2">${_esc(cand.tipo || 'Inmueble')} en ${_esc(cand.barrio || cand.ciudad || '')}</h2>
        <div class="pa-featured-meta">${icon('mappin', 13)} ${_esc([cand.barrio, cand.ciudad].filter(Boolean).join(', '))}</div>
        <div class="pa-featured-foot">
          <div>
            <div class="pa-featured-price-eyebrow">Precio de ${deal}</div>
            <div class="pa-featured-price">${_esc(fmtCOP(precio) || 'Consultar')}${deal === 'arriendo' ? ' /mes' : ''}</div>
          </div>
          <span class="pa-featured-cta">Ver propiedad ${icon('chev-r', 14)}</span>
        </div>
      </div>
    </a>
  `;
}

// "Lo que seleccionaste" — pills removibles de cada filtro activo +
// botón "Limpiar todos los filtros". Sólo se renderiza si hay filtros.
function renderSelBar() {
  const NEG = window.NEG_OPTS || [];
  const TIPO = window.TIPO_OPTS || [];

  const pills = [];

  // Negocio
  state.neg.forEach((v) => {
    const o = NEG.find((x) => x.v === v);
    pills.push({
      key: 'neg-' + v,
      label: `${o ? o.e + ' ' + o.l : capitalize(v)}`,
      group: 'neg',
      value: v,
    });
  });
  // Ciudad
  state.ciu.forEach((v) => {
    pills.push({
      key: 'ciu-' + v,
      label: `📍 ${v}`,
      group: 'ciu',
      value: v,
    });
  });
  // Tipo
  state.tipo.forEach((v) => {
    const o = TIPO.find((x) => x.v === v);
    pills.push({
      key: 'tipo-' + v,
      label: `${o ? o.e + ' ' + (o.l || o.v) : v}`,
      group: 'tipo',
      value: v,
    });
  });
  // Precio
  if (state.precioMin || state.precioMax) {
    const min = state.precioMin ? '$' + Math.round(state.precioMin / 1e6) + 'M' : '$0';
    const max = state.precioMax ? '$' + Math.round(state.precioMax / 1e6) + 'M' : '∞';
    pills.push({
      key: 'precio',
      label: `💰 ${min} – ${max}`,
      group: 'precio',
      value: null,
    });
  }
  // Búsqueda
  if (state.search && state.search.trim()) {
    pills.push({
      key: 'search',
      label: `🔍 "${state.search.trim()}"`,
      group: 'search',
      value: null,
    });
  }

  if (pills.length === 0) return '';

  return `
    <div class="pa-selbar">
      <div class="pa-selbar-title">Lo que seleccionaste</div>
      <div class="pa-selbar-pills">
        ${pills.map((p) => `
          <button class="pa-selpill" type="button"
                  data-group="${_esc(p.group)}" data-value="${_esc(p.value || '')}">
            ${_esc(p.label)}
            <span class="pa-selpill-x">✕</span>
          </button>
        `).join('')}
      </div>
      <button class="pa-selbar-clearall" type="button" id="v2appSelClearAll">
        🗑️ Limpiar todos los filtros
      </button>
    </div>
  `;
}

function renderResults() {
  // Subtitle a partir de los Sets (no strings) — describe los filtros activos
  const subParts = [];
  if (state.neg.size) subParts.push(Array.from(state.neg).map(capitalize).join('/'));
  if (state.tipo.size) subParts.push(Array.from(state.tipo).join('/'));
  if (state.ciu.size) subParts.push(Array.from(state.ciu).join('/'));
  if (state.precioMin || state.precioMax) {
    const min = state.precioMin ? '$' + Math.round(state.precioMin / 1e6) + 'M' : '0';
    const max = state.precioMax ? '$' + Math.round(state.precioMax / 1e6) + 'M' : 'sin tope';
    subParts.push(`${min}–${max}`);
  }
  const sub = subParts.length ? subParts.join(' · ') : 'ordenados por más recientes';

  return `
    <div class="pa-results-head">
      <div class="pa-results-info">
        <h2 class="pa-results-count">${state.filtered.length} inmuebles</h2>
        <span class="pa-results-sub">· ${_esc(sub)}</span>
      </div>
      <div class="pa-results-actions">
        <div class="pa-view-toggle" id="v2appView">
          <button class="pa-view-btn ${state.view === 'grid' ? 'is-active' : ''}" type="button" data-v="grid">${icon('menu', 12)} <span>Grid</span></button>
          <button class="pa-view-btn ${state.view === 'list' ? 'is-active' : ''}" type="button" data-v="list">${icon('filter', 12)} <span>Lista</span></button>
          <button class="pa-view-btn ${state.view === 'map' ? 'is-active' : ''}" type="button" data-v="map">${icon('mappin', 12)} <span>Mapa</span></button>
        </div>
        <button class="pa-sort" type="button">Más recientes ${icon('chev-d', 11)}</button>
      </div>
    </div>

    ${state.filtered.length === 0 ? `
      <div class="pa-empty">
        <h3>Sin resultados</h3>
        <p style="color:var(--v2-ink-3);font-size:14px;margin:0 0 16px">No encontramos propiedades con esos filtros.</p>
        <button class="pa-sb-promo-btn" type="button" id="v2appClear" style="display:inline-block;width:auto;padding:8px 18px">Limpiar filtros</button>
      </div>
    ` : `
      <div class="pa-grid">
        ${state.filtered.slice(0, state.visibleCount).map(renderCard).join('')}
      </div>
      ${state.filtered.length > state.visibleCount ? `
        <div class="pa-load-more">
          <button type="button" id="v2appMore">Cargar más propiedades</button>
        </div>
      ` : ''}
    `}
  `;
}

function renderCard(p) {
  const fotos = Array.isArray(p.fotos) ? [...p.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0)) : [];
  const thumb = fotos.length ? _cld(fotos[0].url_thumb || fotos[0].url, 600) : '';
  const code = p.codigo_house || p.id;
  const deal = dealLabel(p);
  const precio = priceFor(p);
  const a = p.captador || {};
  const ini = (a.nombre || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';
  const isFav = (window.FAVS || []).includes(p.id);

  const dealPill = deal === 'venta'
    ? '<span class="pa-pill pa-pill-blue">En venta</span>'
    : '<span class="pa-pill pa-pill-green">En arriendo</span>';

  return `
    <a class="pa-card" href="#/p/${_esc(code)}">
      <div class="pa-card-img">
        ${thumb ? `<img loading="lazy" src="${_esc(thumb)}" alt="">` : ''}
        <div class="pa-card-badges">
          ${dealPill}
          ${isNew(p) ? '<span class="pa-pill pa-pill-dark">Nuevo</span>' : ''}
        </div>
        <div class="pa-card-actions">
          <button class="pa-card-iconbtn" type="button" aria-label="Compartir"
                  onclick="event.preventDefault();event.stopPropagation();window._v2appShare&&window._v2appShare('${_esc(code)}','${_esc(p.tipo || 'Inmueble')} en ${_esc(p.barrio || p.ciudad || '')}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4"/><path d="M8 13l8 4"/></svg>
          </button>
          <button class="pa-card-iconbtn ${isFav ? 'is-faved' : ''}" type="button" aria-label="Favorito"
                  onclick="event.preventDefault();event.stopPropagation();window._v2appFav&&window._v2appFav('${_esc(p.id)}', this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>
          </button>
        </div>
        ${fotos.length ? `<div class="pa-card-photos">1 / ${fotos.length}</div>` : ''}
      </div>
      <div class="pa-card-body">
        <div>
          <div class="pa-card-eyebrow">${_esc(p.tipo || 'Inmueble')} · ${_esc(p.codigo_house || code)}</div>
          <h3 class="pa-card-title">${_esc(p.tipo || 'Inmueble')} en ${_esc(p.barrio || p.ciudad || '')}</h3>
          <div class="pa-card-loc">${icon('mappin', 12)}<span>${_esc([p.barrio, p.ciudad].filter(Boolean).join(', '))}</span></div>
        </div>
        <div class="pa-card-price">
          ${_esc(fmtCOP(precio) || 'Consultar')}
          ${deal === 'arriendo' ? '<span class="pa-card-price-period"> /mes</span>' : ''}
        </div>
        <div class="pa-card-specs">
          ${p.habitaciones ? `<span class="pa-spec">${icon('bed', 14)}<b>${_esc(p.habitaciones)}</b><span>hab</span></span>` : ''}
          ${p.banos ? `<span class="pa-spec">${icon('bath', 14)}<b>${_esc(p.banos)}</b><span>baños</span></span>` : ''}
          ${p.area_construida ? `<span class="pa-spec">${icon('area', 14)}<b>${_esc(p.area_construida)}m²</b></span>` : ''}
          ${p.parqueaderos ? `<span class="pa-spec">${icon('car', 14)}<b>${_esc(p.parqueaderos)}</b></span>` : ''}
        </div>
        <div class="pa-card-foot">
          <div class="pa-card-advisor">
            <div class="pa-card-advisor-avatar">${a.foto ? `<img src="${_esc(_cld(a.foto, 'avatar'))}" alt="">` : _esc(ini)}</div>
            <div class="pa-card-advisor-name">${_esc(a.nombre || 'House')}</div>
          </div>
          <span class="pa-card-link">Ver detalle ${icon('chev-r', 13)}</span>
        </div>
      </div>
    </a>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════════
async function renderPortfolioAppV2() {
  const root = document.getElementById('sec-portfolio-app');
  if (!root) return;
  root.classList.add('v2-page', 'app');

  // Skeleton
  root.innerHTML = `
    <aside class="pa-sidebar"><div class="pa-skeleton" style="height:30px;width:140px"></div></aside>
    <div class="pa-main">
      <div style="padding:22px 28px"><div class="pa-skeleton" style="height:100px;border-radius:14px"></div></div>
    </div>
  `;

  state.data = await fetchPortfolio();
  applyFilters();

  const stats = {
    total: state.data.length,
    venta: state.data.filter((p) => dealLabel(p) === 'venta' && !((p.negociacion || '').toLowerCase().includes('arriendo') && (p.negociacion || '').toLowerCase().includes('venta'))).length,
    arriendo: state.data.filter((p) => dealLabel(p) === 'arriendo').length,
    ambos: state.data.filter((p) => {
      const n = (p.negociacion || '').toLowerCase();
      return n.includes('venta') && n.includes('arriendo');
    }).length,
  };

  const user = window.userStore?.get();

  const paint = () => {
    applyFilters();
    root.innerHTML = `
      ${renderSidebar(user)}
      <div class="pa-main">
        ${renderTopBar(user)}
        <div class="pa-content">
          ${renderBanner(stats)}
          ${renderChips()}
          ${renderSelBar()}
          ${renderFeatured()}
          ${renderResults()}
        </div>
      </div>
      <!-- Contenedor para dropdowns flotantes (popovers) -->
      <div id="v2appDdRoot"></div>
    `;
    bindEvents();
  };

  function closeDropdown() {
    const r = document.getElementById('v2appDdRoot');
    if (r) r.innerHTML = '';
  }

  function bindDropdownEvents(group) {
    const back = document.getElementById('v2appDdBack');
    if (back) back.addEventListener('click', closeDropdown);
    const closeBtn = document.getElementById('v2appDdClose');
    if (closeBtn) closeBtn.addEventListener('click', () => { closeDropdown(); paint(); });

    if (group === 'precio') {
      const pmin = document.getElementById('v2appPmin');
      const pmax = document.getElementById('v2appPmax');
      const sync = () => {
        state.precioMin = pmin && pmin.value ? Number(pmin.value) : null;
        state.precioMax = pmax && pmax.value ? Number(pmax.value) : null;
      };
      if (pmin) pmin.addEventListener('input', sync);
      if (pmax) pmax.addEventListener('input', sync);
      document.querySelectorAll('.pa-dropdown [data-pq]').forEach((b) => {
        b.addEventListener('click', () => {
          const m = Number(b.dataset.pq) * 1_000_000;
          state.precioMin = null;
          state.precioMax = m;
          if (pmin) pmin.value = '';
          if (pmax) pmax.value = m;
        });
      });
      const clear = document.getElementById('v2appDdClear');
      if (clear) clear.addEventListener('click', () => {
        state.precioMin = null; state.precioMax = null;
        if (pmin) pmin.value = '';
        if (pmax) pmax.value = '';
      });
      return;
    }

    // Multi-select para neg/ciu/tipo
    document.querySelectorAll('.pa-dropdown-opt').forEach((el) => {
      el.addEventListener('click', () => {
        const g = el.dataset.group;
        const v = el.dataset.value;
        if (state[g].has(v)) state[g].delete(v);
        else state[g].add(v);
        // Re-render dropdown manteniéndolo abierto (counts cambian)
        const chip = document.getElementById('v2appChip' + g.charAt(0).toUpperCase() + g.slice(1));
        if (chip) {
          // Actualizar chips/results sin cerrar dropdown
          repaintChipsAndResults();
          // Re-render dropdown con nuevos counts
          const r2 = chip.getBoundingClientRect();
          const ddRoot = document.getElementById('v2appDdRoot');
          if (ddRoot) ddRoot.innerHTML = renderDropdown(g, r2);
          bindDropdownEvents(g);
        }
      });
    });
    const clear = document.getElementById('v2appDdClear');
    if (clear) clear.addEventListener('click', () => {
      state[group].clear();
      const chip = document.getElementById('v2appChip' + group.charAt(0).toUpperCase() + group.slice(1));
      repaintChipsAndResults();
      if (chip) {
        const r2 = chip.getBoundingClientRect();
        const ddRoot = document.getElementById('v2appDdRoot');
        if (ddRoot) ddRoot.innerHTML = renderDropdown(group, r2);
        bindDropdownEvents(group);
      }
    });
  }

  function repaintChipsAndResults() {
    applyFilters();
    // Repintar la sección de chips
    const chipsHost = root.querySelector('.pa-chips');
    if (chipsHost) {
      const tmp = document.createElement('div');
      tmp.innerHTML = renderChips();
      chipsHost.replaceWith(tmp.firstElementChild);
      // Re-bind chip clicks
      ['Neg', 'Ciu', 'Tipo', 'Precio'].forEach((g) => {
        const id = 'v2appChip' + g;
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('click', () => {
            const rect = btn.getBoundingClientRect();
            const ddRoot = document.getElementById('v2appDdRoot');
            if (!ddRoot) return;
            ddRoot.innerHTML = renderDropdown(g.toLowerCase(), rect);
            bindDropdownEvents(g.toLowerCase());
          });
        }
      });
      const cl = document.getElementById('v2appChipsClear');
      if (cl) cl.addEventListener('click', () => {
        state.neg.clear(); state.ciu.clear(); state.tipo.clear();
        state.precioMin = null; state.precioMax = null;
        paint();
      });
    }
    // Repintar results + selbar (más simple: paint completo, mantiene dropdown abierto)
    paint();
  }

  paint();

  function bindEvents() {
    // Search
    const q = document.getElementById('v2appQ');
    if (q) {
      q.value = state.search;
      let t;
      q.addEventListener('input', () => {
        state.search = q.value;
        clearTimeout(t);
        t = setTimeout(repaintResults, 250);
      });
    }

    // Chips → abrir dropdown popover
    const openDropdown = (group, btn) => {
      const rect = btn.getBoundingClientRect();
      const ddRoot = document.getElementById('v2appDdRoot');
      if (!ddRoot) return;
      ddRoot.innerHTML = renderDropdown(group, rect);
      bindDropdownEvents(group);
    };
    const chipNeg = document.getElementById('v2appChipNeg');
    if (chipNeg) chipNeg.addEventListener('click', () => openDropdown('neg', chipNeg));
    const chipCiu = document.getElementById('v2appChipCiu');
    if (chipCiu) chipCiu.addEventListener('click', () => openDropdown('ciu', chipCiu));
    const chipTipo = document.getElementById('v2appChipTipo');
    if (chipTipo) chipTipo.addEventListener('click', () => openDropdown('tipo', chipTipo));
    const chipPrecio = document.getElementById('v2appChipPrecio');
    if (chipPrecio) chipPrecio.addEventListener('click', () => openDropdown('precio', chipPrecio));

    const chipsClear = document.getElementById('v2appChipsClear');
    if (chipsClear) chipsClear.addEventListener('click', () => {
      state.neg.clear(); state.ciu.clear(); state.tipo.clear();
      state.precioMin = null; state.precioMax = null;
      paint();
    });

    // SelBar: pills removibles + clear all
    document.querySelectorAll('.pa-selpill').forEach((el) => {
      el.addEventListener('click', () => {
        const g = el.dataset.group;
        const v = el.dataset.value;
        if (g === 'neg' || g === 'ciu' || g === 'tipo') state[g].delete(v);
        else if (g === 'precio') { state.precioMin = null; state.precioMax = null; }
        else if (g === 'search') {
          state.search = '';
          const q = document.getElementById('v2appQ');
          if (q) q.value = '';
        }
        paint();
      });
    });
    const selClearAll = document.getElementById('v2appSelClearAll');
    if (selClearAll) selClearAll.addEventListener('click', () => {
      state.neg.clear(); state.ciu.clear(); state.tipo.clear();
      state.precioMin = null; state.precioMax = null;
      state.search = '';
      const q = document.getElementById('v2appQ');
      if (q) q.value = '';
      paint();
    });

    // View toggle
    const viewBar = document.getElementById('v2appView');
    if (viewBar) viewBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.pa-view-btn');
      if (!btn) return;
      state.view = btn.dataset.v;
      // Por ahora sólo cambiamos visualmente el estado activo. List/map quedan
      // como vista futura; grid es lo único implementado.
      viewBar.querySelectorAll('.pa-view-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      if (state.view !== 'grid') {
        // mensaje placeholder
        const grid = root.querySelector('.pa-grid');
        if (grid) grid.innerHTML = `<div class="pa-empty" style="grid-column:1/-1"><h3>Vista "${state.view}" próximamente</h3><p style="color:var(--v2-ink-3);font-size:13.5px">Mientras tanto seguís usando la vista en grid.</p><button class="pa-sb-promo-btn" type="button" onclick="window._v2appResetView&&window._v2appResetView()" style="display:inline-block;width:auto;padding:8px 18px">Volver a grid</button></div>`;
      } else {
        repaintResults();
      }
    });
    window._v2appResetView = () => { state.view = 'grid'; paint(); };

    // Cargar más
    const more = document.getElementById('v2appMore');
    if (more) more.addEventListener('click', () => { state.visibleCount += 12; repaintResults(); });

    // Clear
    const clear = document.getElementById('v2appClear');
    if (clear) clear.addEventListener('click', () => {
      state.search = ''; state.deal = 'todos'; state.tipo = 'todos';
      state.ciudad = 'todas'; state.precioMax = null;
      paint();
    });
  }

  function repaintResults() {
    repaintChipsAndResults();
  }

  // Toggle fav delegated
  window._v2appFav = (id, btn) => {
    if (typeof window.toggleFavorito === 'function') window.toggleFavorito(id);
    const isFav = (window.FAVS || []).includes(id);
    if (btn) btn.classList.toggle('is-faved', isFav);
  };

  // Share desde la card
  window._v2appShare = async (code, title) => {
    const url = location.origin + '/ver/' + encodeURIComponent(code);
    const text = `${title || 'Inmueble'} - Inmobiliaria House`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); return; } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      if (window.toast) window.toast('🔗 Link copiado al portapapeles');
      else alert('Link copiado: ' + url);
    } catch {
      prompt('Copia el link:', url);
    }
  };
}

if (typeof window !== 'undefined') {
  window.rPortfolioAppV2 = renderPortfolioAppV2;
}

export { renderPortfolioAppV2 };
