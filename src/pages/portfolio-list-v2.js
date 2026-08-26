/**
 * HOUSE v2 — Portfolio List
 *
 * Ruta: #/v2
 *
 * Match con listing.jsx del handoff:
 *  - TopNav con logo + nav + Ingresar/Contactar (desktop) o solo logo+CTA (mobile)
 *  - Hero con eyebrow + título grande + sub + 4 stats
 *  - Search bar con input + 4 selects (Negocio/Tipo/Ciudad/Precio) + Buscar
 *  - Chips de sugerencias (Pinares, Hasta $500M, etc.)
 *  - Featured hero card (premium destacado)
 *  - Grid de cards 3 cols desktop / 2 tablet / 1 mobile
 *  - PropertyCard con badge deal/premium, fav, photo count, eyebrow
 *    type+code, título, location, price, specs row, advisor + "Ver detalle →"
 *  - Cards linkean a #/p/CODIGO (la ficha v2 que ya existe)
 *
 * Lee window.D para no duplicar la query si ya cargó en otro flow.
 */

import { getSupabaseClient } from '../config/supabase.js';
import { soloPublicos } from '../core/visibilidad-publica.js';
import '../styles/tokens-v2.css';
import '../styles/portfolio-list-v2.css';

const SB = () => getSupabaseClient();
const _esc = (s) =>
  window.escapeHtml
    ? window.escapeHtml(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
      );
const _cld = (u, w) => (window.cldOpt ? window.cldOpt(u, w) : u);

// ═══════════════════════════════════════════════════════════════════
// ICONS — match con components.jsx (lucide-style)
// ═══════════════════════════════════════════════════════════════════
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
};

function icon(name, size = 14, fillHeart = false) {
  const inner = ICONS[name];
  if (!inner) return '';
  const fill = fillHeart && name === 'heart' ? 'currentColor' : 'none';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function fmtCOP(n) {
  if (!n || n <= 0) return '';
  return '$' + Math.round(n).toLocaleString('es-CO');
}
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
function searchNorm(s) {
  return window._searchNorm
    ? window._searchNorm(s)
    : String(s || '').toLowerCase();
}
function isNew(p) {
  if (!p.created_at) return false;
  const days = (Date.now() - new Date(p.created_at).getTime()) / 864e5;
  return days <= 7;
}

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════
const state = {
  data: [],
  filtered: [],
  search: '',
  deal: 'todos',     // todos | venta | arriendo
  tipo: 'todos',
  ciudad: 'todas',
  precioMax: null,
  visibleCount: 12,
};

const DEAL_CYCLE = ['todos', 'venta', 'arriendo'];
const PRICE_BUCKETS = [
  { lab: 'Cualquiera', val: null },
  { lab: 'Hasta $500M', val: 500_000_000 },
  { lab: 'Hasta $800M', val: 800_000_000 },
  { lab: 'Hasta $1.500M', val: 1_500_000_000 },
];

// ═══════════════════════════════════════════════════════════════════
// DATA FETCH
// ═══════════════════════════════════════════════════════════════════
async function fetchPortfolio() {
  // Si window.D ya está poblada (loadPublic o load), reusala
  if (Array.isArray(window.D) && window.D.length) {
    return soloPublicos(window.D);
  }
  // Fallback: query mínima pública
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
    console.error('[v2/listing] fetch error', e);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// FILTERING / SORTING
// ═══════════════════════════════════════════════════════════════════
function applyFilters() {
  const q = searchNorm(state.search);
  state.filtered = state.data.filter((p) => {
    if (state.deal !== 'todos') {
      const d = dealLabel(p);
      if (d !== state.deal) return false;
    }
    if (state.tipo !== 'todos') {
      if ((p.tipo || '').toLowerCase() !== state.tipo.toLowerCase()) return false;
    }
    if (state.ciudad !== 'todas') {
      if ((p.ciudad || '').toLowerCase() !== state.ciudad.toLowerCase()) return false;
    }
    if (state.precioMax) {
      const pr = priceFor(p) || 0;
      if (!pr || pr > state.precioMax) return false;
    }
    if (q) {
      const idx = p._searchIndex || searchNorm([p.tipo, p.ciudad, p.barrio, p.codigo_house, p.direccion_publica, p.captador?.nombre].filter(Boolean).join(' '));
      if (!q.split(/\s+/).filter(Boolean).every((w) => idx.includes(w))) return false;
    }
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════
// RENDER FRAGMENTS
// ═══════════════════════════════════════════════════════════════════
function renderTopNav(user) {
  const isLogged = !!user;
  const ingresar = isLogged
    ? `<a class="pl-btn pl-btn-ghost" href="#/cuenta">Mi cuenta</a>`
    : `<a class="pl-btn pl-btn-ghost" href="#/portafolio?login=1">Ingresar</a>`;
  return `
    <header class="pl-nav">
      <a class="pl-logo" href="#/v2">
        <span class="pl-logo-mark">${icon('home', 18)}</span>
        <span class="pl-logo-text">Inmobiliaria <strong>House</strong></span>
      </a>
      <nav class="pl-nav-links">
        <a class="is-active" href="#/v2">Comprar</a>
        <a href="#/v2">Arrendar</a>
        <a href="#/publicar">Vender con nosotros</a>
        <a href="#/v2">Asesores</a>
      </nav>
      <div class="pl-nav-actions">
        ${ingresar}
        <a class="pl-btn pl-btn-primary" href="#/v2">${icon('sparkle', 14)} Contactar</a>
      </div>
    </header>
  `;
}

function renderHero(stats) {
  return `
    <section class="pl-hero">
      <div class="pl-hero-inner">
        <div class="pl-hero-top">
          <div>
            <div class="pl-eyebrow">Portafolio · Eje Cafetero</div>
            <h1 class="pl-hero-title">
              Encuentra el inmueble <em>perfecto</em> para ti.
            </h1>
            <p class="pl-hero-sub">
              ${stats.total} propiedades en Pereira, Dosquebradas y alrededores.
              Acompañamiento personalizado de un asesor en cada paso.
            </p>
          </div>
          <div class="pl-stats">
            <div><div class="pl-stat-n">${stats.total}</div><div class="pl-stat-l">propiedades</div></div>
            <div><div class="pl-stat-n is-primary">${stats.venta}</div><div class="pl-stat-l">en venta</div></div>
            <div><div class="pl-stat-n is-green">${stats.arriendo}</div><div class="pl-stat-l">en arriendo</div></div>
            <div><div class="pl-stat-n">${stats.ciudades}</div><div class="pl-stat-l">ciudades</div></div>
          </div>
        </div>

        <div class="pl-search">
          <div class="pl-search-input">
            ${icon('search', 18)}
            <input id="v2plQ" placeholder="Busca por barrio, tipo o dirección…" autocomplete="off">
          </div>
          <div class="pl-search-row">
            <button class="pl-select" type="button" id="v2plDeal">
              <span class="pl-select-lab">Negocio</span>
              <span class="pl-select-val" id="v2plDealVal">${dealLabelText()} ${icon('chev-d', 11)}</span>
            </button>
            <button class="pl-select" type="button" id="v2plTipo">
              <span class="pl-select-lab">Tipo</span>
              <span class="pl-select-val" id="v2plTipoVal">${tipoLabelText()} ${icon('chev-d', 11)}</span>
            </button>
            <button class="pl-select" type="button" id="v2plCiudad">
              <span class="pl-select-lab">Ciudad</span>
              <span class="pl-select-val" id="v2plCiudadVal">${ciudadLabelText()} ${icon('chev-d', 11)}</span>
            </button>
            <button class="pl-select" type="button" id="v2plPrecio">
              <span class="pl-select-lab">Precio</span>
              <span class="pl-select-val" id="v2plPrecioVal">${precioLabelText()} ${icon('chev-d', 11)}</span>
            </button>
            <button class="pl-search-go" type="button" id="v2plGo">${icon('search', 16)} Buscar</button>
          </div>
        </div>

        <div class="pl-chips">
          <span class="pl-chips-lab">Sugerencias:</span>
          <button class="pl-chip" data-chip="Pinares">Pinares</button>
          <button class="pl-chip" data-chip="Dosquebradas">Dosquebradas</button>
          <button class="pl-chip" data-chip="hasta-500">Hasta $500M</button>
          <button class="pl-chip" data-chip="Casa campestre">Casa campestre</button>
          <button class="pl-chip" data-chip="Apartaestudio">Apartaestudio</button>
        </div>
      </div>
    </section>
  `;
}

function dealLabelText() {
  const m = { todos: 'Todos', venta: 'Venta', arriendo: 'Arriendo' };
  return m[state.deal] || 'Todos';
}
function tipoLabelText() {
  return state.tipo === 'todos' ? 'Todos' : capitalize(state.tipo);
}
function ciudadLabelText() {
  return state.ciudad === 'todas' ? 'Todas' : capitalize(state.ciudad);
}
function precioLabelText() {
  if (!state.precioMax) return 'Cualquiera';
  const m = state.precioMax;
  if (m >= 1e9) return 'Hasta $' + (m / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  return 'Hasta $' + Math.round(m / 1e6) + 'M';
}
function capitalize(s) {
  return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
}

function getUniqueValues(field) {
  return Array.from(new Set(state.data.map((p) => (p[field] || '').trim()).filter(Boolean)));
}

function renderFeatured() {
  // Toma el primer inmueble más reciente con foto como destacado
  const candidate = state.filtered.find((p) => Array.isArray(p.fotos) && p.fotos.length);
  if (!candidate) return '';
  const fotos = [...candidate.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const img = _cld(fotos[0].url || fotos[0].url_thumb, 1600);
  const deal = dealLabel(candidate);
  const precio = priceFor(candidate);
  const code = candidate.codigo_house || candidate.id;
  return `
    <a class="pl-featured" href="#/p/${_esc(code)}">
      <div class="pl-featured-img"><img src="${_esc(img)}" alt="" loading="lazy"></div>
      <div class="pl-featured-overlay"></div>
      <div class="pl-featured-content">
        <div class="pl-featured-pills">
          ${isNew(candidate) ? '<span class="pl-pill pl-pill-dark">Nuevo</span>' : ''}
          <span class="pl-pill pl-pill-gold">${icon('star', 12)} Destacado</span>
        </div>
        <h2 class="pl-featured-h2">${_esc(candidate.tipo || 'Inmueble')} en ${_esc(candidate.barrio || candidate.ciudad || '')}</h2>
        <div class="pl-featured-meta">${icon('mappin', 14)} ${_esc([candidate.barrio, candidate.ciudad].filter(Boolean).join(', '))}</div>
        <div class="pl-featured-foot">
          <div>
            <div class="pl-featured-price-eyebrow">Precio de ${deal}</div>
            <div class="pl-featured-price">${_esc(fmtCOP(precio) || 'Consultar')}${deal === 'arriendo' ? ' /mes' : ''}</div>
          </div>
          <span class="pl-featured-cta">Ver propiedad ${icon('chev-r', 14)}</span>
        </div>
      </div>
    </a>
  `;
}

function renderResults() {
  const wrap = `
    <section class="pl-results-wrap">
      <div class="pl-results-head">
        <div>
          <h2 class="pl-results-count">${state.filtered.length} inmuebles</h2>
          <div class="pl-results-sub">
            ${state.deal !== 'todos' ? capitalize(state.deal) + ' · ' : ''}
            ${state.tipo !== 'todos' ? capitalize(state.tipo) + ' · ' : ''}
            ${state.ciudad !== 'todas' ? capitalize(state.ciudad) : 'Eje Cafetero'}
          </div>
        </div>
        <div class="pl-sort">
          <span class="pl-sort-lab">Ordenar por</span>
          <button class="pl-sort-btn" type="button">Más recientes ${icon('chev-d', 12)}</button>
        </div>
      </div>

      ${state.filtered.length === 0 ? renderEmpty() : `
        <div class="pl-grid">${state.filtered.slice(0, state.visibleCount).map(renderCard).join('')}</div>
        ${state.filtered.length > state.visibleCount ? `
          <div class="pl-load-more">
            <button type="button" id="v2plMore">Cargar más propiedades</button>
          </div>
        ` : ''}
      `}
    </section>
  `;
  return wrap;
}

function renderEmpty() {
  return `
    <div class="pl-empty">
      <h3>Sin resultados</h3>
      <p style="color:var(--v2-ink-3);font-size:14px;margin:0 0 16px">
        No encontramos propiedades con esos filtros. Probá ajustarlos.
      </p>
      <button class="pl-btn pl-btn-primary" type="button" id="v2plClear">Limpiar filtros</button>
    </div>
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
    ? `<span class="pl-pill pl-pill-blue">En venta</span>`
    : `<span class="pl-pill pl-pill-green">En arriendo</span>`;
  const newPill = isNew(p) ? `<span class="pl-pill pl-pill-dark">Nuevo</span>` : '';

  return `
    <a class="pl-card" href="#/p/${_esc(code)}">
      <div class="pl-card-img">
        ${thumb ? `<img loading="lazy" src="${_esc(thumb)}" alt="">` : ''}
        <div class="pl-card-badges">${dealPill}${newPill}</div>
        <div class="pl-card-actions">
          <button class="pl-card-iconbtn" type="button" aria-label="Compartir"
                  onclick="event.preventDefault();event.stopPropagation();window._v2plShare&&window._v2plShare('${_esc(code)}','${_esc(p.tipo || 'Inmueble')} en ${_esc(p.barrio || p.ciudad || '')}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4"/><path d="M8 13l8 4"/></svg>
          </button>
          <button class="pl-card-iconbtn ${isFav ? 'is-faved' : ''}" type="button" aria-label="Favorito"
                  onclick="event.preventDefault();event.stopPropagation();window._v2plToggleFav&&window._v2plToggleFav('${_esc(p.id)}', this)">
            ${icon('heart', 16, isFav)}
          </button>
        </div>
        ${fotos.length ? `<div class="pl-card-photos">1 / ${fotos.length}</div>` : ''}
      </div>
      <div class="pl-card-body">
        <div>
          <div class="pl-card-eyebrow">${_esc(p.tipo || 'Inmueble')} · ${_esc(p.codigo_house || code)}</div>
          <h3 class="pl-card-title">${_esc(p.tipo || 'Inmueble')} en ${_esc(p.barrio || p.ciudad || '')}</h3>
          <div class="pl-card-loc">${icon('mappin', 12)}<span>${_esc([p.barrio, p.ciudad].filter(Boolean).join(', '))}</span></div>
        </div>
        <div class="pl-card-price">
          ${_esc(fmtCOP(precio) || 'Consultar')}
          ${deal === 'arriendo' ? '<span class="pl-card-price-period"> /mes</span>' : ''}
        </div>
        <div class="pl-card-specs">
          ${p.habitaciones ? `<span class="pl-spec">${icon('bed', 14)}<b>${_esc(p.habitaciones)}</b><span>hab</span></span>` : ''}
          ${p.banos ? `<span class="pl-spec">${icon('bath', 14)}<b>${_esc(p.banos)}</b><span>baños</span></span>` : ''}
          ${p.area_construida ? `<span class="pl-spec">${icon('area', 14)}<b>${_esc(p.area_construida)}m²</b></span>` : ''}
          ${p.parqueaderos ? `<span class="pl-spec">${icon('car', 14)}<b>${_esc(p.parqueaderos)}</b></span>` : ''}
        </div>
        <div class="pl-card-foot">
          <div class="pl-card-advisor">
            <div class="pl-card-avatar">${a.foto ? `<img src="${_esc(_cld(a.foto, 'avatar'))}" alt="">` : _esc(ini)}</div>
            <div class="pl-card-advisor-name">${_esc(a.nombre || 'House')}</div>
          </div>
          <span class="pl-card-link">Ver detalle ${icon('chev-r', 13)}</span>
        </div>
      </div>
    </a>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════════
async function renderPortfolioListV2() {
  const root = document.getElementById('sec-portfolio-list');
  if (!root) return;
  root.classList.add('v2-page', 'pl');

  // Skeleton inicial
  root.innerHTML = `
    <div class="pl-nav"><div class="pl-skeleton" style="width:140px;height:30px"></div></div>
    <section class="pl-hero">
      <div class="pl-hero-inner">
        <div class="pl-skeleton" style="height:18px;width:200px;margin-bottom:14px"></div>
        <div class="pl-skeleton" style="height:44px;margin-bottom:12px"></div>
        <div class="pl-skeleton" style="height:14px;width:60%;margin-bottom:24px"></div>
        <div class="pl-skeleton" style="height:80px;border-radius:14px"></div>
      </div>
    </section>
  `;

  // Fetch
  state.data = await fetchPortfolio();
  applyFilters();

  // Stats
  const stats = {
    total: state.data.length,
    venta: state.data.filter((p) => dealLabel(p) === 'venta').length,
    arriendo: state.data.filter((p) => dealLabel(p) === 'arriendo').length,
    ciudades: new Set(state.data.map((p) => p.ciudad).filter(Boolean)).size,
  };

  const user = window.userStore?.get();

  const paint = () => {
    applyFilters();
    root.innerHTML = `
      ${renderTopNav(user)}
      ${renderHero(stats)}
      ${renderFeatured()}
      ${renderResults()}
    `;
    bindEvents();
  };

  paint();

  // ── Wiring de eventos ──
  function bindEvents() {
    // Search
    const q = document.getElementById('v2plQ');
    if (q) {
      q.value = state.search;
      let t;
      q.addEventListener('input', () => {
        state.search = q.value;
        clearTimeout(t);
        t = setTimeout(repaintResults, 250);
      });
    }

    // Botón Buscar (hace scroll a resultados)
    const go = document.getElementById('v2plGo');
    if (go) go.addEventListener('click', () => {
      const r = document.querySelector('.pl-results-wrap');
      if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Cycle filters (negocio, tipo, ciudad, precio)
    const cycleDeal = document.getElementById('v2plDeal');
    if (cycleDeal) cycleDeal.addEventListener('click', () => {
      const i = DEAL_CYCLE.indexOf(state.deal);
      state.deal = DEAL_CYCLE[(i + 1) % DEAL_CYCLE.length];
      paint();
    });

    const cycleTipo = document.getElementById('v2plTipo');
    if (cycleTipo) cycleTipo.addEventListener('click', () => {
      const tipos = ['todos', ...getUniqueValues('tipo').slice(0, 6)];
      const i = tipos.indexOf(state.tipo);
      state.tipo = tipos[(i + 1) % tipos.length] || 'todos';
      paint();
    });

    const cycleCiudad = document.getElementById('v2plCiudad');
    if (cycleCiudad) cycleCiudad.addEventListener('click', () => {
      const ciudades = ['todas', ...getUniqueValues('ciudad').slice(0, 6)];
      const i = ciudades.indexOf(state.ciudad);
      state.ciudad = ciudades[(i + 1) % ciudades.length] || 'todas';
      paint();
    });

    const cyclePrecio = document.getElementById('v2plPrecio');
    if (cyclePrecio) cyclePrecio.addEventListener('click', () => {
      const i = PRICE_BUCKETS.findIndex((b) => b.val === state.precioMax);
      const next = PRICE_BUCKETS[(i + 1) % PRICE_BUCKETS.length];
      state.precioMax = next.val;
      paint();
    });

    // Suggestion chips
    document.querySelectorAll('.pl-chip').forEach((el) => {
      el.addEventListener('click', () => {
        const v = el.dataset.chip || '';
        if (v === 'hasta-500') {
          state.precioMax = 500_000_000;
        } else if (v === 'Casa campestre' || v === 'Apartaestudio') {
          state.tipo = v.toLowerCase();
        } else {
          state.search = v;
        }
        paint();
      });
    });

    // Cargar más
    const more = document.getElementById('v2plMore');
    if (more) more.addEventListener('click', () => {
      state.visibleCount += 12;
      repaintResults();
    });

    // Clear filters (en empty state)
    const clear = document.getElementById('v2plClear');
    if (clear) clear.addEventListener('click', () => {
      state.search = '';
      state.deal = 'todos';
      state.tipo = 'todos';
      state.ciudad = 'todas';
      state.precioMax = null;
      paint();
    });
  }

  function repaintResults() {
    applyFilters();
    const sec = document.querySelector('.pl-results-wrap');
    if (sec) sec.outerHTML = renderResults();
    bindEvents();
  }

  // Toggle fav (delegated)
  window._v2plToggleFav = (id, btn) => {
    if (typeof window.toggleFavorito === 'function') window.toggleFavorito(id);
    const isFav = (window.FAVS || []).includes(id);
    if (btn) {
      btn.classList.toggle('is-faved', isFav);
      btn.innerHTML = icon('heart', 16, isFav);
    }
  };

  // Compartir desde la card (Web Share API o fallback copia link).
  // Agregamos ?v=<timestamp> para forzar a WhatsApp a re-scrapear el preview
  // si el inmueble fue modificado (cambia fotos, precio, etc.).
  window._v2plShare = async (code, title) => {
    const v = String(Date.now()).slice(-6); // 6 dígitos = 30 días aprox
    const url = location.origin + '/ver/' + encodeURIComponent(code) + '?v=' + v;
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
  window.rPortfolioListV2 = renderPortfolioListV2;
}

export { renderPortfolioListV2 };
