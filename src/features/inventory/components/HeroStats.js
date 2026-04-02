/**
 * HOUSE CRM — HeroStats Component
 *
 * The gradient hero bar with counters: Total, Venta, Arriendo, Ambas.
 * Auto-updates when inventoryStore changes.
 *
 * Usage:
 *   import { HeroStats } from './HeroStats.js';
 *   const hero = new HeroStats(document.querySelector('.hero'));
 *   hero.mount();
 */

import { inventory } from '../inventoryStore.js';

class HeroStats {
  /**
   * @param {HTMLElement} container - The .hero div
   */
  constructor(container) {
    this._container = container;
    this._unsub = null;
    this._els = { total: null, venta: null, arriendo: null, ambas: null };
  }

  mount() {
    this._render();
    this._unsub = inventory.subscribe(state => this._update(state.stats));
    this._update(inventory.getStats());
  }

  unmount() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  _render() {
    // If the hero HTML already exists in the page (from the HTML), just grab refs
    this._els.total   = document.getElementById('hst');
    this._els.venta   = document.getElementById('hsv');
    this._els.arriendo = document.getElementById('hsa');
    this._els.ambas   = document.getElementById('hsb');

    // If elements don't exist yet, build the hero
    if (!this._els.total && this._container) {
      this._container.innerHTML = `<div class="hin">
        <div>
          <h1>Portafolio <em>disponible</em></h1>
          <p>Inmuebles activos · Tiempo real</p>
        </div>
        <div class="sr">
          <div class="st"><div class="stn" id="hst">—</div><div class="stl">Total</div></div>
          <div class="st"><div class="stn" id="hsv">—</div><div class="stl">Venta</div></div>
          <div class="st"><div class="stn" id="hsa">—</div><div class="stl">Arriendo</div></div>
          <div class="st"><div class="stn" id="hsb">—</div><div class="stl">Ambas</div></div>
        </div>
      </div>`;

      this._els.total    = document.getElementById('hst');
      this._els.venta    = document.getElementById('hsv');
      this._els.arriendo = document.getElementById('hsa');
      this._els.ambas    = document.getElementById('hsb');
    }
  }

  _update(stats) {
    // Using textContent — safe, no innerHTML
    if (this._els.total)    this._els.total.textContent = stats.total;
    if (this._els.venta)    this._els.venta.textContent = stats.venta;
    if (this._els.arriendo) this._els.arriendo.textContent = stats.arriendo;
    if (this._els.ambas)    this._els.ambas.textContent = stats.ambas;
  }
}

// ── Backward compat: uSt() replacement ──────────────────────────

function uSt() {
  const stats = inventory.getStats();
  const hst = document.getElementById('hst');
  const hsv = document.getElementById('hsv');
  const hsa = document.getElementById('hsa');
  const hsb = document.getElementById('hsb');
  if (hst) hst.textContent = stats.total;
  if (hsv) hsv.textContent = stats.venta;
  if (hsa) hsa.textContent = stats.arriendo;
  if (hsb) hsb.textContent = stats.ambas;
}

if (typeof window !== 'undefined') {
  window.HeroStats = HeroStats;
  window.uSt = uSt;
}

export { HeroStats, uSt };
export default HeroStats;
