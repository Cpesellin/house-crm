/**
 * HOUSE CRM — PipelineCard Component
 *
 * Compact kanban card for the pipeline board.
 * Based on the card-rendering logic inside rPipe().
 * Uses escapeHtml/escapeAttr for all BD fields.
 */

import { escapeHtml, escapeAttr } from '../../../utils/sanitizer.js';
import { propertyEmoji, formatMoney, timerBadge, FRESHNESS_THRESHOLDS } from '../../inventory/inventoryStore.js';
import { pipeline } from '../pipelineStore.js';

/**
 * @param {Object} p - Property object
 * @param {Object} opts
 * @param {string}  opts.columnId    - Which PCOL column this card is in
 * @param {number}  opts.globalIdx   - Index in D[] for oM() compat
 * @param {Object[]} opts.solicitudes - Pending solicitudes for this property
 * @param {Function} opts.onQuickMove  - (id, newState) => void
 * @param {Function} opts.onReVal      - (id) => void
 * @param {Function} opts.onRespond    - (solId, 'si'|'no') => void
 * @param {Function} opts.onView       - (globalIdx) => void
 * @returns {string} HTML string for the card
 */
export function renderPipelineCard(p, opts = {}) {
  const {
    columnId = 'Disponible',
    globalIdx = 0,
    solicitudes = [],
    onQuickMove = 'quickMove',
    onReVal = 'reVal',
    onRespond = 'responderSol',
    onView = 'oM',
  } = opts;

  // ── Escaped text fields ──
  const tip = escapeHtml(p.tipo || 'Inmueble');
  const ciu = escapeHtml(p.ciudad || '');
  const ase = escapeHtml(p.captador ? p.captador.nombre : '');
  const cod = escapeHtml(p.codigo_house || '');
  const codRaw = escapeAttr(p.codigo_house || '');
  const pId = escapeAttr(p.id);

  // ── Numbers (safe) ──
  const pv = p.precio_venta || 0;
  const pa = p.precio_arriendo || 0;
  const dias = p._dias || 0;
  const umb = FRESHNESS_THRESHOLDS[columnId] || 15;
  const m2 = !!(p.url_metrocuadrado || '').trim();
  const fr = !!(p.url_fincaraiz || '').trim();

  const hab = p.habitaciones || '', ban = p.banos || '', area = p.area_construida || '';
  const sps = [
    hab && hab != 0 ? '🛏️ ' + hab : '',
    ban && ban != 0 ? '🚿 ' + ban : '',
    area ? '📐 ' + area + 'm²' : '',
  ].filter(Boolean);

  // ── Other columns for "Move to..." dropdown ──
  const otherCols = pipeline.getOtherColumns(columnId);

  let h = `<div class="pkc" id="pkc-${pId}" draggable="true" ondragstart="dStart(event,'${pId}')" onclick="${onView}(${globalIdx})">`;

  // Solicitation badge
  if (solicitudes.length > 0) {
    h += `<span class="pk-new" style="background:var(--gold)">📩 ${solicitudes.length}</span>`;
  }

  // Title + code
  h += `<div class="pktp">${propertyEmoji(p.tipo)} ${tip}`;
  if (cod) {
    h += ` <span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${codRaw}');toast('📋 ${codRaw} copiado')" style="font-size:9px;margin-left:4px">${cod}</span>`;
  }
  h += `</div>`;

  // Location
  h += `<div class="pkci">📍 ${ciu}</div>`;

  // Price
  if (pv > 0 || pa > 0) {
    h += `<div class="pkpr">${pv > 0 ? formatMoney(pv) : ''}${pv > 0 && pa > 0 ? ' · ' : ''}${pa > 0 ? formatMoney(pa) + '/mes' : ''}</div>`;
  }

  // Specs
  if (sps.length) {
    h += `<div class="pksp">${sps.map(s => '<span>' + s + '</span>').join('')}</div>`;
  }

  // Timer badge
  h += timerBadge(dias, umb);

  // Pending solicitudes detail
  if (solicitudes.length > 0) {
    h += `<div style="margin-top:6px;padding:8px;background:var(--redbg);border:1px solid var(--rb);border-radius:6px">`;
    solicitudes.forEach(s => {
      const solNom = escapeHtml(s.solicitante ? s.solicitante.nombre : '?');
      const solNota = s.nota_solicitante ? ' — "' + escapeHtml(s.nota_solicitante) + '"' : '';
      const solId = escapeAttr(s.id);

      h += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:10px">` +
        `<span>🔍 <b>${solNom}</b> pregunta${solNota}</span></div>` +
        `<div style="display:flex;gap:4px" onclick="event.stopPropagation()">` +
        `<button style="flex:1;padding:5px;border:none;border-radius:4px;font-size:10px;font-weight:700;background:var(--green);color:#fff;font-family:inherit;cursor:pointer" onclick="${onRespond}('${solId}','si')">✅ Disponible</button>` +
        `<button style="flex:1;padding:5px;border:none;border-radius:4px;font-size:10px;font-weight:700;background:var(--red);color:#fff;font-family:inherit;cursor:pointer" onclick="${onRespond}('${solId}','no')">❌ No disponible</button></div>`;
    });
    h += `</div>`;
  }

  // Revalidate button (only in "Aún Disponible")
  if (columnId === 'Aún Disponible') {
    h += `<button class="pk-reval" onclick="event.stopPropagation();${onReVal}('${pId}')">🔄 Volver a validar</button>`;
  }

  // Footer: asesor + portal badges
  h += `<div class="pkbt"><span class="pkas">👤 ${ase}</span>` +
    `<div class="pkpt">${m2 ? '<span class="pp ppok">M²</span>' : '<span class="pp ppno">M²</span>'}` +
    `${fr ? '<span class="pp ppok">FR</span>' : '<span class="pp ppno">FR</span>'}</div></div>`;

  // Move-to dropdown
  h += `<div class="pk-move" onclick="event.stopPropagation()">` +
    `<select class="esel" style="width:100%;font-size:10px;margin-top:6px;padding:6px" onchange="if(this.value)${onQuickMove}('${pId}',this.value)">` +
    `<option value="">⇄ Mover a...</option>` +
    otherCols.map(c => `<option value="${escapeAttr(c.id)}">${c.emoji} ${escapeHtml(c.label)}</option>`).join('') +
    `</select></div>`;

  h += `</div>`;
  return h;
}

// Backward compat
if (typeof window !== 'undefined') {
  window.renderPipelineCard = renderPipelineCard;
}

export default renderPipelineCard;
