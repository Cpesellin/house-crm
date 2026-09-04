/**
 * Módulo: domains/inmuebles/cards-v2
 *
 * Renderer del inventario con el diseño v2 (editorial cálido).
 * Fuente: mockup de Claude Design, agosto 2026.
 *
 * PRESERVA toda la lógica de cards.js:
 *   - Filtrado de estados finales
 *   - Batch precarga de counts de interesados (evita N+1)
 *   - 4 variantes de CTA según perfil (visitante/cliente/vendedor/interno)
 *   - Favorito gated para anónimos
 *   - Share disponible para todos los perfiles
 *   - Badge de portales sólo para internos
 *
 * CAMBIA sólo la presentación: markup, tokens, iconos SVG.
 *
 * Se activa cuando design-v2/flag.js pone data-design="v2".
 */

import { HOUSE_PHONE } from '../../core/constants.js';
import { tenantPhone, tenantShortName, tenantBaseUrl } from '../../tenant/config.js';
import { icon } from '../../ui/icons.js';

// ─── Shortcuts (mismo patrón que cards.js) ───────────────────────────
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));
const eV = window.eV || ((p) => (p.negociacion || '').toLowerCase().includes('venta'));
const eA = window.eA || ((p) => { const n = (p.negociacion || '').toLowerCase(); return n.includes('arriendo') || n.includes('renta'); });
const eA2 = window.eA2 || ((p) => eV(p) && eA(p));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Badge de negociación: color según tipo de operación */
function badgeNegociacion(p) {
  const ambas = eA2(p);
  const venta = eV(p) && !ambas;
  if (ambas) {
    return { label: 'Venta y arriendo', bg: 'var(--v2-amber-soft)', fg: 'var(--v2-amber)', border: '#f0dcb4' };
  }
  if (venta) {
    return { label: 'En venta', bg: 'var(--v2-primary-soft)', fg: 'var(--v2-primary)', border: 'color-mix(in oklab, var(--v2-primary) 22%, #fff)' };
  }
  return { label: 'En arriendo', bg: 'var(--v2-green-soft)', fg: '#059669', border: '#bfe8d5' };
}

/** Bloque de precio: venta, arriendo o ambos */
function precioBlock(p) {
  const pv = p.precio_venta || 0;
  const pa = p.precio_arriendo || 0;
  if (pv > 0 && pa > 0) {
    return `<div style="display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;align-items:baseline;gap:7px"><span class="v2-num" style="font-size:20px;font-weight:800;letter-spacing:-.015em">${fm(pv)}</span><span style="font-size:12.5px;color:var(--v2-ink-3);font-weight:500">venta</span></div>
      <div style="display:flex;align-items:baseline;gap:7px"><span class="v2-num" style="font-size:15px;font-weight:700;color:#059669">${fm(pa)}</span><span style="font-size:12px;color:var(--v2-ink-3)">/mes</span></div>
    </div>`;
  }
  if (pv > 0) {
    return `<div style="display:flex;align-items:baseline;gap:8px"><span class="v2-num" style="font-size:20px;font-weight:800;letter-spacing:-.015em">${fm(pv)}</span><span style="font-size:12.5px;color:var(--v2-ink-3);font-weight:500">venta</span></div>`;
  }
  if (pa > 0) {
    return `<div style="display:flex;align-items:baseline;gap:8px"><span class="v2-num" style="font-size:20px;font-weight:800;letter-spacing:-.015em;color:#059669">${fm(pa)}</span><span style="font-size:12.5px;color:var(--v2-ink-3);font-weight:500">/mes</span></div>`;
  }
  return `<div style="font-size:13px;color:var(--v2-ink-4);font-weight:500">Precio a consultar</div>`;
}

/** Fila de specs con iconos SVG */
function specsRow(p) {
  const items = [];
  if (p.habitaciones && p.habitaciones != 0) {
    items.push(`<span style="display:inline-flex;align-items:center;gap:4px">${icon('bed', 14, { color: 'var(--v2-ink-4)' })}<b style="font-weight:600">${p.habitaciones}</b><span style="color:var(--v2-ink-3)">hab</span></span>`);
  }
  if (p.banos && p.banos != 0) {
    items.push(`<span style="display:inline-flex;align-items:center;gap:4px">${icon('bath', 14, { color: 'var(--v2-ink-4)' })}<b style="font-weight:600">${p.banos}</b></span>`);
  }
  if (p.area_construida) {
    items.push(`<span style="display:inline-flex;align-items:center;gap:4px">${icon('area', 14, { color: 'var(--v2-ink-4)' })}<b style="font-weight:600">${p.area_construida}m²</b></span>`);
  }
  if (p.parqueaderos && p.parqueaderos != 0) {
    items.push(`<span style="display:inline-flex;align-items:center;gap:4px">${icon('car', 14, { color: 'var(--v2-ink-4)' })}<b style="font-weight:600">${p.parqueaderos}</b></span>`);
  }
  if (p.estrato) {
    items.push(`<span style="display:inline-flex;align-items:center;gap:4px;color:var(--v2-ink-3)">Estrato <b style="font-weight:600;color:var(--v2-ink)">${p.estrato}</b></span>`);
  }
  if (!items.length) return '';
  return `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--v2-line-2);padding-top:10px;font-size:12.5px;margin-top:auto">${items.join('')}</div>`;
}

/** Skeleton para el estado de carga */
function skeletonCard() {
  return `<div class="v2-card" style="cursor:default;pointer-events:none">
    <div class="v2-card-media v2-skeleton"></div>
    <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
      <div class="v2-skeleton" style="height:11px;width:45%;border-radius:4px"></div>
      <div class="v2-skeleton" style="height:17px;width:80%;border-radius:5px"></div>
      <div class="v2-skeleton" style="height:13px;width:60%;border-radius:4px"></div>
      <div class="v2-skeleton" style="height:22px;width:52%;border-radius:5px;margin-top:4px"></div>
      <div class="v2-skeleton" style="height:34px;width:100%;border-radius:8px;margin-top:6px"></div>
    </div>
  </div>`;
}

export function renderSkeletons(n = 6) {
  return `<div class="v2-grid">${Array.from({ length: n }, skeletonCard).join('')}</div>`;
}

// ══════════════════════════════════════════════════════════════════════
// Renderer principal
// ══════════════════════════════════════════════════════════════════════
export function renderV2(ls) {
  const el = document.getElementById('res');
  if (!el) return;
  const D = window.D || [];
  const U = window.userStore?.get();
  const _tipoU = U?.tipo_usuario || (U ? 'interno' : 'visitante');
  const _isExt = !U || _tipoU === 'publico';

  const FINAL = window.FINAL_STATES || ['Arrendado', 'Vendido', 'Retirado'];
  const filtered = (ls || []).filter((p) => !FINAL.includes(p.estado));

  // Estado vacío
  if (!filtered.length) {
    el.innerHTML = `<div style="padding:64px 24px;text-align:center;max-width:420px;margin:0 auto">
      <div style="width:64px;height:64px;border-radius:var(--v2-r-xl);background:var(--v2-cream-3);display:grid;place-items:center;margin:0 auto 20px;color:var(--v2-ink-4)">${icon('search', 28)}</div>
      <h3 style="margin:0;font-size:19px;font-weight:700;letter-spacing:-.02em">Sin resultados</h3>
      <p style="margin:8px 0 20px;font-size:14px;color:var(--v2-ink-3);line-height:1.55">No encontramos inmuebles con esos filtros. Probá ampliando el rango de precio o quitando alguna ciudad.</p>
      <button class="v2-btn v2-btn-outline" style="padding:0 20px" onclick="window.limpiar&&window.limpiar()">Limpiar filtros</button>
    </div>`;
    return;
  }

  ls = filtered;
  const rcEl = document.getElementById('resCount');
  if (rcEl) rcEl.textContent = ls.length;

  const visibles = ls.slice(0, 60);

  // ⚡ Batch precarga de counts de interesados (evita N+1) — igual que v1
  if (!_isExt && typeof window.precargarCountsInteresados === 'function') {
    const ids = visibles.map((p) => p.id).filter(Boolean);
    window.precargarCountsInteresados(ids).then((map) => {
      ids.forEach((id) => {
        const bEl = document.getElementById('badgeInt-' + id);
        if (!bEl) return;
        const n = map.get(id) || 0;
        const span = bEl.querySelector('.int-count');
        if (span) span.textContent = n;
        if (n > 0) {
          bEl.style.background = 'var(--v2-primary)';
          bEl.style.color = '#fff';
          bEl.style.borderColor = 'var(--v2-primary)';
        }
      });
    }).catch(() => { /* noop */ });
  }

  const cards = visibles.map((p) => {
    const idx = D.indexOf(p);
    const tip = p.tipo || 'Inmueble';
    const ciu = p.ciudad || '';
    const esMio = U && p.captador_id === U.id;
    const esP = U && (U.rol === 'admin' || U.rol === 'oficina');
    const esGestor = U && U.es_gestor_arriendos;

    const canSeeDir = _isExt ? false : (esMio || esP || esGestor
      || (U?.es_gestor_arriendos && (p.negociacion || '').toLowerCase().includes('arriendo')));
    const titulo = canSeeDir
      ? (p.direccion || p.direccion_publica || p.barrio || tip)
      : (p.direccion_publica || p.barrio || tip);
    const ubicacion = [p.barrio, ciu].filter(Boolean).join(' · ') || ciu;

    const cod = _isExt ? '' : (p.codigo_house || '');
    const dias = p._dias ?? 999;
    const esNuevo = dias <= 7;
    const badge = badgeNegociacion(p);

    // ── Media ───────────────────────────────────────────────────────
    const fotos = p.fotos && p.fotos.length ? [...p.fotos].sort((a, b) => a.orden - b.orden) : [];
    const _cld = window.cldOpt || ((u) => u);
    const foto0 = fotos.length ? _cld(fotos[0].url_thumb || fotos[0].url, 600) : null;

    const media = foto0
      ? `<img src="${esc(foto0)}" alt="${esc(tip)} en ${esc(ubicacion)}" loading="lazy" onerror="window.drFallback&&window.drFallback(this)">`
      : `<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--v2-ink-4);gap:8px;flex-direction:column">${icon('camera', 26)}<span style="font-size:11.5px;font-weight:500">Sin fotos</span></div>`;

    // ── Favorito (gated para anónimos) ─────────────────────────────
    const esFav = (window.FAVS || []).includes(p.id);
    const favBtn = `<button class="v2-fav" aria-label="${esFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}" aria-pressed="${esFav}" onclick="event.stopPropagation();window.toggleFavorito&&window.toggleFavorito('${p.id}')" style="color:${esFav ? 'var(--v2-red)' : 'var(--v2-ink-3)'}">${icon('heart', 17, { fill: esFav ? 'currentColor' : 'none' })}</button>`;

    // ── Share (todos los perfiles) ─────────────────────────────────
    const shareCode = (p.codigo_house || p.id || '').replace(/'/g, '');
    const shareTitle = (tip + ' en ' + (p.barrio || ciu || '')).replace(/'/g, '');
    const shareBtn = `<button class="v2-fav" style="right:54px;color:var(--v2-ink-3)" aria-label="Compartir inmueble" onclick="event.stopPropagation();window.shareInmueble&&window.shareInmueble('${shareCode}','${esc(shareTitle)}')">${icon('share', 16)}</button>`;

    // ── Contador de fotos ──────────────────────────────────────────
    const photoCount = fotos.length > 1
      ? `<div class="v2-photo-count">${icon('camera', 11)}${fotos.length}</div>` : '';

    // ── Asesor (sólo internos) ─────────────────────────────────────
    const aseNom = _isExt ? '' : (p.captador?.nombre || '');
    const aseBlock = aseNom
      ? `<div style="display:flex;align-items:center;gap:6px;flex-shrink:0"><span style="width:22px;height:22px;border-radius:var(--v2-r-full);background:var(--v2-primary);color:#fff;display:grid;place-items:center;font-size:9px;font-weight:700">${esc(aseNom.trim()[0] || '?').toUpperCase()}</span><span style="font-size:11.5px;color:var(--v2-ink-3);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(aseNom.split(' ')[0])}</span></div>`
      : '';

    // ── Portales (sólo internos) ───────────────────────────────────
    const m2 = _isExt ? false : !!(p.url_metrocuadrado || '').trim();
    const fr = _isExt ? false : !!(p.url_fincaraiz || '').trim();
    const portales = _isExt ? '' : `<div style="display:flex;gap:5px">
      <span class="v2-badge" style="background:${m2 ? 'var(--v2-green-soft)' : 'var(--v2-cream-2)'};color:${m2 ? '#059669' : 'var(--v2-ink-4)'};font-size:10px">M²${m2 ? ' ✓' : ''}</span>
      <span class="v2-badge" style="background:${fr ? 'var(--v2-green-soft)' : 'var(--v2-cream-2)'};color:${fr ? '#059669' : 'var(--v2-ink-4)'};font-size:10px">FR${fr ? ' ✓' : ''}</span>
    </div>`;

    // ── CTAs por perfil (misma lógica que v1) ──────────────────────
    const capTel = tenantPhone();
    const capNom = tenantShortName();
    const prevUrl = (p.codigo_house || '')
      ? tenantBaseUrl() + '/ver/' + encodeURIComponent(p.codigo_house)
      : tenantBaseUrl() + '/ver/' + p.id;
    const esInmExterno = p.origen === 'externo';

    let actBtn;
    if (_isExt) {
      const esVisitante = !U;
      const esCliente = _tipoU === 'publico';
      if (esVisitante) {
        actBtn = `<button class="v2-btn v2-btn-ghost" style="flex:1" onclick="event.stopPropagation();window.trackPropertyView&&window.trackPropertyView('${p.id}');window.showPublicView&&window.showPublicView('${p.id}')">Ver detalle</button>
                  <button class="v2-btn v2-btn-outline" style="flex:1" onclick="event.stopPropagation();window.abrirInteres&&window.abrirInteres('${p.id}')">Me interesa</button>`;
      } else if (esInmExterno) {
        actBtn = `<button class="v2-btn v2-btn-solid" style="flex:1" onclick="event.stopPropagation();window.abrirChat&&window.abrirChat('${p.captador_id || p.captador?.id || ''}','${p.id}')">${icon('chat', 15)}Contactar</button>
                  <a class="v2-btn v2-btn-ghost" style="flex:1;text-decoration:none" href="${prevUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Ver detalle</a>`;
      } else if (esCliente) {
        actBtn = `<a class="v2-btn v2-btn-ghost" style="flex:1;text-decoration:none" href="${prevUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Ver detalle</a>
                  <button class="v2-btn v2-btn-outline" style="flex:1" onclick="event.stopPropagation();window.abrirInteres&&window.abrirInteres('${p.id}')">Me interesa</button>`;
      } else {
        const waTxt = encodeURIComponent('Hola ' + capNom + ', estoy interesado en este inmueble: ' + prevUrl);
        actBtn = `<a class="v2-btn" style="flex:1;background:#25d366;color:#fff;border:none;text-decoration:none" href="https://wa.me/${capTel}?text=${waTxt}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${icon('chat', 15)}WhatsApp</a>
                  <button class="v2-btn v2-btn-outline" style="flex:1" onclick="event.stopPropagation();window.abrirChat&&window.abrirChat('${p.captador_id || p.captador?.id || ''}','${p.id}')">Me interesa</button>`;
      }
    } else {
      const badgeInt = typeof window.badgeInteresadosInmueble === 'function'
        ? window.badgeInteresadosInmueble(p.id) : '';
      actBtn = `<button class="v2-btn v2-btn-ghost" style="flex:1" onclick="event.stopPropagation();window.oM&&window.oM('${p.id}')">Ver detalle</button>${badgeInt}`;
    }

    // ── Card ───────────────────────────────────────────────────────
    return `<article class="v2-card" onclick="${_isExt ? `window.showPublicView&&window.showPublicView('${p.id}')` : `window.oM&&window.oM('${p.id}')`}">
      <div class="v2-card-media">
        ${media}
        <div style="position:absolute;top:11px;left:11px;display:flex;gap:6px;pointer-events:none;flex-wrap:wrap;max-width:calc(100% - 110px)">
          <span class="v2-badge" style="background:${badge.bg};color:${badge.fg};border:1px solid ${badge.border}">${badge.label}</span>
          ${esNuevo ? `<span class="v2-badge" style="background:var(--v2-ink);color:var(--v2-cream)">Nuevo</span>` : ''}
        </div>
        ${favBtn}
        ${shareBtn}
        ${photoCount}
      </div>
      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:9px;flex:1">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:22px">
          <div class="v2-mono" style="font-size:10.5px;letter-spacing:.06em;color:var(--v2-ink-3);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tip)}${cod ? ' · ' + esc(cod) : ''}</div>
          ${aseBlock}
        </div>
        <div>
          <h3 style="margin:0;font-size:16.5px;font-weight:700;letter-spacing:-.015em;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(titulo)}</h3>
          ${ubicacion ? `<div style="display:flex;align-items:center;gap:4px;font-size:12.5px;color:var(--v2-ink-3);margin-top:4px">${icon('pin', 12, { color: 'var(--v2-ink-4)' })}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ubicacion)}</span></div>` : ''}
        </div>
        ${precioBlock(p)}
        ${specsRow(p)}
        ${portales}
        <div style="display:flex;gap:8px;margin-top:2px">${actBtn}</div>
      </div>
    </article>`;
  }).join('');

  let h = `<div class="v2-grid">${cards}</div>`;

  // Paginación / conteo
  if (ls.length > 60) {
    h += `<div style="margin-top:36px;display:flex;flex-direction:column;align-items:center;gap:14px">
      <div style="font-size:13px;color:var(--v2-ink-3)">Mostrando 60 de <b class="v2-num">${ls.length}</b></div>
    </div>`;
  }

  // Banner de referidos (externos)
  if (_isExt) {
    h += `<div style="margin-top:44px;border-radius:var(--v2-r-xl);border:1px solid #f0dcb4;background:linear-gradient(100deg,var(--v2-amber-soft) 0%,var(--v2-paper) 70%);padding:26px 28px;display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <span style="width:52px;height:52px;border-radius:var(--v2-r-lg);background:var(--v2-amber);color:#fff;display:grid;place-items:center;flex-shrink:0">${icon('money', 26)}</span>
      <div style="flex:1;min-width:220px">
        <h3 style="margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em">Ganá hasta 1.5% refiriendo arriendos</h3>
        <p style="margin:6px 0 0;font-size:14px;color:var(--v2-ink-3);line-height:1.5">¿Conocés a alguien que está buscando? Referilo y cobrás comisión cuando se cierre el negocio.</p>
      </div>
      <a class="v2-btn" style="background:var(--v2-ink);color:var(--v2-cream);padding:0 20px;text-decoration:none;flex-shrink:0" href="#/referidos-landing">Cómo funciona${icon('chevronRight', 15)}</a>
    </div>`;

    // CTA publicar
    h += `<div style="margin-top:16px;border-radius:var(--v2-r-xl);border:1px solid #bfe8d5;background:linear-gradient(100deg,var(--v2-green-soft) 0%,var(--v2-paper) 70%);padding:26px 28px;display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <span style="width:52px;height:52px;border-radius:var(--v2-r-lg);background:#059669;color:#fff;display:grid;place-items:center;flex-shrink:0">${icon('home', 26)}</span>
      <div style="flex:1;min-width:220px">
        <h3 style="margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em">¿Tenés un inmueble?</h3>
        <p style="margin:6px 0 0;font-size:14px;color:var(--v2-ink-3);line-height:1.5">Publicalo gratis y llegá a cientos de clientes verificados.</p>
      </div>
      <a class="v2-btn" style="background:#059669;color:#fff;padding:0 20px;text-decoration:none;flex-shrink:0" href="#/publicar">Publicar gratis${icon('chevronRight', 15)}</a>
    </div>`;
  }

  el.innerHTML = h;
}

if (typeof window !== 'undefined') {
  window.renderV2 = renderV2;
  window.renderV2Skeletons = renderSkeletons;
}
