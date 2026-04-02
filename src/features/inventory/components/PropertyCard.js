/**
 * HOUSE CRM — PropertyCard Component
 *
 * Renders a single property card using DOM API (no innerHTML for dynamic text).
 * Uses escapeHtml/escapeAttr from sanitizer.js for all BD fields.
 *
 * Usage:
 *   import { createPropertyCard } from './PropertyCard.js';
 *   const el = createPropertyCard(property, { isOwner, globalIdx, onView, onRequestAvail });
 *   container.appendChild(el);
 */

import { escapeHtml, escapeAttr, safeJsonAttr } from '../../../utils/sanitizer.js';
import { propertyEmoji, formatMoney, isVenta, isArriendo, isAmbas, timerBadge } from '../inventoryStore.js';

/**
 * @param {Object} p - Property object from store
 * @param {Object} opts
 * @param {boolean}  opts.isOwner - Current user owns this property
 * @param {number}   opts.globalIdx - Index in D[] for oM() compat
 * @param {boolean}  opts.canSeeAddress - Can see real address
 * @param {Function} opts.onView - Called with (globalIdx) on card click
 * @param {Function} opts.onRequestAvail - Called with (propertyId) for "consultar disponibilidad"
 * @param {boolean}  opts.hasPendingSolicitud - Already sent request
 * @param {number}   opts.solicitudCount - How many asesores asking about this
 * @param {string}   opts.userRole - Current user role
 * @returns {HTMLElement}
 */
export function createPropertyCard(p, opts = {}) {
  const {
    isOwner = false,
    globalIdx = 0,
    canSeeAddress = false,
    onView = () => {},
    onRequestAvail = () => {},
    hasPendingSolicitud = false,
    solicitudCount = 0,
    userRole = 'asesor',
  } = opts;

  // ── Escaped values ─────────────────────────────────
  const tip   = escapeHtml(p.tipo || 'Inmueble');
  const ciu   = escapeHtml(p.ciudad || '');
  const ase   = escapeHtml(p.captador ? p.captador.nombre : '');
  const cod   = escapeHtml(p.codigo_house || '');
  const codRaw = p.codigo_house || '';

  // Numbers (safe)
  const pv   = p.precio_venta || 0;
  const pa   = p.precio_arriendo || 0;
  const hab  = p.habitaciones || '';
  const ban  = p.banos || '';
  const area = p.area_construida || '';
  const est  = p.estrato || '';
  const dias = p._dias || 0;

  // Computed
  const am = isAmbas(p), sv = isVenta(p) && !am, sa = isArriendo(p) && !am;
  const m2 = !!(p.url_metrocuadrado || '').trim();
  const fr = !!(p.url_fincaraiz || '').trim();

  // Address
  const dirRaw = canSeeAddress ? (p.direccion || '') : (p.direccion_publica || '');
  const dirEsc = escapeHtml(dirRaw);
  const ubiTxt = dirEsc ? (dirEsc + (ciu ? ' · ' + ciu : '')) : ('📍 ' + ciu);

  // Fotos
  const hasF = p.fotos && p.fotos.length > 0;
  const sortedFotos = hasF ? [...p.fotos].sort((a, b) => a.orden - b.orden) : [];

  // ── Build card ─────────────────────────────────────
  const card = document.createElement('div');
  card.className = 'pc';
  card.addEventListener('click', () => onView(globalIdx));

  // ── Card Top: Carousel or colored header ───────────
  let topHtml = '';
  const hc = am ? 'tb' : sv ? 'tv' : 'ta';
  const ageCls = dias <= 7 ? 'agn' : dias <= 20 ? 'ago' : dias <= 40 ? 'agw' : 'agd';
  const ageBadge = `<span class="agb ${ageCls}">${dias === 0 ? 'Hoy' : dias + 'd'}</span>`;

  if (hasF) {
    const fUrls = sortedFotos.map(f => f.url_thumb || f.url);
    const cid = 'car_' + globalIdx;

    topHtml = `<div class="pc-car" id="${cid}" data-fotos='${safeJsonAttr(JSON.stringify(fUrls))}' data-idx="0">` +
      `<img src="${escapeAttr(fUrls[0])}" onerror="drFallback(this)">`;

    if (sortedFotos.length > 1) {
      topHtml += `<button class="car-nav prev" onclick="event.stopPropagation();cardNav('${cid}',-1)">\u2039</button>` +
                 `<button class="car-nav next" onclick="event.stopPropagation();cardNav('${cid}',1)">\u203a</button>`;
    }

    if (sortedFotos.length > 1 && sortedFotos.length <= 6) {
      topHtml += `<div class="car-dots">${sortedFotos.map((_, j) =>
        `<div class="car-dot ${j === 0 ? 'act' : ''}"></div>`
      ).join('')}</div>`;
    }

    topHtml += `<span class="car-count">📷 ${sortedFotos.length}</span>${ageBadge}</div>`;
  } else {
    topHtml = `<div class="pctop ${hc}" style="position:relative">${ageBadge}` +
      `<div class="pce">${propertyEmoji(p.tipo)}</div>` +
      `<div class="pctt">${tip}</div>` +
      `<div class="pccy">${ciu}</div></div>` +
      `<div class="pc-nofoto">📷 Sin foto disponible</div>`;
  }

  // ── Body ───────────────────────────────────────────
  let mdBadges = '';
  if (sv || am) mdBadges += '<span class="mb mbv">💰</span>';
  if (sa || am) mdBadges += '<span class="mb mba">🔑</span>';

  let priceBlock = '<div class="pbl">';
  if (pv > 0) priceBlock += `<div class="pvt">${formatMoney(pv)} <small>venta</small></div>`;
  if (pa > 0) priceBlock += `<div class="par">${formatMoney(pa)} <small>/mes</small></div>`;
  if (!pv && !pa) priceBlock += '<div style="font-size:10px;color:var(--g400)">Consultar</div>';
  priceBlock += '</div>';

  const specs = [
    hab && hab != 0 ? `<span class="sp">🛏️${hab}</span>` : '',
    ban && ban != 0 ? `<span class="sp">🚿${ban}</span>` : '',
    area ? `<span class="sp">📐${area}m²</span>` : '',
    est ? `<span class="sp">E${est}</span>` : '',
  ].filter(Boolean).join('');

  const codBadge = cod
    ? `<span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${escapeAttr(codRaw)}');toast('📋 ${escapeAttr(codRaw)} copiado')">${cod}</span>`
    : '';

  const portalBadges =
    `${m2 ? '<span class="pp ppok">M²✓</span>' : '<span class="pp ppno">M²</span>'}` +
    `${fr ? '<span class="pp ppok">FR✓</span>' : '<span class="pp ppno">FR</span>'}`;

  // ── Action buttons ─────────────────────────────────
  let actionsHtml = `<button class="vb" onclick="event.stopPropagation();oM(${globalIdx})">Ver detalle →</button>`;

  if (!isOwner && userRole === 'asesor') {
    if (hasPendingSolicitud) {
      actionsHtml += '<div style="text-align:center;padding:6px;font-size:10px;color:var(--gold);font-weight:700;background:var(--goldbg);border:1px solid var(--yb);border-radius:6px;margin-top:5px">🔍 Solicitud enviada — esperando respuesta</div>';
    } else {
      actionsHtml += `<button class="wab" style="background:var(--b600)" onclick="event.stopPropagation();solicitarVerif('${escapeAttr(p.id)}')">🔍 Consultar disponibilidad</button>`;
    }
  }

  if (isOwner && solicitudCount > 0) {
    actionsHtml += `<div style="text-align:center;padding:6px;font-size:10px;color:var(--red);font-weight:700;background:var(--redbg);border:1px solid var(--rb);border-radius:6px;margin-top:5px">🔔 ${solicitudCount} asesor(es) consultan este inmueble</div>`;
  }

  // ── Assemble ───────────────────────────────────────
  let bodyHtml;
  if (hasF) {
    bodyHtml = `<div class="pcbd">` +
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">` +
        `<span style="font-size:18px">${propertyEmoji(p.tipo)}</span>` +
        `<div style="flex:1">` +
          `<div style="display:flex;align-items:center;gap:6px">` +
            `<div style="font-size:14px;font-weight:800">${tip}</div>${codBadge}` +
          `</div>` +
          `<div style="font-size:11px;color:var(--sub)">${ubiTxt}</div>` +
        `</div>` +
      `</div>` +
      `<div class="mods">${mdBadges}</div>${priceBlock}` +
      (specs ? `<div class="sps">${specs}</div>` : '') +
      (ase ? `<div class="asl">👤 ${ase}</div>` : '') +
      `<div class="ptb">${portalBadges}</div>${actionsHtml}</div>`;
  } else {
    bodyHtml = `<div class="pcbd">` +
      (cod ? `<div style="margin-bottom:4px">${codBadge}</div>` : '') +
      `<div class="mods">${mdBadges}</div>${priceBlock}` +
      (specs ? `<div class="sps">${specs}</div>` : '') +
      (ase ? `<div class="asl">👤 ${ase}</div>` : '') +
      `<div class="ptb">${portalBadges}</div>${actionsHtml}</div>`;
  }

  card.innerHTML = topHtml + bodyHtml;
  return card;
}

// ─── Backward compat ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.createPropertyCard = createPropertyCard;
}

export default createPropertyCard;
