/**
 * HOUSE CRM — PipelineBoard Component
 *
 * Kanban board with 5 columns + extra columns (solicitudes, arriendos).
 * Handles drag-and-drop with native HTML5 API.
 */

import { escapeHtml, escapeAttr } from '../../../utils/sanitizer.js';
import { inventory, propertyEmoji, formatMoney, diasDesde, timerBadge } from '../../inventory/inventoryStore.js';
import { pipeline, PIPELINE_COLS } from '../pipelineStore.js';
import { quickMove } from '../pipelineService.js';
import { renderPipelineCard } from './PipelineCard.js';

class PipelineBoard {
  /**
   * @param {HTMLElement} container - The #pipeline div
   */
  constructor(container) {
    this._el = container;
    this._unsub = null;
  }

  mount() {
    this._unsub = pipeline.subscribe(state => this.render(state));
    this.render(pipeline.getState());
  }

  unmount() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  render(state) {
    const allItems = inventory.getAll();
    const user = typeof window !== 'undefined' && window.userStore ? window.userStore.get() : null;
    if (!user) return;

    let h = '';

    // ── Main PCOL columns ──
    PIPELINE_COLS.forEach(col => {
      const items = state.itemsByColumn[col.id] || [];

      h += `<div class="pcol ${col.css}" data-estado="${escapeAttr(col.id)}">` +
        `<div class="pch"><span class="pct">${col.emoji} ${escapeHtml(col.label)}</span>` +
        `<span class="pcc">${items.length}</span></div><div class="pcb">`;

      items.forEach(p => {
        const globalIdx = allItems.indexOf(p);
        const pSols = pipeline.getSolicitudesForProperty(p.id);
        h += renderPipelineCard(p, {
          columnId: col.id,
          globalIdx: globalIdx >= 0 ? globalIdx : 0,
          solicitudes: pSols,
        });
      });

      h += '</div></div>';
    });

    // ── "Mis consultas" column (solicitudes I sent) ──
    const mySols = state.mySolicitudesPending || [];
    if (mySols.length > 0) {
      h += `<div class="pcol c-vd" style="border-color:var(--gold)">` +
        `<div class="pch" style="background:rgba(245,158,11,.08)">` +
        `<span class="pct" style="color:var(--gold)">🔍 Mis consultas</span>` +
        `<span class="pcc">${mySols.length}</span></div><div class="pcb">`;

      mySols.forEach(s => {
        const p = inventory.getById(s.inmueble_id);
        if (!p) return;
        const globalIdx = allItems.indexOf(p);
        const dias = diasDesde(s.created_at);
        const capNom = escapeHtml(p.captador ? p.captador.nombre : '?');
        const nota = s.nota_solicitante ? escapeHtml(s.nota_solicitante) : '';

        h += `<div class="sol-card" onclick="oM(${globalIdx})">` +
          `<div class="sol-badge">🔍 Esperando respuesta de ${capNom}</div>` +
          `<div class="pktp">${propertyEmoji(p.tipo)} ${escapeHtml(p.tipo || 'Inmueble')}</div>` +
          `<div class="pkci">📍 ${escapeHtml(p.ciudad || '')}</div>` +
          timerBadge(dias, 5) +
          (nota ? `<div style="font-size:10px;color:var(--sub);margin-top:4px;font-style:italic">"${nota}"</div>` : '') +
          `</div>`;
      });
      h += '</div></div>';
    }

    // ── "Arriendos del inventario" column (for gestor) ──
    const arriendos = state.arriendosInventory || [];
    if (user.es_gestor_arriendos && arriendos.length >= 0) {
      h += `<div class="pcol" style="border-color:#065f46;border-width:2px">` +
        `<div class="pch" style="background:rgba(6,95,70,.08)">` +
        `<span class="pct" style="color:#065f46">🔑 Arriendos del inventario</span>` +
        `<span class="pcc" style="background:#065f46">${arriendos.length}</span></div><div class="pcb">`;

      if (!arriendos.length) {
        h += '<div style="text-align:center;padding:16px;font-size:12px;color:var(--sub)">✅ Sin arriendos pendientes de otros asesores</div>';
      }

      arriendos.forEach(p => {
        const globalIdx = allItems.indexOf(p);
        const tip = escapeHtml(p.tipo || 'Inmueble');
        const ciu = escapeHtml(p.ciudad || '');
        const ase = escapeHtml(p.captador ? p.captador.nombre : '?');
        const pa = p.precio_arriendo || 0;
        const dias = p._dias || 0;
        const pId = escapeAttr(p.id);

        h += `<div class="pkc" style="border-color:#065f46;border-width:2px" onclick="oM(${globalIdx >= 0 ? globalIdx : 0})">` +
          `<div class="pktp">🔑 ${tip}</div><div class="pkci">📍 ${ciu}</div>`;
        if (pa > 0) h += `<div class="pkpr">${formatMoney(pa)}/mes</div>`;
        h += timerBadge(dias, 15);
        h += `<div class="pkbt"><span class="pkas">👤 ${ase}</span></div>`;
        h += `<div style="display:flex;gap:4px;margin-top:6px" onclick="event.stopPropagation()">` +
          `<button style="flex:1;padding:6px;border:none;border-radius:5px;font-size:10px;font-weight:700;background:var(--b600);color:#fff;font-family:inherit;cursor:pointer" onclick="abrirAgendarEvt('${pId}')">📅 Agendar</button>` +
          `<select class="esel" style="flex:1;font-size:10px;padding:6px" onchange="if(this.value)quickMove('${pId}',this.value)">` +
          `<option value="">⇄ Mover a...</option>` +
          `<option value="Arrendado">🔑 Arrendado</option>` +
          `<option value="Retirado">⛔ Retirado</option></select></div></div>`;
      });
      h += '</div></div>';
    }

    this._el.innerHTML = h;

    // ── Bind drag-drop on columns ──
    this._el.querySelectorAll('.pcol').forEach(col => {
      col.addEventListener('dragover', e => {
        e.preventDefault();
        col.classList.add('drag-over');
      });
      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });
      col.addEventListener('drop', e => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        if (id && col.dataset.estado) quickMove(id, col.dataset.estado);
        pipeline.clearDrag();
      });
    });
  }
}

// ── Backward compat: rPipe() replacement ─────────────────────────

function rPipe() {
  const pipeEl = document.getElementById('pipeline');
  const navEl = document.getElementById('mis-nav');
  if (!pipeEl) return;

  // Refresh store data
  pipeline.setSearchQuery(document.getElementById('pipeQ')?.value || '');
  pipeline.setSortBy(document.getElementById('pipeSort')?.value || 'dias');
  pipeline.refresh();

  // Render board
  const board = new PipelineBoard(pipeEl);
  board.render(pipeline.getState());

  // Render nav (import PipelineNav if available, otherwise inline)
  if (navEl && typeof window.renderPipelineNav === 'function') {
    window.renderPipelineNav(navEl);
  }
}

if (typeof window !== 'undefined') {
  window.PipelineBoard = PipelineBoard;
  window.rPipe = rPipe;
}

export { PipelineBoard, rPipe };
export default PipelineBoard;
