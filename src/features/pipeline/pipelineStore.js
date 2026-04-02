/**
 * HOUSE CRM — Pipeline Store
 *
 * State management for the Kanban board.
 * Imports column config from inventoryStore (PIPELINE_COLS, FRESHNESS_THRESHOLDS, FINAL_STATES).
 * Items come from inventory.getMyProperties().
 *
 * Usage:
 *   import { pipeline } from './pipelineStore.js';
 *   pipeline.refresh();
 *   pipeline.subscribe(state => renderBoard(state));
 */

import {
  PIPELINE_COLS, FRESHNESS_THRESHOLDS, FINAL_STATES,
  inventory, diasDesde, formatMoney, propertyEmoji, timerBadge,
} from '../inventory/inventoryStore.js';

// ─── Internal state ──────────────────────────────────────────────

const _state = {
  columns: PIPELINE_COLS,
  itemsByColumn: {},    // { 'Disponible': [...items], 'Aún Disponible': [...], ... }
  searchQuery: '',
  sortBy: 'dias',       // 'dias' | 'precio_desc' | 'precio_asc'
  dragState: { draggingId: null, overColumn: null },

  // Extra columns (not in PCOLS)
  mySolicitudesPending: [],   // SOL where I'm the requester
  solicitudesOnMyItems: [],   // SOL where others ask about MY items
  arriendosInventory: [],     // arriendo items from other asesores (for gestor)
};

const _listeners = new Set();

function _notify() {
  const snap = { ..._state, itemsByColumn: { ..._state.itemsByColumn } };
  _listeners.forEach(fn => { try { fn(snap); } catch (e) { console.error('[pipelineStore]', e); } });
}

// ─── Helpers ─────────────────────────────────────────────────────

function _getUser() {
  return typeof window !== 'undefined' && window.userStore ? window.userStore.get() : null;
}

function _getSolicitudes() {
  return typeof window !== 'undefined' ? (window.SOL || []) : [];
}

/** Matches original pipeFilter logic */
function _matchesPipeSearch(p, query) {
  if (!query) return true;
  const all = [
    p.tipo || '', p.ciudad || '', p.direccion || '', p.barrio || '',
    p.codigo_house || '', formatMoney(p.precio_venta || 0), formatMoney(p.precio_arriendo || 0),
  ].join(' ').toLowerCase();
  return all.includes(query);
}

/** Matches original pipeSortFn logic */
function _pipeSort(a, b, sortBy) {
  if (sortBy === 'precio_desc') {
    return Math.max(b.precio_venta || 0, b.precio_arriendo || 0) -
           Math.max(a.precio_venta || 0, a.precio_arriendo || 0);
  }
  if (sortBy === 'precio_asc') {
    return Math.max(a.precio_venta || 0, a.precio_arriendo || 0) -
           Math.max(b.precio_venta || 0, b.precio_arriendo || 0);
  }
  return (b._dias || 0) - (a._dias || 0); // default: by days desc
}

/**
 * Assigns items to columns.
 * Logic: "Disponible" column includes items with estado = Disponible, null, or "Verificar Disponibilidad".
 * Other columns are exact matches.
 */
function _distributeItems(myItems, query, sortBy) {
  const result = {};

  PIPELINE_COLS.forEach(col => {
    const items = myItems.filter(p => {
      const matchesCol = p.estado === col.id ||
        (col.id === 'Disponible' && (!p.estado || p.estado === 'Disponible' || p.estado === 'Verificar Disponibilidad'));
      return matchesCol && _matchesPipeSearch(p, query);
    });
    items.sort((a, b) => _pipeSort(a, b, sortBy));
    result[col.id] = items;
  });

  return result;
}

// ─── Public API ──────────────────────────────────────────────────

const pipeline = {

  // Re-export constants for components
  COLUMNS: PIPELINE_COLS,
  THRESHOLDS: FRESHNESS_THRESHOLDS,
  FINAL_STATES,

  /**
   * Refresh all pipeline data from the current inventory.
   * Call after load() completes.
   */
  refresh() {
    const user = _getUser();
    if (!user) return;

    const allItems = inventory.getAll();
    const myItems = allItems.filter(p => p.captador_id === user.id);
    const SOL = _getSolicitudes();

    _state.itemsByColumn = _distributeItems(myItems, _state.searchQuery.toLowerCase(), _state.sortBy);

    _state.mySolicitudesPending = SOL.filter(s => s.solicitante_id === user.id && s.estado === 'pendiente');

    _state.solicitudesOnMyItems = SOL.filter(s =>
      myItems.some(p => p.id === s.inmueble_id) && s.estado === 'pendiente'
    );

    // Arriendos from other asesores (for gestor de arriendos)
    if (user.es_gestor_arriendos) {
      _state.arriendosInventory = allItems.filter(p =>
        p.captador_id !== user.id && !p.eliminado &&
        (p.negociacion || '').toLowerCase().includes('arriendo') &&
        (p.estado === 'Disponible' || p.estado === 'Aún Disponible' || !p.estado || p.estado === 'Verificar Disponibilidad')
      );
    } else {
      _state.arriendosInventory = [];
    }

    _notify();
  },

  // ── Getters ──────────────────────────────────────────────────

  getState() { return { ..._state }; },

  getColumnItems(colId) {
    return _state.itemsByColumn[colId] || [];
  },

  getColumnCount(colId) {
    return (_state.itemsByColumn[colId] || []).length;
  },

  getAllColumnCounts() {
    const counts = {};
    PIPELINE_COLS.forEach(col => { counts[col.id] = (_state.itemsByColumn[col.id] || []).length; });
    return counts;
  },

  getMySolicitudes() { return _state.mySolicitudesPending; },
  getSolicitudesOnMyItems() { return _state.solicitudesOnMyItems; },
  getArriendosInventory() { return _state.arriendosInventory; },

  /**
   * Get pending solicitudes for a specific property.
   */
  getSolicitudesForProperty(propertyId) {
    return _getSolicitudes().filter(s => s.inmueble_id === propertyId && s.estado === 'pendiente');
  },

  /**
   * Get the freshness threshold for a column.
   */
  getThreshold(colId) {
    return FRESHNESS_THRESHOLDS[colId] || 15;
  },

  /**
   * Get other columns (for the "Move to..." dropdown).
   */
  getOtherColumns(currentColId) {
    return PIPELINE_COLS.filter(c => c.id !== currentColId);
  },

  /**
   * Validate if a move requires confirmation.
   * Returns { needsConfirm, icon, message } or null if OK.
   */
  validateMove(newState) {
    if (FINAL_STATES.includes(newState)) {
      const icons = { 'Arrendado': '🔑', 'Vendido': '💰', 'Retirado': '⛔' };
      return {
        needsConfirm: true,
        icon: icons[newState] || '⚠️',
        title: '¿Mover a ' + newState + '?',
        message: 'Genera alertas a todo el equipo',
      };
    }
    return null;
  },

  // ── Filters ──────────────────────────────────────────────────

  setSearchQuery(q) {
    _state.searchQuery = (q || '').trim();
    this.refresh();
  },

  setSortBy(val) {
    _state.sortBy = val || 'dias';
    this.refresh();
  },

  // ── Drag state (for visual feedback) ─────────────────────────

  setDragging(id) {
    _state.dragState = { draggingId: id, overColumn: null };
    _notify();
  },

  setDragOver(colId) {
    _state.dragState = { ..._state.dragState, overColumn: colId };
    _notify();
  },

  clearDrag() {
    _state.dragState = { draggingId: null, overColumn: null };
    _notify();
  },

  // ── Optimistic UI update ─────────────────────────────────────

  /**
   * Move an item between columns optimistically (before the API call).
   * Used for instant visual feedback on drag-drop.
   */
  optimisticMove(itemId, toColumn) {
    for (const [colId, items] of Object.entries(_state.itemsByColumn)) {
      const idx = items.findIndex(p => p.id === itemId);
      if (idx >= 0) {
        const [item] = items.splice(idx, 1);
        if (!_state.itemsByColumn[toColumn]) _state.itemsByColumn[toColumn] = [];
        _state.itemsByColumn[toColumn].unshift(item);
        break;
      }
    }
    _notify();
  },

  // ── Subscription ─────────────────────────────────────────────

  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

// ─── Backward compat ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.pipeline = pipeline;
  window.scrollToCol = function(i) {
    const cols = document.querySelectorAll('.pcol');
    if (cols[i]) cols[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };
}

export { pipeline, PIPELINE_COLS, FRESHNESS_THRESHOLDS, FINAL_STATES };
export default pipeline;
