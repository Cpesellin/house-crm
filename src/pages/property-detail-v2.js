/**
 * HOUSE v2 — Property Detail
 *
 * Ruta: #/p/:codigo  (codigo = HOUSE-XXX o UUID)
 *
 * Match fiel con detail.jsx del handoff de Claude Design:
 *  - Hero con pills (deal/code/premium) + título 40px + meta
 *  - Botones share/save arriba a la derecha
 *  - Galería desktop: grid 2fr 1fr 1fr × 1fr 1fr (1 grande + 4 chicas)
 *  - Galería mobile: 4:3 + thumbs scroll horizontal
 *  - Specs strip de 5 tiles (hab/baños/m²/parq/estrato)
 *  - Sections: Descripción, Características (2 cols), Zonas comunes, Ubicación
 *  - Aside sticky 380px desktop con: Price + Advisor + CTAs + Trust strip
 *  - Mortgage simulator card (solo venta)
 *  - Similar properties (3 cards desktop / 1 col mobile)
 *  - Modal de contacto 2-step (form → success)
 *  - Mobile: sticky bottom bar con CTAs
 */

import { getSupabaseClient } from '../config/supabase.js';
import '../styles/tokens-v2.css';
import '../styles/property-detail-v2.css';

const SB = () => getSupabaseClient();
const _esc = (s) =>
  window.escapeHtml
    ? window.escapeHtml(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
      );
const _cld = (u, w) => (window.cldOpt ? window.cldOpt(u, w) : u);

// ═══════════════════════════════════════════════════════════════════
// ICONS — SVG inline (lucide-style 1.5px stroke)
// ═══════════════════════════════════════════════════════════════════
const ICONS = {
  'chev-l': '<polyline points="15 18 9 12 15 6"/>',
  'chev-r': '<polyline points="9 18 15 12 9 6"/>',
  mappin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  bath: '<path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M5 19l-1 2"/><path d="M19 19l1 2"/>',
  area: '<path d="M21 6H3"/><path d="M10 6V3"/><path d="M14 6V3"/><path d="M3 14h18"/><path d="M3 6v12"/><path d="M21 6v12"/>',
  car: '<path d="M5 17h14"/><path d="M5 17a2 2 0 1 0 4 0"/><path d="M15 17a2 2 0 1 0 4 0"/><path d="M3 11l2-6h14l2 6"/><path d="M3 11v6h2"/><path d="M19 17h2v-6"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  sparkle: '<path d="M12 3v18"/><path d="M3 12h18"/><path d="M5.6 5.6l12.8 12.8"/><path d="M5.6 18.4l12.8-12.8"/>',
  whats: '<path d="M22 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-7.6 4.1 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 5.4 1.9 8.5 8.5 0 0 1 4.1 7.6z"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
};

function icon(name, size = 16, extra = '') {
  const inner = ICONS[name];
  if (!inner) return '';
  const sz = size;
  return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function fmtCOPShort(n) {
  if (!n || n <= 0) return '';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' MM';
  if (n >= 1e6) return '$' + Math.round(n / 1e6).toLocaleString('es-CO') + ' M';
  return '$' + Math.round(n).toLocaleString('es-CO');
}
function fmtCOP(n) {
  if (!n || n <= 0) return '';
  return '$' + Math.round(n).toLocaleString('es-CO');
}
function getCodeFromHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/');
  return decodeURIComponent(parts[1] || '').trim();
}
function dealLabel(p) {
  const n = (p.negociacion || '').toLowerCase();
  if (n.includes('arriendo') && n.includes('venta')) return 'venta';
  if (n.includes('arriendo')) return 'arriendo';
  return 'venta';
}
function dealPill(p) {
  const d = dealLabel(p);
  return d === 'arriendo' ? 'En arriendo' : `${p.tipo || 'Inmueble'} en venta`;
}

// ═══════════════════════════════════════════════════════════════════
// DATA FETCH
// ═══════════════════════════════════════════════════════════════════
async function fetchPropertyByCode(code) {
  if (!code) return null;
  const D = window.D || [];
  const isUuid = /^[0-9a-f-]{36}$/i.test(code);
  const local = D.find((p) =>
    isUuid ? p.id === code : (p.codigo_house || '').toLowerCase() === code.toLowerCase()
  );
  if (local && Array.isArray(local.fotos) && local.fotos.length) return local;

  const sb = SB();

  // Sólo seleccionamos campos PÚBLICOS — los internos (direccion, observaciones,
  // descripcion_interna, caracteristicas) están protegidos por RLS para anon.
  // Si el usuario está logueado, intentamos fetch con campos extras (más rico).
  const u = window.userStore?.get();
  const PUB_FIELDS = 'id,codigo_house,tipo,negociacion,ciudad,barrio,direccion_publica,precio_venta,precio_arriendo,habitaciones,banos,area_construida,estrato,parqueaderos,estado,descripcion_cliente,captador:usuarios!captador_id(id,nombre,foto,telefono_contacto),fotos(url,url_thumb,orden)';
  const FULL_FIELDS = PUB_FIELDS.replace(',descripcion_cliente,', ',descripcion_cliente,descripcion_interna,observaciones,caracteristicas,direccion,area_total,antiguedad,');

  const fields = u ? FULL_FIELDS : PUB_FIELDS;

  let q = sb
    .from('inmuebles')
    .select(fields)
    .eq('eliminado', false)
    .limit(1);
  q = isUuid ? q.eq('id', code) : q.eq('codigo_house', code);

  let { data, error } = await q;

  // Fallback: si la query con campos full falló (RLS), reintentamos con públicos
  if (error && u) {
    console.warn('[v2/p] query full falló, reintentando con públicos:', error.message);
    let q2 = sb.from('inmuebles').select(PUB_FIELDS).eq('eliminado', false).limit(1);
    q2 = isUuid ? q2.eq('id', code) : q2.eq('codigo_house', code);
    const r = await q2;
    data = r.data;
    error = r.error;
  }

  if (error) {
    console.error('[v2/p] fetch error:', error.message);
    return null;
  }
  return Array.isArray(data) && data.length ? data[0] : null;
}

async function fetchSimilar(p, n = 3) {
  // Reuse window.D si está, si no query mínima
  const D = window.D || [];
  if (D.length) {
    return D.filter((x) => x.id !== p.id && x.ciudad === p.ciudad && x.tipo === p.tipo).slice(0, n);
  }
  try {
    const { data } = await SB()
      .from('inmuebles')
      .select(
        'id,codigo_house,tipo,negociacion,ciudad,barrio,precio_venta,precio_arriendo,habitaciones,banos,area_construida,fotos(url,url_thumb,orden)'
      )
      .eq('eliminado', false)
      .eq('ciudad', p.ciudad)
      .eq('tipo', p.tipo)
      .neq('id', p.id)
      .limit(n);
    return data || [];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// RENDER FRAGMENTS
// ═══════════════════════════════════════════════════════════════════
function renderTopBar(p) {
  const titulo = p ? `${p.tipo || 'Inmueble'} en ${p.barrio || p.ciudad || ''}` : 'Cargando…';
  const sub = p && p.codigo_house ? p.codigo_house : '';
  return `
    <div class="pd-topbar">
      <button class="pd-back" type="button" aria-label="Volver" onclick="history.length>1?history.back():location.hash='#/portafolio'">
        ${icon('chev-l', 18)}
      </button>
      <div>
        <div class="pd-topbar-title">${_esc(titulo)}</div>
        ${sub ? `<div class="pd-topbar-sub">${_esc(sub)}</div>` : ''}
      </div>
      <div class="pd-topbar-actions" style="margin-left:auto">
        <button class="pd-iconbtn pd-iconbtn-mini" type="button" id="v2ShareBtn" aria-label="Compartir" onclick="window._v2Share&&window._v2Share()">${icon('share', 18)}</button>
        <button class="pd-iconbtn pd-iconbtn-mini" type="button" id="v2FavBtn" aria-label="Guardar" onclick="window._v2ToggleFav&&window._v2ToggleFav()">${icon('heart', 18)}</button>
      </div>
    </div>
  `;
}

function renderHero(p, isMobile) {
  const deal = dealLabel(p);
  const pillClass = deal === 'arriendo' ? 'pd-pill pd-pill-green' : 'pd-pill pd-pill-blue';
  const ubic = [p.barrio, p.ciudad].filter(Boolean).join(', ');

  // En mobile no mostramos los IconBtn del header (ya están en topbar)
  const actionsDesktop = isMobile
    ? ''
    : `
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button class="pd-iconbtn" type="button" onclick="window._v2Share&&window._v2Share()">${icon('share', 14)} Compartir</button>
      <button class="pd-iconbtn" type="button" id="v2FavBtnDesk" onclick="window._v2ToggleFav&&window._v2ToggleFav()">${icon('heart', 14)} <span class="pd-fav-label">Guardar</span></button>
    </div>`;

  return `
    <section class="pd-hero">
      <div class="pd-hero-pills">
        <span class="${pillClass}">${_esc(dealPill(p))}</span>
        ${p.codigo_house ? `<span class="pd-pill pd-pill-cream">${_esc(p.codigo_house)}</span>` : ''}
      </div>
      <div class="pd-hero-row">
        <div class="pd-hero-info">
          <h1 class="pd-title">${_esc(p.tipo || 'Inmueble')} en ${_esc(p.barrio || p.ciudad || '')}</h1>
          <div class="pd-meta">
            ${icon('mappin', 14)} ${_esc(ubic)}${p.estrato ? ' · Estrato ' + _esc(p.estrato) : ''}
          </div>
        </div>
        ${actionsDesktop}
      </div>
    </section>
  `;
}

function renderGallery(p, isMobile) {
  const fotos = Array.isArray(p.fotos)
    ? [...p.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0))
    : [];

  if (!fotos.length) {
    return `
      <div class="pd-gallery">
        <div class="pd-gal-main">
          <div style="display:grid;place-items:center;height:100%;color:var(--v2-ink-4);font-size:13px">Sin fotografías</div>
        </div>
      </div>
    `;
  }

  if (isMobile) {
    // Mobile: 1 main + thumbs horizontal scroll
    const main = _cld(fotos[0].url || fotos[0].url_thumb, 1200);
    const thumbsHtml = fotos
      .slice(0, 8)
      .map((f, i) => {
        const t = _cld(f.url_thumb || f.url, 240);
        return `<button type="button" class="pd-gal-thumb${i === 0 ? ' is-active' : ''}" data-idx="${i}" data-full="${_esc(_cld(f.url || f.url_thumb, 1200))}" onclick="window._v2GalleryGo&&window._v2GalleryGo(${i})"><img loading="lazy" src="${_esc(t)}" alt=""></button>`;
      })
      .join('');
    return `
      <div class="pd-gallery">
        <div class="pd-gal-main">
          <img id="v2MainImg" src="${_esc(main)}" alt="" onerror="this.style.display='none'">
          <span class="pd-gal-counter">1 / ${fotos.length}</span>
          ${fotos.length > 1 ? `
            <button class="pd-gal-nav is-prev" type="button" onclick="window._v2GalleryNav&&window._v2GalleryNav(-1)">${icon('chev-l', 18)}</button>
            <button class="pd-gal-nav is-next" type="button" onclick="window._v2GalleryNav&&window._v2GalleryNav(1)">${icon('chev-r', 18)}</button>
          ` : ''}
        </div>
        <div class="pd-gal-thumbs">${thumbsHtml}</div>
      </div>
    `;
  }

  // Desktop: grid 2fr 1fr 1fr × 1fr 1fr
  const main = _cld(fotos[0].url || fotos[0].url_thumb, 1200);
  const tiles = fotos.slice(1, 5).map((f, i) => {
    const t = _cld(f.url_thumb || f.url, 600);
    const isLast = i === 3 && fotos.length > 5;
    const more = isLast ? `<div class="pd-gal-thumb-more">+ ${fotos.length - 5} fotos</div>` : '';
    return `<div class="pd-gal-tile" data-idx="${i + 1}" data-full="${_esc(_cld(f.url || f.url_thumb, 1200))}" onclick="window._v2GalleryGo&&window._v2GalleryGo(${i + 1})">
      <img loading="lazy" src="${_esc(t)}" alt="">${more}
    </div>`;
  }).join('');

  return `
    <div class="pd-gallery">
      <div class="pd-gal-grid">
        <div class="pd-gal-main">
          <img id="v2MainImg" src="${_esc(main)}" alt="" onerror="this.style.display='none'">
          ${fotos.length > 1 ? `
            <button class="pd-gal-nav is-prev" type="button" onclick="window._v2GalleryNav&&window._v2GalleryNav(-1)">${icon('chev-l', 18)}</button>
            <button class="pd-gal-nav is-next" type="button" onclick="window._v2GalleryNav&&window._v2GalleryNav(1)">${icon('chev-r', 18)}</button>
          ` : ''}
          <span class="pd-gal-counter" id="v2GalCounter">1 / ${fotos.length}</span>
        </div>
        ${tiles}
      </div>
    </div>
  `;
}

function renderSpecs(p) {
  const tiles = [
    { ic: 'bed', val: p.habitaciones || '—', lab: 'Habitaciones' },
    { ic: 'bath', val: p.banos || '—', lab: 'Baños' },
    { ic: 'area', val: p.area_construida ? p.area_construida + 'm²' : '—', lab: 'Construidos' },
    { ic: 'car', val: p.parqueaderos || '—', lab: 'Parqueaderos' },
    { ic: 'home', val: p.estrato || '—', lab: 'Estrato' },
  ];
  return `
    <div class="pd-specs">
      ${tiles.map((s) => `
        <div class="pd-spec">
          <div class="pd-spec-icon">${icon(s.ic, 16)}</div>
          <div class="pd-spec-num">${_esc(s.val)}</div>
          <div class="pd-spec-lab">${_esc(s.lab)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDescripcion(p) {
  const txt = (p.descripcion_cliente || p.descripcion_interna || p.observaciones || '').trim();
  const fallback = 'La propiedad cuenta con acabados de primera, distribución funcional y amplia entrada de luz natural durante todo el día. El sector es residencial, tranquilo y se encuentra a pocos minutos de centros comerciales, colegios y vías principales.';
  const fallback2 = 'Inmueble disponible para visitas de lunes a sábado, previa coordinación con el asesor.';
  const paras = txt
    ? txt.split(/\n\n+/).map((t) => `<p class="pd-prose">${_esc(t)}</p>`).join('')
    : `<p class="pd-prose">${fallback}</p><p class="pd-prose">${fallback2}</p>`;

  return `
    <section class="pd-section">
      <h3 class="pd-section-title">Descripción</h3>
      ${paras}
    </section>
  `;
}

function parseFeatures(p) {
  // p.caracteristicas puede ser array de strings, JSON, o texto. Normalizamos.
  let out = [];
  const c = p.caracteristicas;
  if (Array.isArray(c)) out = c.filter(Boolean);
  else if (typeof c === 'string') {
    try {
      const j = JSON.parse(c);
      if (Array.isArray(j)) out = j;
    } catch {
      out = c.split(/[,\n;]/).map((x) => x.trim()).filter(Boolean);
    }
  }
  // Defaults razonables si no hay
  if (!out.length) {
    out = [
      p.habitaciones ? `${p.habitaciones} habitaciones` : null,
      p.banos ? `${p.banos} baños completos` : null,
      p.parqueaderos ? `${p.parqueaderos} parqueaderos` : null,
      p.area_construida ? `${p.area_construida} m² construidos` : null,
      p.estrato ? `Estrato ${p.estrato}` : null,
      p.antiguedad ? `${p.antiguedad}` : null,
    ].filter(Boolean);
  }
  return out.slice(0, 12);
}

function renderFeatures(p) {
  const feats = parseFeatures(p);
  if (!feats.length) return '';
  return `
    <section class="pd-section">
      <h3 class="pd-section-title">Características del inmueble</h3>
      <div class="pd-features">
        ${feats.map((f) => `
          <div class="pd-feature">
            <span class="pd-feature-check">${icon('check', 13)}</span>
            ${_esc(f)}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderAmenities(p) {
  // No tenemos campo amenities en BD, usamos defaults sensatos por tipo
  const tipo = (p.tipo || '').toLowerCase();
  let am = [];
  if (tipo.includes('apto') || tipo.includes('apartamento') || tipo.includes('penthouse')) {
    am = ['Portería 24h', 'Piscina', 'Gimnasio', 'Salón social', 'Zona BBQ', 'Ascensor'];
  } else if (tipo.includes('casa')) {
    am = ['Patio', 'Garaje cubierto', 'Zona verde'];
  } else if (tipo.includes('finca')) {
    am = ['Zona verde amplia', 'Piscina', 'BBQ', 'Casa principal', 'Habitaciones múltiples'];
  } else if (tipo.includes('local') || tipo.includes('bodega')) {
    am = ['Vitrina', 'Bodega', 'Servicios públicos'];
  }
  if (!am.length) return '';
  return `
    <section class="pd-section">
      <h3 class="pd-section-title">Zonas comunes</h3>
      <div class="pd-amenities">
        ${am.map((a) => `<span class="pd-pill pd-pill-cream pd-pill-lg">${_esc(a)}</span>`).join('')}
      </div>
    </section>
  `;
}

function renderMap(p) {
  const ubic = [p.barrio, p.ciudad].filter(Boolean).join(', ');
  return `
    <section class="pd-section">
      <h3 class="pd-section-title">Ubicación</h3>
      ${ubic ? `<div class="pd-section-sub" style="margin-bottom:12px">${_esc(ubic)}</div>` : ''}
      <div class="pd-map">
        <svg viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice">
          <rect width="800" height="280" fill="#f0e8d4"/>
          ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${35 * (i + 1)}" x2="800" y2="${35 * (i + 1)}" stroke="#e6dcc2" stroke-width="1.2"/>`).join('')}
          ${Array.from({ length: 20 }, (_, i) => `<line x1="${45 * i}" y1="0" x2="${45 * i}" y2="280" stroke="#e6dcc2" stroke-width="1.2"/>`).join('')}
          <path d="M -20 200 Q 200 160 400 200 T 820 180" stroke="#a8c4b8" stroke-width="14" fill="none" opacity="0.6"/>
          <path d="M 0 130 L 800 110" stroke="#d0c2a0" stroke-width="6" fill="none"/>
          <circle cx="400" cy="140" r="22" fill="var(--v2-primary)" opacity="0.18"/>
          <circle cx="400" cy="140" r="11" fill="var(--v2-primary)"/>
          <circle cx="400" cy="140" r="4" fill="#fff"/>
        </svg>
        <div class="pd-map-note">${icon('mappin', 13)} Por privacidad mostramos zona aproximada</div>
      </div>
    </section>
  `;
}

function renderAside(p, isMobile) {
  const deal = dealLabel(p);
  const precio = deal === 'arriendo' ? p.precio_arriendo : p.precio_venta;
  const precioStr = fmtCOP(precio);
  const period = deal === 'arriendo' ? '<span class="pd-price-period"> /mes</span>' : '';

  // Cuota estimada (sólo venta): 0.85% del precio /mes (aprox 11.4% E.A. a 15 años con inicial 30%)
  const cuotaEst = deal === 'venta' && precio
    ? '$' + Math.round((precio * 0.0085) / 1000).toLocaleString('es-CO') + '.000'
    : null;

  // Advisor
  const a = p.captador || {};
  const ini = (a.nombre || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';
  const avatarHtml = a.foto
    ? `<img src="${_esc(_cld(a.foto, 'avatar'))}" alt="">`
    : ini;

  const tel = (a.telefono_contacto || '').replace(/[^\d+]/g, '');
  const wapp = tel
    ? `https://wa.me/${tel.replace(/^\+/, '')}?text=${encodeURIComponent('Hola ' + (a.nombre || '').split(' ')[0] + ', vi el inmueble ' + (p.codigo_house || '') + ' y me interesa.')}`
    : null;

  const priceBlock = `
    <div class="pd-price-block">
      <div class="pd-price-eyebrow">Precio de ${deal}</div>
      <div class="pd-price">${_esc(precioStr || 'Consultar')}${period}</div>
      ${cuotaEst ? `<div class="pd-price-cuota">Cuota estimada desde <strong>${cuotaEst}</strong> /mes</div>` : ''}
    </div>
  `;

  const advisorBlock = `
    <div class="pd-advisor-block">
      <div class="pd-price-eyebrow">Tu asesor</div>
      <div class="pd-advisor-row">
        <div class="pd-advisor-avatar">${avatarHtml}</div>
        <div>
          <div class="pd-advisor-name">${_esc(a.nombre || 'Equipo House')}</div>
          <div class="pd-advisor-meta">${icon('star', 11)} <span style="font-weight:700;color:var(--v2-ink)">4.9</span> · House Inmobiliaria</div>
        </div>
      </div>
    </div>
  `;

  const ctaBlock = `
    <div class="pd-cta-block">
      <button class="pd-cta-primary" type="button" onclick="window._v2OpenContact&&window._v2OpenContact()">
        ${icon('sparkle', 15)} Me interesa este inmueble
      </button>
      <div class="pd-cta-row">
        ${wapp ? `<a class="pd-cta pd-cta-wapp" href="${_esc(wapp)}" target="_blank" rel="noopener">${icon('whats', 14)} WhatsApp</a>` : `<button class="pd-cta pd-cta-wapp" type="button" disabled style="opacity:.5;cursor:not-allowed">${icon('whats', 14)} WhatsApp</button>`}
        ${tel ? `<a class="pd-cta pd-cta-tel" href="tel:${_esc(tel)}">${icon('phone', 14)} Llamar</a>` : `<button class="pd-cta pd-cta-tel" type="button" disabled style="opacity:.5;cursor:not-allowed">${icon('phone', 14)} Llamar</button>`}
      </div>
      <div class="pd-cta-foot">Respondemos en menos de 30 minutos en horario hábil.</div>
    </div>
  `;

  const trustBlock = `
    <div class="pd-trust">
      <span>${icon('check', 12)} Verificado</span>
      <span>${icon('check', 12)} Documentos en regla</span>
      <span>${icon('check', 12)} Sin comisión oculta</span>
    </div>
  `;

  // Mortgage card sólo para venta
  const mortgageCard = deal === 'venta' && precio ? renderMortgage(precio) : '';

  return `
    <aside class="pd-aside">
      <div class="pd-aside-card">
        ${priceBlock}
        ${advisorBlock}
        ${ctaBlock}
        ${trustBlock}
      </div>
      ${mortgageCard}
    </aside>
  `;
}

function renderMortgage(price) {
  return `
    <div class="pd-mortgage" id="v2Mortgage" data-price="${price}">
      <div class="pd-mortgage-head">
        <div class="pd-mortgage-icon">${icon('sparkle', 16)}</div>
        <div>
          <div class="pd-mortgage-title">Simulador de cuota</div>
          <div class="pd-mortgage-sub">Cálculo aproximado · 11.4% E.A.</div>
        </div>
      </div>
      <div class="pd-slider">
        <div class="pd-slider-row">
          <span class="pd-slider-lab">Cuota inicial</span>
          <span class="pd-slider-val" id="v2MortDownLabel">30% · $${Math.round((price * 0.3) / 1e6).toLocaleString('es-CO')}M</span>
        </div>
        <input type="range" min="20" max="60" value="30" id="v2MortDown" oninput="window._v2RecalcMortgage&&window._v2RecalcMortgage()">
      </div>
      <div class="pd-slider">
        <div class="pd-slider-row">
          <span class="pd-slider-lab">Plazo</span>
          <span class="pd-slider-val" id="v2MortYearsLabel">15 años</span>
        </div>
        <input type="range" min="5" max="30" value="15" id="v2MortYears" oninput="window._v2RecalcMortgage&&window._v2RecalcMortgage()">
      </div>
      <div class="pd-mortgage-result">
        <div class="pd-mortgage-result-lab">Cuota mensual estimada</div>
        <div class="pd-mortgage-result-val" id="v2MortResult">—</div>
      </div>
    </div>
  `;
}

function renderSticky(p) {
  // (legacy 3-col sticky, ya no se usa en mobile — reemplazado por renderMSticky)
  const a = p.captador || {};
  const tel = (a.telefono_contacto || '').replace(/[^\d+]/g, '');
  const wapp = tel
    ? `https://wa.me/${tel.replace(/^\+/, '')}?text=${encodeURIComponent('Hola, me interesa el inmueble ' + (p.codigo_house || ''))}`
    : '#';
  return `
    <div class="pd-sticky-cta">
      <button class="pd-cta pd-cta-primary" style="background:var(--v2-primary);color:#fff;border:none" type="button" onclick="window._v2OpenContact&&window._v2OpenContact()">
        ${icon('sparkle', 14)} Me interesa
      </button>
      ${tel ? `<a class="pd-cta pd-cta-wapp" href="${_esc(wapp)}" target="_blank" rel="noopener">${icon('whats', 14)} WhatsApp</a>` : `<button class="pd-cta pd-cta-wapp" type="button" disabled style="opacity:.5">${icon('whats', 14)} WhatsApp</button>`}
      ${tel ? `<a class="pd-cta pd-cta-tel" href="tel:${_esc(tel)}">${icon('phone', 14)} Llamar</a>` : `<button class="pd-cta pd-cta-tel" type="button" disabled style="opacity:.5">${icon('phone', 14)} Llamar</button>`}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// MOBILE RENDER — patrón mobile.jsx (overlay header + sheet + tabs)
// ═══════════════════════════════════════════════════════════════════
function renderMobile(p, similar) {
  const fotos = Array.isArray(p.fotos)
    ? [...p.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0))
    : [];
  const mainImg = fotos.length ? _cld(fotos[0].url || fotos[0].url_thumb, 1200) : '';
  const isFav = (window.FAVS || []).includes(p.id);

  // Pills: deal + code + premium/nuevo
  const deal = dealLabel(p);
  const dealPill = deal === 'arriendo'
    ? `<span class="pd-pill pd-pill-green">En arriendo</span>`
    : `<span class="pd-pill pd-pill-blue">En venta</span>`;
  const codePill = p.codigo_house ? `<span class="pd-pill pd-pill-cream">${_esc(p.codigo_house)}</span>` : '';

  // Price
  const precio = deal === 'arriendo' ? p.precio_arriendo : p.precio_venta;
  const precioStr = fmtCOP(precio);
  const period = deal === 'arriendo' ? '<span class="pd-sheet-price-period"> /mes</span>' : '';
  const cuotaEst = deal === 'venta' && precio
    ? '$' + Math.round((precio * 0.0085) / 1000).toLocaleString('es-CO') + '.000'
    : null;

  // Specs (4 tiles)
  const specsTiles = [
    { ic: 'bed', val: p.habitaciones || '—', lab: 'Hab' },
    { ic: 'bath', val: p.banos || '—', lab: 'Baños' },
    { ic: 'area', val: p.area_construida ? p.area_construida : '—', lab: 'm²' },
    { ic: 'car', val: p.parqueaderos || '—', lab: 'Park' },
  ];

  // Advisor
  const a = p.captador || {};
  const ini = (a.nombre || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';
  const tel = (a.telefono_contacto || '').replace(/[^\d+]/g, '');
  const wapp = tel
    ? `https://wa.me/${tel.replace(/^\+/, '')}?text=${encodeURIComponent('Hola ' + (a.nombre || '').split(' ')[0] + ', vi el inmueble ' + (p.codigo_house || '') + ' y me interesa.')}`
    : null;

  // Description
  const descTxt = (p.descripcion_cliente || p.descripcion_interna || p.observaciones || '').trim();
  const descFallback = 'Acabados de primera, distribución funcional y excelente entrada de luz natural. Sector residencial tranquilo, cerca a colegios, vías principales y centros comerciales.';
  const descParas = (descTxt || descFallback)
    .split(/\n\n+/)
    .map((t) => `<p style="margin:0 0 12px;font-size:13.5px;line-height:1.6;color:var(--v2-ink)">${_esc(t)}</p>`)
    .join('');

  const features = parseFeatures(p);
  const amenities = (() => {
    const tipo = (p.tipo || '').toLowerCase();
    if (tipo.includes('apto') || tipo.includes('apartamento') || tipo.includes('penthouse'))
      return ['Portería 24h', 'Piscina', 'Gimnasio', 'Salón social', 'BBQ', 'Ascensor'];
    if (tipo.includes('casa')) return ['Patio', 'Garaje', 'Zona verde'];
    if (tipo.includes('finca')) return ['Zona verde', 'Piscina', 'BBQ', 'Casa principal'];
    if (tipo.includes('local') || tipo.includes('bodega')) return ['Vitrina', 'Bodega', 'Servicios públicos'];
    return [];
  })();

  // Photo dots (max 6 visible) + counter
  const photoDots = fotos.slice(0, 6).map((_, i) =>
    `<button class="pd-mhero-dot${i === 0 ? ' is-active' : ''}" type="button" data-idx="${i}" aria-label="Foto ${i + 1}"></button>`
  ).join('');

  return `
    <!-- Mobile hero con foto extendida + overlay header -->
    <div class="pd-mhero">
      ${mainImg ? `<img id="v2MainImg" src="${_esc(mainImg)}" alt="" loading="eager" onerror="this.style.display='none'">` : ''}
      <div class="pd-mhero-overlay">
        <button class="pd-iconcircle" type="button" aria-label="Volver" onclick="history.length>1?history.back():location.hash='#/portafolio'">
          ${icon('chev-l', 18)}
        </button>
        <div class="pd-mhero-actions">
          <button class="pd-iconcircle" type="button" aria-label="Compartir" onclick="window._v2Share&&window._v2Share()">${icon('share', 16)}</button>
          <button class="pd-iconcircle ${isFav ? 'is-active' : ''}" id="v2FavBtn" type="button" aria-label="Guardar" onclick="window._v2ToggleFav&&window._v2ToggleFav()">${icon('heart', 16)}</button>
        </div>
      </div>
      ${fotos.length > 1 ? `
        <button class="pd-mhero-prev" type="button" aria-label="Anterior" onclick="window._v2GalleryNav&&window._v2GalleryNav(-1)">${icon('chev-l', 16)}</button>
        <button class="pd-mhero-next" type="button" aria-label="Siguiente" onclick="window._v2GalleryNav&&window._v2GalleryNav(1)">${icon('chev-r', 16)}</button>
        <div class="pd-mhero-dots">${photoDots}</div>
      ` : ''}
      ${fotos.length ? `<div class="pd-mhero-counter" id="v2GalCounter">1 / ${fotos.length}</div>` : ''}
    </div>

    <!-- Sheet con borde superior redondeado -->
    <div class="pd-sheet">
      <div class="pd-sheet-pills">
        ${dealPill}
        ${codePill}
      </div>
      <div class="pd-sheet-eyebrow">${_esc(p.tipo || 'Inmueble')} · en ${_esc(deal)}</div>
      <h1 class="pd-sheet-title">${_esc(p.tipo || 'Inmueble')} en ${_esc(p.barrio || p.ciudad || '')}</h1>
      <div class="pd-sheet-meta">${icon('mappin', 12)} ${_esc([p.barrio, p.ciudad].filter(Boolean).join(', '))}</div>

      <div class="pd-sheet-price">
        <div class="pd-sheet-price-eyebrow">Precio de ${deal}</div>
        <div class="pd-sheet-price-num">${_esc(precioStr || 'Consultar')}${period}</div>
        ${cuotaEst ? `<div class="pd-sheet-price-cuota">Cuota desde <strong>${cuotaEst}</strong> /mes · Crédito 15a</div>` : ''}
      </div>

      <div class="pd-sheet-specs">
        ${specsTiles.map((s) => `
          <div class="pd-sheet-spec">
            ${icon(s.ic, 14)}
            <div class="pd-sheet-spec-num">${_esc(s.val)}</div>
            <div class="pd-sheet-spec-lab">${_esc(s.lab)}</div>
          </div>
        `).join('')}
      </div>

      <!-- Tabs -->
      <div class="pd-tabs" id="v2Tabs">
        <button class="pd-tab is-active" type="button" data-tab="detalles">Detalles</button>
        <button class="pd-tab" type="button" data-tab="comunes">Comunes</button>
        <button class="pd-tab" type="button" data-tab="mapa">Mapa</button>
      </div>

      <div class="pd-tab-content" id="v2TabDetalles">
        ${descParas}
        ${features.length ? `
          <div class="pd-sheet-features">
            ${features.map((f) => `
              <div class="pd-sheet-feature">
                <span class="pd-sheet-feature-check">${icon('check', 11)}</span>
                ${_esc(f)}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="pd-tab-content" id="v2TabComunes" style="display:none">
        ${amenities.length
          ? `<div class="pd-sheet-amenities">${amenities.map((a) => `<span class="pd-pill pd-pill-cream">${_esc(a)}</span>`).join('')}</div>`
          : `<p style="margin:0;font-size:13.5px;color:var(--v2-ink-3)">Sin información de zonas comunes.</p>`}
      </div>

      <div class="pd-tab-content" id="v2TabMapa" style="display:none">
        <div class="pd-sheet-map">
          <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
            <rect width="320" height="160" fill="#f0e8d4"/>
            ${Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="${32 * (i + 1)}" x2="320" y2="${32 * (i + 1)}" stroke="#e6dcc2" stroke-width="1"/>`).join('')}
            ${Array.from({ length: 8 }, (_, i) => `<line x1="${40 * i}" y1="0" x2="${40 * i}" y2="160" stroke="#e6dcc2" stroke-width="1"/>`).join('')}
            <circle cx="160" cy="80" r="14" fill="${'currentColor'}" opacity="0.18" style="color:var(--v2-primary)"/>
            <circle cx="160" cy="80" r="7" style="fill:var(--v2-primary)"/>
          </svg>
        </div>
        <p style="margin:8px 0 0;font-size:11.5px;color:var(--v2-ink-3);text-align:center">Por privacidad mostramos zona aproximada</p>
      </div>

      <!-- Advisor card -->
      <div class="pd-sheet-advisor">
        <div class="pd-sheet-advisor-avatar">${a.foto ? `<img src="${_esc(_cld(a.foto, 'avatar'))}" alt="">` : _esc(ini)}</div>
        <div class="pd-sheet-advisor-info">
          <div class="pd-sheet-advisor-eyebrow">Tu asesor</div>
          <div class="pd-sheet-advisor-name">${_esc(a.nombre || 'Equipo House')}</div>
        </div>
        ${wapp
          ? `<a class="pd-sheet-advisor-chat" href="${_esc(wapp)}" target="_blank" rel="noopener">${icon('whats', 12)} Chat</a>`
          : ''}
      </div>
    </div>

    ${renderMSticky(p)}
    ${renderContactModal(p)}
  `;
}

function renderMSticky(p) {
  const a = p.captador || {};
  const tel = (a.telefono_contacto || '').replace(/[^\d+]/g, '');
  const wapp = tel
    ? `https://wa.me/${tel.replace(/^\+/, '')}?text=${encodeURIComponent('Hola, me interesa el inmueble ' + (p.codigo_house || ''))}`
    : '#';
  return `
    <div class="pd-msticky">
      <button class="pd-msticky-main" type="button" onclick="window._v2OpenContact&&window._v2OpenContact()">
        ${icon('sparkle', 15)} Me interesa este inmueble
      </button>
      <div class="pd-msticky-row">
        ${tel ? `<a class="pd-msticky-wapp" href="${_esc(wapp)}" target="_blank" rel="noopener">${icon('whats', 14)} WhatsApp</a>` : `<button class="pd-msticky-wapp" type="button" disabled style="opacity:.5">${icon('whats', 14)} WhatsApp</button>`}
        ${tel ? `<a class="pd-msticky-tel" href="tel:${_esc(tel)}">${icon('phone', 14)} Llamar</a>` : `<button class="pd-msticky-tel" type="button" disabled style="opacity:.5">${icon('phone', 14)} Llamar</button>`}
      </div>
    </div>
  `;
}

function renderSimilar(list) {
  if (!list.length) return '';
  const cards = list.map((s) => {
    const fotos = Array.isArray(s.fotos)
      ? [...s.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0))
      : [];
    const thumb = fotos.length ? _cld(fotos[0].url_thumb || fotos[0].url, 600) : '';
    const code = s.codigo_house || '';
    const deal = (s.negociacion || '').toLowerCase().includes('arriendo') ? 'arriendo' : 'venta';
    const precio = deal === 'arriendo' ? s.precio_arriendo : s.precio_venta;
    return `
      <a class="pd-sim-card" href="#/p/${_esc(code || s.id)}">
        <div class="pd-sim-img">${thumb ? `<img loading="lazy" src="${_esc(thumb)}" alt="">` : ''}</div>
        <div class="pd-sim-body">
          <div class="pd-sim-loc">${_esc([s.barrio, s.ciudad].filter(Boolean).join(', '))}</div>
          <div class="pd-sim-tit">${_esc(s.tipo || 'Inmueble')}${code ? ' · ' + _esc(code) : ''}</div>
          <div class="pd-sim-price">${_esc(fmtCOPShort(precio))}${deal === 'arriendo' ? '<span style="font-size:13px;color:var(--v2-ink-3);font-weight:500"> /mes</span>' : ''}</div>
        </div>
      </a>
    `;
  }).join('');
  return `
    <div style="margin-top:48px">
      <h2 class="pd-similar-title">Propiedades similares</h2>
      <div class="pd-similar-grid">${cards}</div>
    </div>
  `;
}

function renderContactModal(p) {
  // Inicialmente oculto; se inyecta en DOM al abrirlo
  return `
    <div class="pd-modal-back" id="v2ModalBack" style="display:none" onclick="if(event.target===this)window._v2CloseContact&&window._v2CloseContact()">
      <div class="pd-modal" id="v2Modal">
        <div class="pd-modal-head">
          <div>
            <div class="pd-modal-eyebrow">Contactar asesor</div>
            <div class="pd-modal-title">${_esc(p.tipo || 'Inmueble')} en ${_esc(p.barrio || p.ciudad || '')}</div>
          </div>
          <button class="pd-modal-close" type="button" onclick="window._v2CloseContact&&window._v2CloseContact()">${icon('close', 18)}</button>
        </div>
        <div class="pd-modal-body" id="v2ModalBody">
          <div class="pd-field"><label>Nombre completo</label><input id="v2cName" placeholder="Ej. Sara Gómez" autocomplete="name"></div>
          <div class="pd-field"><label>Teléfono / WhatsApp</label><input id="v2cPhone" placeholder="+57 ___" autocomplete="tel" inputmode="tel"></div>
          <div class="pd-field"><label>Correo</label><input id="v2cEmail" type="email" placeholder="tu@correo.com" autocomplete="email"></div>
          <div>
            <div style="font-size:12px;color:var(--v2-ink-3);margin-bottom:8px;font-weight:600">Me interesa</div>
            <div class="pd-mode-row" id="v2cMode">
              <button class="pd-mode-btn is-active" type="button" data-v="visita">Agendar visita</button>
              <button class="pd-mode-btn" type="button" data-v="info">Más información</button>
              <button class="pd-mode-btn" type="button" data-v="oferta">Hacer una oferta</button>
            </div>
          </div>
          <button class="pd-modal-submit" type="button" onclick="window._v2SubmitContact&&window._v2SubmitContact()">Enviar solicitud</button>
          <div class="pd-modal-foot">Al enviar aceptas nuestros términos y política de tratamiento de datos.</div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════════
async function renderPropertyDetailV2() {
  const root = document.getElementById('sec-property-detail');
  if (!root) return;
  root.classList.add('v2-page', 'pd');

  const code = getCodeFromHash();
  const isMobile = window.matchMedia('(max-width: 759px)').matches;

  // Skeleton inicial
  root.innerHTML = `
    ${renderTopBar(null)}
    <div class="pd-hero">
      <div class="pd-skeleton" style="height:14px;width:140px;margin-bottom:14px"></div>
      <div class="pd-skeleton" style="height:36px;margin-bottom:8px"></div>
      <div class="pd-skeleton" style="height:14px;width:60%"></div>
    </div>
    <div class="pd-gallery"><div class="pd-skeleton" style="aspect-ratio:4/3;border-radius:16px"></div></div>
  `;

  if (!code) {
    root.innerHTML = `
      ${renderTopBar(null)}
      <div class="pd-empty">
        <h2>Falta el código</h2>
        <p style="color:var(--v2-ink-3)">La URL no incluye el código del inmueble.</p>
        <a class="pd-cta-primary" style="display:inline-flex;margin-top:16px;text-decoration:none" href="#/portafolio">Ver portafolio</a>
      </div>
    `;
    return;
  }

  let p = null;
  try {
    p = await fetchPropertyByCode(code);
  } catch (e) {
    console.error('[v2] fetch error', e);
  }

  if (!p) {
    root.innerHTML = `
      ${renderTopBar(null)}
      <div class="pd-empty">
        <h2>No encontramos esta propiedad</h2>
        <p style="color:var(--v2-ink-3)">Es posible que ya no esté disponible.</p>
        <a class="pd-cta-primary" style="display:inline-flex;margin-top:16px;text-decoration:none" href="#/portafolio">Ver portafolio</a>
      </div>
    `;
    return;
  }

  // Render real
  const similar = await fetchSimilar(p, 3);

  if (isMobile) {
    // Mobile: patrón mobile.jsx (overlay header + sheet + tabs + sticky bottom 2 filas)
    root.innerHTML = renderMobile(p, similar);
  } else {
    // Desktop: layout 2 cols con aside sticky 380px + similar abajo
    root.innerHTML = `
      ${renderTopBar(p)}
      ${renderHero(p, false)}
      ${renderGallery(p, false)}
      <div class="pd-body">
        <div class="pd-grid">
          <div>
            ${renderSpecs(p)}
            ${renderDescripcion(p)}
            ${renderFeatures(p)}
            ${renderAmenities(p)}
            ${renderMap(p)}
          </div>
          ${renderAside(p, false)}
        </div>
        ${renderSimilar(similar)}
      </div>
      ${renderSticky(p)}
      ${renderContactModal(p)}
    `;
  }

  // ── Wiring ──
  const fotos = Array.isArray(p.fotos)
    ? [...p.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0))
    : [];
  let activeIdx = 0;

  const setMain = (i) => {
    if (i < 0) i = fotos.length - 1;
    if (i >= fotos.length) i = 0;
    activeIdx = i;
    const main = root.querySelector('#v2MainImg');
    const counter = root.querySelector('#v2GalCounter');
    const allThumbs = root.querySelectorAll('.pd-gal-thumb, .pd-gal-tile');
    if (main) {
      main.style.opacity = '0';
      const url = (fotos[i].url || fotos[i].url_thumb);
      setTimeout(() => {
        main.src = _cld(url, 1200);
        main.style.opacity = '1';
      }, 120);
    }
    if (counter) counter.textContent = (i + 1) + ' / ' + fotos.length;
    allThumbs.forEach((t) => {
      t.classList.toggle('is-active', Number(t.dataset.idx) === i);
    });
  };

  window._v2GalleryGo = (i) => setMain(Number(i));
  window._v2GalleryNav = (delta) => setMain(activeIdx + Number(delta));

  // Mobile dots wiring (clickear cualquiera = ir a esa foto)
  if (isMobile) {
    root.querySelectorAll('.pd-mhero-dot').forEach((d) => {
      d.addEventListener('click', () => setMain(Number(d.dataset.idx) || 0));
    });
    // Sobrescribir setMain para actualizar dots
    const _origSetMain = setMain;
    const setMainMobile = (i) => {
      _origSetMain(i);
      root.querySelectorAll('.pd-mhero-dot').forEach((d, idx) => {
        d.classList.toggle('is-active', idx === activeIdx);
      });
    };
    window._v2GalleryGo = (i) => setMainMobile(Number(i));
    window._v2GalleryNav = (delta) => setMainMobile(activeIdx + Number(delta));

    // Tabs wiring
    const tabsBar = root.querySelector('#v2Tabs');
    if (tabsBar) {
      tabsBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.pd-tab');
        if (!btn) return;
        const target = btn.dataset.tab;
        tabsBar.querySelectorAll('.pd-tab').forEach((b) => b.classList.toggle('is-active', b === btn));
        ['detalles', 'comunes', 'mapa'].forEach((t) => {
          const el = root.querySelector(`#v2Tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
          if (el) el.style.display = (t === target) ? '' : 'none';
        });
      });
    }
  }

  // Mortgage simulator
  if (p.precio_venta && dealLabel(p) === 'venta') {
    const recalc = () => {
      const m = document.getElementById('v2Mortgage');
      if (!m) return;
      const price = Number(m.dataset.price) || 0;
      const downPct = Number(document.getElementById('v2MortDown').value);
      const years = Number(document.getElementById('v2MortYears').value);
      const down = price * (downPct / 100);
      const loan = price - down;
      const r = 0.0095;
      const n = years * 12;
      const monthly = (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      document.getElementById('v2MortDownLabel').textContent =
        `${downPct}% · $${Math.round(down / 1e6).toLocaleString('es-CO')}M`;
      document.getElementById('v2MortYearsLabel').textContent = `${years} años`;
      document.getElementById('v2MortResult').textContent =
        '$' + Math.round(monthly).toLocaleString('es-CO');
    };
    window._v2RecalcMortgage = recalc;
    recalc();
  }

  // Mode buttons en modal
  const modeRow = root.querySelector('#v2cMode');
  if (modeRow) {
    modeRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.pd-mode-btn');
      if (!btn) return;
      modeRow.querySelectorAll('.pd-mode-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  }

  // Modal open/close
  window._v2OpenContact = () => {
    const back = document.getElementById('v2ModalBack');
    if (back) back.style.display = 'grid';
    document.body.style.overflow = 'hidden';
  };
  window._v2CloseContact = () => {
    const back = document.getElementById('v2ModalBack');
    if (back) back.style.display = 'none';
    document.body.style.overflow = '';
  };
  window._v2SubmitContact = async () => {
    // Reusa abrirInteres si está disponible (lo guarda en BD), si no muestra success
    const name = document.getElementById('v2cName')?.value.trim();
    const phone = document.getElementById('v2cPhone')?.value.trim();
    if (!name || !phone) {
      alert('Por favor completá nombre y teléfono.');
      return;
    }
    // Mostrar success state
    const body = document.getElementById('v2ModalBody');
    if (body) {
      body.innerHTML = `
        <div class="pd-modal-success">
          <div class="pd-modal-check">${icon('check', 26)}</div>
          <h3>¡Solicitud enviada!</h3>
          <p>${_esc(p.captador?.nombre || 'Nuestro equipo')} se pondrá en contacto contigo en menos de 30 minutos.</p>
          <button class="pd-modal-success-back" type="button" onclick="window._v2CloseContact&&window._v2CloseContact()">Volver al inmueble</button>
        </div>
      `;
    }
    // TODO: aquí podríamos llamar a window.abrirInteres o crear un interesado vía API
  };

  // Share + favorite. ?v=<timestamp> fuerza re-scrapeo de WhatsApp.
  window._v2Share = async () => {
    const v = String(Date.now()).slice(-6);
    const url = location.origin + '/ver/' + encodeURIComponent(p.codigo_house || p.id) + '?v=' + v;
    const text = `${p.tipo || 'Inmueble'} en ${p.barrio || p.ciudad || ''} - Inmobiliaria House`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); window.toast && window.toast('🔗 Link copiado'); } catch {}
    }
  };
  window._v2ToggleFav = () => {
    if (p && p.id && typeof window.toggleFavorito === 'function') {
      window.toggleFavorito(p.id);
      const isFav = (window.FAVS || []).includes(p.id);
      const btns = [document.getElementById('v2FavBtn'), document.getElementById('v2FavBtnDesk')].filter(Boolean);
      btns.forEach((b) => b.classList.toggle('is-active', isFav));
      const lab = document.querySelector('.pd-fav-label');
      if (lab) lab.textContent = isFav ? 'Guardado' : 'Guardar';
    }
  };

  // Init fav state
  if ((window.FAVS || []).includes(p.id)) {
    [document.getElementById('v2FavBtn'), document.getElementById('v2FavBtnDesk')].filter(Boolean).forEach((b) => b.classList.add('is-active'));
    const lab = document.querySelector('.pd-fav-label');
    if (lab) lab.textContent = 'Guardado';
  }
}

// ─── Detector de "anomalía de ancho" ──────────────────────────
function _checkWidthAnomaly() {
  const inner = window.innerWidth;
  const client = document.documentElement.clientWidth;
  const isAnomaly = inner > 0 && client > 0 && (inner - client) > 20;
  document.documentElement.classList.toggle('v2-width-anomaly', isAnomaly);
}

// ─── Toggle de body class cuando v2 está activa ────────────────
// :has() no es soportado en todas las versiones de browsers móviles
// (especialmente Brave/Chrome viejos en Android). Manejamos el toggle
// vía JS para garantizar que el body tenga fondo cream cuando hay
// una pantalla v2 activa.
function _checkV2Active() {
  const hasV2 = !!document.querySelector('.sec.v2-page.act');
  document.body.classList.toggle('v2-active', hasV2);
  document.documentElement.classList.toggle('v2-active', hasV2);
}

if (typeof window !== 'undefined') {
  window.rPropertyV2 = renderPropertyDetailV2;
  _checkWidthAnomaly();
  _checkV2Active();
  window.addEventListener('resize', _checkWidthAnomaly);
  window.addEventListener('orientationchange', _checkWidthAnomaly);
  window.addEventListener('hashchange', () => setTimeout(_checkV2Active, 50));
  // Observador para detectar cambios de clase 'act' en secciones
  const _obs = new MutationObserver(_checkV2Active);
  setTimeout(() => {
    document.querySelectorAll('.sec').forEach((el) => {
      _obs.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    });
    _checkV2Active();
  }, 1000);
}

export { renderPropertyDetailV2 };
