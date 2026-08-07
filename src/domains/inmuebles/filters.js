/**
 * Módulo: domains/inmuebles/filters
 *
 * Sistema de filtros del inventario público de inmuebles:
 *   - Estado global F = {neg, ciu, tipo} (Sets) + flags window._*
 *   - Panels (togglePanel/renderPanel/updatePills)
 *   - Selection bar (renderSel) con chips removibles
 *   - Toggles adicionales (mis, tiempo, asesor)
 *   - Motor principal doSearch()
 *   - Autocomplete (showAC/updateAC/pickAC/acKey)
 *
 * Dependencias externas (viven en window por ahora):
 *   - window.D (dataset de inmuebles)
 *   - window.userStore.get() (usuario actual)
 *   - window.render(list) (renderer de cards — módulo #7)
 *   - window.FAVS[] (favoritos del usuario)
 *   - window.eV/eA/eA2 (helpers negociación — fallback local)
 *   - window._searchNorm / window._buildSearchIndex (índice de búsqueda — módulo #6)
 *   - window.trackEvent (analytics)
 *
 * Toda la superficie sigue expuesta en window.* para compat con onclick
 * inline y el resto del CRM legacy.
 */

// ─── Shortcuts (mismo patrón que functions.js) ───────────────────────
const U = () => window.userStore?.get();
const D = () => window.D || [];
const eV = window.eV || ((p) => (p.negociacion || '').toLowerCase().includes('venta'));
const eA = window.eA || ((p) => {
  const n = (p.negociacion || '').toLowerCase();
  return n.includes('arriendo') || n.includes('renta');
});
const eA2 = window.eA2 || ((p) => eV(p) && eA(p));

// ─── Estado global ────────────────────────────────────────────────────
const F = { neg: new Set(), ciu: new Set(), tipo: new Set() };
window.F = F;
window._myFilter = false;
// window._favFilterActive lo inicializa domains/favoritos (idempotente)
if (typeof window._favFilterActive === 'undefined') window._favFilterActive = false;
window._tiempoFiltro = null;
window._openPanel = null;
window._asesorFilter = null;

// ─── Filter options data ──────────────────────────────────────────────
const NEG_OPTS = [
  { v: 'venta', l: 'Comprar', e: '🏠', d: 'En venta', c: '#059669' },
  { v: 'arriendo', l: 'Arrendar', e: '🔑', d: 'En arriendo', c: '#d97706' },
  { v: 'ambas', l: 'Las dos', e: '🔄', d: 'Ver todo', c: '#7c3aed' },
];
const CIU_OPTS = [
  { v: 'Pereira', e: '🏙️', d: 'Centro, Pinares, Álamos, Cuba...' },
  { v: 'Dosquebradas', e: '🌆', d: 'La Pradera, Camilo Torres...' },
  { v: 'Santa Rosa', e: '🌿', d: 'Centro, Termales, veredas' },
  { v: 'Cerritos', e: '🌳', d: 'Condominios, fincas, campestre' },
];
const TIPO_OPTS = [
  { v: 'Apartamento', e: '🏢', l: 'Apto' },
  { v: 'Apartaestudio', e: '🏬', l: 'Apartaestudio' },
  { v: 'Casa', e: '🏡', l: 'Casa' },
  { v: 'Finca', e: '🌾', l: 'Finca' },
  { v: 'Local', e: '🏪', l: 'Local' },
  { v: 'Lote', e: '📐', l: 'Lote' },
  { v: 'Oficina', e: '💼', l: 'Oficina' },
  { v: 'Bodega', e: '🏭', l: 'Bodega' },
  { v: 'Penthouse', e: '✨', l: 'PH' },
];
const NEG_MAP = { venta: 'Comprar', arriendo: 'Arrendar', ambas: 'Las dos' };

// Expose para v2-app (reusa la config en lugar de duplicarla)
window.NEG_OPTS = NEG_OPTS;
window.CIU_OPTS = CIU_OPTS;
window.TIPO_OPTS = TIPO_OPTS;
window.NEG_MAP = NEG_MAP;

// ─── Format price input con separador de miles ───────────────────────
window.fmtPrice = function (el) {
  const clean = el.value.replace(/\D/g, '');
  el.value = clean ? Number(clean).toLocaleString('es-CO') : '';
};
window.autoHasta = function (fromId, toId, tipo) {
  const desde = parsePriceInput(fromId);
  if (!desde) return;
  const toEl = document.getElementById(toId);
  if (!toEl || toEl.value.replace(/\D/g, '')) return;
  const delta = tipo === 'arr' ? 300000 : 50000000;
  const hasta = desde + delta;
  toEl.value = hasta.toLocaleString('es-CO');
};
function parsePriceInput(id) {
  const v = (document.getElementById(id)?.value || '').replace(/\D/g, '');
  return v ? Number(v) : 0;
}
function fmShort(n) {
  if (!n && n !== 0) return '';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

// ─── Toggle panel ─────────────────────────────────────────────────────
window.togglePanel = function (name) {
  if (window._panelCloseTimer) {
    clearTimeout(window._panelCloseTimer);
    window._panelCloseTimer = null;
  }
  const prev = window._openPanel;
  window._openPanel = prev === name ? null : name;
  ['neg', 'ciudad', 'tipo', 'precio', 'asesor'].forEach((p) => {
    const el = document.getElementById('panel' + p.charAt(0).toUpperCase() + p.slice(1));
    if (el) el.style.display = p === window._openPanel ? '' : 'none';
  });
  if (window._openPanel) renderPanel(window._openPanel);
  updatePills();
};

// ─── Render panel content ─────────────────────────────────────────────
function renderPanel(name) {
  const el = document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1));
  if (!el) return;
  if (name === 'neg') {
    el.innerHTML = `<div class="fpanel"><div class="fpanel-title">¿Qué estás buscando?</div><div style="display:flex;gap:8px">${NEG_OPTS.map((o) => { const s = F.neg.has(o.v); return `<button class="fopt-neg${s ? ' sel' : ''}" onclick="pillToggle('neg','${o.v}')" style="${s ? 'border-color:' + o.c + ';background:' + o.c + '0c' : ''}"><span style="font-size:30px">${o.e}</span><span style="font-size:15px;font-weight:800;color:${s ? o.c : '#3a3530'}">${o.l}</span><span style="font-size:11px;color:#a8977f">${o.d}</span>${s ? `<div class="fopt-check" style="background:${o.c}">✓</div>` : ''}</button>`; }).join('')}</div></div>`;
  } else if (name === 'ciudad') {
    el.innerHTML = `<div class="fpanel"><div class="fpanel-title">¿En qué ciudad buscas?</div><div style="display:flex;flex-direction:column;gap:6px">${CIU_OPTS.map((c) => { const s = F.ciu.has(c.v); return `<button class="fopt-ciu${s ? ' sel' : ''}" onclick="pillToggle('ciu','${c.v}')"><span style="font-size:24px">${c.e}</span><div style="flex:1"><div style="font-size:16px;font-weight:800;color:${s ? '#1a4f8b' : '#3a3530'}">${c.v}</div><div style="font-size:12px;color:#a8977f;margin-top:1px">${c.d}</div></div>${s ? '<div class="fopt-check-ciu">✓</div>' : ''}</button>`; }).join('')}</div></div>`;
  } else if (name === 'tipo') {
    el.innerHTML = `<div class="fpanel"><div class="fpanel-title">¿Qué tipo de inmueble?</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${TIPO_OPTS.map((t) => { const s = F.tipo.has(t.v); return `<button class="fopt-tipo${s ? ' sel' : ''}" onclick="pillToggle('tipo','${t.v}')"><span style="font-size:28px">${t.e}</span><span style="font-size:13px;font-weight:800;color:${s ? '#d4a853' : '#5a5550'}">${t.l}</span></button>`; }).join('')}</div></div>`;
  } else if (name === 'precio') {
    const showArr = F.neg.size === 0 || F.neg.has('arriendo') || F.neg.has('ambas');
    const showVnt = F.neg.size === 0 || F.neg.has('venta') || F.neg.has('ambas');
    let h = '<div class="fpanel">';
    if (showArr) {
      h += `<div style="${showVnt ? 'margin-bottom:16px' : ''}"><div style="font-size:15px;font-weight:800;color:#2c2520;margin-bottom:10px">💰 Precio arriendo <span style="font-size:11px;color:#a8977f;font-weight:600">/mes</span></div><div style="display:flex;gap:8px;align-items:center"><div style="flex:1"><div style="font-size:9px;color:#8b8178;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.8px">Desde</div><div class="precio-input" style="border:1.5px solid rgba(217,119,6,.15)"><span style="font-size:12px;color:#d97706;font-weight:800">$</span><input id="arMin" placeholder="1.000.000" inputmode="numeric" oninput="fmtPrice(this)" onblur="autoHasta('arMin','arMax','arr')" value="${document.getElementById('arMin')?.value || ''}"></div></div><span style="color:#d4cdc4;font-weight:800;margin-top:16px">—</span><div style="flex:1"><div style="font-size:9px;color:#8b8178;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.8px">Hasta</div><div class="precio-input" style="border:1.5px solid rgba(217,119,6,.15)"><span style="font-size:12px;color:#d97706;font-weight:800">$</span><input id="arMax" placeholder="10.000.000" inputmode="numeric" oninput="fmtPrice(this)" value="${document.getElementById('arMax')?.value || ''}"></div></div></div></div>`;
    }
    if (showVnt) {
      const vnMinVal = document.getElementById('vnMin')?.value || '';
      const vnMaxVal = document.getElementById('vnMax')?.value || '';
      h += `<div><div style="font-size:15px;font-weight:800;color:#2c2520;margin-bottom:10px">🏦 Precio venta</div><div style="display:flex;gap:8px;align-items:center"><div style="flex:1"><div style="font-size:9px;color:#8b8178;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.8px">Desde</div><div class="precio-input" style="border:1.5px solid rgba(5,150,105,.15)"><span style="font-size:12px;color:#059669;font-weight:800">$</span><input id="vnMin" placeholder="100.000.000" inputmode="numeric" oninput="fmtPrice(this)" onblur="autoHasta('vnMin','vnMax','vnt')" value="${vnMinVal}"></div></div><span style="color:#d4cdc4;font-weight:800;margin-top:16px">—</span><div style="flex:1"><div style="font-size:9px;color:#8b8178;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.8px">Hasta</div><div class="precio-input" style="border:1.5px solid rgba(5,150,105,.15)"><span style="font-size:12px;color:#059669;font-weight:800">$</span><input id="vnMax" placeholder="3.000.000.000" inputmode="numeric" oninput="fmtPrice(this)" value="${vnMaxVal}"></div></div></div></div>`;
    }
    h += `<button class="precio-apply" onclick="togglePanel(null);doSearch()">🔍 Aplicar precio</button></div>`;
    el.innerHTML = h;
    if (F.neg.has('venta') && showVnt) {
      const vnMinEl = document.getElementById('vnMin');
      const vnMaxEl = document.getElementById('vnMax');
      if (vnMinEl && !vnMinEl.value) vnMinEl.value = '100.000.000';
      if (vnMaxEl && !vnMaxEl.value) vnMaxEl.value = '150.000.000';
    }
  } else if (name === 'asesor') {
    const asesores = {};
    D().forEach((p) => {
      if (p.captador) {
        asesores[p.captador_id] = asesores[p.captador_id] || {
          id: p.captador_id,
          nombre: p.captador.nombre,
          gestor: p.captador.gestor_arriendos,
          count: 0,
        };
        asesores[p.captador_id].count++;
      }
    });
    const sorted = Object.values(asesores).sort((a, b) => b.count - a.count);
    el.innerHTML = `<div class="fpanel"><div class="fpanel-title">Filtrar por asesor</div><div style="font-size:12px;color:#a8977f;margin-bottom:12px">Ordenados por cantidad de inmuebles</div><div style="display:flex;flex-direction:column;gap:6px">${sorted.map((a) => { const s = window._asesorFilter === a.id; return `<button class="fopt-ase${s ? ' sel' : ''}" onclick="pickAsesor('${a.id}')"><div style="width:36px;height:36px;border-radius:10px;background:${s ? '#1a4f8b' : '#eae6e1'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:${s ? '#fff' : '#5a5550'}">${a.nombre.charAt(0)}</div><div style="flex:1"><div style="font-size:15px;font-weight:800;color:${s ? '#1a4f8b' : '#3a3530'}">${a.nombre}${a.gestor ? ' 🔑' : ''}</div><div style="font-size:12px;color:#a8977f;margin-top:1px">${a.count} inmuebles</div></div><div style="font-size:16px;font-weight:800;color:${s ? '#1a4f8b' : '#c4b9a8'}">${a.count}</div>${s ? '<div class="fopt-check-ciu">✓</div>' : ''}</button>`; }).join('')}</div></div>`;
  }
}

// ─── Update pill styles ───────────────────────────────────────────────
function updatePills() {
  const negMap = { venta: 'Comprar', arriendo: 'Arrendar', ambas: 'Las dos' };
  const pNeg = document.getElementById('pillNeg');
  if (pNeg) { const on = F.neg.size > 0 || window._openPanel === 'neg'; pNeg.className = 'pill ' + (on ? 'pill-on' : 'pill-off'); const txt = document.getElementById('pillNegTxt'); if (txt) txt.textContent = F.neg.size > 0 ? Array.from(F.neg).map((v) => negMap[v]).join(', ') : 'Negocio'; pNeg.querySelector('.pill-chev')?.classList.toggle('open', window._openPanel === 'neg'); const badge = pNeg.querySelector('.pill-badge'); if (F.neg.size > 0 && !badge) { const b = document.createElement('span'); b.className = 'pill-badge'; b.textContent = F.neg.size; pNeg.insertBefore(b, pNeg.querySelector('.pill-chev')); } else if (F.neg.size === 0 && badge) badge.remove(); else if (badge) badge.textContent = F.neg.size; }
  const pCiu = document.getElementById('pillCiu');
  if (pCiu) { const on = F.ciu.size > 0 || window._openPanel === 'ciudad'; pCiu.className = 'pill ' + (on ? 'pill-on' : 'pill-off'); const txt = document.getElementById('pillCiuTxt'); if (txt) txt.textContent = F.ciu.size > 0 ? Array.from(F.ciu).join(', ') : 'Ciudad'; pCiu.querySelector('.pill-chev')?.classList.toggle('open', window._openPanel === 'ciudad'); const badge = pCiu.querySelector('.pill-badge'); if (F.ciu.size > 0 && !badge) { const b = document.createElement('span'); b.className = 'pill-badge'; b.textContent = F.ciu.size; pCiu.insertBefore(b, pCiu.querySelector('.pill-chev')); } else if (F.ciu.size === 0 && badge) badge.remove(); else if (badge) badge.textContent = F.ciu.size; }
  const pTipo = document.getElementById('pillTipo');
  if (pTipo) { const on = F.tipo.size > 0 || window._openPanel === 'tipo'; pTipo.className = 'pill ' + (on ? 'pill-on' : 'pill-off'); const txt = document.getElementById('pillTipoTxt'); if (txt) txt.textContent = F.tipo.size > 0 ? Array.from(F.tipo).join(', ') : 'Tipo'; pTipo.querySelector('.pill-chev')?.classList.toggle('open', window._openPanel === 'tipo'); const badge = pTipo.querySelector('.pill-badge'); if (F.tipo.size > 0 && !badge) { const b = document.createElement('span'); b.className = 'pill-badge'; b.textContent = F.tipo.size; pTipo.insertBefore(b, pTipo.querySelector('.pill-chev')); } else if (F.tipo.size === 0 && badge) badge.remove(); else if (badge) badge.textContent = F.tipo.size; }
  const pPrecio = document.getElementById('pillPrecio');
  if (pPrecio) { const hasP = parsePriceInput('arMin') > 0 || parsePriceInput('arMax') > 0 || parsePriceInput('vnMin') > 0 || parsePriceInput('vnMax') > 0; const on = hasP || window._openPanel === 'precio'; pPrecio.className = 'pill ' + (on ? 'pill-on' : 'pill-off'); const txt = document.getElementById('pillPrecioTxt'); if (txt) txt.textContent = hasP ? 'Precio ✓' : 'Precio'; pPrecio.querySelector('.pill-chev')?.classList.toggle('open', window._openPanel === 'precio'); }
  const pAse = document.getElementById('pillAsesor');
  if (pAse) { const on = !!window._asesorFilter || window._openPanel === 'asesor'; pAse.className = 'pill ' + (on ? 'pill-on' : 'pill-off'); const txt = document.getElementById('pillAseTxt'); if (txt) { const aseData = window._asesorFilter ? D().find((p) => p.captador_id === window._asesorFilter)?.captador?.nombre : null; txt.textContent = aseData || 'Asesores'; } pAse.querySelector('.pill-chev')?.classList.toggle('open', window._openPanel === 'asesor'); }
  document.querySelectorAll('.pill').forEach((p) => { const svg = p.querySelector('.pill-chev path'); if (svg) svg.setAttribute('stroke', p.classList.contains('pill-on') || p.classList.contains('pill-mis') || p.classList.contains('pill-fav') ? '#fff' : '#8b7e6e'); });
}

// ─── Toggle desde panel (multi-select con auto-cierre debounced) ─────
window.pillToggle = function (g, v) {
  if (F[g].has(v)) F[g].delete(v);
  else F[g].add(v);
  if (window._openPanel) renderPanel(window._openPanel);
  updatePills();
  window.renderSel();
  window.doSearch();
  if (window._panelCloseTimer) clearTimeout(window._panelCloseTimer);
  window._panelCloseTimer = setTimeout(() => {
    window._panelCloseTimer = null;
    if (window._openPanel) window.togglePanel(null);
  }, 400);
};

// ─── Asesor pick (single select, cierra panel) ────────────────────────
window.pickAsesor = function (id) {
  window._asesorFilter = window._asesorFilter === id ? null : id;
  window.togglePanel(null);
  window.renderSel();
  window.doSearch();
};

// ─── Selection bar (chips removibles) ─────────────────────────────────
window.renderSel = function () {
  const chips = [];
  F.neg.forEach((v) => { const o = NEG_OPTS.find((x) => x.v === v); chips.push({ key: 'n-' + v, label: o ? o.e + ' ' + o.l : v, remove: `pillToggle('neg','${v}')` }); });
  F.ciu.forEach((v) => { chips.push({ key: 'c-' + v, label: '📍 ' + v, remove: `pillToggle('ciu','${v}')` }); });
  F.tipo.forEach((v) => { const o = TIPO_OPTS.find((x) => x.v === v); chips.push({ key: 't-' + v, label: o ? o.l : v, remove: `pillToggle('tipo','${v}')` }); });
  if (window._asesorFilter) { const a = D().find((p) => p.captador_id === window._asesorFilter)?.captador; chips.push({ key: 'ase', label: '👤 ' + (a?.nombre || 'Asesor'), remove: "pickAsesor('" + window._asesorFilter + "')" }); }
  const arMn = parsePriceInput('arMin'), arMx = parsePriceInput('arMax');
  if (arMn > 0 || arMx > 0) chips.push({ key: 'arr', label: '💰 ' + (fmShort(arMn) || '$0') + '-' + (arMx ? fmShort(arMx) : '∞'), remove: "document.getElementById('arMin').value='';document.getElementById('arMax').value='';renderSel();doSearch()" });
  const vnMn = parsePriceInput('vnMin'), vnMx = parsePriceInput('vnMax');
  if (vnMn > 0 || vnMx > 0) chips.push({ key: 'vnt', label: '🏦 ' + (fmShort(vnMn) || '$0') + '-' + (vnMx ? fmShort(vnMx) : '∞'), remove: "document.getElementById('vnMin').value='';document.getElementById('vnMax').value='';renderSel();doSearch()" });
  if (window._tiempoFiltro) chips.push({ key: 'tiempo', label: '📅 Últimos ' + window._tiempoFiltro + 'd', remove: 'setTiempo(null)' });
  if (window._favFilterActive) chips.push({ key: 'fav', label: '♥ Favoritos', remove: 'toggleFavFilter()' });
  if (window._myFilter) chips.push({ key: 'mis', label: '📌 Mis inmuebles', remove: 'toggleMis()' });
  const qv = (document.getElementById('q')?.value || '').trim();
  if (qv) chips.push({ key: 'q', label: '🔍 "' + qv + '"', remove: "document.getElementById('q').value='';document.getElementById('qClear').style.display='none';renderSel();doSearch()" });

  const bar = document.getElementById('selBar');
  const chipsEl = document.getElementById('selChips');
  if (!bar || !chipsEl) return;
  if (chips.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = '';
  chipsEl.innerHTML = chips.map((s) => `<span class="sel-chip" onclick="${s.remove}">${s.label}<span class="sel-x">✕</span></span>`).join('');
  const qC = document.getElementById('qClear');
  if (qC) qC.style.display = qv ? 'flex' : 'none';
  updatePills();
};

// ─── Toggles secundarios ──────────────────────────────────────────────
window.toggleMis = function () {
  window._myFilter = !window._myFilter;
  const btn = document.getElementById('myToggle');
  if (btn) {
    if (window._myFilter) { btn.className = 'pill pill-mis'; btn.textContent = '📌 Míos ✓'; }
    else { btn.className = 'pill pill-off'; btn.style.color = '#1a4f8b'; btn.style.borderColor = '#d0dff2'; btn.textContent = '📌 Míos'; }
  }
  window.renderSel(); window.doSearch();
};

// NOTA: toggleFavFilter también vive en domains/favoritos/index.js.
// Esta versión es la del botón #favToggle en la barra de filtros.
// La de favoritos (btn #myToggle) se cargó ANTES vía main.js, por eso
// esta redefinición gana. Ambos comportamientos convergen en el mismo
// _favFilterActive + doSearch(), así que es seguro. TODO: consolidar.
window.toggleFavFilter = function () {
  window._favFilterActive = !window._favFilterActive;
  const btn = document.getElementById('favToggle');
  if (btn) {
    if (window._favFilterActive) { btn.className = 'pill pill-fav'; btn.innerHTML = '♥ Favs ✓'; }
    else { btn.className = 'pill pill-off'; btn.style.color = '#b91c3a'; btn.style.borderColor = '#f5d0d7'; btn.innerHTML = '♡ Favs'; }
  }
  window.renderSel(); window.doSearch();
};

// ─── Time filter ──────────────────────────────────────────────────────
window.toggleTiempo = function () {
  const dd = document.getElementById('tiempoDD');
  if (!dd) return;
  if (dd.style.display === 'none' || !dd.style.display) {
    dd.style.display = 'block';
    dd.innerHTML = [
      { v: null, l: 'Más recientes', d: 'Todos' },
      { v: '7', l: 'Últimos 7 días', d: 'Esta semana' },
      { v: '15', l: 'Últimos 15 días', d: '2 semanas' },
    ].map((o) => `<button class="tiempo-opt${window._tiempoFiltro === o.v ? ' sel' : ''}" onclick="setTiempo(${o.v ? "'" + o.v + "'" : 'null'})"><div style="font-size:14px;font-weight:700;color:${window._tiempoFiltro === o.v ? '#1a4f8b' : '#3a3530'}">${o.l}</div><div style="font-size:10px;color:#a8977f">${o.d}</div></button>`).join('');
  } else dd.style.display = 'none';
};
window.setTiempo = function (v) {
  window._tiempoFiltro = v;
  const btn = document.getElementById('tiempoBtn');
  if (btn) {
    if (v) { btn.style.color = '#1a4f8b'; btn.style.background = '#eef3fb'; btn.style.border = '1.5px solid #b8d4f0'; btn.textContent = '📅 Últimos ' + v + ' días ▾'; }
    else { btn.style.color = '#6b5c4d'; btn.style.background = '#fff'; btn.style.border = '1.5px solid #e8e4df'; btn.textContent = '📅 Más recientes ▾'; }
  }
  const dd = document.getElementById('tiempoDD');
  if (dd) dd.style.display = 'none';
  window.renderSel(); window.doSearch();
};

// ─── Asesor pill visibility ───────────────────────────────────────────
window.populateAsesorFilter = function () {
  const pAse = document.getElementById('pillAsesor');
  if (!pAse) return;
  const u = U();
  const isAdmin = u && (u.rol === 'admin' || u.rol === 'oficina');
  pAse.style.display = isAdmin ? 'flex' : 'none';
};

// ─── Init pills (called after data load) ─────────────────────────────
window.renderAccOpts = function () {
  const tdC = document.getElementById('tiempoDD');
  if (tdC) tdC.innerHTML = '';
  updatePills();
  window.populateAsesorFilter();
};

window.renderRecent = function () {
  const el = document.getElementById('rsrch');
  if (!el) return;
  let r = [];
  try { r = JSON.parse(localStorage.getItem('hcrm_recent') || '[]'); } catch (e) { /* noop */ }
  if (!r.length) { el.textContent = ''; return; }
  el.innerHTML = '<span style="font-size:8px;color:#a8977f;font-weight:700">Recientes:</span>' + r.map((q) => `<span style="font-size:11px;padding:4px 10px;border-radius:8px;background:#f5f2ee;color:#5a5550;font-weight:600;border:1px solid #e0dbd5;cursor:pointer;margin-left:4px" onclick="document.getElementById('q').value='${q}';doSearch()">${q}</span>`).join('');
};

// ─── Motor principal doSearch ─────────────────────────────────────────
window.doSearch = function () {
  const allD = D();
  if (!allD.length) return;
  window.renderSel();
  const _norm = window._searchNorm || ((s) => String(s || '').toLowerCase());
  const qvRaw = (document.getElementById('q')?.value || '').trim();
  const qv = _norm(qvRaw);
  if (qv.length >= 2) {
    let r = [];
    try { r = JSON.parse(localStorage.getItem('hcrm_recent') || '[]'); } catch (e) { /* noop */ }
    r = r.filter((x) => x !== qv);
    r.unshift(qv);
    localStorage.setItem('hcrm_recent', JSON.stringify(r.slice(0, 5)));
  }
  const qC = document.getElementById('qClear');
  if (qC) qC.style.display = qv ? 'flex' : 'none';

  // TRACK: search + filter (sólo públicos, debounced al escribir)
  const uT = U();
  if (window.trackEvent && uT && uT.tipo_usuario === 'publico') {
    clearTimeout(window._srchTrkT);
    window._srchTrkT = setTimeout(() => {
      const payload = {
        ciudad: [...(window.F?.ciudad || [])][0] || null,
        tipo: [...(window.F?.tipo || [])][0] || null,
        negociacion: [...(window.F?.neg || [])][0] || null,
        precio_min: parsePriceInput('vnMin') || parsePriceInput('arMin') || null,
        precio_max: parsePriceInput('vnMax') || parsePriceInput('arMax') || null,
      };
      if (qv.length >= 2) window.trackEvent('search', { search_text: qv, filtro_payload: payload });
      if (payload.ciudad || payload.tipo || payload.negociacion || payload.precio_min || payload.precio_max) {
        window.trackEvent('filter', {
          ciudad: payload.ciudad,
          tipo_inmueble: payload.tipo,
          negociacion: payload.negociacion,
          filtro_payload: payload,
        });
      }
    }, 1200);
  }

  const arMin = parsePriceInput('arMin'), arMax = parsePriceInput('arMax');
  const vnMin = parsePriceInput('vnMin'), vnMax = parsePriceInput('vnMax');

  let list = allD;
  if (window._myFilter) list = list.filter((p) => p.captador_id === U()?.id);
  if (window._favFilterActive) list = list.filter((p) => (window.FAVS || []).includes(p.id));
  if (window._asesorFilter) list = list.filter((p) => p.captador_id === window._asesorFilter);
  if (window._tiempoFiltro) {
    const maxD = parseInt(window._tiempoFiltro);
    list = list.filter((p) => (p._dias || 999) <= maxD);
  }

  const hasFilters = Object.values(F).some((s) => s.size > 0) || qv.length > 0 || arMin > 0 || arMax > 0 || vnMin > 0 || vnMax > 0;
  if (hasFilters) {
    list = list.filter((p) => {
      const c = (p.ciudad || '').toLowerCase();
      const t = (p.tipo || '').toLowerCase();
      const pa = p.precio_arriendo || 0;
      const pv = p.precio_venta || 0;
      if (F.neg.size > 0) {
        let ok = false;
        if (F.neg.has('venta') && eV(p) && !eA2(p)) ok = true;
        if (F.neg.has('arriendo') && eA(p) && !eA2(p)) ok = true;
        if (F.neg.has('ambas') && eA2(p)) ok = true;
        if (F.neg.has('venta') && F.neg.has('arriendo') && eA2(p)) ok = true;
        if (!ok) return false;
      }
      if (F.ciu.size > 0 && !Array.from(F.ciu).some((x) => c.includes(x.toLowerCase()))) return false;
      if (F.tipo.size > 0 && !Array.from(F.tipo).some((x) => t.includes(x.toLowerCase()))) return false;
      if (arMin > 0 && (pa <= 0 || pa < arMin)) return false;
      if (arMax > 0 && (pa <= 0 || pa > arMax)) return false;
      if (vnMin > 0 && (pv <= 0 || pv < vnMin)) return false;
      if (vnMax > 0 && (pv <= 0 || pv > vnMax)) return false;
      if (qv) {
        const idx = p._searchIndex || (window._buildSearchIndex ? window._buildSearchIndex(p) : '');
        if (!qv.split(/\s+/).filter(Boolean).every((w) => idx.includes(w))) return false;
      }
      return true;
    });
  }
  window.render(list);
};

window.autoSearch = function () {
  clearTimeout(window._searchTimer);
  window._searchTimer = setTimeout(() => window.doSearch(), 300);
};
window._searchTimer = null;

// Cierra panels al clickear fuera
document.addEventListener('click', (e) => {
  if (window._openPanel && !e.target.closest('.fpanel') && !e.target.closest('.pill') && !e.target.closest('.pill-bar')) {
    window.togglePanel(null);
  }
});

// ─── Autocomplete ─────────────────────────────────────────────────────
window._acIdx = -1;
function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function hlMatch(text, q) {
  if (!q) return escHtml(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return escHtml(text);
  return escHtml(text.slice(0, i)) + '<b>' + escHtml(text.slice(i, i + q.length)) + '</b>' + escHtml(text.slice(i + q.length));
}
function acBuild(q) {
  const sections = [];
  const ql = (q || '').trim().toLowerCase();

  let recent = [];
  try { recent = JSON.parse(localStorage.getItem('hcrm_recent') || '[]'); } catch (e) { /* noop */ }
  if (ql) recent = recent.filter((r) => r.toLowerCase().includes(ql));
  if (recent.length) sections.push({ cat: '🕐 Recientes', items: recent.slice(0, 3).map((r) => ({ label: r, val: r })) });

  const allD = D();
  if (allD.length && ql) {
    const barrios = [...new Set(allD.map((p) => p.barrio).filter(Boolean))];
    const matched = barrios.filter((b) => b.toLowerCase().includes(ql)).sort((a, b) => {
      const ai = a.toLowerCase().indexOf(ql), bi = b.toLowerCase().indexOf(ql);
      return ai - bi || a.localeCompare(b);
    }).slice(0, 5);
    if (matched.length) sections.push({ cat: '📍 Barrios', items: matched.map((b) => ({ label: b, val: b })) });
  }

  const tipoMatch = TIPO_OPTS.filter((o) => !ql || o.v.toLowerCase().includes(ql) || o.l.toLowerCase().includes(ql));
  if (tipoMatch.length && tipoMatch.length < TIPO_OPTS.length) {
    sections.push({ cat: '🏢 Tipos', items: tipoMatch.slice(0, 4).map((o) => ({ label: o.v, val: o.v, icon: o.e })) });
  }

  const ciuMatch = CIU_OPTS.filter((o) => !ql || o.v.toLowerCase().includes(ql));
  if (ciuMatch.length && ciuMatch.length < CIU_OPTS.length) {
    sections.push({ cat: '🗺️ Ciudades', items: ciuMatch.map((o) => ({ label: o.v, val: o.v, icon: o.e })) });
  }

  if (!ql && !sections.length && recent.length === 0) return '';

  let idx = 0;
  let html = '';
  for (const sec of sections) {
    html += `<div class="ac-cat">${sec.cat}</div>`;
    for (const it of sec.items) {
      const ico = it.icon ? `<span class="ac-ico-sm">${it.icon}</span>` : '';
      html += `<div class="ac-item" data-idx="${idx}" data-val="${escHtml(it.val)}" onmousedown="pickAC(this)">${ico}<span>${hlMatch(it.label, ql)}</span></div>`;
      idx++;
    }
  }
  return html;
}

window.showAC = function () {
  const drop = document.getElementById('acDrop');
  if (!drop) return;
  const q = document.getElementById('q')?.value || '';
  const html = acBuild(q);
  if (!html) { drop.style.display = 'none'; return; }
  drop.innerHTML = html;
  drop.style.display = 'block';
  window._acIdx = -1;
};

window.updateAC = function () {
  const drop = document.getElementById('acDrop');
  if (!drop) return;
  const q = document.getElementById('q')?.value || '';
  const html = acBuild(q);
  if (!html) { drop.style.display = 'none'; return; }
  drop.innerHTML = html;
  drop.style.display = 'block';
  window._acIdx = -1;
};

window.hideAC = function () {
  const drop = document.getElementById('acDrop');
  if (drop) drop.style.display = 'none';
  window._acIdx = -1;
};

window.pickAC = function (el) {
  const val = el.dataset.val || el.textContent;
  const inp = document.getElementById('q');
  if (inp) inp.value = val;
  window.hideAC();
  window.doSearch();
};

window.acKey = function (e) {
  const drop = document.getElementById('acDrop');
  const visible = drop && drop.style.display !== 'none';
  const items = visible ? drop.querySelectorAll('.ac-item') : [];

  if (e.key === 'ArrowDown' && visible && items.length) {
    e.preventDefault();
    window._acIdx = (window._acIdx + 1) % items.length;
    items.forEach((it, i) => it.classList.toggle('ac-hl', i === window._acIdx));
    items[window._acIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp' && visible && items.length) {
    e.preventDefault();
    window._acIdx = window._acIdx <= 0 ? items.length - 1 : window._acIdx - 1;
    items.forEach((it, i) => it.classList.toggle('ac-hl', i === window._acIdx));
    items[window._acIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (visible && window._acIdx >= 0 && items[window._acIdx]) {
      window.pickAC(items[window._acIdx]);
    } else {
      window.hideAC();
      window.doSearch();
    }
  } else if (e.key === 'Escape') {
    window.hideAC();
  }
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('#acDrop') && e.target.id !== 'q') window.hideAC();
});

// ─── Legacy compat ────────────────────────────────────────────────────
window.collapseFilters = function () {};
window.expandFilters = function () {};
window.qf = function (g, v) {
  F[g]?.delete(v);
  updatePills();
  window.renderSel();
  window.doSearch();
};
window.tc = function () {};
