/**
 * HOUSE v2 — Property Detail page
 *
 * Ruta: #/p/:codigo  (codigo puede ser HOUSE-XXX o un UUID)
 *
 * Es una pantalla nueva, opt-in, no toca rInv ni oM.
 * Diseño basado en el handoff editorial (Fraunces serif + ink + cream).
 *
 * Mounting: el router muestra <div id="sec-property-detail" class="sec">
 * y llama window.rPropertyV2().
 */

import { getSupabaseClient } from '../config/supabase.js';
import '../styles/tokens-v2.css';
import '../styles/property-detail-v2.css';

const SB = () => getSupabaseClient();
const _esc = (s) => (window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const _cld = (u, w) => (window.cldOpt ? window.cldOpt(u, w) : u);

// ───────── helpers ─────────
function fmtCOP(n) {
  if (!n || n <= 0) return '';
  return '$' + Math.round(n).toLocaleString('es-CO');
}
function precioPrincipal(p) {
  if (p.precio_venta && p.precio_venta > 0) return { num: fmtCOP(p.precio_venta), label: 'venta' };
  if (p.precio_arriendo && p.precio_arriendo > 0) return { num: fmtCOP(p.precio_arriendo), label: 'arriendo · mes' };
  return { num: 'Consultar', label: '' };
}
function precioPorM2(p) {
  const precio = p.precio_venta && p.precio_venta > 0 ? p.precio_venta : null;
  const area = p.area_construida && p.area_construida > 0 ? p.area_construida : null;
  if (!precio || !area) return '';
  const ppm = Math.round(precio / area);
  return ppm > 0 ? `${fmtCOP(ppm)} / m²` : '';
}
function getCodeFromHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/');
  // #/p/HOUSE-178  →  parts = ['p', 'HOUSE-178']
  return decodeURIComponent(parts[1] || '').trim();
}

// ───────── data ─────────
async function fetchPropertyByCode(code) {
  if (!code) return null;
  // Primero buscamos en window.D si ya está cargado (instantáneo)
  const D = window.D || [];
  const isUuid = /^[0-9a-f-]{36}$/i.test(code);
  const local = D.find((p) =>
    isUuid ? p.id === code : (p.codigo_house || '').toLowerCase() === code.toLowerCase()
  );
  if (local) return local;

  // Si no, lo traemos de Supabase (ej: deep-link sin sesión cargada)
  const sb = SB();
  let q = sb.from('inmuebles')
    .select('id,codigo_house,tipo,negociacion,ciudad,barrio,direccion_publica,direccion,precio_venta,precio_arriendo,habitaciones,banos,area_construida,area_total,estrato,antiguedad,parqueaderos,estado,descripcion_cliente,descripcion_interna,observaciones,caracteristicas,captador:usuarios!captador_id(id,nombre,email,foto,telefono_contacto),fotos(url,url_thumb,orden)')
    .eq('eliminado', false)
    .limit(1);
  q = isUuid ? q.eq('id', code) : q.eq('codigo_house', code);
  const { data } = await q;
  return Array.isArray(data) && data.length ? data[0] : null;
}

// ───────── render fragments ─────────
function renderTopBar(p) {
  const titulo = p ? `${p.tipo || 'Inmueble'}${p.barrio ? ' en ' + p.barrio : ''}` : 'Cargando…';
  const sub = p && p.codigo_house ? p.codigo_house : '';
  return `
    <div class="pd-topbar">
      <button class="pd-back" type="button" aria-label="Volver" onclick="history.length>1?history.back():location.hash='#/portafolio'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="pd-topbar-title">
        <div>${_esc(titulo)}</div>
        ${sub ? `<div class="pd-topbar-sub">${_esc(sub)}</div>` : ''}
      </div>
      <div class="pd-topbar-actions">
        <button class="pd-icon-btn" id="v2FavBtn" type="button" aria-label="Guardar" onclick="window._v2ToggleFav&&window._v2ToggleFav()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </button>
      </div>
    </div>
  `;
}

function renderGallery(p) {
  const fotos = Array.isArray(p.fotos)
    ? [...p.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0))
    : [];

  if (!fotos.length) {
    return `
      <div class="pd-gallery">
        <div class="pd-main"><div class="pd-main-placeholder">Sin fotografías</div></div>
      </div>
    `;
  }

  const main = _cld(fotos[0].url || fotos[0].url_thumb, 1200);
  const thumbsHtml = fotos.slice(0, 6).map((f, i) => {
    const t = _cld(f.url_thumb || f.url, 200);
    return `<button type="button" class="pd-thumb${i === 0 ? ' is-active' : ''}" data-idx="${i}" data-full="${_esc(_cld(f.url || f.url_thumb, 1200))}" onclick="window._v2GalleryGo&&window._v2GalleryGo(${i})"><img loading="lazy" src="${_esc(t)}" alt=""></button>`;
  }).join('');

  return `
    <div class="pd-gallery">
      <div class="pd-main">
        <img id="v2MainImg" src="${_esc(main)}" alt="${_esc(p.tipo || 'Inmueble')}" onerror="this.style.display='none'">
        <span class="pd-photocount">${fotos.length} foto${fotos.length === 1 ? '' : 's'}</span>
      </div>
      <div class="pd-thumbs">${thumbsHtml}</div>
    </div>
  `;
}

function renderHeader(p) {
  const titulo = `${p.tipo || 'Inmueble'} en <em>${_esc(p.barrio || p.ciudad || '')}</em>`;
  const ubic = [p.barrio, p.ciudad].filter(Boolean).join(' · ');
  const neg = (p.negociacion || '').toLowerCase();
  const chipClass = neg.includes('arriendo') ? 'pd-chip is-arr' : 'pd-chip';
  const chipText = neg.includes('arriendo') && neg.includes('venta')
    ? 'VENTA · ARRIENDO'
    : (neg.includes('arriendo') ? 'ARRIENDO' : 'VENTA');

  return `
    <div>
      <div class="pd-eyebrow">
        <span class="pd-dot"></span>
        ${_esc(p.codigo_house || 'HOUSE')} · ${_esc((p.estado || 'DISPONIBLE').toUpperCase())}
      </div>
      <h1 class="pd-title">${titulo}</h1>
      <div class="pd-loc">${_esc(ubic)}</div>
      <span class="${chipClass}">${chipText}</span>
    </div>
  `;
}

function renderPriceBlock(p) {
  const main = precioPrincipal(p);
  const ppm = precioPorM2(p);
  // Si hay venta y arriendo, mostramos los dos
  const v = fmtCOP(p.precio_venta), a = fmtCOP(p.precio_arriendo);
  let sub = '';
  if (v && a) sub = `Venta · también disponible en arriendo ${a}/mes`;
  else if (main.label) sub = main.label.toUpperCase();
  return `
    <div class="pd-price-block">
      <div class="pd-price">${_esc(main.num)}</div>
      ${sub ? `<div class="pd-price-sub">${_esc(sub)}</div>` : ''}
      ${ppm ? `<div class="pd-price-pp">${_esc(ppm)}</div>` : ''}
    </div>
  `;
}

function renderSpecs(p) {
  const items = [
    { num: p.habitaciones || '—', lab: 'habitaciones' },
    { num: p.banos || '—', lab: 'baños' },
    { num: p.area_construida ? p.area_construida + 'm²' : '—', lab: 'área' },
    { num: p.estrato || '—', lab: 'estrato' },
  ];
  return `
    <div class="pd-specs">
      ${items.map(i => `<div class="pd-spec"><div class="pd-spec-num">${_esc(i.num)}</div><div class="pd-spec-lab">${_esc(i.lab)}</div></div>`).join('')}
    </div>
  `;
}

function renderDescripcion(p) {
  const txt = (p.descripcion_cliente || p.descripcion_interna || p.observaciones || '').trim();
  if (!txt) return '';
  const paras = txt.split(/\n\n+/).map(t => `<p>${_esc(t)}</p>`).join('');
  return `
    <section class="pd-section">
      <div class="pd-section-eyebrow">DESCRIPCIÓN</div>
      <h2 class="pd-section-title">Sobre la propiedad</h2>
      <div class="pd-prose">${paras}</div>
    </section>
  `;
}

function renderFeatures(p) {
  const rows = [];
  if (p.tipo) rows.push({ k: 'Tipo', v: p.tipo });
  if (p.negociacion) rows.push({ k: 'Negociación', v: p.negociacion });
  if (p.area_construida) rows.push({ k: 'Área construida', v: p.area_construida + ' m²' });
  if (p.area_total) rows.push({ k: 'Área total', v: p.area_total + ' m²' });
  if (p.habitaciones) rows.push({ k: 'Habitaciones', v: p.habitaciones });
  if (p.banos) rows.push({ k: 'Baños', v: p.banos });
  if (p.parqueaderos) rows.push({ k: 'Parqueaderos', v: p.parqueaderos });
  if (p.estrato) rows.push({ k: 'Estrato', v: p.estrato });
  if (p.antiguedad) rows.push({ k: 'Antigüedad', v: p.antiguedad });
  if (p.codigo_house) rows.push({ k: 'Código', v: p.codigo_house });
  if (!rows.length) return '';
  return `
    <section class="pd-section">
      <div class="pd-section-eyebrow">CARACTERÍSTICAS</div>
      <h2 class="pd-section-title">Detalles</h2>
      <div class="pd-features">
        ${rows.map(r => `<div class="pd-feature"><div class="pd-feature-key">${_esc(r.k)}</div><div class="pd-feature-val">${_esc(r.v)}</div></div>`).join('')}
      </div>
    </section>
  `;
}

function renderAdvisor(p) {
  const a = p.captador;
  if (!a || !a.nombre) return '';
  const ini = (a.nombre || '?')[0].toUpperCase();
  const tel = (a.telefono_contacto || '').replace(/[^\d+]/g, '');
  const wapp = tel ? `https://wa.me/${tel.replace(/^\+/, '')}?text=${encodeURIComponent('Hola ' + a.nombre.split(' ')[0] + ', vi el inmueble ' + (p.codigo_house || '') + ' y me interesa.')}` : null;
  const avatarHtml = a.foto
    ? `<img src="${_esc(_cld(a.foto, 'avatar'))}" alt="">`
    : ini;
  return `
    <section class="pd-section">
      <div class="pd-section-eyebrow">ASESOR</div>
      <h2 class="pd-section-title">Te asesora</h2>
      <div class="pd-advisor">
        <div class="pd-advisor-avatar">${avatarHtml}</div>
        <div>
          <div class="pd-advisor-name">${_esc(a.nombre)}</div>
          <div class="pd-advisor-meta">Asesor · Inmobiliaria House</div>
        </div>
        <div class="pd-advisor-actions">
          ${tel ? `<a class="v2-btn v2-btn-ghost" href="tel:${_esc(tel)}">Llamar</a>` : ''}
          ${wapp ? `<a class="v2-btn v2-btn-wapp" href="${_esc(wapp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </div>
    </section>
  `;
}

function renderStickyCTA(p) {
  const a = p.captador || {};
  const tel = (a.telefono_contacto || '').replace(/[^\d+]/g, '');
  const wapp = tel ? `https://wa.me/${tel.replace(/^\+/, '')}?text=${encodeURIComponent('Hola, me interesa el inmueble ' + (p.codigo_house || ''))}` : '#';
  return `
    <div class="pd-sticky-cta">
      <button class="v2-btn v2-btn-primary" type="button" onclick="window._v2AgendarVisita&&window._v2AgendarVisita('${_esc(p.id)}')">📅 Agendar</button>
      <a class="v2-btn v2-btn-wapp" href="${_esc(wapp)}" target="_blank" rel="noopener">💬 WhatsApp</a>
      ${tel ? `<a class="v2-btn v2-btn-ghost" href="tel:${_esc(tel)}">📞 Llamar</a>` : `<button class="v2-btn v2-btn-ghost" type="button" onclick="window._v2AbrirContacto&&window._v2AbrirContacto('${_esc(p.id)}')">📞 Contactar</button>`}
    </div>
  `;
}

// ───────── public renderer ─────────
async function renderPropertyDetailV2() {
  const root = document.getElementById('sec-property-detail');
  if (!root) {
    console.warn('[v2] sec-property-detail no existe en el DOM');
    return;
  }

  // Aseguramos las clases de scoping antes de pintar nada (los tokens-v2 dependen de .v2-page)
  root.classList.add('v2-page', 'pd');

  const code = getCodeFromHash();

  // Skeleton
  root.innerHTML = `
    ${renderTopBar(null)}
    <div class="pd-gallery"><div class="pd-main"><div class="pd-skeleton" style="position:absolute;inset:0"></div></div></div>
    <div class="pd-body">
      <div>
        <div class="pd-skeleton" style="height:14px;width:140px;margin-bottom:14px"></div>
        <div class="pd-skeleton" style="height:32px;margin-bottom:10px"></div>
        <div class="pd-skeleton" style="height:80px;margin-bottom:12px"></div>
      </div>
    </div>
  `;

  if (!code) {
    root.innerHTML = `
      ${renderTopBar(null)}
      <div class="pd-empty">
        <h2>Falta el código</h2>
        <p class="pd-prose">La URL no incluye el código del inmueble. Volvé al portafolio y elegí uno.</p>
        <a class="v2-btn v2-btn-primary" href="#/portafolio" style="margin-top:16px">Ver portafolio</a>
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
        <p class="pd-prose">Es posible que ya no esté disponible o que el enlace haya cambiado.</p>
        <a class="v2-btn v2-btn-primary" href="#/portafolio" style="margin-top:16px">Ver portafolio</a>
      </div>
    `;
    return;
  }

  // Render real
  root.innerHTML = `
    ${renderTopBar(p)}
    ${renderGallery(p)}
    <div class="pd-body">
      <div>
        ${renderHeader(p)}
        ${renderPriceBlock(p)}
        ${renderSpecs(p)}
        ${renderDescripcion(p)}
        ${renderFeatures(p)}
        ${renderAdvisor(p)}
      </div>
    </div>
    ${renderStickyCTA(p)}
  `;

  // Wiring: galería simple — click thumb cambia main
  window._v2GalleryGo = function (idx) {
    const thumbs = root.querySelectorAll('.pd-thumb');
    const main = root.querySelector('#v2MainImg');
    thumbs.forEach((t, i) => t.classList.toggle('is-active', i === idx));
    const t = thumbs[idx];
    if (t && main) {
      main.style.opacity = '0';
      setTimeout(() => {
        main.src = t.dataset.full || t.querySelector('img')?.src || '';
        main.style.opacity = '1';
      }, 120);
    }
  };

  // Hooks: integrar con flujos existentes si están disponibles
  window._v2AgendarVisita = function (id) {
    if (typeof window.abrirAgendarVisitaLead === 'function') return window.abrirAgendarVisitaLead(null, id);
    if (typeof window.abrirInteres === 'function') return window.abrirInteres(id);
    location.hash = '#/contacto';
  };
  window._v2AbrirContacto = function (id) {
    if (typeof window.abrirInteres === 'function') return window.abrirInteres(id);
    location.hash = '#/contacto';
  };
  window._v2ToggleFav = function () {
    if (p && p.id && typeof window.toggleFavorito === 'function') {
      window.toggleFavorito(p.id);
      const btn = document.getElementById('v2FavBtn');
      if (btn) btn.classList.toggle('is-active');
    }
  };
}

if (typeof window !== 'undefined') {
  window.rPropertyV2 = renderPropertyDetailV2;
}

export { renderPropertyDetailV2 };
