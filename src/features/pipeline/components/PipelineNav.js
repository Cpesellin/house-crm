/**
 * HOUSE CRM — PipelineNav Component
 *
 * Quick-navigation buttons with badge counters for each pipeline column.
 * Clicking scrolls the board to that column.
 */

import { escapeHtml } from '../../../utils/sanitizer.js';
import { pipeline, PIPELINE_COLS } from '../pipelineStore.js';
import { inventory } from '../../inventory/inventoryStore.js';

/**
 * Render the navigation buttons into a container.
 *
 * @param {HTMLElement} container - The #mis-nav div
 * @param {Object} [state] - Pipeline state (optional, fetched from store if omitted)
 */
export function renderPipelineNav(container, state) {
  if (!container) return;

  const st = state || pipeline.getState();
  const user = typeof window !== 'undefined' && window.userStore ? window.userStore.get() : null;
  if (!user) return;

  const counts = pipeline.getAllColumnCounts();
  const mySols = st.mySolicitudesPending || [];
  const solsOnMy = st.solicitudesOnMyItems || [];
  const arriendos = st.arriendosInventory || [];

  let h = '';

  // ── Main PCOL buttons ──
  PIPELINE_COLS.forEach((col, i) => {
    h += `<button class="pnav-btn ${col.css}" onclick="scrollToCol(${i})">` +
      `${col.emoji} ${escapeHtml(col.label)} ` +
      `<span class="pnav-n">${counts[col.id] || 0}</span></button>`;
  });

  // ── "Mis consultas" button ──
  if (mySols.length > 0) {
    h += `<button class="pnav-btn c-vd" onclick="scrollToCol(${PIPELINE_COLS.length})">` +
      `🔍 Mis consultas <span class="pnav-n" style="background:var(--gold)">${mySols.length}</span></button>`;
  }

  // ── "Me consultan" button ──
  if (solsOnMy.length > 0) {
    h += `<button class="pnav-btn c-vd" onclick="scrollToCol(${PIPELINE_COLS.length + 1})">` +
      `📩 Me consultan <span class="pnav-n" style="background:var(--red)">${solsOnMy.length}</span></button>`;
  }

  // ── "Arriendos" button (gestor only) ──
  if (user.es_gestor_arriendos) {
    h += `<button class="pnav-btn" style="border-color:#065f46" onclick="scrollToCol(99)">` +
      `🔑 Arriendos <span class="pnav-n" style="background:#065f46">${arriendos.length}</span></button>`;
  }

  container.innerHTML = h;
}

/**
 * Scroll to a specific pipeline column by index.
 */
export function scrollToCol(i) {
  const cols = document.querySelectorAll('.pcol');
  if (cols[i]) {
    cols[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }
}

// Backward compat
if (typeof window !== 'undefined') {
  window.renderPipelineNav = renderPipelineNav;
  window.scrollToCol = scrollToCol;
}

export default renderPipelineNav;
