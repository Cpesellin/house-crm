/**
 * HOUSE CRM — SearchFilters Component
 *
 * Extracts: chips (negociación, ciudad, tipo, fresco), dual-handle price sliders,
 *           search input, "mis inmuebles" toggle, asesor filter, selection bar.
 *
 * Replaces: tc(), qf(), resetA(), resetV2(), renderSel(), limpiar(),
 *           mostrarTodo(), toggleMis(), iSl(), iDR(), doSearch(), autoSearch(),
 *           renderRecent(), populateAsesorFilter()
 *
 * Usage:
 *   import { SearchFilters } from './SearchFilters.js';
 *   const filters = new SearchFilters({ container: document.getElementById('filters-root') });
 *   filters.mount();
 */

import { inventory, ARRIENDO_STEPS, VENTA_STEPS } from '../inventoryStore.js';
import { escapeHtml } from '../../../utils/sanitizer.js';

// ─── Chip definitions (identical to original HTML) ───────────────

const CHIP_GROUPS = {
  neg: {
    label: 'Negociación',
    chips: [
      { value: 'venta',    label: '💰 Venta',   colorClass: 'cg' },
      { value: 'arriendo',  label: '🔑 Arriendo', colorClass: '' },
      { value: 'ambas',     label: '🔄 Ambas',   colorClass: 'cy' },
    ],
  },
  ciu: {
    label: 'Ciudad',
    chips: [
      { value: 'pereira',       label: '📍 Pereira' },
      { value: 'dosquebradas',  label: '📍 Dosq.' },
      { value: 'santa rosa',    label: '📍 Sta Rosa' },
      { value: 'cerritos',      label: '📍 Cerritos' },
    ],
  },
  tipo: {
    label: 'Tipo',
    full: true,
    chips: [
      { value: 'apartamento', label: '🏢 Apto' },
      { value: 'casa',        label: '🏡 Casa' },
      { value: 'finca',       label: '🌾 Finca',   colorClass: 'cg' },
      { value: 'local',       label: '🏪 Local',   colorClass: 'cy' },
      { value: 'lote',        label: '🌳 Lote',    colorClass: 'cg' },
      { value: 'oficina',     label: '💼 Oficina' },
      { value: 'bodega',      label: '🏭 Bodega' },
      { value: 'penthouse',   label: '👑 PH',      colorClass: 'cy' },
    ],
  },
  fresco: {
    label: 'Estado de info',
    full: true,
    chips: [
      { value: 'si',       label: '✅ Solo frescos (≤7d)', colorClass: 'cg' },
      { value: 'atencion', label: '⚠️ Necesitan atención', colorClass: 'cy' },
    ],
  },
};

// ─── Component ───────────────────────────────────────────────────

class SearchFilters {
  constructor(opts = {}) {
    this._container = opts.container;
    this._unsub = null;

    // Refs (populated after mount)
    this._searchInput = null;
    this._selBar = null;
    this._selTags = null;
    this._asesorSelect = null;
    this._myToggle = null;

    // Slider refs
    this._arLoEl = null;
    this._arHiEl = null;
    this._arFill = null;
    this._arPill = null;
    this._vnLoEl = null;
    this._vnHiEl = null;
    this._vnFill = null;
    this._vnPill = null;
  }

  mount() {
    if (!this._container) return;
    this._render();
    this._bindSliders();
    this._unsub = inventory.subscribe(() => this._updateSelectionBar());
    this._updateSelectionBar();
  }

  unmount() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  // ── Build DOM ────────────────────────────────────────────────

  _render() {
    const c = this._container;

    // ── Top row: my toggle + asesor filter ─────────
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center';

    this._myToggle = document.createElement('button');
    this._myToggle.className = 'my-toggle';
    this._myToggle.id = 'myToggle';
    this._myToggle.textContent = '🏠 Mis inmuebles';
    this._myToggle.addEventListener('click', () => {
      inventory.toggleMyOnly();
      this._myToggle.classList.toggle('act', inventory.getState().myOnly);
    });
    topRow.appendChild(this._myToggle);

    this._asesorSelect = document.createElement('select');
    this._asesorSelect.id = 'asesorFilter';
    this._asesorSelect.className = 'esel';
    this._asesorSelect.style.cssText = 'font-size:11px;padding:6px 10px;display:none';
    this._asesorSelect.addEventListener('change', () => {
      inventory.setAsesorFilter(this._asesorSelect.value);
    });
    topRow.appendChild(this._asesorSelect);
    c.appendChild(topRow);

    // ── Recent searches ─────────────────────────────
    const rsrch = document.createElement('div');
    rsrch.className = 'rsrch';
    rsrch.id = 'rsrch';
    c.appendChild(rsrch);

    // ── Search input ────────────────────────────────
    const siw = document.createElement('div');
    siw.className = 'siw';
    siw.style.marginBottom = '8px';
    siw.innerHTML =
      '<span class="sii">🔍</span>' +
      '<input class="si" id="q" placeholder="Buscar...">' +
      '<button class="sig" id="searchBtn">→</button>';
    c.appendChild(siw);

    this._searchInput = siw.querySelector('#q');
    this._searchInput.addEventListener('input', () => {
      inventory.autoSearch(this._searchInput.value);
    });
    this._searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') inventory.setSearchQuery(this._searchInput.value);
    });
    siw.querySelector('#searchBtn').addEventListener('click', () => {
      inventory.setSearchQuery(this._searchInput.value);
    });

    // ── Filter card ─────────────────────────────────
    const card = document.createElement('div');
    card.className = 'card';

    // Card header
    const cdh = document.createElement('div');
    cdh.className = 'cdh';
    cdh.innerHTML =
      '<div class="chl"><div class="chi">⚙️</div><div><div class="cht">Filtros</div></div></div>';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'bt bsm bd';
    clearBtn.textContent = '✕ Limpiar';
    clearBtn.addEventListener('click', () => this.clearAll());
    cdh.appendChild(clearBtn);
    card.appendChild(cdh);

    // Card body
    const cdb = document.createElement('div');
    cdb.className = 'cdb';

    const fg = document.createElement('div');
    fg.className = 'fg';

    // ── Chip groups ──────────────────────────────────
    for (const [group, config] of Object.entries(CHIP_GROUPS)) {
      const fs = document.createElement('div');
      fs.className = 'fs' + (config.full ? ' ful' : '');

      const fl = document.createElement('div');
      fl.className = 'fl';
      fl.textContent = config.label;
      fs.appendChild(fl);

      const cps = document.createElement('div');
      cps.className = 'cps';

      config.chips.forEach(chip => {
        const el = document.createElement('div');
        el.className = 'ch';
        el.dataset.g = group;
        el.dataset.v = chip.value;
        if (chip.colorClass) el.dataset.c = chip.colorClass;
        el.textContent = chip.label;

        el.addEventListener('click', () => {
          inventory.toggleFilter(group, chip.value);
          const isActive = inventory.getState().filters[group].has(chip.value);
          el.classList.toggle('on', isActive);
          el.classList.remove('cg', 'cy');
          if (isActive && chip.colorClass) el.classList.add(chip.colorClass);
        });

        cps.appendChild(el);
      });

      fs.appendChild(cps);
      fg.appendChild(fs);
    }

    // ── Arriendo slider ──────────────────────────────
    fg.appendChild(this._buildSlider({
      id: 'ar', label: '🔑 Arriendo/mes', steps: ARRIENDO_STEPS, green: false,
      ticks: ['$0', '$2.5M', '$5M', '$7.5M', '$10M'],
      onRange: (lo, hi) => inventory.setArriendoRange(lo, hi),
      onCommit: () => {},
    }));

    // ── Venta slider ─────────────────────────────────
    fg.appendChild(this._buildSlider({
      id: 'vn', label: '💰 Venta', steps: VENTA_STEPS, green: true,
      ticks: ['$150M', '$1.000M', '$2.000M', '$3.000M'],
      onRange: (lo, hi) => inventory.setVentaRange(lo, hi),
      onCommit: () => {},
    }));

    cdb.appendChild(fg);

    // ── Selection bar ────────────────────────────────
    this._selBar = document.createElement('div');
    this._selBar.id = 'selbar';
    this._selBar.style.cssText = 'display:none;margin-top:10px;background:linear-gradient(135deg,var(--b50),var(--cd2));border:1.5px solid var(--b200);border-radius:8px;padding:10px';
    this._selBar.innerHTML = '<div style="font-size:8px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--b600);margin-bottom:6px">✦ Lo que seleccionaste</div>';
    this._selTags = document.createElement('div');
    this._selTags.id = 'seltags';
    this._selTags.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
    this._selBar.appendChild(this._selTags);
    cdb.appendChild(this._selBar);

    // ── Action buttons ───────────────────────────────
    const br = document.createElement('div');
    br.className = 'br';

    const searchBtn2 = document.createElement('button');
    searchBtn2.className = 'bt bp';
    searchBtn2.textContent = '🔍 Buscar';
    searchBtn2.addEventListener('click', () => inventory.setSearchQuery(this._searchInput.value));

    const allBtn = document.createElement('button');
    allBtn.className = 'bt bs2';
    allBtn.textContent = 'Todos';
    allBtn.addEventListener('click', () => this.clearAll());

    const clearBtn2 = document.createElement('button');
    clearBtn2.className = 'bt bd';
    clearBtn2.textContent = '✕';
    clearBtn2.addEventListener('click', () => this.clearAll());

    br.append(searchBtn2, allBtn, clearBtn2);
    cdb.appendChild(br);

    card.appendChild(cdb);
    c.appendChild(card);
  }

  // ── Slider builder ─────────────────────────────────────────

  _buildSlider({ id, label, steps, green, ticks, onRange, onCommit }) {
    const mx = steps.length - 1;
    const slb = document.createElement('div');
    slb.className = 'slb';

    slb.innerHTML =
      `<div class="slt"><span class="sltt">${label}</span>` +
      `<span class="rp${green ? ' gr' : ''} off" id="${id}p">Sin filtro</span></div>` +
      `<div class="drs"><div class="drbg"></div>` +
      `<div class="drf${green ? ' gf' : ''}" id="${id}f"></div>` +
      `<input id="${id}lo" class="dri lo${green ? ' gi' : ''}" type="range" min="0" max="${mx}" value="0">` +
      `<input id="${id}hi" class="dri hi${green ? ' gi' : ''}" type="range" min="0" max="${mx}" value="${mx}">` +
      `</div>` +
      `<div class="drtk">${ticks.map(t => `<span>${t}</span>`).join('')}</div>`;

    // Store refs for later update
    setTimeout(() => {
      const loEl = document.getElementById(id + 'lo');
      const hiEl = document.getElementById(id + 'hi');
      const fill = document.getElementById(id + 'f');
      const pill = document.getElementById(id + 'p');

      if (!loEl || !hiEl) return;

      if (id === 'ar') {
        this._arLoEl = loEl; this._arHiEl = hiEl;
        this._arFill = fill; this._arPill = pill;
      } else {
        this._vnLoEl = loEl; this._vnHiEl = hiEl;
        this._vnFill = fill; this._vnPill = pill;
      }

      const updateVisual = () => {
        const lo = +loEl.value, hi = +hiEl.value;
        fill.style.left = (lo / mx * 100) + '%';
        fill.style.width = ((hi - lo) / mx * 100) + '%';
        const active = lo > 0 || hi < mx;
        pill.className = 'rp' + (green ? ' gr' : '') + (active ? '' : ' off');
        pill.textContent = active
          ? '$' + (steps[lo] / 1e6).toFixed(1) + 'M–$' + (steps[hi] / 1e6).toFixed(1) + 'M'
          : 'Sin filtro';
      };

      loEl.addEventListener('input', () => {
        let v = +loEl.value;
        if (v > +hiEl.value) { v = +hiEl.value; loEl.value = v; }
        onRange(v, +hiEl.value);
        updateVisual();
      });

      hiEl.addEventListener('input', () => {
        let v = +hiEl.value;
        if (v < +loEl.value) { v = +loEl.value; hiEl.value = v; }
        onRange(+loEl.value, v);
        updateVisual();
      });

      updateVisual();
    }, 0);

    return slb;
  }

  _bindSliders() {
    // Sliders bind themselves in _buildSlider via setTimeout
  }

  // ── Selection bar ─────────────────────────────────────────

  _updateSelectionBar() {
    if (!this._selTags || !this._selBar) return;

    const tags = inventory.getActiveFilterTags();

    if (!tags.length) {
      this._selBar.style.display = 'none';
      return;
    }

    this._selBar.style.display = 'block';
    this._selTags.textContent = '';

    tags.forEach(tag => {
      const span = document.createElement('span');
      span.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:var(--cd);border:1.5px solid var(--b300);color:var(--b700);border-radius:14px;padding:3px 9px;font-size:10px;font-weight:700';
      span.textContent = tag.label;

      const x = document.createElement('span');
      x.style.cssText = 'cursor:pointer;color:var(--b400);font-size:9px;margin-left:2px';
      x.textContent = '✕';
      x.addEventListener('click', () => this._removeTag(tag));
      span.appendChild(x);

      this._selTags.appendChild(span);
    });
  }

  _removeTag(tag) {
    if (tag.type === 'filter') {
      inventory.removeFilter(tag.category, tag.value);
      const chipEl = this._container.querySelector(`.ch[data-g="${tag.category}"][data-v="${tag.value}"]`);
      if (chipEl) chipEl.classList.remove('on', 'cg', 'cy');
    } else if (tag.type === 'arriendo') {
      inventory.resetArriendoRange();
      this._resetSliderUI('ar');
    } else if (tag.type === 'venta') {
      inventory.resetVentaRange();
      this._resetSliderUI('vn');
    } else if (tag.type === 'search') {
      if (this._searchInput) this._searchInput.value = '';
      inventory.setSearchQuery('');
    }
  }

  _resetSliderUI(id) {
    const steps = id === 'ar' ? ARRIENDO_STEPS : VENTA_STEPS;
    const loEl = id === 'ar' ? this._arLoEl : this._vnLoEl;
    const hiEl = id === 'ar' ? this._arHiEl : this._vnHiEl;
    const fill = id === 'ar' ? this._arFill : this._vnFill;
    const pill = id === 'ar' ? this._arPill : this._vnPill;

    if (loEl) loEl.value = 0;
    if (hiEl) hiEl.value = steps.length - 1;
    if (fill) { fill.style.left = '0%'; fill.style.width = '100%'; }
    if (pill) {
      pill.className = 'rp' + (id === 'vn' ? ' gr' : '') + ' off';
      pill.textContent = 'Sin filtro';
    }
  }

  // ── Clear all ──────────────────────────────────────────────

  clearAll() {
    inventory.resetAllFilters();

    // Reset UI
    if (this._searchInput) this._searchInput.value = '';
    this._container.querySelectorAll('.ch').forEach(el => el.classList.remove('on', 'cg', 'cy'));
    if (this._myToggle) this._myToggle.classList.remove('act');
    if (this._asesorSelect) this._asesorSelect.value = '';
    this._resetSliderUI('ar');
    this._resetSliderUI('vn');
  }

  // ── Populate asesor filter (for admin) ─────────────────────

  populateAsesorFilter(items, currentUser) {
    if (!this._asesorSelect) return;
    const isAdmin = currentUser && (currentUser.rol === 'admin' || currentUser.rol === 'oficina');

    if (!isAdmin) {
      this._asesorSelect.style.display = 'none';
      return;
    }

    this._asesorSelect.style.display = 'block';
    const asesores = {};
    items.forEach(p => {
      if (p.captador) {
        const id = p.captador_id;
        if (!asesores[id]) asesores[id] = { nombre: p.captador.nombre, count: 0 };
        asesores[id].count++;
      }
    });

    this._asesorSelect.innerHTML = '<option value="">👤 Todos los asesores</option>' +
      Object.entries(asesores)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([id, a]) =>
          `<option value="${escapeHtml(id)}">👤 ${escapeHtml(a.nombre)} (${a.count})</option>`
        ).join('');
  }

  // ── Render recent searches ─────────────────────────────────

  renderRecentSearches() {
    const el = this._container.querySelector('#rsrch') || document.getElementById('rsrch');
    if (!el) return;

    const recent = inventory.getState().recentSearches;
    if (!recent.length) { el.textContent = ''; return; }

    el.textContent = '';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:8px;color:var(--sub);font-weight:700';
    lbl.textContent = 'Recientes:';
    el.appendChild(lbl);

    recent.forEach(q => {
      const chip = document.createElement('span');
      chip.className = 'rsrch-ch';
      chip.textContent = q;  // textContent = safe, no innerHTML
      chip.addEventListener('click', () => {
        if (this._searchInput) this._searchInput.value = q;
        inventory.setSearchQuery(q);
      });
      el.appendChild(chip);
    });
  }
}

// ── Backward compat ──────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.SearchFilters = SearchFilters;

  // Legacy function aliases
  window.doSearch = () => inventory.setSearchQuery(document.getElementById('q')?.value || '');
  window.autoSearch = () => inventory.autoSearch(document.getElementById('q')?.value || '');
  window.limpiar = () => {
    inventory.resetAllFilters();
    const q = document.getElementById('q');
    if (q) q.value = '';
    document.querySelectorAll('.ch').forEach(e => e.classList.remove('on', 'cg', 'cy'));
    const af = document.getElementById('asesorFilter');
    if (af) af.value = '';
    const mt = document.getElementById('myToggle');
    if (mt) mt.classList.remove('act');
    window.render?.(inventory.getAll());
  };
  window.mostrarTodo = window.limpiar;
  window.toggleMis = () => {
    inventory.toggleMyOnly();
    document.getElementById('myToggle')?.classList.toggle('act', inventory.getState().myOnly);
    window.doSearch?.();
  };
  window.renderRecent = () => {
    // delegate to component if mounted, otherwise no-op
  };
}

export { SearchFilters };
export default SearchFilters;
