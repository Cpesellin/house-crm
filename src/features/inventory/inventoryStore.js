/**
 * HOUSE CRM — Inventory Store
 *
 * Replaces globals: D[], MIS[], F{}, AS[], VS[], aL/aH/vL/vH/aA/vA,
 *                   searchTimer, _myFilter
 *
 * Usage:
 *   import { inventory } from './inventoryStore.js';
 *   inventory.setItems(data);
 *   inventory.toggleFilter('neg', 'venta');
 *   inventory.subscribe(state => renderGrid(state.filtered));
 */

// ─── Price step arrays (identical to original) ──────────────────

const ARRIENDO_STEPS = []; // 0 → 10M, step 500K
for (let v = 0; v <= 1e7; v += 5e5) ARRIENDO_STEPS.push(v);

const VENTA_STEPS = []; // 150M → 3B, step 50M
for (let v = 15e7; v <= 3e9; v += 5e7) VENTA_STEPS.push(v);

// ─── Pipeline columns (identical to original PCOLS) ─────────────

const PIPELINE_COLS = [
  { id: 'Disponible',      label: 'Disponible',      css: 'c-d',  emoji: '✅' },
  { id: 'Aún Disponible',  label: 'Aún Disponible',  css: 'c-ad', emoji: '✓' },
  { id: 'Arrendado',       label: 'Arrendado',        css: 'c-ar', emoji: '🔑' },
  { id: 'Vendido',         label: 'Vendido',          css: 'c-ve', emoji: '💰' },
  { id: 'Retirado',        label: 'Retirado',         css: 'c-re', emoji: '⛔' },
];

const FRESHNESS_THRESHOLDS = {
  'Disponible': 15,
  'Aún Disponible': 10,
  'Arrendado': 30,
  'Vendido': 30,
  'Retirado': 999,
};

const FINAL_STATES = ['Arrendado', 'Vendido', 'Retirado'];

// ─── Helpers (identical to original) ─────────────────────────────

function diasDesde(f) {
  if (!f) return 999;
  return Math.floor((Date.now() - new Date(f).getTime()) / 864e5);
}

function isVenta(p) {
  return (p.negociacion || '').toLowerCase().includes('venta');
}

function isArriendo(p) {
  const n = (p.negociacion || '').toLowerCase();
  return n.includes('arriendo') || n.includes('renta');
}

function isAmbas(p) {
  return isVenta(p) && isArriendo(p);
}

function formatMoney(n) {
  return n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : '';
}

function propertyEmoji(t) {
  t = (t || '').toLowerCase();
  if (t.includes('penthouse')) return '👑';
  if (t.includes('campestre')) return '🌿';
  if (t.includes('finca'))     return '🌾';
  if (t.includes('apartaestudio') || t.includes('aparta-estudio') || t.includes('aparta estudio')) return '🏬';
  if (t.includes('apto') || t.includes('apartamento')) return '🏢';
  if (t.includes('casa'))      return '🏡';
  if (t.includes('local'))     return '🏪';
  if (t.includes('oficina'))   return '💼';
  if (t.includes('lote'))      return '🌳';
  if (t.includes('bodega'))    return '🏭';
  return '🏠';
}

function timerBadge(days, threshold) {
  if (days <= Math.floor(threshold * 0.5))
    return `<span class="pk-timer ok">⏱️ ${days}d</span>`;
  if (days <= threshold)
    return `<span class="pk-timer warn">⏱️ ${days}d</span>`;
  return `<span class="pk-timer danger">🔴 ${days}d</span>`;
}

// ─── Recent searches (localStorage) ─────────────────────────────

const RECENT_KEY = 'hcrm_recent';
const MAX_RECENT = 5;

function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

function addRecentSearch(q) {
  if (!q || q.length < 2) return;
  let arr = getRecentSearches().filter(x => x !== q);
  arr.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, MAX_RECENT)));
}

// ─── Internal state ──────────────────────────────────────────────

const _state = {
  // Data
  items: [],          // all properties (replaces D[])
  filtered: [],       // after filters applied
  loading: false,
  error: null,

  // Filters (replaces F{})
  filters: {
    neg:    new Set(),
    ciu:    new Set(),
    tipo:   new Set(),
    fresco: new Set(),
  },

  // Search
  searchQuery: '',
  myOnly: false,       // replaces _myFilter
  asesorId: '',        // admin filter by asesor

  // Price sliders (replaces aL/aH/vL/vH/aA/vA)
  arriendo: { lo: 0, hi: ARRIENDO_STEPS.length - 1, active: false },
  venta:    { lo: 0, hi: VENTA_STEPS.length - 1, active: false },

  // Computed
  stats: { total: 0, venta: 0, arriendo: 0, ambas: 0 },

  // Recent searches
  recentSearches: getRecentSearches(),
};

const _listeners = new Set();
let _searchTimer = null;

function _notify() {
  const snapshot = _getSnapshot();
  _listeners.forEach(fn => {
    try { fn(snapshot); } catch (e) { console.error('[inventoryStore]', e); }
  });
}

function _getSnapshot() {
  return {
    items: _state.items,
    filtered: _state.filtered,
    loading: _state.loading,
    error: _state.error,
    filters: {
      neg:    new Set(_state.filters.neg),
      ciu:    new Set(_state.filters.ciu),
      tipo:   new Set(_state.filters.tipo),
      fresco: new Set(_state.filters.fresco),
    },
    searchQuery: _state.searchQuery,
    myOnly: _state.myOnly,
    asesorId: _state.asesorId,
    arriendo: { ..._state.arriendo },
    venta: { ..._state.venta },
    stats: { ..._state.stats },
    recentSearches: [..._state.recentSearches],
  };
}

// ─── Core filter logic (identical to original filtrar()) ─────────

function _matchesFilters(p, query) {
  const c = (p.ciudad || '').toLowerCase();
  const t = (p.tipo || '').toLowerCase();
  const pv = p.precio_venta || 0;
  const pa = p.precio_arriendo || 0;
  const { filters, arriendo, venta } = _state;

  // Negotiation filter
  if (filters.neg.size > 0) {
    let ok = false;
    if (filters.neg.has('venta') && isVenta(p))     ok = true;
    if (filters.neg.has('arriendo') && isArriendo(p)) ok = true;
    if (filters.neg.has('ambas') && isAmbas(p))      ok = true;
    if (!ok) return false;
  }

  // City filter
  if (filters.ciu.size > 0 && !Array.from(filters.ciu).some(x => c.includes(x)))
    return false;

  // Type filter
  if (filters.tipo.size > 0 && !Array.from(filters.tipo).some(x => t.includes(x)))
    return false;

  // Arriendo price range
  if (arriendo.active && (pa <= 0 || pa < ARRIENDO_STEPS[arriendo.lo] || pa > ARRIENDO_STEPS[arriendo.hi]))
    return false;

  // Venta price range
  if (venta.active && (pv <= 0 || pv < VENTA_STEPS[venta.lo] || pv > VENTA_STEPS[venta.hi]))
    return false;

  // Freshness
  if (filters.fresco.size > 0) {
    const d = p._dias ?? 999;
    if (filters.fresco.has('si') && d > 7)         return false;
    if (filters.fresco.has('atencion') && d <= 7)   return false;
  }

  // Text search
  if (query) {
    const all = Object.values(p).join(' ').toLowerCase() +
                (p.captador ? p.captador.nombre : '');
    if (!query.split(/\s+/).every(w => all.toLowerCase().includes(w)))
      return false;
  }

  return true;
}

function _applyFilters() {
  const q = _state.searchQuery.toLowerCase();
  let list = _state.items;

  // My only filter
  if (_state.myOnly) {
    const userId = _getCurrentUserId();
    if (userId) list = list.filter(p => p.captador_id === userId);
  }

  // Asesor filter (admin)
  if (_state.asesorId) {
    list = list.filter(p => p.captador_id === _state.asesorId);
  }

  // Check if any filter is active
  const hasFilters = Object.values(_state.filters).some(s => s.size > 0) ||
                     q.length > 0 ||
                     _state.arriendo.active ||
                     _state.venta.active;

  _state.filtered = hasFilters ? list.filter(p => _matchesFilters(p, q)) : list;
}

function _recomputeStats() {
  const items = _state.items;
  _state.stats = {
    total:    items.length,
    venta:    items.filter(p => isVenta(p) && !isAmbas(p)).length,
    arriendo: items.filter(p => isArriendo(p) && !isAmbas(p)).length,
    ambas:    items.filter(p => isAmbas(p)).length,
  };
}

function _getCurrentUserId() {
  if (typeof window !== 'undefined' && window.userStore) return window.userStore.get()?.id;
  return null;
}

// ─── Public API ──────────────────────────────────────────────────

const inventory = {

  // ── Constants (exported for components) ──────────────────────
  ARRIENDO_STEPS,
  VENTA_STEPS,
  PIPELINE_COLS,
  FRESHNESS_THRESHOLDS,
  FINAL_STATES,

  // ── Helpers (exported for components) ────────────────────────
  diasDesde,
  isVenta,
  isArriendo,
  isAmbas,
  formatMoney,
  propertyEmoji,
  timerBadge,

  // ── Data setters ─────────────────────────────────────────────

  setItems(data) {
    _state.items = (data || []).map(p => ({
      ...p,
      _dias: diasDesde(p.fecha_estado),
    }));
    _recomputeStats();
    _applyFilters();
    _notify();
  },

  setLoading(val) {
    _state.loading = !!val;
    _notify();
  },

  setError(msg) {
    _state.error = msg || null;
    _notify();
  },

  // ── Filters ──────────────────────────────────────────────────

  toggleFilter(category, value) {
    const s = _state.filters[category];
    if (!s) return;
    if (s.has(value)) s.delete(value);
    else s.add(value);
    _applyFilters();
    _notify();
  },

  removeFilter(category, value) {
    const s = _state.filters[category];
    if (s) s.delete(value);
    _applyFilters();
    _notify();
  },

  setSearchQuery(q) {
    _state.searchQuery = (q || '').trim();
    if (_state.searchQuery.length >= 2) addRecentSearch(_state.searchQuery);
    _state.recentSearches = getRecentSearches();
    _applyFilters();
    _notify();
  },

  /** Debounced search — call on every keystroke */
  autoSearch(q) {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      inventory.setSearchQuery(q);
    }, 300);
  },

  setMyOnly(val) {
    _state.myOnly = !!val;
    _applyFilters();
    _notify();
  },

  toggleMyOnly() {
    _state.myOnly = !_state.myOnly;
    _applyFilters();
    _notify();
  },

  setAsesorFilter(id) {
    _state.asesorId = id || '';
    _applyFilters();
    _notify();
  },

  // ── Price ranges ─────────────────────────────────────────────

  setArriendoRange(lo, hi) {
    _state.arriendo = { lo, hi, active: true };
    _applyFilters();
    _notify();
  },

  resetArriendoRange() {
    _state.arriendo = { lo: 0, hi: ARRIENDO_STEPS.length - 1, active: false };
    _applyFilters();
    _notify();
  },

  setVentaRange(lo, hi) {
    _state.venta = { lo, hi, active: true };
    _applyFilters();
    _notify();
  },

  resetVentaRange() {
    _state.venta = { lo: 0, hi: VENTA_STEPS.length - 1, active: false };
    _applyFilters();
    _notify();
  },

  resetAllFilters() {
    for (const k of Object.keys(_state.filters)) _state.filters[k].clear();
    _state.searchQuery = '';
    _state.myOnly = false;
    _state.asesorId = '';
    _state.arriendo = { lo: 0, hi: ARRIENDO_STEPS.length - 1, active: false };
    _state.venta = { lo: 0, hi: VENTA_STEPS.length - 1, active: false };
    _applyFilters();
    _notify();
  },

  // ── Queries ──────────────────────────────────────────────────

  getAll()        { return _state.items; },
  getFiltered()   { return _state.filtered; },
  getStats()      { return { ..._state.stats }; },
  getState()      { return _getSnapshot(); },
  isLoading()     { return _state.loading; },

  getById(id) {
    return _state.items.find(p => p.id === id) || null;
  },

  getIndexById(id) {
    return _state.items.findIndex(p => p.id === id);
  },

  getMyProperties(userId) {
    return _state.items.filter(p => p.captador_id === userId);
  },

  /** Active filter tags for the "selection bar" UI */
  getActiveFilterTags() {
    const tags = [];
    const labels = {
      neg:    { venta: '💰 Venta', arriendo: '🔑 Arriendo', ambas: '🔄 Ambas' },
      ciu:    { pereira: '📍 Pereira', dosquebradas: '📍 Dosq.', 'santa rosa': '📍 Sta Rosa', cerritos: '📍 Cerritos' },
      tipo:   { apartamento: '🏢 Apto', casa: '🏡 Casa', finca: '🌾 Finca', local: '🏪 Local', lote: '🌳 Lote', oficina: '💼 Oficina', bodega: '🏭 Bodega', penthouse: '👑 PH' },
      fresco: { si: '✅ Frescos ≤7d', atencion: '⚠️ Necesitan atención' },
    };

    for (const [cat, set] of Object.entries(_state.filters)) {
      for (const val of set) {
        tags.push({ type: 'filter', category: cat, value: val, label: labels[cat]?.[val] || val });
      }
    }

    if (_state.arriendo.active) {
      const lo = ARRIENDO_STEPS[_state.arriendo.lo];
      const hi = ARRIENDO_STEPS[_state.arriendo.hi];
      tags.push({ type: 'arriendo', label: `🔑 $${(lo/1e6).toFixed(1)}M–$${(hi/1e6).toFixed(1)}M` });
    }
    if (_state.venta.active) {
      const lo = VENTA_STEPS[_state.venta.lo];
      const hi = VENTA_STEPS[_state.venta.hi];
      tags.push({ type: 'venta', label: `💰 $${(lo/1e6).toFixed(0)}M–$${(hi/1e6).toFixed(0)}M` });
    }
    if (_state.searchQuery) {
      tags.push({ type: 'search', label: `🔍 "${_state.searchQuery}"` });
    }

    return tags;
  },

  hasActiveFilters() {
    return Object.values(_state.filters).some(s => s.size > 0) ||
           _state.searchQuery.length > 0 ||
           _state.arriendo.active ||
           _state.venta.active;
  },

  // ── Subscription ─────────────────────────────────────────────

  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

// ─── Backward compat (window globals during migration) ───────────

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'D', {
    get() { return inventory.getAll(); },
    set(val) { inventory.setItems(val); },
    configurable: true,
  });
  Object.defineProperty(window, 'MIS', {
    get() {
      const uid = _getCurrentUserId();
      return uid ? inventory.getMyProperties(uid) : [];
    },
    configurable: true,
  });
  window.F = _state.filters;
  window.AS = ARRIENDO_STEPS;
  window.VS = VENTA_STEPS;

  // Expose slider state via getters for legacy code
  Object.defineProperties(window, {
    aL: { get() { return _state.arriendo.lo; }, set(v) { _state.arriendo.lo = v; }, configurable: true },
    aH: { get() { return _state.arriendo.hi; }, set(v) { _state.arriendo.hi = v; }, configurable: true },
    vL: { get() { return _state.venta.lo; },   set(v) { _state.venta.lo = v; },   configurable: true },
    vH: { get() { return _state.venta.hi; },   set(v) { _state.venta.hi = v; },   configurable: true },
    aA: { get() { return _state.arriendo.active; }, set(v) { _state.arriendo.active = v; }, configurable: true },
    vA: { get() { return _state.venta.active; },   set(v) { _state.venta.active = v; },   configurable: true },
  });

  window.inventory = inventory;
  window.diasDesde = diasDesde;
  window.fm = formatMoney;
  window.emo = propertyEmoji;
  window.timerBadge = timerBadge;
  window.eV = isVenta;
  window.eA = isArriendo;
  window.eA2 = isAmbas;
  window.PCOLS = PIPELINE_COLS;
  window.UMBRAL = FRESHNESS_THRESHOLDS;
  window.FINAL_STATES = FINAL_STATES;
  window.findInm = (id) => inventory.getById(id);
  window.descInm = (p) => p ? (p.tipo || 'Inmueble') + ' en ' + (p.ciudad || '?') : 'inmueble';
  window.getRecent = getRecentSearches;
  window.addRecent = addRecentSearch;
}

export { inventory, ARRIENDO_STEPS, VENTA_STEPS, PIPELINE_COLS, FRESHNESS_THRESHOLDS, FINAL_STATES };
export { diasDesde, isVenta, isArriendo, isAmbas, formatMoney, propertyEmoji, timerBadge };
export default inventory;
