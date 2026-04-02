/**
 * HOUSE CRM — PropertyGrid Component
 *
 * Renders a responsive grid of PropertyCard elements.
 * Subscribes to inventoryStore for automatic re-renders.
 *
 * Usage:
 *   import { PropertyGrid } from './PropertyGrid.js';
 *   const grid = new PropertyGrid(document.getElementById('res'));
 *   grid.mount();     // subscribes to store, renders
 *   grid.unmount();   // unsubscribes
 */

import { inventory } from '../inventoryStore.js';
import { createPropertyCard } from './PropertyCard.js';

const MAX_VISIBLE = 60; // same limit as original render()

class PropertyGrid {
  /**
   * @param {HTMLElement} container - The #res div
   * @param {Object} [opts]
   * @param {Function} [opts.onViewProperty] - Called with (globalIdx)
   * @param {Function} [opts.onRequestAvailability] - Called with (propertyId)
   * @param {Function} [opts.getUserId] - Returns current user ID
   * @param {Function} [opts.getUserRole] - Returns current user role
   * @param {Function} [opts.getSolicitudes] - Returns SOL[] array
   */
  constructor(container, opts = {}) {
    this._container = container;
    this._opts = opts;
    this._unsub = null;
  }

  mount() {
    this._unsub = inventory.subscribe(state => this.render(state));
    // Initial render
    this.render(inventory.getState());
  }

  unmount() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  render(state) {
    const items = state?.filtered ?? [];

    if (!items.length) {
      this._container.innerHTML =
        '<div class="emp"><span class="emp-i">🔍</span>' +
        '<h3>Sin resultados</h3></div>';
      return;
    }

    // Header count
    const header = document.createElement('div');
    header.style.cssText = "font-family:'Fraunces',serif;font-size:16px;font-weight:700;margin:10px 0";
    header.innerHTML = `🎯 <b style="color:var(--b600)">${items.length}</b> propiedades`;

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'pgr';

    const userId = this._opts.getUserId?.() || null;
    const userRole = this._opts.getUserRole?.() || 'asesor';
    const SOL = this._opts.getSolicitudes?.() || [];

    const allItems = inventory.getAll();

    items.slice(0, MAX_VISIBLE).forEach(p => {
      const globalIdx = allItems.indexOf(p);
      const isOwner = userId && p.captador_id === userId;
      const canSeeAddress = isOwner ||
        userRole === 'admin' || userRole === 'oficina' ||
        (window.userStore?.isGestorArriendos?.() &&
         (p.negociacion || '').toLowerCase().includes('arriendo'));

      const mySols = SOL.filter(s => s.inmueble_id === p.id && s.solicitante_id === userId);
      const hasPendSol = mySols.some(s => s.estado === 'pendiente');
      const solCount = SOL.filter(s => s.inmueble_id === p.id && s.estado === 'pendiente').length;

      const card = createPropertyCard(p, {
        isOwner,
        globalIdx: globalIdx >= 0 ? globalIdx : 0,
        canSeeAddress,
        onView: this._opts.onViewProperty || ((idx) => { if (window.oM) window.oM(idx); }),
        onRequestAvail: this._opts.onRequestAvailability || (() => {}),
        hasPendingSolicitud: hasPendSol,
        solicitudCount: solCount,
        userRole,
      });

      grid.appendChild(card);
    });

    // Clear and render
    this._container.textContent = '';
    this._container.appendChild(header);
    this._container.appendChild(grid);

    // Infinite scroll sentinel (preparation)
    if (items.length > MAX_VISIBLE) {
      const sentinel = document.createElement('div');
      sentinel.className = 'emp';
      sentinel.style.padding = '16px';
      sentinel.innerHTML = `<p style="color:var(--sub);font-size:11px">Mostrando ${MAX_VISIBLE} de ${items.length} · Usa filtros para refinar</p>`;
      this._container.appendChild(sentinel);
    }
  }
}

// ─── Backward compat: drop-in replacement for render() ───────────

/**
 * Drop-in replacement for the original render(ls) function.
 * Uses PropertyGrid internally but matches the old API.
 */
function render(ls) {
  const el = document.getElementById('res');
  if (!el) return;

  // If called with a list, temporarily override the store's filtered
  // This preserves backward compat where render() receives a pre-filtered array
  if (!ls || !ls.length) {
    el.innerHTML = '<div class="emp"><span class="emp-i">🔍</span><h3>Sin resultados</h3></div>';
    return;
  }

  const grid = new PropertyGrid(el, {
    getUserId: () => window.userStore?.get()?.id,
    getUserRole: () => window.userStore?.get()?.rol || 'asesor',
    getSolicitudes: () => window.SOL || [],
    onViewProperty: (idx) => { if (window.oM) window.oM(idx); },
  });

  // Create a temporary state snapshot with the provided list
  grid.render({ filtered: ls });
}

// Backward compat
if (typeof window !== 'undefined') {
  window.PropertyGrid = PropertyGrid;
  window.render = render;
}

export { PropertyGrid, render };
export default PropertyGrid;
