/**
 * HOUSE CRM — Section Renderers
 *
 * All the view-specific render functions that the router calls.
 * Each one populates its section div with data from window globals.
 *
 * Functions: rPipe, rAl, rPort, rDash, rAgenda, rConc, rUsers, rPerfil, rPapelera, rReg, rInv
 */

import { getSupabaseClient } from './config/supabase.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const fm = (n) => n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : '';
const emo = (t) => {
  t = (t || '').toLowerCase();
  if (t.includes('penthouse')) return '👑'; if (t.includes('campestre')) return '🌿';
  if (t.includes('finca')) return '🌾'; if (t.includes('apto') || t.includes('apartamento')) return '🏢';
  if (t.includes('casa')) return '🏡'; if (t.includes('local')) return '🏪';
  if (t.includes('oficina')) return '💼'; if (t.includes('lote')) return '🌳';
  if (t.includes('bodega')) return '🏭'; return '🏠';
};

const PCOLS = [
  { id: 'Disponible', l: 'Disponible', c: 'c-d', e: '✅' },
  { id: 'Aún Disponible', l: 'Aún Disponible', c: 'c-ad', e: '✓' },
  { id: 'Arrendado', l: 'Arrendado', c: 'c-ar', e: '🔑' },
  { id: 'Vendido', l: 'Vendido', c: 'c-ve', e: '💰' },
  { id: 'Retirado', l: 'Retirado', c: 'c-re', e: '⛔' },
];
const UMBRAL = { Disponible: 15, 'Aún Disponible': 10, Arrendado: 30, Vendido: 30, Retirado: 999 };
const FINAL_STATES = ['Arrendado', 'Vendido', 'Retirado'];

window.PCOLS = PCOLS;
window.UMBRAL = UMBRAL;
window.FINAL_STATES = FINAL_STATES;

function timerBadge(d, umb) {
  if (d <= Math.floor(umb * 0.5)) return `<span class="pk-timer ok">⏱️ ${d}d</span>`;
  if (d <= umb) return `<span class="pk-timer warn">⏱️ ${d}d</span>`;
  return `<span class="pk-timer danger">🔴 ${d}d</span>`;
}

function diasDesde(f) { if (!f) return 999; return Math.floor((Date.now() - new Date(f).getTime()) / 864e5); }
function eV(p) { return (p.negociacion || '').toLowerCase().includes('venta'); }
function eA(p) { const n = (p.negociacion || '').toLowerCase(); return n.includes('arriendo') || n.includes('renta'); }
function eA2(p) { return eV(p) && eA(p); }

// ══════════════════════════════════════════════════════════════════
// rInv — Inventory (already rendered by load.js, just re-render)
// ══════════════════════════════════════════════════════════════════

window.rInv = function () {
  if (window.render) window.render(window.D || []);
};

// ══════════════════════════════════════════════════════════════════
// rPipe — Pipeline (Mis Inmuebles)
// ══════════════════════════════════════════════════════════════════

window._pipeTab = 'Disponible';

window.setPipeTab = function(tabId) {
  window._pipeTab = tabId;
  window.rPipe();
};

window.rPipe = function () {
  const el = document.getElementById('pipeline');
  const nav = document.getElementById('mis-nav');
  if (!el) return;

  const u = U();
  if (!u) return;

  const allD = window.D || [];
  const MIS = allD.filter(p => p.captador_id === u.id);
  const SOL = window.SOL || [];

  const pipeQv = (document.getElementById('pipeQ')?.value || '').trim().toLowerCase();
  const pipeSortV = document.getElementById('pipeSort')?.value || 'dias';

  const pipeFilter = p => {
    if (!pipeQv) return true;
    const all = [p.tipo||'', p.ciudad||'', p.direccion||'', p.barrio||'', p.codigo_house||'', fm(p.precio_venta||0), fm(p.precio_arriendo||0)].join(' ').toLowerCase();
    return all.includes(pipeQv);
  };

  const pipeSortFn = (a, b) => {
    if (pipeSortV === 'precio_desc') return Math.max(b.precio_venta||0, b.precio_arriendo||0) - Math.max(a.precio_venta||0, a.precio_arriendo||0);
    if (pipeSortV === 'precio_asc') return Math.max(a.precio_venta||0, a.precio_arriendo||0) - Math.max(b.precio_venta||0, b.precio_arriendo||0);
    return (b._dias||0) - (a._dias||0);
  };

  const mySolsPend = SOL.filter(s => s.solicitante_id === u.id && s.estado === 'pendiente');
  const solsOnMyInm = SOL.filter(s => MIS.some(p => p.id === s.inmueble_id) && s.estado === 'pendiente');

  // Counts for ALL tabs (always calculated)
  const colCounts = {};
  PCOLS.forEach(col => {
    colCounts[col.id] = MIS.filter(p => p.estado === col.id || (col.id === 'Disponible' && (!p.estado || p.estado === 'Disponible' || p.estado === 'Verificar Disponibilidad'))).length;
  });

  const arrDisp = u.es_gestor_arriendos ? allD.filter(p => p.captador_id !== u.id && !p.eliminado && (p.negociacion||'').toLowerCase().includes('arriendo') && (p.estado === 'Disponible' || p.estado === 'Aún Disponible' || !p.estado || p.estado === 'Verificar Disponibilidad')) : [];

  const tab = window._pipeTab || 'Disponible';

  // ── TAB BAR ──
  if (nav) {
    let navH = PCOLS.map(col =>
      `<button class="pnav-btn ${col.c}${tab===col.id?' active':''}" onclick="setPipeTab('${col.id}')">${col.e} ${col.l} <span class="pnav-n">${colCounts[col.id]}</span></button>`
    ).join('');
    if (mySolsPend.length) navH += `<button class="pnav-btn c-vd${tab==='mis-consultas'?' active':''}" onclick="setPipeTab('mis-consultas')">🔍 Consultas <span class="pnav-n">${mySolsPend.length}</span></button>`;
    if (solsOnMyInm.length) navH += `<button class="pnav-btn c-re${tab==='me-consultan'?' active':''}" onclick="setPipeTab('me-consultan')">📩 Me consultan <span class="pnav-n">${solsOnMyInm.length}</span></button>`;
    if (u.es_gestor_arriendos) navH += `<button class="pnav-btn c-ar${tab==='arriendos'?' active':''}" onclick="setPipeTab('arriendos')">🔑 Arriendos <span class="pnav-n">${arrDisp.length}</span></button>`;
    nav.innerHTML = navH;
  }

  // ── Helper: render a standard pipeline card with thumbnail ──
  const renderCard = (p, colId) => {
    const idx = allD.indexOf(p);
    const dias = p._dias || 0, umb = UMBRAL[colId] || 15;
    const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;
    const m2 = !!(p.url_metrocuadrado||'').trim(), fr = !!(p.url_fincaraiz||'').trim();
    const hab = p.habitaciones||'', ban = p.banos||'', area = p.area_construida||'';
    const sps = [hab&&hab!=0?'🛏️ '+hab:'', ban&&ban!=0?'🚿 '+ban:'', area?'📐 '+area+'m²':''].filter(Boolean);
    const sortedF = p.fotos ? [...p.fotos].sort((a,b) => (a.orden||0) - (b.orden||0)) : [];
    const thumb = sortedF.length > 0 ? (sortedF[0].url_thumb || sortedF[0].url) : '';
    const otherCols = PCOLS.filter(c2 => c2.id !== colId);
    const pSols = SOL.filter(s => s.inmueble_id === p.id && s.estado === 'pendiente');
    const ubPub = p.direccion_publica || p.barrio || p.ciudad || '';

    let c = `<div class="pkc" id="pkc-${p.id}">`;
    // Solicitud badge
    if (pSols.length > 0) c += `<div style="padding:6px 12px;background:var(--goldbg);border-bottom:1px solid rgba(245,158,11,.2);font-size:10px;font-weight:700;color:#92400e">📩 ${pSols.length} consulta${pSols.length>1?'s':''} pendiente${pSols.length>1?'s':''}</div>`;
    // Main row: thumb + body
    c += `<div class="pkc-row" onclick="oM&&oM(${idx})">`;
    if (thumb) c += `<div class="pkc-thumb" style="background-image:url('${thumb}')"></div>`;
    c += `<div class="pkc-body">`;
    // Badges line: code + timer
    c += `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:3px">`;
    if (p.codigo_house) c += `<span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${p.codigo_house}');toast('📋 Copiado')" style="font-size:9px">${p.codigo_house}</span>`;
    c += timerBadge(dias, umb);
    c += `</div>`;
    // Type + location
    c += `<div class="pktp">${emo(p.tipo)} ${p.tipo || 'Inmueble'}</div>`;
    c += `<div class="pkci">📍 ${ubPub}</div>`;
    // Price
    if (pv > 0 || pa > 0) c += `<div class="pkpr">${pv > 0 ? fm(pv) : ''}${pv > 0 && pa > 0 ? ' · ' : ''}${pa > 0 ? fm(pa) + '/mes' : ''}</div>`;
    // Specs
    if (sps.length) c += `<div class="pksp">${sps.map(s => '<span>' + s + '</span>').join('')}</div>`;
    // Footer: asesor + portals
    c += `<div class="pkbt"><span class="pkas">👤 ${p.captador ? p.captador.nombre : ''}</span><div class="pkpt">${m2 ? '<span class="pp ppok">M²</span>' : '<span class="pp ppno">M²</span>'}${fr ? '<span class="pp ppok">FR</span>' : '<span class="pp ppno">FR</span>'}</div></div>`;
    c += `</div></div>`; // close pkc-body + pkc-row

    // Solicitudes inline
    if (pSols.length > 0) {
      c += `<div style="padding:8px 12px;background:var(--redbg);border-top:1px solid var(--rb)">`;
      pSols.forEach(s => {
        c += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:11px"><span>🔍 <b>${s.solicitante ? s.solicitante.nombre : '?'}</b>${s.nota_solicitante ? ' — "' + s.nota_solicitante + '"' : ''}</span></div>`;
        c += `<div style="display:flex;gap:4px" onclick="event.stopPropagation()"><button style="flex:1;padding:6px;border:none;border-radius:5px;font-size:11px;font-weight:700;background:var(--green);color:#fff;font-family:inherit;cursor:pointer" onclick="responderSol('${s.id}','si')">✅ Disponible</button><button style="flex:1;padding:6px;border:none;border-radius:5px;font-size:11px;font-weight:700;background:var(--red);color:#fff;font-family:inherit;cursor:pointer" onclick="responderSol('${s.id}','no')">❌ No disponible</button></div>`;
      });
      c += `</div>`;
    }

    // Revalidate
    if (colId === 'Aún Disponible') c += `<div style="padding:4px 12px 8px"><button class="pk-reval" onclick="event.stopPropagation();reVal('${p.id}')">🔄 Volver a validar</button></div>`;

    // Actions: move-to
    c += `<div class="pkc-actions" onclick="event.stopPropagation()"><select class="esel" style="flex:1;font-size:11px;padding:7px 10px" onchange="if(this.value)quickMove('${p.id}',this.value)"><option value="">⇄ Mover a...</option>${otherCols.map(c2 => `<option value="${c2.id}">${c2.e} ${c2.l}</option>`).join('')}</select></div>`;

    c += `</div>`; // close pkc
    return c;
  };

  // ── RENDER ACTIVE TAB CONTENT ──
  let h = '';

  if (tab === 'mis-consultas') {
    if (!mySolsPend.length) { h = `<div class="emp"><span class="emp-i">🔍</span><h3>Sin consultas pendientes</h3><p style="font-size:12px;color:var(--sub)">Cuando consultes disponibilidad de un inmueble, aparecerá aquí</p></div>`; }
    else {
      mySolsPend.forEach(s => {
        const p = allD.find(x => x.id === s.inmueble_id);
        if (!p) return;
        const idx = allD.indexOf(p);
        const dias2 = diasDesde(s.created_at);
        const capNom = p.captador ? p.captador.nombre : '?';
        const sortedF = p.fotos ? [...p.fotos].sort((a,b) => (a.orden||0) - (b.orden||0)) : [];
        const thumb = sortedF.length > 0 ? (sortedF[0].url_thumb || sortedF[0].url) : '';
        h += `<div class="pkc">`;
        h += `<div style="padding:6px 12px;background:var(--goldbg);border-bottom:1px solid rgba(245,158,11,.2);font-size:11px;font-weight:700;color:#92400e">🔍 Esperando respuesta de ${capNom}</div>`;
        h += `<div class="pkc-row" onclick="oM&&oM(${idx})">`;
        if (thumb) h += `<div class="pkc-thumb" style="background-image:url('${thumb}')"></div>`;
        h += `<div class="pkc-body"><div class="pktp">${emo(p.tipo)} ${p.tipo || 'Inmueble'}</div><div class="pkci">📍 ${p.ciudad || ''}</div>${timerBadge(dias2, 5)}${s.nota_solicitante ? `<div style="font-size:11px;color:var(--sub);margin-top:4px;font-style:italic">"${s.nota_solicitante}"</div>` : ''}</div></div></div>`;
      });
    }
  } else if (tab === 'me-consultan') {
    if (!solsOnMyInm.length) { h = `<div class="emp"><span class="emp-i">📩</span><h3>Sin consultas recibidas</h3></div>`; }
    else {
      solsOnMyInm.forEach(s => {
        const p = allD.find(x => x.id === s.inmueble_id);
        if (!p) return;
        const idx = allD.indexOf(p);
        const sortedF = p.fotos ? [...p.fotos].sort((a,b) => (a.orden||0) - (b.orden||0)) : [];
        const thumb = sortedF.length > 0 ? (sortedF[0].url_thumb || sortedF[0].url) : '';
        h += `<div class="pkc">`;
        h += `<div style="padding:6px 12px;background:var(--redbg);border-bottom:1px solid var(--rb);font-size:11px;font-weight:700;color:var(--red)">📩 ${s.solicitante ? s.solicitante.nombre : '?'} consulta disponibilidad</div>`;
        h += `<div class="pkc-row" onclick="oM&&oM(${idx})">`;
        if (thumb) h += `<div class="pkc-thumb" style="background-image:url('${thumb}')"></div>`;
        h += `<div class="pkc-body"><div class="pktp">${emo(p.tipo)} ${p.tipo || 'Inmueble'}</div><div class="pkci">📍 ${p.ciudad || ''}</div></div></div>`;
        h += `<div style="display:flex;gap:4px;padding:8px 12px" onclick="event.stopPropagation()"><button style="flex:1;padding:8px;border:none;border-radius:6px;font-size:12px;font-weight:700;background:var(--green);color:#fff;font-family:inherit;cursor:pointer" onclick="responderSol('${s.id}','si')">✅ Disponible</button><button style="flex:1;padding:8px;border:none;border-radius:6px;font-size:12px;font-weight:700;background:var(--red);color:#fff;font-family:inherit;cursor:pointer" onclick="responderSol('${s.id}','no')">❌ No disponible</button></div>`;
        h += `</div>`;
      });
    }
  } else if (tab === 'arriendos' && u.es_gestor_arriendos) {
    if (!arrDisp.length) { h = `<div class="emp"><span class="emp-i">✅</span><h3>Sin arriendos pendientes</h3></div>`; }
    arrDisp.forEach(p => {
      const idx = allD.indexOf(p);
      const dias2 = p._dias || 0;
      const cod = p.codigo_house || '';
      const pa = p.precio_arriendo || 0;
      const hab = p.habitaciones || '', ban = p.banos || '', area = p.area_construida || '', est = p.estrato || '';
      const propTel = p.propietario_telefono || '', propNom = p.propietario_nombre || '';
      const capNom = p.captador ? p.captador.nombre : '?';
      const ubPub = p.direccion_publica || p.barrio || p.ciudad || '';
      const sortedF = p.fotos ? [...p.fotos].sort((a,b) => (a.orden||0) - (b.orden||0)) : [];
      const thumb = sortedF.length > 0 ? (sortedF[0].url_thumb || sortedF[0].url) : '';
      const specs = [];
      if (hab && hab != 0) specs.push('🛏️ '+hab);
      if (ban && ban != 0) specs.push('🚿 '+ban);
      if (area) specs.push('📐 '+area+'m²');
      if (est) specs.push('E'+est);

      h += `<div class="pkc" style="border-color:#065f46;border-width:2px">`;
      h += `<input type="checkbox" class="arr-check" onclick="event.stopPropagation();toggleArrSelect('${p.id}',this)" style="position:absolute;top:8px;left:8px;width:18px;height:18px;cursor:pointer;z-index:2;accent-color:#065f46">`;
      h += `<div class="pkc-row" onclick="oM&&oM(${idx >= 0 ? idx : 0})">`;
      if (thumb) h += `<div class="pkc-thumb" style="background-image:url('${thumb}')"></div>`;
      h += `<div class="pkc-body">`;
      h += `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:3px">`;
      if (cod) h += `<span style="font-family:monospace;font-size:9px;font-weight:800;color:var(--b700);background:var(--b50);padding:1px 6px;border-radius:4px;border:1px solid var(--b200)">${cod}</span>`;
      h += `<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:#065f4615;color:#065f46;border:1px solid #065f4630">Arriendo</span>`;
      h += timerBadge(dias2, 15);
      h += `</div>`;
      h += `<div style="font-size:14px;font-weight:800">${emo(p.tipo)} ${p.tipo || 'Inmueble'}</div>`;
      h += `<div style="font-size:11px;color:var(--sub);margin-top:1px">📍 ${ubPub}</div>`;
      if (pa > 0) h += `<div style="font-family:Fraunces,serif;font-size:17px;font-weight:700;color:#065f46;margin-top:3px">${fm(pa)}<span style="font-size:11px;font-weight:500;color:var(--sub)">/mes</span></div>`;
      if (specs.length) h += `<div style="display:flex;gap:8px;font-size:11px;color:var(--sub);font-weight:600;margin-top:4px">${specs.join(' · ')}</div>`;
      h += `<div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--sub);margin-top:3px"><span>👤 <b>${capNom}</b></span>`;
      if (propTel) h += `<span>· 📞 <b>${propNom||'—'}</b></span>`;
      h += `</div></div></div>`; // close body + row
      // Actions
      h += `<div class="pkc-actions" onclick="event.stopPropagation()">`;
      h += `<button style="flex:1;min-width:100px;padding:8px;border:none;border-radius:6px;font-size:11px;font-weight:700;background:var(--b600);color:#fff;font-family:inherit;cursor:pointer" onclick="abrirAgendarEvt('${p.id}',null,null,'visita')">📅 Agendar visita</button>`;
      h += `<button style="flex:1;min-width:80px;padding:8px;border:none;border-radius:6px;font-size:11px;font-weight:700;background:#065f46;color:#fff;font-family:inherit;cursor:pointer" onclick="quickMove('${p.id}','Arrendado')">🔑 Arrendado</button>`;
      h += `<button style="padding:8px 10px;border:1.5px solid var(--brd);border-radius:6px;font-size:10px;font-weight:700;background:var(--cd);color:var(--tx);font-family:inherit;cursor:pointer" onclick="shareInm('${p.id}')">📤</button>`;
      if (propTel) h += `<a href="tel:+${propTel}" style="padding:8px 10px;border:1.5px solid var(--brd);border-radius:6px;font-size:10px;font-weight:700;background:var(--cd);color:var(--tx);text-decoration:none;display:inline-flex;align-items:center" onclick="event.stopPropagation()">📞</a>`;
      h += `<button style="padding:8px 10px;border:1.5px solid var(--red);border-radius:6px;font-size:10px;font-weight:700;background:var(--redbg);color:var(--red);font-family:inherit;cursor:pointer" onclick="gestorEliminar('${p.id}')">🗑️</button>`;
      h += `</div></div>`;
    });
  } else {
    // Standard PCOL tab
    const col = PCOLS.find(c => c.id === tab) || PCOLS[0];
    const items = MIS.filter(p => (p.estado === col.id || (col.id === 'Disponible' && (!p.estado || p.estado === 'Disponible' || p.estado === 'Verificar Disponibilidad'))) && pipeFilter(p));
    items.sort(pipeSortFn);

    if (!items.length) { h = `<div class="emp"><span class="emp-i">${col.e}</span><h3>Sin inmuebles en "${col.l}"</h3></div>`; }
    else { items.forEach(p => { h += renderCard(p, col.id); }); }
  }

  el.innerHTML = h;

  // Auto-scroll tab bar to show active tab
  if (nav) {
    const activeBtn = nav.querySelector('.pnav-btn.active');
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
};

window.scrollToCol = function (i) {
  // Legacy compat — now tabs handle navigation
  const cols = PCOLS;
  if (cols[i]) window.setPipeTab(cols[i].id);
};

// ══════════════════════════════════════════════════════════════════
// rReg — Registration (init wizard)
// ══════════════════════════════════════════════════════════════════

window.rReg = function () { if (typeof window.iForm === 'function') window.iForm(); };

// ══════════════════════════════════════════════════════════════════
// F28: rAl — Alertas (click abre inmueble)
// ══════════════════════════════════════════════════════════════════

// Tab activo de la sección Alertas (filtro por categoría)
window._notifTab = window._notifTab || 'todas';

const NOTIF_TABS = [
  { id: 'todas',     label: 'Todas',       emoji: '🔔' },
  { id: 'inmueble',  label: 'Inmuebles',   emoji: '🏠' },
  { id: 'solicitud', label: 'Solicitudes', emoji: '📋' },
  { id: 'referido',  label: 'Referidos',   emoji: '🤝' },
  { id: 'pago',      label: 'Pagos',       emoji: '💰' },
  { id: 'agenda',    label: 'Agenda',      emoji: '📅' },
  { id: 'mensaje',   label: 'Mensajes',    emoji: '💬' },
  { id: 'sistema',   label: 'Sistema',     emoji: '⚙️' },
];

window.setNotifTab = function(tab) {
  window._notifTab = tab;
  if (window.rAl) window.rAl();
};

window.rAl = function () {
  const el = document.getElementById('all'); if (!el) return;
  const all = (window.NOTIFS || window.ALU || []).filter(n => !n.descartada);
  const tab = window._notifTab || 'todas';
  const filtered = tab === 'todas' ? all : all.filter(n => n.categoria === tab);

  // KPIs
  const noLeidas = all.filter(n => !n.leida).length;
  const criticas = all.filter(n => n.prioridad === 'critica' && !n.leida).length;
  const altas = all.filter(n => n.prioridad === 'alta' && !n.leida).length;

  let h = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
    <div style="flex:1;min-width:80px;padding:10px;background:var(--redbg);border:1px solid var(--rb);border-radius:8px;text-align:center"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--red)">${criticas}</div><div style="font-size:7px;color:var(--red);text-transform:uppercase;letter-spacing:1px">Críticas</div></div>
    <div style="flex:1;min-width:80px;padding:10px;background:var(--goldbg);border:1px solid var(--yb);border-radius:8px;text-align:center"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--gold)">${altas}</div><div style="font-size:7px;color:var(--gold);text-transform:uppercase;letter-spacing:1px">Altas</div></div>
    <div style="flex:1;min-width:80px;padding:10px;background:var(--b50);border:1px solid var(--b200);border-radius:8px;text-align:center"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--b700)">${noLeidas}</div><div style="font-size:7px;color:var(--b700);text-transform:uppercase;letter-spacing:1px">No leídas</div></div>
  </div>`;

  // Botón "marcar todas leídas"
  if (noLeidas > 0) {
    h += `<div style="text-align:right;margin-bottom:8px"><button onclick="marcarTodasLeidas()" style="padding:5px 10px;background:var(--cd);border:1px solid var(--brd);border-radius:6px;font-size:11px;font-weight:700;color:var(--b600);cursor:pointer">✓ Marcar todas como leídas</button></div>`;
  }

  // Tabs por categoría
  h += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--brd)">`;
  NOTIF_TABS.forEach(t => {
    const cnt = t.id === 'todas' ? all.length : all.filter(n => n.categoria === t.id).length;
    if (t.id !== 'todas' && cnt === 0) return;
    const active = tab === t.id;
    h += `<button onclick="setNotifTab('${t.id}')" style="padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${active?'var(--b500)':'var(--brd)'};background:${active?'var(--b500)':'var(--cd)'};color:${active?'#fff':'var(--tx)'}">${t.emoji} ${t.label}${cnt>0?' ('+cnt+')':''}</button>`;
  });
  h += `</div>`;

  if (!filtered.length) {
    el.innerHTML = h + '<div class="emp"><span class="emp-i">🎉</span><h3>Sin notificaciones en esta categoría</h3></div>';
    return;
  }

  // Ordenar: no leídas primero, luego por fecha
  const sorted = [...filtered].sort((a, b) => {
    if (a.leida !== b.leida) return a.leida ? 1 : -1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  h += sorted.slice(0, 100).map(n => {
    const ico = n.icono || '📌';
    const color = n.color || '#3b82f6';
    const fecha = n.created_at ? new Date(n.created_at).toLocaleDateString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
    const opacity = n.leida ? '.6' : '1';
    const prioBadge = n.prioridad === 'critica'
      ? '<span style="font-size:8px;font-weight:800;background:#ef4444;color:#fff;padding:2px 6px;border-radius:8px;margin-left:6px">CRÍTICA</span>'
      : n.prioridad === 'alta'
        ? '<span style="font-size:8px;font-weight:800;background:#f59e0b;color:#fff;padding:2px 6px;border-radius:8px;margin-left:6px">ALTA</span>'
        : '';
    return `<div style="display:flex;gap:10px;padding:12px;background:var(--cd);border:1.5px solid var(--brd);border-left:4px solid ${color};border-radius:10px;margin-bottom:6px;cursor:pointer;opacity:${opacity}" onclick="handleNotifClick('${n.id}','${n.accion_tipo||''}','${n.accion_destino||''}','${n.accion_seccion||''}')">
      <div style="width:38px;height:38px;border-radius:10px;background:${color}1a;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">${ico}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:var(--tx)">${n.titulo || ''}${prioBadge}</div>
        ${n.mensaje ? `<div style="font-size:11px;color:var(--sub);margin-top:3px">${n.mensaje}</div>` : ''}
        <div style="font-size:10px;color:var(--sub);margin-top:4px;opacity:.75">${fecha}${n.emisor?.nombre ? ' · 👤 ' + n.emisor.nombre : ''}</div>
      </div>
      <button onclick="event.stopPropagation();descartarNotificacion('${n.id}')" title="Descartar" style="background:none;border:none;color:var(--sub);font-size:16px;cursor:pointer;padding:4px;align-self:flex-start">×</button>
    </div>`;
  }).join('');

  el.innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════
// F1-F9: rDash — Dashboard COMPLETO
// ══════════════════════════════════════════════════════════════════

window.rDash = async function () {
  const el = document.getElementById('dsc'); if (!el) return;
  const u = U(); const allD = window.D || [];
  const isAdmin = u?.rol==='admin'||u?.rol==='oficina';

  if (isAdmin) {
    // ADMIN DASHBOARD
    const total = allD.length;
    const asesores = {};
    allD.forEach(p => {
      const ase=p.captador?p.captador.nombre:'Sin asesor';
      if(!asesores[ase])asesores[ase]={total:0,verif:0,sinObs:0,sinFotos:0,fresh:0,warn:0,risk:0,cerrados:0};
      const a=asesores[ase]; a.total++;
      if(p.estado==='Verificar Disponibilidad')a.verif++;
      if(p.estado==='Arrendado'||p.estado==='Vendido')a.cerrados++;
      if(!p.observaciones||p.observaciones.length<5)a.sinObs++;
      if(!p.fotos||!p.fotos.length)a.sinFotos++;
      const d=p._dias||999; if(d<=7)a.fresh++;else if(d<=15)a.warn++;else a.risk++;
    });
    const pendVerif=allD.filter(p=>p.estado==='Verificar Disponibilidad');
    const sinFotosG=allD.filter(p=>!p.fotos||!p.fotos.length);
    const sinObsG=allD.filter(p=>!p.observaciones||p.observaciones.length<5);
    const estancadosG=allD.filter(p=>(p._dias||999)>15&&!['Arrendado','Vendido','Retirado'].includes(p.estado||''));

    // F1: Arriendos KPIs
    const arrDisp=allD.filter(p=>(p.negociacion||'').toLowerCase().includes('arriendo')&&(p.estado==='Disponible'||p.estado==='Aún Disponible'||!p.estado));
    const arrRent=allD.filter(p=>(p.negociacion||'').toLowerCase().includes('arriendo')&&p.estado==='Arrendado');

    let h=`<div class="card" style="margin-bottom:12px"><div class="cdh"><div class="chl"><div class="chi">📊</div><div><div class="cht">Visión del Negocio</div><div class="chsb">${u.rol==='admin'?'Administrador':'Oficina'}</div></div></div></div><div class="cdb">`;

    // F1: Arriendos
    h+=`<div style="background:linear-gradient(135deg,#065f4615,#065f4608);border:2px solid #065f4630;border-radius:12px;padding:14px;margin-bottom:14px"><div style="font-size:14px;font-weight:800;color:#065f46;margin-bottom:10px">🔑 ARRIENDOS</div><div style="display:flex;gap:8px;flex-wrap:wrap"><div style="flex:1;min-width:80px;padding:12px;background:var(--greenbg);border:1.5px solid var(--gb);border-radius:10px;text-align:center"><div style="font-family:Fraunces,serif;font-size:28px;font-weight:800;color:#065f46">${arrDisp.length}</div><div style="font-size:10px;color:#065f46;font-weight:700">Disponibles</div></div><div style="flex:1;min-width:80px;padding:12px;background:var(--b50);border:1.5px solid var(--b200);border-radius:10px;text-align:center"><div style="font-family:Fraunces,serif;font-size:28px;font-weight:800;color:var(--b700)">${arrRent.length}</div><div style="font-size:10px;color:var(--b700);font-weight:700">Arrendados</div></div></div></div>`;

    // Counters
    h+=`<div class="dg"><div class="dc"><div class="dn2">${total}</div><div class="dl">Total</div></div><div class="dc" style="border-color:var(--red)"><div class="dn2" style="color:var(--red)">${pendVerif.length}</div><div class="dl">Verificar</div></div><div class="dc" style="border-color:var(--purple)"><div class="dn2" style="color:var(--purple)">${sinFotosG.length}</div><div class="dl">Sin fotos</div></div><div class="dc" style="border-color:var(--gold)"><div class="dn2" style="color:var(--gold)">${sinObsG.length}</div><div class="dl">Sin obs.</div></div><div class="dc" style="border-color:var(--red)"><div class="dn2" style="color:var(--red)">${estancadosG.length}</div><div class="dl">Estancados</div></div></div>`;

    // F2: Embudo con barras
    h+=`<div style="margin:14px 0"><div style="font-size:11px;font-weight:800;color:var(--sub);margin-bottom:8px">EMBUDO GLOBAL</div>`;
    PCOLS.forEach(col=>{const n=allD.filter(p=>p.estado===col.id||(col.id==='Disponible'&&(!p.estado||p.estado==='Disponible'))).length;const pct=total>0?Math.round(n/total*100):0;h+=`<div class="dbr"><div class="dbl" style="font-size:11px">${col.e} ${col.l}</div><div class="dbf" style="height:8px"><span style="width:${pct}%"></span></div><div class="dbv">${n} <span style="font-size:9px;color:var(--sub)">${pct}%</span></div></div>`;});
    h+=`</div>`;

    // F3: Verificaciones pendientes
    if(pendVerif.length>0){h+=`<div style="margin:14px 0"><div style="font-size:11px;font-weight:800;color:var(--red);margin-bottom:8px">🔍 VERIFICACIONES PENDIENTES (${pendVerif.length})</div>`;
    const byCap={};pendVerif.forEach(p=>{const cap=p.captador?p.captador.nombre:'?';if(!byCap[cap])byCap[cap]=[];byCap[cap].push(p);});
    Object.entries(byCap).sort((a,b)=>b[1].length-a[1].length).forEach(([cap,items])=>{const avgD=Math.round(items.reduce((s,p)=>s+(p._dias||0),0)/items.length);h+=`<div style="background:${avgD>3?'var(--redbg)':'var(--goldbg)'};border:1.5px solid ${avgD>3?'var(--rb)':'var(--yb)'};border-radius:10px;padding:10px;margin-bottom:6px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:800">👤 ${cap}</span><span style="font-size:11px;font-weight:800;padding:3px 8px;border-radius:8px;background:${avgD>3?'var(--red)':'var(--gold)'};color:#fff">~${avgD}d</span></div></div>`;});h+=`</div>`;}

    // F5: Estancados
    if(estancadosG.length>0){h+=`<div style="margin:14px 0"><div style="font-size:11px;font-weight:800;color:var(--red);margin-bottom:8px">🧊 ESTANCADOS +15d (${estancadosG.length})</div>`;
    estancadosG.sort((a,b)=>(b._dias||0)-(a._dias||0)).slice(0,6).forEach(p=>{const idx=allD.indexOf(p);h+=`<div style="display:flex;gap:8px;align-items:center;padding:8px;background:var(--cd);border:1.5px solid var(--brd);border-left:4px solid var(--red);border-radius:8px;margin-bottom:4px;cursor:pointer" onclick="oM&&oM(${idx>=0?idx:0})"><span style="font-size:16px">${emo(p.tipo)}</span><div style="flex:1"><div style="font-size:12px;font-weight:700">${p.tipo} · ${p.ciudad||''}</div><div style="font-size:10px;color:var(--sub)">👤 ${p.captador?p.captador.nombre:'?'}</div></div><div style="font-size:18px;font-weight:800;color:var(--red)">${p._dias||0}d</div></div>`;});h+=`</div>`;}

    // F6: Rendimiento por asesor
    h+=`<div style="margin:14px 0"><div style="font-size:11px;font-weight:800;color:var(--sub);margin-bottom:8px">👥 RENDIMIENTO POR ASESOR</div>`;
    Object.entries(asesores).sort((a,b)=>b[1].total-a[1].total).forEach(([ase,a])=>{
      const score=Math.max(0,Math.min(100,Math.round(100-(a.sinObs/Math.max(a.total,1))*20-(a.sinFotos/Math.max(a.total,1))*15-(a.risk/Math.max(a.total,1))*15-(a.verif*10))));
      const sc=score>=80?'var(--green)':score>=50?'var(--gold)':'var(--red)';
      h+=`<div style="background:var(--cd);border:1.5px solid var(--brd);border-radius:12px;padding:12px;margin-bottom:6px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:14px;font-weight:800">👤 ${ase}</span><span style="font-family:Fraunces,serif;font-size:20px;font-weight:800;color:${sc}">${score}%</span></div><div style="display:flex;gap:4px;flex-wrap:wrap;font-size:10px;font-weight:700"><span style="padding:3px 8px;border-radius:6px;background:var(--cd2);border:1px solid var(--brd)">📦 ${a.total}</span>${a.verif>0?`<span style="padding:3px 8px;border-radius:6px;background:var(--redbg);color:var(--red)">🔍 ${a.verif}</span>`:''}${a.cerrados>0?`<span style="padding:3px 8px;border-radius:6px;background:var(--greenbg);color:#065f46">✅ ${a.cerrados}</span>`:''}<span style="padding:3px 8px;border-radius:6px;background:${a.sinObs>0?'var(--goldbg)':'var(--greenbg)'}">📝 ${a.total-a.sinObs}/${a.total}</span><span style="padding:3px 8px;border-radius:6px;background:var(--cd2)">📷 ${a.total-a.sinFotos}/${a.total}</span></div></div>`;});
    h+=`</div>`;

    // Widget: Agenda Gestor próximos 3 días
    const _agHoy=new Date();const _ag3d=new Date();_ag3d.setDate(_ag3d.getDate()+3);
    const gestorIds=(window.USERS||[]).filter(x=>x.es_gestor_arriendos).map(x=>x.id);
    if(gestorIds.length){
      const{data:agGestor}=await SB().from('agenda').select('*,inmueble:inmuebles(tipo,ciudad,codigo_house),usuario:usuarios!usuario_id(nombre)').gte('fecha',_agHoy.toISOString().split('T')[0]).lte('fecha',_ag3d.toISOString().split('T')[0]).in('usuario_id',gestorIds).eq('estado','pendiente').order('fecha').order('hora_inicio');
      if(agGestor&&agGestor.length>0){
        h+=`<div style="margin:16px 0;background:linear-gradient(135deg,#065f4615,#065f4608);border:2px solid #065f4630;border-radius:12px;padding:14px">`;
        h+=`<div style="font-size:14px;font-weight:800;color:#065f46;margin-bottom:10px">📅 Agenda Gestor — Próximos 3 días</div>`;
        agGestor.forEach(ae=>{const inm=ae.inmueble;const esAsig=ae.creado_por&&ae.creado_por!==ae.usuario_id;const brdC=esAsig?'#f59e0b':'#065f46';
          h+=`<div style="display:flex;gap:10px;align-items:center;padding:10px;background:var(--cd);border-left:3px solid ${brdC};border-radius:8px;margin-bottom:6px">`;
          h+=`<div style="text-align:center;min-width:44px"><div style="font-size:11px;font-weight:800;color:var(--sub)">${(ae.fecha||'').slice(5,10)}</div><div style="font-size:10px;color:var(--sub)">${(ae.hora_inicio||'').slice(0,5)}</div></div>`;
          h+=`<div style="flex:1"><div style="font-size:12px;font-weight:700">${ae.tipo_evento||''} ${inm?'— '+inm.tipo+' '+inm.ciudad:''}</div>`;
          if(inm&&inm.codigo_house)h+=`<span style="font-family:monospace;font-size:9px;color:var(--b700)">${inm.codigo_house}</span> `;
          if(ae.usuario&&ae.usuario.nombre)h+=`<span style="font-size:9px;color:#065f46;font-weight:600">👤 ${ae.usuario.nombre}</span>`;
          if(ae.cliente_nombre)h+=`<div style="font-size:10px;color:var(--sub)">🤝 ${ae.cliente_nombre}</div>`;
          if(esAsig)h+=`<div style="font-size:9px;color:#92400e;font-weight:600">Asignado por admin</div>`;
          h+=`</div></div>`;
        });
        h+=`</div>`;
      }
    }

    // Widget: Referidos inbox
    h+=`<div id="dash-ref-inbox" style="margin-top:14px"></div>`;

    h+=`</div></div>`;el.innerHTML=h;

    // Render referidos inbox widget after DOM is set
    if (typeof window.renderReferralInbox === 'function') window.renderReferralInbox('dash-ref-inbox');

  } else {
    // ASESOR DASHBOARD (F7-F9)
    const my=allD.filter(p=>p.captador_id===u?.id);const total=my.length;
    const colC={};PCOLS.forEach(col=>{colC[col.id]=my.filter(p=>p.estado===col.id||(col.id==='Disponible'&&(!p.estado||p.estado==='Disponible'))).length;});
    let fresh=0,warn=0,risk=0;const sinObs=[];
    my.forEach(p=>{const d=p._dias||999;if(d<=7)fresh++;else if(d<=15)warn++;else risk++;if(!p.observaciones||p.observaciones.length<5)sinObs.push(p);});
    const pctSalud=total>0?Math.round(((fresh*100/total)*0.4+(total-sinObs.length)*100/total*0.6)):100;

    let h=`<div class="card" style="margin-bottom:12px"><div class="cdh"><div class="chl"><div class="chi">📊</div><div><div class="cht">Mi Gestión</div><div class="chsb">${u?.nombre||''}</div></div></div><div style="font-family:Fraunces,serif;font-size:22px;font-weight:700;color:${pctSalud>=80?'var(--green)':pctSalud>=50?'var(--gold)':'var(--red)'}">${pctSalud}%</div></div><div class="cdb">`;

    h+=`<div class="dg"><div class="dc"><div class="dn2">${total}</div><div class="dl">Mis inmuebles</div></div><div class="dc" style="border-color:var(--green)"><div class="dn2" style="color:var(--green)">${(colC['Arrendado']||0)+(colC['Vendido']||0)}</div><div class="dl">Cerrados</div></div></div>`;

    // F7: Embudo personal
    h+=`<div style="margin:14px 0"><div style="font-size:11px;font-weight:800;color:var(--sub);margin-bottom:8px">MI EMBUDO</div>`;
    PCOLS.forEach(col=>{const n=colC[col.id]||0;const pct=total>0?Math.round(n/total*100):0;h+=`<div class="dbr"><div class="dbl" style="font-size:11px">${col.e} ${col.l}</div><div class="dbf"><span style="width:${pct}%"></span></div><div class="dbv">${n}</div></div>`;});
    h+=`</div>`;

    // F8: Semáforo
    h+=`<div style="margin:14px 0"><div style="font-size:11px;font-weight:800;color:var(--sub);margin-bottom:8px">🚦 SALUD</div><div style="display:flex;gap:8px"><div style="flex:1;padding:12px;background:var(--greenbg);border:1px solid var(--gb);border-radius:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--green)">${fresh}</div><div style="font-size:9px;color:#065f46;font-weight:700">≤7d</div></div><div style="flex:1;padding:12px;background:var(--goldbg);border:1px solid var(--yb);border-radius:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--gold)">${warn}</div><div style="font-size:9px;color:#92400e;font-weight:700">8-15d</div></div><div style="flex:1;padding:12px;background:var(--redbg);border:1px solid var(--rb);border-radius:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--red)">${risk}</div><div style="font-size:9px;color:var(--red);font-weight:700">+15d</div></div></div></div>`;

    // F9: Sin observaciones
    if(sinObs.length>0){h+=`<div style="margin:14px 0"><div style="font-size:11px;font-weight:800;color:var(--gold);margin-bottom:8px">📝 SIN OBSERVACIONES (${sinObs.length})</div>`;
    sinObs.slice(0,5).forEach(p=>{const idx=allD.indexOf(p);h+=`<div style="display:flex;gap:8px;align-items:center;padding:8px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;margin-bottom:4px;cursor:pointer" onclick="oM&&oM(${idx>=0?idx:0})"><span style="font-size:16px">${emo(p.tipo)}</span><div style="flex:1"><div style="font-size:12px;font-weight:700">${p.tipo||''}</div><div style="font-size:10px;color:var(--sub)">📍 ${p.ciudad||''}</div></div><span style="font-size:10px;color:var(--gold);font-weight:700">Agregar →</span></div>`;});h+=`</div>`;}

    h+=`</div></div>`;el.innerHTML=h;
  }
};

// ══════════════════════════════════════════════════════════════════
// F19-F22: rPort — Portales COMPLETO
// ══════════════════════════════════════════════════════════════════

window.rPort = function () {
  const el = document.getElementById('ptl'); if (!el) return;
  const allD = window.D || []; const u = U();
  const isAdmin = u?.rol==='admin'||u?.rol==='oficina';
  const ls = allD.filter(p => { const pend=!(p.url_metrocuadrado||'').trim()||!(p.url_fincaraiz||'').trim(); return isAdmin?pend:pend&&p.captador_id===u?.id; });
  const sinM2=ls.filter(p=>!(p.url_metrocuadrado||'').trim()).length;
  const sinFR=ls.filter(p=>!(p.url_fincaraiz||'').trim()).length;

  // F19: Contadores
  let h=`<div class="ptl-stats"><div class="ptl-stat"><div class="ptl-stat-n" style="color:var(--b700)">${sinM2}</div><div class="ptl-stat-l">Faltan M²</div></div><div class="ptl-stat"><div class="ptl-stat-n" style="color:#065f46">${sinFR}</div><div class="ptl-stat-l">Faltan FR</div></div><div class="ptl-stat"><div class="ptl-stat-n" style="color:var(--gold)">${ls.length}</div><div class="ptl-stat-l">Total pend.</div></div></div>`;

  if (!ls.length) { el.innerHTML=h+'<div class="emp"><span class="emp-i">✅</span><h3>Todo al día</h3></div>'; return; }

  ls.forEach(p => {
    const idx=allD.indexOf(p);const hasM2=!!(p.url_metrocuadrado||'').trim();const hasFR=!!(p.url_fincaraiz||'').trim();
    const esMio=p.captador_id===u?.id;const canEdit=isAdmin||esMio;
    const fotoThumb=p.fotos&&p.fotos.length>0?(p.fotos[0].url_thumb||p.fotos[0].url):'';

    // F22: Click abre modal
    h+=`<div class="ptl-card" style="flex-direction:column"><div style="display:flex;gap:10px;width:100%;cursor:pointer" onclick="oM&&oM(${idx>=0?idx:0})">`;
    // F21: Foto thumbnail
    if(fotoThumb)h+=`<img src="${fotoThumb}" onerror="drFallback&&drFallback(this)" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--brd);flex-shrink:0">`;
    else h+=`<div style="width:70px;height:70px;border-radius:8px;background:var(--cd2);border:1px solid var(--brd);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">${emo(p.tipo)}</div>`;
    h+=`<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:800">${p.tipo||''}</div><div style="font-size:11px;color:var(--sub)">📍 ${p.direccion||''} ${p.ciudad||''}</div><div style="font-size:10px;color:var(--sub)">👤 ${p.captador?p.captador.nombre:''}</div></div></div>`;

    // F20: Add/edit URL buttons
    h+=`<div class="ptl-links" style="margin-top:8px"><div class="ptl-link"><span class="ptl-logo m2">M²</span>${hasM2?`<span class="ptl-url"><a href="${p.url_metrocuadrado}" target="_blank">Ver →</a></span>${canEdit?`<button class="ptl-btn ptl-edit" onclick="sPrt('${p.id}','url_metrocuadrado')">✏️</button>`:''}`:(canEdit?`<span class="ptl-url" style="color:var(--red);font-weight:700">⏳ Pendiente</span><button class="ptl-btn ptl-add" onclick="sPrt('${p.id}','url_metrocuadrado')">+ Enlace</button>`:`<span class="ptl-url" style="color:var(--red)">⏳ Pendiente</span>`)}</div>`;
    h+=`<div class="ptl-link"><span class="ptl-logo fr">FR</span>${hasFR?`<span class="ptl-url"><a href="${p.url_fincaraiz}" target="_blank">Ver →</a></span>${canEdit?`<button class="ptl-btn ptl-edit" onclick="sPrt('${p.id}','url_fincaraiz')">✏️</button>`:''}`:(canEdit?`<span class="ptl-url" style="color:var(--red);font-weight:700">⏳ Pendiente</span><button class="ptl-btn ptl-add" onclick="sPrt('${p.id}','url_fincaraiz')">+ Enlace</button>`:`<span class="ptl-url" style="color:var(--red)">⏳ Pendiente</span>`)}</div></div></div>`;
  });
  el.innerHTML = h;
};

// F14-F16: rUsers — moved to bottom of file (with Solicitudes tab)

// ══════════════════════════════════════════════════════════════════
// F17-F18: rPerfil — Mi Perfil EDITABLE
// ══════════════════════════════════════════════════════════════════

window.rPerfil = function () {
  const el = document.getElementById('perfilc'); if (!el) return;
  const u = U(); if (!u) return;
  const inp=(id,val,ph,type)=>`<input id="${id}" type="${type||'text'}" value="${(val||'').toString().replace(/"/g,'&quot;')}" placeholder="${ph||''}" style="width:100%;padding:6px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:12px;font-family:inherit;color:var(--tx);background:var(--cd)">`;

  let h=`<div style="text-align:center;margin-bottom:16px">`;
  if(u.foto)h+=`<img src="${u.foto}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:8px;border:3px solid var(--b200)">`;
  else h+=`<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--b500),var(--purple));display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:24px;color:#fff;font-weight:800">${(u.nombre||'?')[0].toUpperCase()}</div>`;
  const profileRol = u.es_gestor_arriendos ? 'Gestor Arriendos' : u.rol;
  h+=`<div style="font-family:Fraunces,serif;font-size:18px;font-weight:800">${u.nombre}</div><div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-top:2px">${profileRol}</div></div>`;

  // F17: Editable fields
  h+=`<div class="msc"><div class="msct">✏️ Editar</div><div class="mgr">`;
  h+=`<div class="mf ful"><div class="mfl">Nombre</div>${inp('pf_nombre',u.nombre,'Nombre')}</div>`;
  h+=`<div class="mf ful"><div class="mfl">Email Google</div>${inp('pf_email',u.email,'correo@gmail.com','email')}</div>`;
  h+=`<div class="mf"><div class="mfl">Usuario</div>${inp('pf_usuario',u.usuario,'usuario')}</div>`;
  h+=`<div class="mf"><div class="mfl">Nueva contraseña</div>${inp('pf_pwd','','Dejar vacío si no cambia','password')}</div>`;
  h+=`<div class="mf ful"><div class="mfl">📱 Teléfono WhatsApp</div>${inp('pf_tel',u.telefono_contacto,'573001234567','tel')}<div style="font-size:9px;color:var(--sub);margin-top:3px">Aparece cuando compartes inmuebles</div></div>`;
  h+=`</div></div>`;

  // F18: Save button
  h+=`<button class="bt bp" style="width:100%" onclick="savePerfil()">💾 Guardar</button>`;
  el.innerHTML=h;
};

// ══════════════════════════════════════════════════════════════════
// F23: rPapelera — con botón restaurar
// ══════════════════════════════════════════════════════════════════

window.rPapelera = async function () {
  const el = document.getElementById('papc'); if (!el) return;
  const { data } = await SB().from('inmuebles').select('*,captador:usuarios!captador_id(nombre)').eq('eliminado', true).order('fecha_eliminacion', { ascending: false });
  if (!data||!data.length) { el.innerHTML='<div class="emp"><span class="emp-i">✅</span><h3>Papelera vacía</h3></div>'; return; }

  el.innerHTML = data.map(p => `<div style="display:flex;gap:10px;align-items:center;padding:12px;background:var(--cd);border:1.5px solid var(--brd);border-left:4px solid var(--red);border-radius:10px;margin-bottom:6px"><span style="font-size:20px">${emo(p.tipo)}</span><div style="flex:1"><div style="font-size:13px;font-weight:700">${p.tipo} · ${p.ciudad||''}</div><div style="font-size:11px;color:var(--sub)">👤 ${p.captador?p.captador.nombre:'?'} · Eliminado ${p.fecha_eliminacion?new Date(p.fecha_eliminacion).toLocaleDateString('es-CO'):''}</div></div><button onclick="restaurarInm('${p.id}')" style="padding:8px 14px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid var(--gb);background:var(--greenbg);color:#065f46;cursor:pointer;font-family:inherit;flex-shrink:0">♻️ Restaurar</button></div>`).join('');
};

// ══════════════════════════════════════════════════════════════════
// F10-F13: rAgenda — Agenda COMPLETA
// ══════════════════════════════════════════════════════════════════

window._agDate = new Date();
window._agView = 'day';

window.agNavDay = function(off) { window._agDate.setDate(window._agDate.getDate()+(window._agView==='week'?off*7:off)); window.rAgenda(); };
window.agSetView = function(v) { window._agView=v; window.rAgenda(); };

window.rAgenda = async function () {
  const el = document.getElementById('agc'); if (!el) return;
  const u = U(); if (!u) return;
  el.innerHTML='<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';

  const isAdmin=u.rol==='admin'||u.rol==='oficina';
  const isGestor=u.es_gestor_arriendos===true;
  const canSeeAll=isAdmin||isGestor;
  const startW=new Date(window._agDate);startW.setDate(startW.getDate()-startW.getDay());
  const endW=new Date(startW);endW.setDate(endW.getDate()+7);

  let q=SB().from('agenda').select('*,inmueble:inmuebles(id,tipo,ciudad,direccion,codigo_house,captador:usuarios!captador_id(nombre)),creador:usuarios!creado_por(nombre)').gte('fecha',startW.toISOString().split('T')[0]).lte('fecha',endW.toISOString().split('T')[0]).order('hora_inicio');
  if(!canSeeAll)q=q.eq('usuario_id',u.id);
  const{data}=await q; const evts=data||[];
  const USERS2=window.USERS||[];

  const dias2=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const hoy=new Date().toISOString().split('T')[0];
  const selDay=window._agDate.toISOString().split('T')[0];

  let h=`<div class="card"><div class="cdh"><div class="chl"><div class="chi">📅</div><div><div class="cht">Agenda${canSeeAll?' — Gestión':''}</div></div></div></div><div class="cdb">`;

  // F10: Nav ◀ ▶
  h+=`<div class="ag-nav"><button onclick="agNavDay(-1)">◀</button><div class="ag-date">${dias2[window._agDate.getDay()]} ${window._agDate.getDate()} de ${meses[window._agDate.getMonth()]}</div><button onclick="agNavDay(1)">▶</button></div>`;

  // F11: Toggle día/semana + nuevo evento
  h+=`<div class="ag-nav" style="margin-bottom:16px"><button class="${window._agView==='day'?'act':''}" onclick="agSetView('day')">📋 Día</button><button class="${window._agView==='week'?'act':''}" onclick="agSetView('week')">📅 Semana</button><button style="margin-left:auto;background:var(--b600);color:#fff;border-color:var(--b600)" onclick="abrirAgendarEvt()">+ Nuevo</button></div>`;

  if (window._agView==='day') {
    // DAY VIEW
    const evtsDay=evts.filter(e=>e.fecha===selDay);
    const slots={};for(let hr=7;hr<=20;hr++)slots[hr]=null;
    evtsDay.forEach(e=>{const hr=parseInt((e.hora_inicio||'08:00').split(':')[0]);if(!slots[hr])slots[hr]=[];slots[hr].push(e);});

    Object.keys(slots).sort((a,b)=>a-b).forEach(hr=>{
      const hh=parseInt(hr);const lbl=(hh<12?hh:hh===12?12:hh-12)+''+(hh<12?' AM':' PM');
      h+=`<div class="ag-slot"><div class="ag-hora">${lbl}</div>`;
      if(slots[hr]&&slots[hr].length>0){
        slots[hr].forEach(e=>{
          const isPers=e.es_personal;const inm=e.inmueble;
          const tipoLabels={visita:'🔑 Visita',entrega:'🔑 Entrega',firma:'📝 Firma',personal:'🔒 Personal',otro:'📌 Otro'};
          const esAsignado=e.creado_por&&e.creado_por!==e.usuario_id;
          const creadorNom=e.creador?e.creador.nombre:'';
          const esMioCreado=e.creado_por===u.id;
          const isDone=e.estado==='completado';
          const canDelete=esMioCreado||isAdmin;
          // Determine event class
          const evtClass=isDone?'completado':isPers?'personal':esAsignado?'asignado':'inmueble';
          if(isPers&&isAdmin&&e.usuario_id!==u.id){h+=`<div class="ag-evt personal"><div class="ag-evt-tipo" style="color:var(--sub)">🔒 OCUPADO</div><div class="ag-evt-titulo">${e.hora_inicio||''}</div></div>`;}
          else{
            h+=`<div class="ag-evt ${evtClass}" style="position:relative">`;
            // Badge asignado
            if(esAsignado&&!isAdmin)h+=`<div style="position:absolute;top:-6px;right:10px;font-size:9px;font-weight:600;background:var(--goldbg);color:#92400e;padding:2px 8px;border-radius:4px;border:1px solid rgba(245,158,11,.3)">Asignado por ${creadorNom}</div>`;
            if(esAsignado&&isAdmin){const targetUser=USERS2.find(x=>x.id===e.usuario_id);h+=`<div style="position:absolute;top:-6px;right:10px;font-size:9px;font-weight:600;background:var(--g100);color:var(--sub);padding:2px 8px;border-radius:4px">Asignado a ${targetUser?targetUser.nombre:'gestor'}</div>`;}
            if(isDone)h+=`<div style="position:absolute;top:-6px;right:10px;font-size:9px;font-weight:600;background:var(--greenbg);color:#065f46;padding:2px 8px;border-radius:4px;border:1px solid var(--gb)">✅ Completado</div>`;
            h+=`<div class="ag-evt-tipo">${tipoLabels[e.tipo_evento]||e.tipo_evento}</div>`;
            h+=`<div class="ag-evt-titulo">${e.hora_inicio||''}${e.hora_fin?' — '+e.hora_fin:''} · ${isPers?(e.titulo||'Personal'):(inm?inm.tipo+' en '+inm.ciudad:e.titulo||'Evento')}</div>`;
            if(inm&&inm.codigo_house)h+=`<span style="font-family:monospace;font-size:9px;color:var(--b700)">${inm.codigo_house}</span>`;
            if(!isPers&&e.cliente_nombre)h+=`<div class="ag-evt-sub">👤 ${e.cliente_nombre}${e.cliente_telefono?' · 📞 '+e.cliente_telefono:''}</div>`;
            if(e.nota_admin)h+=`<div style="font-size:10px;color:#92400e;margin-top:4px;font-weight:500">📝 "${e.nota_admin}"</div>`;
            // Action button: delete or complete
            if(!isDone){
              if(canDelete)h+=`<span class="ag-evt-del" onclick="event.stopPropagation();cancelarEvt('${e.id}')" title="Eliminar">✕</span>`;
              else h+=`<span class="ag-evt-del" onclick="event.stopPropagation();completarEvt('${e.id}')" style="color:var(--green)" title="Completar">✓</span>`;
            }
            h+=`</div>`;
          }
        });
      } else {
        // F13: Click en slot libre
        h+=`<div class="ag-evt libre" onclick="abrirAgendarEvt(null,'${selDay}','${hr<10?'0'+hr:hr}:00')">+ Agendar aquí</div>`;
      }
      h+=`</div>`;
    });

  } else {
    // F12: WEEK VIEW
    h+=`<div class="ag-week">`;
    for(let d=0;d<7;d++){
      const dt=new Date(startW);dt.setDate(dt.getDate()+d);
      const ds=dt.toISOString().split('T')[0];const isToday=ds===hoy;
      const dayEvts=evts.filter(e=>e.fecha===ds);
      h+=`<div class="ag-week-day${isToday?' today':''}" onclick="window._agDate=new Date('${ds}T12:00');agSetView('day')"><div class="ag-wd-name">${dias2[d]}</div><div class="ag-wd-num">${dt.getDate()}</div>`;
      dayEvts.slice(0,3).forEach(e=>{const isPers=e.es_personal;const esAsig=e.creado_por&&e.creado_por!==e.usuario_id;if(isPers&&isAdmin&&e.usuario_id!==u.id){h+=`<div class="ag-wd-evt pers">🔒 Ocupado</div>`;}else{const inm=e.inmueble;const bdr=esAsig?'border-left:3px solid #f59e0b;padding-left:4px':'';h+=`<div class="ag-wd-evt inm" style="${bdr}">${(e.hora_inicio||'').slice(0,5)} ${isPers?'🔒':(inm?inm.tipo:'📌')}${e.estado==='completado'?' ✅':''}</div>`;}});
      if(dayEvts.length>3)h+=`<div style="font-size:8px;color:var(--sub);font-weight:700">+${dayEvts.length-3} más</div>`;
      if(!dayEvts.length)h+=`<div style="font-size:9px;color:var(--g400);margin-top:6px">Sin eventos</div>`;
      h+=`</div>`;
    }
    h+=`</div>`;
  }

  h+=`</div></div>`;el.innerHTML=h;
};

// ══════════════════════════════════════════════════════════════════
// F24-F27: rConc — Conciliación COMPLETA
// ══════════════════════════════════════════════════════════════════

window._concFilter2 = 'all';

window.rConc = async function () {
  const el = document.getElementById('concc'); if (!el) return;
  el.innerHTML='<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';

  const{data}=await SB().from('conciliacion').select('*').order('created_at',{ascending:false});
  const items=data||[];const pend=items.filter(c=>c.estado==='pendiente').length;const done=items.filter(c=>c.estado==='completado').length;
  const isAdmin=U()?.rol==='admin'||U()?.rol==='oficina';

  const tipos={all:'Todos',precio:'💲 Precio',fotos:'📷 Fotos',descripcion:'📝 Desc.',solo_m2:'❌ Solo M²',solo_fr:'❌ Solo FR',retirar:'🗑️ Retirar'};

  let h=`<div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;padding:10px;background:var(--redbg);border:1.5px solid var(--rb);border-radius:10px;text-align:center"><div style="font-family:Fraunces,serif;font-size:24px;font-weight:800;color:var(--red)">${pend}</div><div style="font-size:10px;font-weight:700;color:var(--red)">Pendientes</div></div><div style="flex:1;padding:10px;background:var(--greenbg);border:1.5px solid var(--gb);border-radius:10px;text-align:center"><div style="font-family:Fraunces,serif;font-size:24px;font-weight:800;color:var(--green)">${done}</div><div style="font-size:10px;font-weight:700;color:var(--green)">Completados</div></div><div style="flex:1;padding:10px;background:var(--b50);border:1.5px solid var(--b200);border-radius:10px;text-align:center"><div style="font-family:Fraunces,serif;font-size:24px;font-weight:800;color:var(--b700)">${items.length}</div><div style="font-size:10px;font-weight:700;color:var(--b700)">Total</div></div></div>`;

  // F27: Filtros
  h+=`<div class="conc-filters">${Object.entries(tipos).map(([k,v])=>`<button class="${window._concFilter2===k?'act':''}" onclick="window._concFilter2='${k}';rConc()">${v}</button>`).join('')}</div>`;

  if(isAdmin)h+=`<button style="width:100%;padding:10px;background:var(--b600);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;margin-bottom:14px" onclick="concNuevo()">+ Agregar diferencia</button>`;

  const filtered=items.filter(c=>{if(window._concFilter2==='all')return true;return c.tipo_diferencia===window._concFilter2;});

  if(!filtered.length){el.innerHTML=h+'<div class="emp"><span class="emp-i">✅</span><h3>Sin diferencias</h3></div>';return;}

  filtered.forEach(c=>{
    const isDone=c.estado==='completado';
    const badgeLabels={precio:'💲 PRECIO',fotos:'📷 FOTOS',descripcion:'📝 DESCRIPCIÓN',solo_m2:'❌ SOLO M²',solo_fr:'❌ SOLO FR',retirar:'🗑️ RETIRAR',otro:'📌 OTRO'};

    h+=`<div class="conc-card${isDone?' done':''}">`;
    // F24: Expand/collapse
    h+=`<div class="conc-hdr" onclick="concToggle('${c.id}')"><span class="conc-badge ${c.tipo_diferencia}">${badgeLabels[c.tipo_diferencia]||c.tipo_diferencia}</span><div class="conc-info"><div class="conc-tipo">${c.tipo_inmueble||''} · ${c.ciudad||''}</div><div class="conc-det">${c.detalle||''}</div></div>`;
    // F26: Checkbox completado
    if(isAdmin)h+=`<div class="conc-check${isDone?' done':''}" onclick="event.stopPropagation();concCheck('${c.id}',${isDone})">${isDone?'✓':''}</div>`;
    h+=`</div>`;

    // F24+F25: Expandable body with notes
    h+=`<div class="conc-body" id="conc-${c.id}">`;
    if(c.tipo_diferencia==='precio'){h+=`<div class="conc-row"><div class="conc-col m2"><div class="conc-col-t">M²</div><div class="conc-col-v">${c.precio_m2?fm(c.precio_m2):'—'}</div></div><div class="conc-col fr"><div class="conc-col-t">FR</div><div class="conc-col-v">${c.precio_fr?fm(c.precio_fr):'—'}</div></div></div>`;}
    if(c.url_m2||c.url_fr){h+=`<div class="conc-links">${c.url_m2?`<a class="lm2" href="${c.url_m2}" target="_blank">🔗 M²</a>`:''}${c.url_fr?`<a class="lfr" href="${c.url_fr}" target="_blank">🔗 FR</a>`:''}</div>`;}
    // F25: Notes
    h+=`<div class="conc-notas"><div style="font-size:10px;font-weight:800;color:var(--sub);margin-bottom:6px">💬 ANOTACIONES</div><div id="cn-${c.id}"><span style="font-size:10px;color:var(--g400)">Cargando...</span></div><div class="conc-add"><textarea id="cnt-${c.id}" placeholder="Agregar nota..."></textarea><button onclick="concAddNote('${c.id}')">Enviar</button></div></div>`;
    h+=`</div></div>`;
  });

  el.innerHTML=h;
  // Load notes for expanded items
  filtered.forEach(c=>{const body=document.getElementById('conc-'+c.id);if(body&&body.classList.contains('open'))ldConcNotas(c.id);});
};

// ══════════════════════════════════════════════════════════════════
// EXTERNAL USERS — Portal, Favoritos, Cuenta, MisPub, Publicar, Espera
// ══════════════════════════════════════════════════════════════════

// --- Public filters state ---
window._pubFilters = { neg: '', tipo: '', ciudad: '', q: '' };

window.pubFilter = function(group, value, el) {
  if (window._pubFilters[group] === value) { window._pubFilters[group] = ''; el.classList.remove('act'); }
  else {
    window._pubFilters[group] = value;
    document.querySelectorAll(`.pub-chip[data-g="${group}"]`).forEach(c => c.classList.remove('act'));
    el.classList.add('act');
  }
  window.rPortafolio();
};

window.rPortafolio = async function() {
  const el = document.getElementById('portafolioc'); if (!el) return;
  const u = U();
  // If user is logged in, portafolio is handled by sec-inv + rInv via router
  // Don't render the visitor portal header/content
  if (u) { el.innerHTML = ''; return; }
  const isVisitor = true;
  const loginUrl = window.location.pathname + '?login=1';
  const regUrl = window.location.pathname + '?reg=1';

  // Load data
  let data = window.PUB;
  if (!data || !data.length) {
    el.innerHTML = '<div style="text-align:center;padding:60px;background:#fff"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';
    // Auth progresiva: visitantes ven todo el inventario público (no muro)
    data = await window.loadPublic(null);
  }

  // Load favorites for logged-in users
  let favIds = new Set();
  if (u && isExterno) {
    try {
      const { data: favs } = await SB().from('favoritos').select('inmueble_id').eq('usuario_id', u.id);
      if (favs) favs.forEach(f => favIds.add(f.inmueble_id));
    } catch(e) {}
  }

  // Apply filters
  const f = window._pubFilters;
  let filtered = data;
  if (window._pubFavFilter && favIds.size > 0) filtered = filtered.filter(p => favIds.has(p.id));
  if (window._pubMyFilter && u) filtered = filtered.filter(p => p.captador_id === u.id || (p.captador && p.captador.id === u.id));
  filtered = filtered.filter(p => {
    if (f.neg) { const n = (p.negociacion||'').toLowerCase(); if (f.neg === 'arriendo' && !n.includes('arriendo')) return false; if (f.neg === 'venta' && !n.includes('venta')) return false; }
    if (f.tipo && !(p.tipo||'').toLowerCase().includes(f.tipo)) return false;
    if (f.ciudad && !(p.ciudad||'').toLowerCase().includes(f.ciudad)) return false;
    if (f.q) { const q = f.q.toLowerCase(); if (!(p.tipo||'').toLowerCase().includes(q) && !(p.ciudad||'').toLowerCase().includes(q) && !(p.barrio||'').toLowerCase().includes(q) && !(p.direccion_publica||'').toLowerCase().includes(q)) return false; }
    return true;
  });

  let h = '';

  // ════════════════════════════════════════════════
  // LOGGED-IN EXTERNAL USERS: CRM-style layout (no own header)
  // ════════════════════════════════════════════════
  if (u && isExterno) {
    h += `<div style="max-width:1300px;margin:0 auto;padding:10px 14px 60px">`;

    // Search bar (same style as CRM)
    h += `<div class="sr"><input class="sin" placeholder="🔍 Buscar zona, tipo, barrio..." value="${f.q||''}" oninput="window._pubFilters.q=this.value;window.rPortafolio()"></div>`;

    // Filter chips (same as CRM but with Favoritos toggle)
    h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">`;
    h += `<div class="ch${f.neg==='arriendo'?' on':''}" onclick="pubFilter('neg','arriendo',this)">🔑 Arriendo</div>`;
    h += `<div class="ch${f.neg==='venta'?' on':''}" onclick="pubFilter('neg','venta',this)">💰 Venta</div>`;
    h += `<div class="ch${f.tipo==='apartamento'?' on':''}" onclick="pubFilter('tipo','apartamento',this)">🏢 Apto</div>`;
    h += `<div class="ch${f.tipo==='casa'?' on':''}" onclick="pubFilter('tipo','casa',this)">🏡 Casa</div>`;
    h += `<div class="ch${f.tipo==='finca'?' on':''}" onclick="pubFilter('tipo','finca',this)">🌾 Finca</div>`;
    h += `<div class="ch${f.tipo==='local'?' on':''}" onclick="pubFilter('tipo','local',this)">🏪 Local</div>`;
    h += `<div class="ch${f.tipo==='lote'?' on':''}" onclick="pubFilter('tipo','lote',this)">🌳 Lote</div>`;
    h += `<div class="ch${f.tipo==='oficina'?' on':''}" onclick="pubFilter('tipo','oficina',this)">💼 Oficina</div>`;
    h += `</div>`;

    // City chips
    h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">`;
    h += `<div class="ch${f.ciudad==='pereira'?' on':''}" onclick="pubFilter('ciudad','pereira',this)">📍 Pereira</div>`;
    h += `<div class="ch${f.ciudad==='dosquebradas'?' on':''}" onclick="pubFilter('ciudad','dosquebradas',this)">📍 Dosq.</div>`;
    h += `<div class="ch${f.ciudad==='santa rosa'?' on':''}" onclick="pubFilter('ciudad','santa rosa',this)">📍 Sta Rosa</div>`;
    h += `<div class="ch${f.ciudad==='cerritos'?' on':''}" onclick="pubFilter('ciudad','cerritos',this)">📍 Cerritos</div>`;
    h += `</div>`;

    // Favoritos toggle (pink, like Mis inmuebles in CRM)
    h += `<div style="display:flex;gap:6px;margin-bottom:10px">`;
    h += `<button onclick="window._pubFavFilter=!window._pubFavFilter;if(window._pubFavFilter)window._pubMyFilter=false;rPortafolio()" style="padding:8px 16px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;border:2px solid ${window._pubFavFilter?'#e11d73':'var(--brd)'};background:${window._pubFavFilter?'#e11d73':'var(--cd)'};color:${window._pubFavFilter?'#fff':'var(--tx)'}">♥ Mis favoritos</button>`;
    if (tipoU === 'vendedor_externo' || tipoU === 'propietario') {
      h += `<button onclick="window._pubMyFilter=!window._pubMyFilter;if(window._pubMyFilter)window._pubFavFilter=false;rPortafolio()" style="padding:8px 16px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;border:2px solid ${window._pubMyFilter?'#e11d73':'var(--brd)'};background:${window._pubMyFilter?'#e11d73':'var(--cd)'};color:${window._pubMyFilter?'#fff':'var(--tx)'}">🏠 Mis inmuebles</button>`;
    }
    h += `</div>`;

    // Results count
    h += `<div style="font-size:12px;color:var(--sub);font-weight:700;margin-bottom:8px">${filtered.length} inmueble${filtered.length!==1?'s':''} disponible${filtered.length!==1?'s':''}</div>`;

    // Cards grid (same card style as CRM)
    h += `<div id="pub-res" class="pub-grid">`;
    filtered.forEach(p => {
      const fotos = p.fotos ? [...p.fotos].sort((a,b)=>(a.orden||0)-(b.orden||0)) : [];
      const thumb = fotos.length > 0 ? (fotos[0].url_thumb || fotos[0].url) : '';
      const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;
      const capTel = p.captador?.telefono_contacto || '573105922763';
      const capNom = p.captador?.nombre || 'House';
      const cod = p.codigo_house || '';
      const previewUrl = cod ? 'https://inmobiliariahouse.com.co/ver/'+encodeURIComponent(cod) : 'https://inmobiliariahouse.com.co/ver/'+p.id;
      const isFav = favIds.has(p.id);
      const specs = [];
      if (p.habitaciones) specs.push('🛏️ '+p.habitaciones);
      if (p.banos) specs.push('🚿 '+p.banos);
      if (p.area_construida) specs.push('📐 '+p.area_construida+'m²');
      if (p.estrato) specs.push('E'+p.estrato);

      h += `<div class="pub-card" style="background:var(--cd)">`;
      if (thumb) h += `<img class="pub-card-img" src="${thumb}" onerror="this.style.display='none'" loading="lazy">`;
      else h += `<div class="pub-card-img" style="display:flex;align-items:center;justify-content:center;font-size:40px;background:var(--g100)">${emo(p.tipo)}</div>`;
      h += `<button class="pub-fav-btn${isFav?' active':''}" onclick="event.stopPropagation();toggleFavorito('${p.id}')">${isFav?'❤️':'🤍'}</button>`;
      if (p.origen === 'externo') h += `<span style="position:absolute;top:10px;left:10px;font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,.6);color:#fff">🏢 Asesor externo</span>`;
      h += `<div class="pub-card-body">`;
      h += `<div class="pub-card-tipo">${p.tipo||'Inmueble'} · ${(p.negociacion||'').replace(/Venta y Arriendo/i,'Venta/Arriendo')}</div>`;
      h += `<div class="pub-card-title">${p.direccion_publica || p.barrio || p.ciudad || ''}</div>`;
      h += `<div class="pub-card-loc">📍 ${p.ciudad||''}</div>`;
      if (pa > 0) h += `<div class="pub-card-price">${fm(pa)}<span style="font-size:12px;font-weight:500;color:var(--sub)">/mes</span></div>`;
      if (pv > 0) h += `<div class="pub-card-price" style="font-size:${pa>0?'14px':'20px'}">${fm(pv)}</div>`;
      if (specs.length) h += `<div class="pub-card-specs">${specs.join(' · ')}</div>`;
      h += `</div>`;
      h += `<div class="pub-card-actions"><a class="pub-card-wa" href="https://wa.me/${capTel}?text=${encodeURIComponent('Hola '+capNom+', estoy interesado en este inmueble: '+previewUrl)}" target="_blank" onclick="event.stopPropagation()">💬 WhatsApp</a><a class="pub-card-det" href="${previewUrl}" target="_blank" onclick="event.stopPropagation()">Ver detalle</a></div>`;
      h += `</div>`;
    });
    h += `</div></div>`;

    el.innerHTML = h;
    return;
  }

  // ════════════════════════════════════════════════
  // VISITOR (not logged in): standalone portal with own header
  // ════════════════════════════════════════════════

  // Header
  h += `<div style="position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:8px;box-shadow:0 1px 4px rgba(0,0,0,.04)">`;
  h += `<img src="/img/logo.png" style="height:28px" onerror="this.style.display='none'">`;
  h += `<span style="font-family:Fraunces,serif;font-size:15px;font-weight:800;color:#1e293b;letter-spacing:-.3px">House</span>`;
  h += `<div style="flex:1"></div>`;
  h += `<a href="${loginUrl}" style="padding:8px 16px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap">Ingresar</a>`;
  h += `<a href="${regUrl}" style="padding:8px 16px;background:#2563eb;color:#fff;border:2px solid #2563eb;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;margin-left:6px;white-space:nowrap">Registrarse gratis</a>`;
  h += `</div>`;

  // Hero banner
  h += `<div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:28px 20px;text-align:center;color:#fff">`;
  h += `<div style="font-family:Fraunces,serif;font-size:22px;font-weight:800;line-height:1.2;margin-bottom:6px">Encuentra tu hogar ideal en Pereira</div>`;
  h += `<div style="font-size:13px;opacity:.85;margin-bottom:16px">Arriendos, ventas y más en el Eje Cafetero</div>`;
  h += `<div style="max-width:400px;margin:0 auto"><input class="pub-search" placeholder="🔍 Buscar zona, tipo de inmueble..." value="${f.q||''}" oninput="window._pubFilters.q=this.value;window.rPortafolio()" style="background:#fff;color:#1e293b;border:none;padding:12px 16px;border-radius:10px;width:100%;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>`;
  h += `</div>`;

  // Filters
  h += `<div style="padding:8px 14px;background:#fff;display:flex;gap:6px;overflow-x:auto;flex-wrap:nowrap">`;
  h += `<button class="pub-chip${f.neg==='arriendo'?' act':''}" data-g="neg" onclick="pubFilter('neg','arriendo',this)">🔑 Arriendo</button>`;
  h += `<button class="pub-chip${f.neg==='venta'?' act':''}" data-g="neg" onclick="pubFilter('neg','venta',this)">💰 Venta</button>`;
  h += `<button class="pub-chip${f.tipo==='apartamento'?' act':''}" data-g="tipo" onclick="pubFilter('tipo','apartamento',this)">🏢 Apto</button>`;
  h += `<button class="pub-chip${f.tipo==='casa'?' act':''}" data-g="tipo" onclick="pubFilter('tipo','casa',this)">🏡 Casa</button>`;
  h += `<button class="pub-chip${f.tipo==='finca'?' act':''}" data-g="tipo" onclick="pubFilter('tipo','finca',this)">🌾 Finca</button>`;
  h += `<button class="pub-chip${f.tipo==='local'?' act':''}" data-g="tipo" onclick="pubFilter('tipo','local',this)">🏪 Local</button>`;
  h += `</div>`;

  h += `<div style="padding:6px 14px;font-size:12px;color:#64748b;font-weight:700;background:#fff">${filtered.length} inmueble${filtered.length!==1?'s':''}</div>`;

  // Grid
  h += `<div style="padding:8px 14px;background:#f8fafc;min-height:60vh"><div class="pub-grid">`;
  filtered.forEach((p, idx) => {
    const fotos = p.fotos ? [...p.fotos].sort((a,b)=>(a.orden||0)-(b.orden||0)) : [];
    const thumb = fotos.length > 0 ? (fotos[0].url_thumb || fotos[0].url) : '';
    const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;
    const cod = p.codigo_house || '';
    const previewUrl = cod ? 'https://inmobiliariahouse.com.co/ver/'+encodeURIComponent(cod) : 'https://inmobiliariahouse.com.co/ver/'+p.id;
    const specs = [];
    if (p.habitaciones) specs.push('🛏️ '+p.habitaciones);
    if (p.banos) specs.push('🚿 '+p.banos);
    if (p.area_construida) specs.push('📐 '+p.area_construida+'m²');

    h += `<div class="pub-card" style="background:#fff" onclick="window.trackPropertyView&&window.trackPropertyView('${p.id}');typeof showPublicView==='function'?showPublicView('${p.id}'):(window.location.href='${previewUrl}')">`;
    if (thumb) h += `<img class="pub-card-img" src="${thumb}" onerror="this.style.display='none'" loading="lazy">`;
    else h += `<div class="pub-card-img" style="display:flex;align-items:center;justify-content:center;font-size:40px;background:#f1f5f9">${emo(p.tipo)}</div>`;
    h += `<button class="pub-fav-btn" onclick="event.stopPropagation();toggleFavorito('${p.id}')" style="position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.95);border:none;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)">🤍</button>`;
    h += `<div class="pub-card-body">`;
    h += `<div class="pub-card-tipo">${p.tipo||'Inmueble'} · ${(p.negociacion||'').replace(/Venta y Arriendo/i,'Venta/Arriendo')}</div>`;
    h += `<div class="pub-card-title">${p.direccion_publica || p.barrio || p.ciudad || ''}</div>`;
    h += `<div class="pub-card-loc">📍 ${p.ciudad||''}</div>`;
    if (pa > 0) h += `<div class="pub-card-price">${fm(pa)}<span style="font-size:12px;font-weight:500;color:#94a3b8">/mes</span></div>`;
    if (pv > 0) h += `<div class="pub-card-price" style="font-size:${pa>0?'14px':'20px'}">${fm(pv)}</div>`;
    if (specs.length) h += `<div class="pub-card-specs">${specs.join(' · ')}</div>`;
    h += `</div>`;
    h += `</div>`;

    // Scroll banner inline después de la card 10 (solo 1 vez, si aplica)
    if (idx === 9 && !window.VISITOR?.promptsDismissed?.scroll_banner && !window.VISITOR?.promptsShown?.scroll_banner) {
      h += `<div class="vis-scroll-banner" id="vis-scroll-banner" style="grid-column:1/-1">`;
      h += `<div style="font-size:28px;margin-bottom:8px">🏠</div>`;
      h += `<div class="vsb-title">¿Te gusta lo que ves?</div>`;
      h += `<div class="vsb-msg">Con una cuenta gratis puedes guardar favoritos, contactar asesores, recibir alertas de precio y hasta ganar dinero refiriendo inmuebles.</div>`;
      h += `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">`;
      h += `<button onclick="window.trackPromptShown('scroll_banner');showRegisterModal('scroll')" style="padding:12px 24px;background:linear-gradient(135deg,#122d4f,#1a4f8b);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Crear cuenta gratis</button>`;
      h += `<button onclick="window.dismissPrompt('scroll_banner');document.getElementById('vis-scroll-banner').remove()" style="padding:12px 16px;background:var(--g100);color:var(--sub);border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">No gracias</button>`;
      h += `</div></div>`;
    }
  });
  h += `</div></div>`;

  // Registration gate
  h += `<div id="pub-gate" style="background:#fff;padding:32px 20px;text-align:center;border-top:1px solid #e2e8f0">`;
  h += `<div style="font-size:32px;margin-bottom:10px">🔓</div>`;
  h += `<div style="font-family:Fraunces,serif;font-size:22px;font-weight:800;color:#1e293b;margin-bottom:6px">Regístrate gratis para ver todo</div>`;
  h += `<div style="font-size:14px;color:#64748b;max-width:360px;margin:0 auto 20px;line-height:1.5">Accede al inventario completo, guarda favoritos y recibe alertas de nuevos inmuebles.</div>`;
  h += `<a href="${regUrl}" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#fff;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(37,99,235,.3)">Registrarse gratis</a>`;
  h += `<div style="margin-top:10px"><a href="${loginUrl}" style="font-size:13px;color:#64748b;text-decoration:underline">Ya tengo cuenta → Ingresar</a></div>`;
  h += `</div>`;

  // Owner CTA
  h += `<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);padding:28px 20px;text-align:center;border-top:1px solid #bbf7d0">`;
  h += `<div style="font-size:28px;margin-bottom:8px">🏠</div>`;
  h += `<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;color:#065f46;margin-bottom:6px">¿Tienes un inmueble?</div>`;
  h += `<div style="font-size:14px;color:#064e3b;max-width:340px;margin:0 auto 16px;line-height:1.5">Suscríbete y publica gratis. Te conectamos con cientos de compradores e inversionistas.</div>`;
  h += `<a href="${regUrl}" style="display:inline-block;padding:12px 28px;background:#065f46;color:#fff;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none">Publicar mi inmueble gratis</a>`;
  h += `</div>`;

  h += `<div style="background:#fff;padding:20px;text-align:center;border-top:1px solid #e2e8f0"><div style="font-size:11px;color:#94a3b8">© ${new Date().getFullYear()} House · Asesores Inmobiliarios · Pereira, Colombia</div></div>`;

  el.innerHTML = h;
};

// --- Favoritos ---
window.rFavoritos = async function() {
  const el = document.getElementById('favoritosc'); if (!el) return;
  const u = U(); if (!u) return;
  el.innerHTML = '<div style="text-align:center;padding:40px"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';

  try {
    const { data: favs } = await SB().from('favoritos').select('inmueble_id,inmueble:inmuebles(id,tipo,negociacion,ciudad,barrio,direccion_publica,precio_venta,precio_arriendo,habitaciones,banos,area_construida,codigo_house,captador:usuarios!captador_id(nombre,telefono_contacto),fotos(url,url_thumb,orden))').eq('usuario_id', u.id);
    if (!favs || !favs.length) {
      el.innerHTML = '<div style="text-align:center;padding:40px"><div style="font-size:40px;margin-bottom:12px">💔</div><h3 style="font-size:16px;font-weight:800">Aún no tienes favoritos</h3><p style="font-size:13px;color:var(--sub);margin-top:6px">Explora inmuebles y guarda los que te gusten</p><a href="#/portafolio" style="display:inline-block;margin-top:14px;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;background:var(--b600);color:#fff;text-decoration:none">🔍 Explorar</a></div>';
      return;
    }
    let h = '<div style="padding:14px"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;margin-bottom:14px">❤️ Mis Favoritos</div></div>';
    h += '<div class="pub-grid">';
    favs.forEach(fav => {
      const p = fav.inmueble; if (!p) return;
      const fotos = p.fotos ? [...p.fotos].sort((a,b)=>(a.orden||0)-(b.orden||0)) : [];
      const thumb = fotos.length > 0 ? (fotos[0].url_thumb || fotos[0].url) : '';
      const pa = p.precio_arriendo || 0, pv = p.precio_venta || 0;
      const capTel = p.captador?.telefono_contacto || '573105922763';
      const capNom = p.captador?.nombre || 'House';
      const cod = p.codigo_house || '';
      const url = cod ? 'https://inmobiliariahouse.com.co/ver/' + encodeURIComponent(cod) : 'https://inmobiliariahouse.com.co/ver/' + p.id;
      h += `<div class="pub-card">`;
      if (thumb) h += `<img class="pub-card-img" src="${thumb}" onerror="this.style.display='none'" loading="lazy">`;
      h += `<button class="pub-fav-btn active" onclick="event.stopPropagation();toggleFavorito('${p.id}')">❤️</button>`;
      h += `<div class="pub-card-body"><div class="pub-card-tipo">${p.tipo||''} · ${p.negociacion||''}</div><div class="pub-card-title">${p.direccion_publica||p.barrio||''}</div><div class="pub-card-loc">📍 ${p.ciudad||''}</div>`;
      if (pa > 0) h += `<div class="pub-card-price">${fm(pa)}/mes</div>`;
      if (pv > 0) h += `<div class="pub-card-price" style="font-size:14px">${fm(pv)}</div>`;
      h += `</div><div class="pub-card-actions"><a class="pub-card-wa" href="https://wa.me/${capTel}?text=${encodeURIComponent('Hola '+capNom+', estoy interesado: '+url)}" target="_blank" onclick="event.stopPropagation()">💬 WhatsApp</a><a class="pub-card-det" href="${url}" target="_blank" onclick="event.stopPropagation()">Ver detalle</a></div></div>`;
    });
    h += '</div>';
    el.innerHTML = h;
  } catch(e) { el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red)">Error: ' + e.message + '</div>'; }
};

// --- Mi Cuenta (externo) ---
window.rCuenta = function() {
  const el = document.getElementById('cuentac'); if (!el) return;
  const u = U(); if (!u) return;
  let h = '<div class="card"><div class="cdh"><div class="chl"><div class="chi">⚙️</div><div><div class="cht">Mi Cuenta</div></div></div></div><div class="cdb">';
  h += `<div style="text-align:center;margin-bottom:16px">`;
  if (u.foto) h += `<img src="${u.foto}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:8px;border:3px solid var(--b200)">`;
  else h += `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--b500),var(--purple));display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:24px;color:#fff;font-weight:800">${(u.nombre||'?')[0]}</div>`;
  h += `<div style="font-family:Fraunces,serif;font-size:18px;font-weight:800">${u.nombre}</div>`;
  h += `<div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-top:2px">${(u.tipo_usuario==='vendedor_externo'||u.tipo_usuario==='propietario')?'Asesor Externo':'Cliente'}</div></div>`;
  h += `<div style="padding:0 16px 16px"><div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">Nombre</label><input id="ext_nombre" value="${(u.nombre||'').replace(/"/g,'&quot;')}" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:13px;color:var(--tx);background:var(--cd);font-family:inherit"></div>`;
  h += `<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">Email</label><input value="${u.email}" disabled style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:13px;color:var(--sub);background:var(--cd2);font-family:inherit"></div>`;
  h += `<div style="margin-bottom:16px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">Teléfono</label><input id="ext_tel" value="${(u.telefono_contacto||'').replace(/"/g,'&quot;')}" placeholder="573001234567" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:13px;color:var(--tx);background:var(--cd);font-family:inherit"></div>`;
  h += `<button onclick="saveExtCuenta()" style="width:100%;padding:12px;border:none;border-radius:8px;font-size:14px;font-weight:700;background:var(--b600);color:#fff;cursor:pointer;font-family:inherit">💾 Guardar</button>`;
  h += `</div>`;

  // Publish CTA for external users
  if (u.tipo_usuario === 'cliente' || u.tipo_usuario === 'vendedor_externo' || u.tipo_usuario === 'propietario') {
    h += `<div style="margin:0 16px 16px;padding:14px;border-radius:12px;background:var(--b50);border:1.5px solid var(--b200);display:flex;align-items:center;gap:12px;cursor:pointer" onclick="go('publicar')"><div style="font-size:24px">🏠</div><div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--b700)">Publicar inmueble</div><div style="font-size:11px;color:var(--sub)">Publica hasta 3 inmuebles gratis</div></div><span style="color:var(--sub)">→</span></div>`;
  }

  // Payment method link
  h += `<div style="margin:0 16px 16px;padding:14px;border-radius:12px;background:var(--b50);border:1.5px solid var(--b200);display:flex;align-items:center;gap:12px;cursor:pointer" onclick="go('metodo-pago')"><div style="font-size:24px">💳</div><div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--b700)">Método de pago</div><div style="font-size:11px;color:var(--sub)">Configura dónde recibir tus pagos de referidos</div></div><span style="color:var(--sub)">→</span></div>`;

  h += `<div style="padding:16px;text-align:center"><button onclick="logout()" style="padding:10px 20px;border:1.5px solid var(--red);border-radius:8px;font-size:13px;font-weight:700;background:var(--redbg);color:var(--red);cursor:pointer;font-family:inherit">Cerrar sesión</button></div>`;
  h += '</div></div>';
  el.innerHTML = h;
};

window.saveExtCuenta = async function() {
  const u = U(); if (!u) return;
  const nombre = document.getElementById('ext_nombre')?.value || u.nombre;
  const tel = document.getElementById('ext_tel')?.value || '';
  try {
    await SB().from('usuarios').update({ nombre, telefono_contacto: tel }).eq('id', u.id);
    window.userStore.update({ nombre, telefono_contacto: tel });
    window.toast('💾 Guardado');
  } catch(e) { window.toast('Error: ' + e.message, 'terr'); }
};

// --- Mis Publicaciones (asesor externo) con barra de progreso ---
window.rMisPub = async function() {
  const el = document.getElementById('mispubc'); if (!el) return;
  const u = U(); if (!u) return;
  const LIMITE = 3;
  el.innerHTML = '<div style="text-align:center;padding:40px"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';
  try {
    const { data } = await SB().from('inmuebles').select('*,fotos(url,url_thumb,orden)').eq('captador_id', u.id).eq('origen', 'externo').eq('eliminado', false).order('created_at', { ascending: false });
    const items = data || [];
    const pct = Math.min(100, Math.round(items.length / LIMITE * 100));
    const restantes = Math.max(0, LIMITE - items.length);
    const barColor = pct >= 100 ? 'var(--gold)' : pct >= 67 ? '#f59e0b' : '#2563eb';

    let h = '<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;margin-bottom:14px">🏠 Mis Publicaciones</div>';

    // Progress bar
    h += `<div style="background:var(--cd);border:1.5px solid var(--brd);border-radius:12px;padding:14px;margin-bottom:16px">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:13px;font-weight:700">📦 Plan Gratuito</span><span style="font-size:13px;font-weight:800;color:${barColor}">${items.length}/${LIMITE}</span></div>`;
    h += `<div style="height:6px;background:var(--g100);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width .3s"></div></div>`;
    if (restantes > 0) h += `<div style="font-size:11px;color:var(--sub);margin-top:6px">${restantes} publicación${restantes!==1?'es':''} gratuita${restantes!==1?'s':''} restante${restantes!==1?'s':''}</div>`;
    else h += `<div style="font-size:11px;color:#92400e;margin-top:6px;font-weight:600">⚠️ Límite alcanzado — <a href="#" onclick="event.preventDefault();showPaywall(${items.length},${LIMITE})" style="color:#2563eb;text-decoration:underline">Ver Plan Profesional</a></div>`;
    h += `</div>`;

    // Publish button
    if (restantes > 0) h += `<button onclick="go('publicar')" style="margin-bottom:16px;width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:700;background:#2563eb;color:#fff;cursor:pointer;font-family:inherit">➕ Publicar nuevo inmueble</button>`;

    if (!items.length) {
      h += '<div style="text-align:center;padding:30px"><div style="font-size:40px;margin-bottom:10px">📭</div><div style="font-size:15px;font-weight:700;color:var(--tx);margin-bottom:4px">Aún no has publicado inmuebles</div><div style="font-size:13px;color:var(--sub)">Publica tu primer inmueble gratis y llega a cientos de clientes</div></div>';
    }
    items.forEach(p => {
      const rev = p.estado_revision || 'en_revision';
      const revColor = rev === 'aprobado' ? '#065f46' : rev === 'rechazado' ? 'var(--red)' : '#92400e';
      const revBg = rev === 'aprobado' ? 'var(--greenbg)' : rev === 'rechazado' ? 'var(--redbg)' : 'var(--goldbg)';
      const revLabel = rev === 'aprobado' ? '✅ Publicado' : rev === 'rechazado' ? '❌ Rechazado' : '⏳ En revisión';
      const fotos = p.fotos ? [...p.fotos].sort((a,b)=>(a.orden||0)-(b.orden||0)) : [];
      const thumb = fotos.length > 0 ? (fotos[0].url_thumb || fotos[0].url) : '';
      h += `<div style="display:flex;gap:12px;padding:14px;background:var(--cd);border:1.5px solid var(--brd);border-radius:12px;margin-bottom:8px">`;
      if (thumb) h += `<img src="${thumb}" style="width:70px;height:70px;border-radius:8px;object-fit:cover;flex-shrink:0">`;
      else h += `<div style="width:70px;height:70px;border-radius:8px;background:var(--g100);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${emo(p.tipo)}</div>`;
      h += `<div style="flex:1"><div style="font-size:14px;font-weight:800">${emo(p.tipo)} ${p.tipo||''}</div><div style="font-size:12px;color:var(--sub)">📍 ${p.ciudad||''} · ${p.barrio||''}</div>`;
      if (p.precio_arriendo > 0) h += `<div style="font-size:13px;font-weight:700;color:var(--b700)">${fm(p.precio_arriendo)}/mes</div>`;
      if (p.precio_venta > 0) h += `<div style="font-size:13px;font-weight:700">${fm(p.precio_venta)}</div>`;
      h += `<span style="display:inline-block;margin-top:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:${revBg};color:${revColor}">${revLabel}</span>`;
      h += `</div></div>`;
    });

    // Empty slot indicator
    if (items.length > 0 && restantes > 0) {
      h += `<div style="border:2px dashed var(--brd);border-radius:12px;padding:20px;text-align:center;margin-top:8px">`;
      h += `<div style="font-size:13px;color:var(--sub)">Espacio disponible: ${restantes} restante${restantes!==1?'s':''}</div>`;
      h += `<button onclick="go('publicar')" style="margin-top:8px;padding:8px 16px;border:none;border-radius:8px;font-size:12px;font-weight:700;background:var(--b50);color:var(--b700);cursor:pointer;font-family:inherit">➕ Publicar nuevo</button>`;
      h += `</div>`;
    }

    // Plan CTA
    h += `<div style="margin-top:20px;padding:16px;border-top:1px solid var(--brd);text-align:center"><div style="font-size:13px;color:var(--sub);margin-bottom:8px">¿Necesitas más espacio?</div><button onclick="showPaywall(${items.length},${LIMITE})" style="padding:8px 16px;border:1.5px solid var(--b300);border-radius:8px;font-size:12px;font-weight:700;background:var(--cd);color:var(--b700);cursor:pointer;font-family:inherit">📦 Ver Plan Profesional →</button></div>`;

    el.innerHTML = h;
  } catch(e) { el.innerHTML = '<div style="color:var(--red)">Error: ' + e.message + '</div>'; }
};

// --- Wizard Publicar (propietario) ---
window.rPublicar = async function() {
  const el = document.getElementById('publicarc'); if (!el) return;
  const u = U(); if (!u) return;
  const step = window._ownerStep || 1;
  const d = window._ownerData || {};
  const tipos = ['Apartamento','Casa','Finca','Local','Lote','Oficina','Bodega','Penthouse'];
  const ciudades = ['Pereira','Dosquebradas','Santa Rosa de Cabal','Cerritos','Cartago'];
  const LIMITE = 3;

  // Check count
  const { data: existPub } = await SB().from('inmuebles').select('id').eq('captador_id', u.id).eq('origen', 'externo').eq('eliminado', false);
  const usados = (existPub||[]).length;
  if (usados >= LIMITE) { window.showPaywall(usados, LIMITE); return; }
  const numPub = usados + 1;
  const isLast = numPub === LIMITE;

  let h = '';
  // Publication count badge
  h += `<div style="background:${isLast?'var(--goldbg)':'var(--b50)'};border:1.5px solid ${isLast?'var(--yb)':'var(--b200)'};border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">`;
  h += `<span style="font-size:13px;font-weight:700;color:${isLast?'#92400e':'var(--b700)'}">${isLast?'⚠️ Última publicación gratuita':'📦 Publicación '+numPub+' de '+LIMITE+' gratis'}</span>`;
  h += `<div style="flex:1;height:5px;background:var(--g100);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(numPub/LIMITE*100)}%;background:${isLast?'var(--gold)':'var(--b500)'};border-radius:3px"></div></div>`;
  h += `</div>`;

  h += '<div class="card"><div class="cdh"><div class="chl"><div class="chi">🏠</div><div><div class="cht">Publicar Inmueble</div><div class="chsb">Paso ' + step + '/3</div></div></div></div><div class="cdb">';

  // Steps indicator
  h += '<div class="wiz-steps">';
  for (let i = 1; i <= 3; i++) h += `<div class="wiz-step${i<step?' done':''}${i===step?' act':''}"></div>`;
  h += '</div>';

  if (step === 1) {
    h += '<div class="wiz-field"><div class="wiz-label">TIPO DE INMUEBLE</div><div class="wiz-grid">';
    tipos.forEach(t => { h += `<button class="wiz-type-btn${d.tipo===t?' act':''}" onclick="document.querySelectorAll(\'.wiz-type-btn\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\');document.getElementById(\'ow_tipo\').value=\'${t}\'"><span class="wiz-emoji">${emo(t)}</span><span class="wiz-tname">${t}</span></button>`; });
    h += `</div><input type="hidden" id="ow_tipo" value="${d.tipo||''}"></div>`;
    h += `<div class="wiz-field"><div class="wiz-label">¿VENTA, ARRIENDO O AMBOS?</div><select id="ow_neg" class="wiz-input"><option value="">— Selecciona —</option><option value="Venta"${d.negociacion==='Venta'?' selected':''}>💰 Venta</option><option value="Arriendo"${d.negociacion==='Arriendo'?' selected':''}>🔑 Arriendo</option><option value="Venta y Arriendo"${d.negociacion==='Venta y Arriendo'?' selected':''}>💰🔑 Ambos</option></select></div>`;
    h += `<div class="wiz-field" style="display:flex;gap:8px"><div style="flex:1"><div class="wiz-label">PRECIO VENTA</div><input id="ow_pv" type="number" class="wiz-input" placeholder="0" value="${d.precio_venta||''}"></div><div style="flex:1"><div class="wiz-label">PRECIO ARRIENDO</div><input id="ow_pa" type="number" class="wiz-input" placeholder="0" value="${d.precio_arriendo||''}"></div></div>`;
    h += `<div class="wiz-field"><div class="wiz-label">CIUDAD</div><select id="ow_ciudad" class="wiz-input"><option value="">— Selecciona —</option>${ciudades.map(c=>`<option${d.ciudad===c?' selected':''}>${c}</option>`).join('')}</select></div>`;
    h += `<div class="wiz-field"><div class="wiz-label">DIRECCIÓN COMPLETA</div><input id="ow_dir" class="wiz-input" placeholder="Cra 10 #15-30" value="${(d.direccion||'').replace(/"/g,'&quot;')}"></div>`;
    h += `<div class="wiz-field"><div class="wiz-label">BARRIO</div><input id="ow_barrio" class="wiz-input" placeholder="Pinares, Álamos..." value="${(d.barrio||'').replace(/"/g,'&quot;')}"></div>`;
    h += `<div style="display:flex;gap:8px;margin-top:16px"><button onclick="if(ownerSaveStep(1))ownerWizardNext()" style="flex:1;padding:14px;border:none;border-radius:10px;font-size:14px;font-weight:700;background:var(--b600);color:#fff;cursor:pointer;font-family:inherit">Continuar →</button></div>`;

  } else if (step === 2) {
    h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">`;
    h += `<div class="wiz-field"><div class="wiz-label">HABITACIONES</div><input id="ow_hab" type="number" class="wiz-input" value="${d.habitaciones||''}"></div>`;
    h += `<div class="wiz-field"><div class="wiz-label">BAÑOS</div><input id="ow_ban" type="number" class="wiz-input" value="${d.banos||''}"></div>`;
    h += `<div class="wiz-field"><div class="wiz-label">PARQUEADEROS</div><input id="ow_parq" type="number" class="wiz-input" value="${d.parqueaderos||''}"></div>`;
    h += `</div>`;
    h += `<div style="display:flex;gap:8px;margin-bottom:12px"><div class="wiz-field" style="flex:1"><div class="wiz-label">ÁREA (m²)</div><input id="ow_area" type="number" class="wiz-input" value="${d.area_construida||''}"></div><div class="wiz-field" style="flex:1"><div class="wiz-label">ESTRATO</div><select id="ow_est" class="wiz-input"><option value="">—</option>${[1,2,3,4,5,6].map(e=>`<option${d.estrato==e?' selected':''}>${e}</option>`).join('')}</select></div></div>`;
    h += `<div class="wiz-field"><div class="wiz-label">DESCRIPCIÓN (lo que verá el público)</div><textarea id="ow_desc" class="wiz-input" style="min-height:80px;resize:vertical" placeholder="Describe tu inmueble...">${d.descripcion_cliente||''}</textarea></div>`;
    // Photo upload
    h += `<div class="wiz-field"><div class="wiz-label">FOTOS (hasta 10)</div><div id="ow_fotos_zone"></div></div>`;
    // Show existing uploaded photos
    if (d._fotos && d._fotos.length) {
      h += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">`;
      d._fotos.forEach((f,i) => { h += `<div style="position:relative;width:60px;height:60px"><img src="${f.thumb}" style="width:60px;height:60px;object-fit:cover;border-radius:6px"><button onclick="window._ownerData._fotos.splice(${i},1);rPublicar()" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:#fff;border:none;font-size:10px;cursor:pointer;line-height:18px">✕</button></div>`; });
      h += `</div>`;
    }
    h += `<div style="display:flex;gap:8px;margin-top:16px"><button onclick="ownerWizardPrev()" style="flex:1;padding:14px;border:1.5px solid var(--brd);border-radius:10px;font-size:14px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">← Atrás</button><button onclick="if(ownerSaveStep(2))ownerWizardNext()" style="flex:1;padding:14px;border:none;border-radius:10px;font-size:14px;font-weight:700;background:var(--b600);color:#fff;cursor:pointer;font-family:inherit">Continuar →</button></div>`;

  } else if (step === 3) {
    h += `<div style="font-size:14px;font-weight:800;margin-bottom:12px">📋 Resumen</div>`;
    h += `<div style="padding:14px;background:var(--cd2);border:1.5px solid var(--brd);border-radius:10px;margin-bottom:12px">`;
    h += `<div style="font-size:16px;font-weight:800">${emo(d.tipo)} ${d.tipo||'?'}</div>`;
    h += `<div style="font-size:12px;color:var(--sub);margin-top:2px">📍 ${d.barrio||''}, ${d.ciudad||''}</div>`;
    h += `<div style="font-size:12px;color:var(--sub)">${d.negociacion||''}</div>`;
    if (d.precio_venta) h += `<div style="margin-top:6px;font-weight:700">💰 Venta: ${fm(d.precio_venta)}</div>`;
    if (d.precio_arriendo) h += `<div style="font-weight:700">🔑 Arriendo: ${fm(d.precio_arriendo)}/mes</div>`;
    const sp = [];
    if (d.habitaciones) sp.push('🛏️ '+d.habitaciones+' hab');
    if (d.banos) sp.push('🚿 '+d.banos+' baños');
    if (d.area_construida) sp.push('📐 '+d.area_construida+'m²');
    if (d.estrato) sp.push('E'+d.estrato);
    if (sp.length) h += `<div style="margin-top:6px;font-size:12px;color:var(--sub)">${sp.join(' · ')}</div>`;
    if (d.descripcion_cliente) h += `<div style="margin-top:8px;font-size:12px;color:var(--tx);line-height:1.5">"${d.descripcion_cliente}"</div>`;
    h += `</div>`;
    h += `<div style="font-size:11px;color:var(--sub);margin-bottom:14px;text-align:center">Tu inmueble será revisado por nuestro equipo antes de ser publicado.</div>`;
    h += `<div style="display:flex;gap:8px"><button onclick="ownerWizardPrev()" style="flex:1;padding:14px;border:1.5px solid var(--brd);border-radius:10px;font-size:14px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">← Atrás</button><button onclick="ownerPublish()" style="flex:1;padding:14px;border:none;border-radius:10px;font-size:14px;font-weight:700;background:#065f46;color:#fff;cursor:pointer;font-family:inherit">🏠 Enviar para revisión</button></div>`;
  }

  h += '</div></div>';
  el.innerHTML = h;

  // Init photo upload zone on step 2
  if (step === 2 && typeof window.initFotoUpload === 'function') {
    if (!d._fotos) d._fotos = [];
    window.initFotoUpload('ow_fotos_zone', (result) => {
      d._fotos.push(result);
    }, d._fotos.length);
  }
};

// --- Espera (pendiente approval) ---
window.rEspera = function() {
  const el = document.getElementById('esperac'); if (!el) return;
  el.innerHTML = `<div style="font-size:48px;margin-bottom:16px">⏳</div>
    <div style="font-family:Fraunces,serif;font-size:22px;font-weight:800;margin-bottom:8px">Tu solicitud está en revisión</div>
    <div style="font-size:14px;color:var(--sub);line-height:1.6;margin-bottom:20px">Nuestro equipo revisará tu solicitud y te notificaremos cuando esté aprobada. Esto normalmente toma menos de 24 horas.</div>
    <a href="#/portafolio" onclick="document.getElementById('lov')&&(document.getElementById('lov').style.display='none')" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:16px">🔍 Explorar inmuebles mientras esperas</a>
    <div style="padding:16px;background:var(--cd2);border:1.5px solid var(--brd);border-radius:12px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:700;color:var(--sub);margin-bottom:4px">¿Preguntas?</div>
      <div style="font-size:13px;color:var(--tx);margin-top:6px">📱 Llamarnos: <a href="tel:+573105922763" style="color:var(--b600);font-weight:700">310 592 2763</a></div>
      <div style="font-size:13px;color:var(--tx);margin-top:4px">💬 WhatsApp: <a href="https://wa.me/573105922763" target="_blank" style="color:#25d366;font-weight:700">Enviar mensaje</a></div>
    </div>
    <button onclick="logout()" style="padding:10px 20px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">Cerrar sesión</button>`;
};

// --- Modify rUsers: add Solicitudes tab ---
const _origRUsers = window.rUsers;
window._usersTab = 'equipo';

window.rUsers = async function() {
  const el = document.getElementById('usrl'); if (!el) return;
  const u = U(); if (!u || u.rol !== 'admin') return;

  // Count pending
  const { data: pendingRegs } = await SB().from('registro_solicitudes').select('id').eq('estado', 'pendiente');
  const { data: pendingInm } = await SB().from('inmuebles').select('id').eq('estado_revision', 'en_revision').eq('origen', 'externo');
  const pendCount = ((pendingRegs||[]).length) + ((pendingInm||[]).length);

  // Tabs
  let h = `<div style="display:flex;gap:6px;margin-bottom:14px">`;
  h += `<button onclick="window._usersTab='equipo';rUsers()" style="padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;border:1.5px solid ${window._usersTab==='equipo'?'var(--b600)':'var(--brd)'};background:${window._usersTab==='equipo'?'var(--b600)':'var(--cd)'};color:${window._usersTab==='equipo'?'#fff':'var(--tx)'};cursor:pointer;font-family:inherit">👥 Equipo</button>`;
  h += `<button onclick="window._usersTab='solicitudes';rUsers()" style="padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;border:1.5px solid ${window._usersTab==='solicitudes'?'var(--b600)':'var(--brd)'};background:${window._usersTab==='solicitudes'?'var(--b600)':'var(--cd)'};color:${window._usersTab==='solicitudes'?'#fff':'var(--tx)'};cursor:pointer;font-family:inherit">📨 Solicitudes${pendCount>0?' ('+pendCount+')':''}</button>`;
  h += `</div>`;

  if (window._usersTab === 'equipo') {
    // Original users list
    const { data } = await SB().from('usuarios').select('*').order('nombre');
    if (!data) { el.innerHTML = h + '<div class="emp"><span class="emp-i">❌</span></div>'; return; }
    h += data.map(u2 => {
      const act=u2.activo, rol=u2.rol||'asesor';
      const isGestor = u2.es_gestor_arriendos === true;
      const displayRol = isGestor ? 'Gestor Arriendos' : rol;
      const rolColor = rol==='admin' ? 'background:rgba(139,92,246,.1);color:var(--purple)' : rol==='oficina' ? 'background:var(--goldbg);color:#92400e' : isGestor ? 'background:#065f4615;color:#065f46' : u2.tipo_usuario==='cliente'?'background:var(--b50);color:var(--b500)':(u2.tipo_usuario==='vendedor_externo'||u2.tipo_usuario==='propietario')?'background:#065f4615;color:#065f46':'background:var(--b50);color:var(--b700)';
      const gestorBadge = isGestor ? '<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:#065f4615;color:#065f46;border:1px solid #065f4630;font-weight:700;margin-left:4px">🔑 Gestor</span>' : '';
      const externoBadge = u2.tipo_usuario==='cliente'?' <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--b50);color:var(--b500);border:1px solid var(--b200);font-weight:700">Cliente</span>':(u2.tipo_usuario==='vendedor_externo'||u2.tipo_usuario==='propietario')?' <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:#065f4615;color:#065f46;border:1px solid #065f4630;font-weight:700">Asesor Ext.</span>':'';
      const toggleBtn = rol!=='admin' ? `<button onclick="tUsr('${u2.id}',${act})" style="padding:5px 12px;border-radius:14px;font-size:10px;font-weight:700;border:1.5px solid ${act?'var(--green)':'var(--red)'};background:${act?'var(--greenbg)':'var(--redbg)'};color:${act?'#065f46':'var(--red)'};cursor:pointer;font-family:inherit">${act?'✅ Activo':'🔒 Bloqueado'}</button>` : '';
      // Admin can upgrade cliente/pendiente to vendedor_externo
      const upgradeBtn = (u2.tipo_usuario==='cliente'||u2.tipo_usuario==='pendiente') ? `<button onclick="aprobarRegistro('${u2.id}','vendedor_externo')" style="padding:5px 8px;border-radius:14px;font-size:9px;font-weight:700;border:1.5px solid #065f46;background:#065f4615;color:#065f46;cursor:pointer;font-family:inherit;margin-left:4px">🏢 Hacer asesor</button>` : '';
      return `<div class="uc"><img src="${u2.foto||''}" onerror="this.style.display='none'" style="width:36px;height:36px;border-radius:50%;object-fit:cover"><div class="ui"><div class="uinm">${u2.nombre}${gestorBadge}${externoBadge}</div><div class="uiem">${u2.usuario||u2.email||''}</div></div><span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:2px 7px;border-radius:4px;${rolColor}">${displayRol}</span>${toggleBtn}${upgradeBtn}</div>`;
    }).join('');
  } else {
    // Solicitudes tab
    // Pending registrations
    const { data: regs } = await SB().from('registro_solicitudes').select('*,usuario:usuarios(id,nombre,email,foto,telefono_contacto)').eq('estado', 'pendiente').order('created_at', { ascending: false });
    if (regs && regs.length) {
      h += `<div style="font-size:12px;font-weight:800;color:var(--sub);margin-bottom:8px">👤 SOLICITUDES DE REGISTRO</div>`;
      regs.forEach(r => {
        const usr = r.usuario;
        h += `<div style="padding:14px;background:var(--cd);border:1.5px solid var(--brd);border-left:4px solid var(--gold);border-radius:10px;margin-bottom:8px">`;
        h += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">`;
        if (usr?.foto) h += `<img src="${usr.foto}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">`;
        h += `<div style="flex:1"><div style="font-size:14px;font-weight:800">${usr?.nombre||'?'}</div><div style="font-size:11px;color:var(--sub)">${usr?.email||''}</div></div></div>`;
        h += `<div style="font-size:12px;color:var(--sub);margin-bottom:4px">🏠 Quiere: <b>${r.tipo_solicitado}</b></div>`;
        if (r.descripcion) h += `<div style="font-size:12px;color:var(--tx);margin-bottom:8px;padding:8px;background:var(--cd2);border-radius:6px">"${r.descripcion}"</div>`;
        h += `<div style="display:flex;gap:6px"><button onclick="aprobarRegistro('${usr?.id}','${r.tipo_solicitado}')" style="padding:6px 14px;border:none;border-radius:6px;font-size:11px;font-weight:700;background:#065f46;color:#fff;cursor:pointer;font-family:inherit">✅ Aprobar</button><button onclick="rechazarRegistro('${usr?.id}')" style="padding:6px 14px;border:1.5px solid var(--red);border-radius:6px;font-size:11px;font-weight:700;background:var(--redbg);color:var(--red);cursor:pointer;font-family:inherit">❌ Rechazar</button></div>`;
        h += `</div>`;
      });
    }

    // Pending inmuebles
    const { data: inmExt } = await SB().from('inmuebles').select('*,captador:usuarios!captador_id(nombre,email,foto)').eq('estado_revision', 'en_revision').eq('origen', 'externo').order('created_at', { ascending: false });
    if (inmExt && inmExt.length) {
      h += `<div style="font-size:12px;font-weight:800;color:var(--sub);margin-top:14px;margin-bottom:8px">🏠 INMUEBLES EN REVISIÓN</div>`;
      inmExt.forEach(p => {
        h += `<div style="padding:14px;background:var(--cd);border:1.5px solid var(--brd);border-left:4px solid var(--gold);border-radius:10px;margin-bottom:8px">`;
        h += `<div style="font-size:14px;font-weight:800">${emo(p.tipo)} ${p.tipo||''} — ${p.ciudad||''}</div>`;
        h += `<div style="font-size:12px;color:var(--sub)">📍 ${p.barrio||''} · ${p.direccion||''}</div>`;
        if (p.precio_arriendo > 0) h += `<div style="font-size:13px;font-weight:700;color:var(--b700)">🔑 ${fm(p.precio_arriendo)}/mes</div>`;
        if (p.precio_venta > 0) h += `<div style="font-size:13px;font-weight:700">💰 ${fm(p.precio_venta)}</div>`;
        h += `<div style="font-size:11px;color:var(--sub);margin-top:4px">👤 Subido por: ${p.captador?.nombre||'?'}</div>`;
        h += `<div style="display:flex;gap:6px;margin-top:8px">`;
        h += `<button onclick="aprobarInmuebleExterno('${p.id}')" style="padding:6px 14px;border:none;border-radius:6px;font-size:11px;font-weight:700;background:#065f46;color:#fff;cursor:pointer;font-family:inherit">✅ Aprobar y publicar</button>`;
        h += `<button onclick="rechazarInmuebleExterno('${p.id}')" style="padding:6px 14px;border:1.5px solid var(--red);border-radius:6px;font-size:11px;font-weight:700;background:var(--redbg);color:var(--red);cursor:pointer;font-family:inherit">❌ Rechazar</button>`;
        h += `</div></div>`;
      });
    }

    if ((!regs||!regs.length) && (!inmExt||!inmExt.length)) {
      h += '<div style="text-align:center;padding:30px"><div style="font-size:32px;margin-bottom:8px">✅</div><p style="color:var(--sub)">No hay solicitudes pendientes</p></div>';
    }
  }

  el.innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════
// REFERRAL PROGRAM — Form Wizard + Pipeline View
// ══════════════════════════════════════════════════════════════════

// Entry point: includes desplegables + wizard
window.renderReferralForm = function() {
  const el = document.getElementById('sec-referir-content'); if (!el) return;
  const hasRefs = (window._mrefCount || 0) > 0;
  let h = '';
  h += window.renderHowItWorks(!hasRefs);
  h += window.renderReferralPolicies();
  h += window.renderReferralStrategies();
  h += '<div style="border-top:2px solid var(--brd);margin:8px 0 20px;position:relative"><div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--cd);padding:0 12px;font-size:12px;font-weight:700;color:var(--b600)">📝 Registrar referido</div></div>';
  h += '<div id="sec-referir-wizard"></div>';
  el.innerHTML = h;
  _renderRefWizard();
};

// The actual wizard form
function _renderRefWizard() {
  const el = document.getElementById('sec-referir-wizard'); if (!el) return;
  const step = window._refStep || 1;
  const d = window._refData || {};
  let h = '';

  // Progress indicator
  h += '<div style="display:flex;gap:8px;align-items:center;justify-content:center;margin-bottom:20px">';
  h += '<div style="display:flex;align-items:center;gap:4px"><div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;' + (step >= 1 ? 'background:var(--b600);color:#fff' : 'background:var(--g200);color:var(--sub)') + '">1</div><span style="font-size:11px;font-weight:600;color:' + (step >= 1 ? 'var(--b600)' : 'var(--sub)') + '">Propietario</span></div>';
  h += '<div style="width:40px;height:2px;background:' + (step >= 2 ? 'var(--b600)' : 'var(--g200)') + '"></div>';
  h += '<div style="display:flex;align-items:center;gap:4px"><div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;' + (step >= 2 ? 'background:var(--b600);color:#fff' : 'background:var(--g200);color:var(--sub)') + '">2</div><span style="font-size:11px;font-weight:600;color:' + (step >= 2 ? 'var(--b600)' : 'var(--sub)') + '">Inmueble</span></div>';
  h += '</div>';

  if (step === 1) {
    h += '<div style="text-align:center;margin-bottom:20px"><div style="font-size:40px;margin-bottom:8px">🤝</div><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700">¿Quién es el propietario?</div></div>';
    h += '<div class="ff"><label class="ffl">Nombre del propietario <span class="ffr">*</span></label><input class="ffi" id="ref_prop_nom" placeholder="Ana María López" value="' + (d.propNombre || '').replace(/"/g, '&quot;') + '"></div>';
    h += '<div class="ff"><label class="ffl">Teléfono del propietario <span class="ffr">*</span></label><div style="display:flex;gap:6px;align-items:center"><span style="font-size:13px;font-weight:700;color:var(--sub);padding:8px 10px;background:var(--cd2);border:1.5px solid var(--brd);border-radius:8px 0 0 8px;white-space:nowrap">+57</span><input class="ffi" id="ref_prop_tel" type="tel" placeholder="300 123 4567" style="border-radius:0 8px 8px 0;flex:1" value="' + (d.propTelefono || '') + '"></div></div>';
    h += '<div class="ff"><label class="ffl">Email (opcional)</label><input class="ffi" id="ref_prop_email" type="email" placeholder="correo@mail.com" value="' + (d.propEmail || '') + '"></div>';
    h += '<div class="ff"><label class="ffl">¿Cómo lo encontraste? <span class="ffr">*</span></label><select class="esel" id="ref_como" style="width:100%;font-size:13px;padding:10px"><option value="">— Selecciona —</option>';
    [['aviso_ventana','🪟 Vi aviso en ventana/balcón'],['aviso_poste','📋 Vi aviso en poste/muro'],['conocido','👤 Conocido, amigo o familiar'],['administrador','🏢 Soy administrador de conjunto/edificio'],['celador','🛡️ Soy celador/vigilante de conjunto'],['redes','📱 Redes sociales'],['otro','💬 Otro']].forEach(o => { h += '<option value="' + o[0] + '"' + (d.comoEncontro === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
    h += '</select></div>';
    h += '<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;text-align:center"><div style="font-size:13px;font-weight:700;color:#065f46;margin-bottom:4px">💡 ¿Sabías?</div><div style="font-size:12px;color:#065f46">Un apartamento de $2.500.000/mes te genera <strong>$250.000</strong> de comisión.</div></div>';
    h += '<button class="bt bp" style="width:100%;padding:14px;font-size:14px" onclick="refNext()">Continuar → Datos del inmueble</button>';
  } else {
    h += '<div style="text-align:center;margin-bottom:20px"><div style="font-size:40px;margin-bottom:8px">🏠</div><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700">¿Cómo es el inmueble?</div><div style="font-size:12px;color:var(--sub);margin-top:6px">No necesitas ser preciso. Nuestro equipo verificará.</div></div>';
    // Type chips
    h += '<div class="ff"><label class="ffl">Tipo</label><div style="display:flex;flex-wrap:wrap;gap:6px">';
    [['Apartamento','🏢'],['Casa','🏡'],['Local','🏪'],['Oficina','💼'],['Bodega','🏭'],['Finca','🌾']].forEach(tp => {
      const sel = d.tipo === tp[0];
      h += '<div onclick="window._refData.tipo=\'' + tp[0] + '\';renderReferralForm()" style="padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid ' + (sel ? 'var(--b600)' : 'var(--brd)') + ';background:' + (sel ? 'var(--b600)' : 'transparent') + ';color:' + (sel ? '#fff' : 'var(--tx)') + '">' + tp[1] + ' ' + tp[0] + '</div>';
    });
    h += '</div></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="ff"><label class="ffl">Ciudad</label><input class="ffi" id="ref_ciudad" placeholder="Pereira" value="' + (d.ciudad || '').replace(/"/g, '&quot;') + '"></div><div class="ff"><label class="ffl">Barrio</label><input class="ffi" id="ref_barrio" placeholder="Pinares" value="' + (d.barrio || '').replace(/"/g, '&quot;') + '"></div></div>';
    h += '<div class="ff"><label class="ffl">Dirección aproximada</label><input class="ffi" id="ref_dir" placeholder="Cerca al centro comercial..." value="' + (d.direccion || '').replace(/"/g, '&quot;') + '"></div>';
    h += '<div class="ff"><label class="ffl">Canon aproximado (mensual)</label><input class="ffi" id="ref_canon" type="number" inputmode="numeric" placeholder="2500000" value="' + (d.canon || '') + '" oninput="refUpdateCalc()"></div>';
    h += '<div id="refCalcBox"></div>';
    h += '<div class="ff"><label class="ffl">Notas</label><textarea class="ffi" id="ref_notas" style="min-height:60px;resize:vertical" placeholder="Ej: El propietario quiere arrendar rápido...">' + (d.notas || '') + '</textarea></div>';
    h += '<div class="ff"><label class="ffl">📸 Foto del aviso (opcional)</label><div id="refFotoUp"></div>';
    if (d.fotoUrl) h += '<div style="margin-top:6px"><img src="' + d.fotoUrl + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px"></div>';
    h += '</div>';
    h += '<div style="display:flex;gap:8px;margin-top:16px"><button class="bt bs2" style="flex:1;padding:14px" onclick="refPrev()">← Atrás</button><button class="bt bp" style="flex:2;padding:14px;font-size:14px" onclick="refSubmit()">🤝 Enviar referido</button></div>';
  }
  el.innerHTML = h;
  if (step === 2) {
    if (typeof window.initFotoUpload === 'function') window.initFotoUpload('refFotoUp', r => { window._refData.fotoUrl = r.url; window._refData.fotoHash = r.hash || null; }, 0);
    window.refUpdateCalc();
  }
};

// --- Pipeline: Mis referidos ---
window.renderMisReferidos = async function() {
  const el = document.getElementById('sec-misref-content'); if (!el) return;
  const u = U(); if (!u) return;
  el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--sub)">Cargando referidos...</div>';

  const isAdmin = u.rol === 'admin' || u.rol === 'oficina';

  // Query ALL referidos (unfiltered) for KPIs/stats
  let qAll = SB().from('referidos').select('*,referidor:usuarios!referidor_id(id,nombre,foto,usuario,email,telefono_contacto),inmueble:inmuebles!inmueble_id(id,tipo,ciudad,barrio,precio_arriendo,estado,codigo_house)').order('created_at', { ascending: false });
  if (!isAdmin) qAll = qAll.eq('referidor_id', u.id);
  const { data: allRefs, error } = await qAll;
  if (error) { el.innerHTML = '<div class="emp"><span class="emp-i">❌</span><h3>Error</h3><p>' + error.message + '</p></div>'; return; }
  const all = allRefs || [];

  // Apply filter client-side for the displayed list
  let filtered = all;
  if (window._refFiltro && window._refFiltro !== 'todos') {
    if (window._refFiltro === 'en_proceso') filtered = all.filter(r => r.estado === 'registrado' || r.estado === 'verificando');
    else filtered = all.filter(r => r.estado === window._refFiltro);
  }

  // Stats (always from ALL, not filtered)
  const activos = all.filter(r => !['rechazado'].includes(r.estado));
  const bonos = all.filter(r => r.bono_pagado).reduce((s, r) => s + (r.bono_monto || 0), 0);
  const comPagadas = all.filter(r => r.comision_pagada).reduce((s, r) => s + (r.comision_monto || 0), 0);
  const comPend = all.filter(r => r.estado === 'arrendado' && !r.comision_pagada).reduce((s, r) => s + (r.comision_monto || 0), 0);
  const totalGanado = bonos + comPagadas;

  let h = '';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><div><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700">' + (isAdmin ? '🤝 Todos los referidos' : '💰 Mis referidos') + '</div></div><button class="bt bp" style="font-size:12px;padding:8px 16px" onclick="go(\'referir\')">+ Referir</button></div>';

  // Gamification level card (for referrers, not admin)
  if (!isAdmin && typeof window.renderGamificationCard === 'function') {
    h += window.renderGamificationCard(all);
  }

  // KPIs — Commission dashboard for referrers, basic KPIs for admin
  if (!isAdmin && typeof window.renderCommissionDashboard === 'function') {
    h += window.renderCommissionDashboard({ total: all.length, activos: activos.length, arrendados: all.filter(r => r.estado === 'arrendado').length, rechazados: all.filter(r => r.estado === 'rechazado').length, bonosCobrados: bonos, comisionesCobradas: comPagadas, comisionesPendientes: comPend, totalGanado: totalGanado }, all);
  } else {
    const _rc = (estado) => "window._refFiltro='" + estado + "';renderMisReferidos()";
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-bottom:16px">';
    h += '<div class="dc" style="cursor:pointer" onclick="' + _rc('todos') + '"><div class="dn2" style="color:var(--b700)">' + all.length + '</div><div class="dl">Total</div></div>';
    h += '<div class="dc" style="cursor:pointer;border-color:var(--gold)" onclick="' + _rc('en_proceso') + '"><div class="dn2" style="color:var(--gold)">' + all.filter(r => r.estado === 'registrado' || r.estado === 'verificando').length + '</div><div class="dl">En proceso</div></div>';
    h += '<div class="dc" style="cursor:pointer;border-color:var(--b600)" onclick="' + _rc('contrato_firmado') + '"><div class="dn2" style="color:var(--b600)">' + all.filter(r => r.estado === 'contrato_firmado').length + '</div><div class="dl">Contrato</div></div>';
    h += '<div class="dc" style="cursor:pointer;border-color:var(--green)" onclick="' + _rc('arrendado') + '"><div class="dn2" style="color:var(--green)">' + all.filter(r => r.estado === 'arrendado').length + '</div><div class="dl">Arrendados</div></div>';
    h += '<div class="dc" style="cursor:pointer;border-color:var(--red)" onclick="' + _rc('rechazado') + '"><div class="dn2" style="color:var(--red)">' + all.filter(r => r.estado === 'rechazado').length + '</div><div class="dl">Rechazados</div></div>';
    if (comPend > 0) h += '<div class="dc" style="border-color:var(--gold)"><div class="dn2" style="color:var(--gold)">' + fm(comPend) + '</div><div class="dl">Por pagar</div></div>';
    h += '</div>';
  }

  // Filters
  window._refFiltro = window._refFiltro || 'todos';
  h += '<div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:8px;margin-bottom:12px">';
  [['todos','Todos',all.length],['registrado','En proceso',all.filter(r=>r.estado==='registrado').length],['verificando','Verificando',all.filter(r=>r.estado==='verificando').length],['contrato_firmado','Contrato prop.',all.filter(r=>r.estado==='contrato_firmado').length],['publicado','Publicados',all.filter(r=>r.estado==='publicado').length],['arrendado','Arrendados',all.filter(r=>r.estado==='arrendado').length],['rechazado','Rechazados',all.filter(r=>r.estado==='rechazado').length]].forEach(f => {
    const act = window._refFiltro === f[0];
    h += '<div onclick="window._refFiltro=\'' + f[0] + '\';renderMisReferidos()" style="padding:6px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;background:' + (act ? 'var(--b600)' : 'var(--g100)') + ';color:' + (act ? '#fff' : 'var(--sub)') + '">' + f[1] + (f[2] > 0 ? ' (' + f[2] + ')' : '') + '</div>';
  });
  h += '</div>';

  const EC = { registrado: { c: 'var(--sub)', l: 'En proceso', i: '📝', s: 1 }, verificando: { c: 'var(--gold)', l: 'Verificando', i: '🔍', s: 2 }, contrato_firmado: { c: 'var(--b600)', l: 'Contrato propietario', i: '📄', s: 3 }, publicado: { c: 'var(--b700)', l: 'Publicado', i: '📢', s: 4 }, arrendado: { c: 'var(--green)', l: '¡Arrendado!', i: '🎉', s: 5 }, rechazado: { c: 'var(--red)', l: 'Rechazado', i: '❌', s: 0 } };

  // Cards (use filtered list, not all)
  filtered.forEach(r => {
    const cfg = EC[r.estado] || EC.registrado;
    const canon = r.inmueble?.precio_arriendo || r.canon_real || r.canon_aproximado || 0;
    const comNeta = Math.max(0, Math.round(canon * (r.comision_porcentaje || 0.10)) - (r.bono_monto || 50000));
    const dias = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);

    h += '<div style="background:var(--cd);border:1px solid var(--brd);border-left:4px solid ' + cfg.c + ';border-radius:0 12px 12px 0;margin-bottom:10px;overflow:hidden">';
    // Header
    h += '<div style="padding:14px 14px 8px;display:flex;align-items:flex-start;gap:10px"><div style="font-size:24px">' + (emo(r.tipo_inmueble) || '🏠') + '</div><div style="flex:1;min-width:0">';
    h += '<div style="font-size:14px;font-weight:700">' + (r.tipo_inmueble || 'Inmueble') + ' · ' + (r.barrio || r.ciudad || '?') + '</div>';
    h += '<div style="font-size:11px;color:var(--sub)">Canon: ' + (canon > 0 ? fm(canon) + '/mes' : 'Por definir') + ' · Propietario: ' + r.propietario_nombre + '</div>';
    if (isAdmin && r.referidor) h += '<div style="font-size:10px;color:var(--b600);font-weight:700;margin-top:3px">Referido por: ' + r.referidor.nombre + ' · hace ' + dias + 'd</div>';
    if (!isAdmin) h += '<div style="font-size:10px;color:var(--sub);margin-top:2px">Hace ' + dias + ' días</div>';
    h += '</div><span style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;background:' + cfg.c + '15;color:' + cfg.c + ';border:1px solid ' + cfg.c + '30">' + cfg.i + ' ' + cfg.l + '</span></div>';

    // Progress bar
    if (r.estado !== 'rechazado') {
      h += '<div style="padding:4px 14px 6px;display:flex;gap:3px">';
      [1,2,3,4,5].forEach(s => { h += '<div style="height:4px;flex:1;border-radius:2px;background:' + (s <= cfg.s ? cfg.c : 'var(--g200)') + '"></div>'; });
      h += '</div>';
    }
    if (r.estado === 'rechazado' && r.motivo_rechazo) h += '<div style="padding:6px 14px;font-size:11px;color:var(--red);background:var(--redbg);margin:0 10px 8px;border-radius:6px">❌ ' + r.motivo_rechazo + '</div>';

    // Comisiones
    h += '<div style="padding:4px 14px 10px;display:flex;gap:14px;font-size:11px;flex-wrap:wrap">';
    if (r.bono_pagado) h += '<span style="color:var(--green);font-weight:600">✅ Bono: ' + fm(r.bono_monto) + '</span>';
    else if (r.estado !== 'rechazado') h += '<span style="color:var(--sub)">⏳ Bono: ' + fm(r.bono_monto || 50000) + ' pendiente</span>';
    if (r.estado === 'arrendado') h += '<span style="color:' + (r.comision_pagada ? 'var(--green)' : 'var(--gold)') + ';font-weight:600">' + (r.comision_pagada ? '✅' : '⏳') + ' Comisión: ' + fm(comNeta) + (r.comision_pagada ? ' pagada' : ' pendiente') + '</span>';
    else if (cfg.s >= 3 && r.estado !== 'rechazado' && canon > 0) h += '<span style="color:var(--sub)">💰 Potencial: ' + fm(comNeta) + '</span>';
    h += '</div>';

    // Referidor action: send proposal
    if (!isAdmin && ['registrado','verificando','contrato_firmado','publicado'].includes(r.estado)) {
      h += '<div style="padding:6px 14px 12px;border-top:1px solid var(--g100)">';
      h += '<div style="display:flex;gap:4px;align-items:center;margin-bottom:6px"><span style="font-size:10px;color:var(--sub);white-space:nowrap">📞 Tel:</span><input id="refTel_' + r.id + '" value="' + (r.propietario_telefono || '') + '" style="flex:1;padding:5px 8px;border:1.5px solid var(--brd);border-radius:6px;font-size:11px;font-family:inherit;color:var(--tx);background:var(--cd)" onchange="actualizarTelReferido(\'' + r.id + '\',this.value)"><button style="padding:5px 8px;border:1.5px solid var(--brd);border-radius:6px;font-size:10px;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit" onclick="actualizarTelReferido(\'' + r.id + '\',document.getElementById(\'refTel_' + r.id + '\').value)">💾</button></div>';
      h += '<div style="display:flex;gap:4px"><button class="bt bs2" style="flex:1;font-size:10px;padding:7px" onclick="compartirPropuestaPropietario({propietario_nombre:\'' + (r.propietario_nombre || '').replace(/'/g, "\\'") + '\',propietario_telefono:document.getElementById(\'refTel_' + r.id + '\').value})">💬 WhatsApp</button><button class="bt bs2" style="flex:1;font-size:10px;padding:7px" onclick="copiarPropuesta(\'' + (r.propietario_nombre || '').replace(/'/g, "\\'") + '\')">📋 Copiar texto</button></div>';
      h += '</div>';
    }

    // Admin actions
    if (isAdmin) {
      // Notes
      h += '<div style="padding:6px 14px;border-top:1px solid var(--g100)"><details><summary style="font-size:11px;font-weight:600;color:var(--sub);cursor:pointer">📝 Notas internas' + (r.notas_admin ? ' ✓' : '') + '</summary><textarea class="ffi" id="nota_' + r.id + '" style="margin-top:6px;min-height:50px;font-size:11px">' + (r.notas_admin || '') + '</textarea><button class="bt bs2" style="margin-top:4px;font-size:10px;padding:4px 10px" onclick="guardarNotasAdmin(\'' + r.id + '\',document.getElementById(\'nota_' + r.id + '\').value)">Guardar</button></details></div>';

      if (r.estado === 'registrado') {
        h += '<div style="padding:8px 14px 12px;border-top:1px solid var(--g100);display:flex;gap:6px"><button style="flex:1;padding:10px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:var(--gold);color:#fff;font-family:inherit;cursor:pointer" onclick="iniciarVerificacion(\'' + r.id + '\').then(()=>renderMisReferidos())">🔍 Verificar</button><button style="padding:10px 14px;border:1.5px solid var(--rb);border-radius:8px;font-size:11px;font-weight:700;background:var(--redbg);color:var(--red);font-family:inherit;cursor:pointer" onclick="rechazarConMotivo(\'' + r.id + '\').then(()=>renderMisReferidos())">❌</button></div>';
      }
      if (r.estado === 'verificando') {
        h += '<div style="padding:8px 14px 12px;border-top:1px solid var(--g100);display:flex;gap:6px"><button style="flex:1;padding:10px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:var(--green);color:#fff;font-family:inherit;cursor:pointer" onclick="aprobarReferido(\'' + r.id + '\').then(()=>renderMisReferidos())">✅ Aprobar + Bono $50K</button><button style="padding:10px 14px;border:1.5px solid var(--rb);border-radius:8px;font-size:11px;font-weight:700;background:var(--redbg);color:var(--red);font-family:inherit;cursor:pointer" onclick="rechazarConMotivo(\'' + r.id + '\').then(()=>renderMisReferidos())">❌</button></div>';
      }
      if (r.estado === 'contrato_firmado' && !r.inmueble_id) {
        h += '<div style="padding:8px 14px 12px;border-top:1px solid var(--g100)"><div style="font-size:11px;color:var(--sub);margin-bottom:6px">Vincular con inmueble:</div><div style="display:flex;gap:6px"><input class="ffi" id="vinc_' + r.id + '" placeholder="HOUSE-XXX o UUID" style="flex:1;font-size:11px"><button class="bt bp" style="font-size:11px;padding:8px 14px" onclick="vincularPorCodigo(\'' + r.id + '\')">Vincular</button></div></div>';
      }
      if (r.estado === 'arrendado' && !r.comision_pagada) {
        h += '<div style="padding:8px 14px 12px;border-top:1px solid var(--g100)"><button style="width:100%;padding:10px;border:none;border-radius:8px;font-size:12px;font-weight:700;background:var(--b600);color:#fff;font-family:inherit;cursor:pointer" onclick="marcarComisionPagada(\'' + r.id + '\').then(()=>renderMisReferidos())">💰 Marcar comisión pagada (' + fm(comNeta) + ')</button></div>';
      }
      // WhatsApp links
      h += '<div style="padding:4px 14px 12px;display:flex;gap:6px"><a href="https://wa.me/57' + (r.propietario_telefono || '').replace(/^57/, '') + '" target="_blank" style="flex:1;padding:6px;border:1px solid var(--brd);border-radius:6px;font-size:10px;text-align:center;text-decoration:none;color:var(--tx)">📞 Propietario</a>';
      if (r.referidor?.telefono_contacto) h += '<a href="https://wa.me/57' + (r.referidor.telefono_contacto || '').replace(/^57/, '') + '" target="_blank" style="flex:1;padding:6px;border:1px solid var(--brd);border-radius:6px;font-size:10px;text-align:center;text-decoration:none;color:var(--tx)">📞 Referidor</a>';
      h += '</div>';
    }
    h += '</div>';
  });

  if (!filtered.length) {
    if (all.length > 0) {
      h += '<div class="emp"><span class="emp-i">📋</span><h3>Sin referidos en este estado</h3><button class="bt bs2" style="margin-top:8px" onclick="window._refFiltro=\'todos\';renderMisReferidos()">Ver todos</button></div>';
    } else {
      h += '<div class="emp"><span class="emp-i">🤝</span><h3>Aún no tienes referidos</h3><p style="font-size:12px;color:var(--sub)">¿Conoces un inmueble en arriendo? Refierelo y gana hasta 10% del canon.</p><button class="bt bp" style="margin-top:10px" onclick="go(\'referir\')">🤝 Referir mi primer inmueble</button></div>';
    }
  }

  // Desplegables informativos al final
  h += '<div style="margin-top:20px">';
  h += window.renderHowItWorks(false);
  h += window.renderReferralPolicies();
  h += window.renderReferralStrategies();
  h += '</div>';

  // Store ref count for renderReferralForm open state
  window._mrefCount = all.length;

  el.innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════
// LANDING PAGE: /propietarios — Beneficios para propietarios
// ══════════════════════════════════════════════════════════════════

window.renderPropietariosLanding = function() {
  const el = document.getElementById('propietariosc'); if (!el) return;
  const waTel = '573105922763';
  const waMsg = encodeURIComponent('Hola, soy propietario y quiero conocer más sobre el servicio de administración de arriendo.');

  let h = '';

  // Header
  h += '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 20px;text-align:center;color:#fff;border-radius:0 0 20px 20px">';
  h += '<img src="/img/logo.png" style="height:48px;margin-bottom:12px" onerror="this.style.display=\'none\'">';
  h += '<div style="font-family:Fraunces,serif;font-size:26px;font-weight:800;line-height:1.2;margin-bottom:8px">Arrienda tu inmueble<br>sin preocupaciones</div>';
  h += '<div style="font-size:14px;opacity:.9;margin-bottom:16px">Nosotros nos encargamos de todo. Tú solo recibes tu plata cada mes.</div>';
  h += '<div style="font-size:12px;opacity:.7">📍 Cl. 14 #14-09, Pereira · Risaralda</div>';
  h += '</div>';

  // Office photo
  h += '<div style="padding:20px 16px 0">';
  h += '<div style="position:relative;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12);border:1.5px solid var(--brd)">';
  h += '<img src="/img/oficina.png" alt="Oficina Inmobiliaria House" style="width:100%;height:auto;display:block" onerror="this.parentElement.style.display=\'none\'">';
  h += '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.75));padding:20px 16px 14px;color:#fff">';
  h += '<div style="font-family:Fraunces,serif;font-size:16px;font-weight:800">📍 Visítenos en nuestra oficina</div>';
  h += '<div style="font-size:12px;opacity:.95;margin-top:2px">Cl. 14 #14-09, Pereira · Risaralda</div>';
  h += '</div></div></div>';

  // Energy savings flow — antes vs después
  h += '<div style="padding:24px 16px 8px">';
  h += '<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;text-align:center;margin-bottom:6px;color:var(--tx)">⚡ Ahorre su energía</div>';
  h += '<div style="font-size:13px;color:var(--sub);text-align:center;margin-bottom:20px">Deje de gastar tiempo, dinero y preocupaciones</div>';

  // Antes (rojo - cansado)
  h += '<div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid #fecaca;border-radius:16px;padding:16px;margin-bottom:14px">';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><div style="font-size:28px">😩</div><div><div style="font-size:11px;font-weight:800;color:#991b1b;text-transform:uppercase;letter-spacing:1px">Sin nosotros</div><div style="font-size:14px;font-weight:800;color:#7f1d1d">Usted hace TODO</div></div></div>';
  ['📸 Tomar fotos y publicar avisos','📞 Atender llamadas a toda hora','🚶 Mostrar el inmueble una y otra vez','🔍 Verificar inquilinos sin herramientas','📄 Redactar contratos legales','💸 Cobrar el canon mes a mes','🔧 Atender daños y reclamos','⚖️ Pelear si no le pagan'].forEach(t => {
    h += '<div style="font-size:12px;color:#7f1d1d;padding:4px 0;display:flex;align-items:center;gap:6px"><span style="color:#dc2626;font-weight:800">✗</span> ' + t + '</div>';
  });
  h += '</div>';

  // Flecha de transformación
  h += '<div style="text-align:center;margin:8px 0"><div style="display:inline-block;background:var(--b600);color:#fff;padding:8px 20px;border-radius:20px;font-size:12px;font-weight:800">⬇ NOS DELEGA TODO ⬇</div></div>';

  // Después (verde - relajado)
  h += '<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #bbf7d0;border-radius:16px;padding:16px;margin-top:14px">';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><div style="font-size:28px">😎</div><div><div style="font-size:11px;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:1px">Con House</div><div style="font-size:14px;font-weight:800;color:#064e3b">Usted no hace NADA</div></div></div>';
  h += '<div style="background:#fff;border-radius:12px;padding:14px;text-align:center;border:1.5px solid #bbf7d0">';
  h += '<div style="font-size:48px;margin-bottom:6px">☕</div>';
  h += '<div style="font-size:14px;font-weight:800;color:#064e3b;margin-bottom:4px">Solo recibe su plata</div>';
  h += '<div style="font-size:12px;color:#065f46">Cada 10 del mes, sin falta</div>';
  h += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #d1fae5;font-family:Fraunces,serif;font-size:22px;font-weight:800;color:#065f46">90% del canon</div>';
  h += '<div style="font-size:11px;color:#065f46;opacity:.8">Directo a su cuenta</div>';
  h += '</div></div>';
  h += '</div>';

  // Main benefits
  h += '<div style="padding:24px 16px">';
  h += '<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;text-align:center;margin-bottom:20px;color:var(--tx)">¿Qué hacemos por usted?</div>';

  const benefits = [
    { icon: '💰', title: 'Pago garantizado cada 10 del mes', desc: 'La inmobiliaria cobra al inquilino y le transfiere a usted. Sin falta. Si el inquilino se atrasa, nosotros gestionamos el cobro jurídico.', color: '#065f46' },
    { icon: '🔍', title: 'Estudio completo al inquilino', desc: 'Verificamos en DataCrédito (centrales de riesgo), confirmamos empleo e ingresos, pedimos referencias personales y familiares, y revisamos antecedentes judiciales. No entra cualquier persona.', color: '#2563eb' },
    { icon: '📄', title: 'Contrato notariado y blindado', desc: 'Elaboramos contrato de arrendamiento con cláusulas de protección: seguro de arrendamiento, póliza de daños, procedimiento claro de desalojo, e inventario fotográfico detallado al momento de la entrega.', color: '#7c3aed' },
    { icon: '🏠', title: 'Administración integral', desc: 'Nos encargamos de TODO: publicación profesional con fotografías, visitas guiadas, estudio del candidato, contrato, cobros mensuales, gestión de mantenimiento y reclamos del inquilino. Usted no hace nada.', color: '#0891b2' },
    { icon: '📢', title: 'Exposición masiva en 4 canales', desc: 'Su inmueble se publica simultáneamente en nuestro portal oficial inmobiliariahouse.com.co, Metrocuadrado, Fincaraíz y Facebook Marketplace, con fotografía profesional, descripción completa y contacto directo. Miles de personas buscando arriendo lo verán.', color: '#ea580c' },
    { icon: '💵', title: 'Comisión justa: solo 10% del canon', desc: 'Cobramos el 10% del canon mensual. Usted recibe el 90% todos los meses sin mover un dedo. No hay comisiones ocultas, ni cobros de mantenimiento, ni gastos administrativos adicionales.', color: '#059669' },
    { icon: '🆓', title: 'Sin costo inicial', desc: 'Usted no paga absolutamente nada para empezar. Ni por publicación, ni por estudio, ni por contrato. La comisión solo se aplica cuando el inmueble YA está arrendado y generando ingresos.', color: '#d97706' },
    { icon: '🛡️', title: 'Tranquilidad total', desc: 'Si hay problemas con el inquilino — no paga, daña el inmueble, quiere irse antes de tiempo, subarrienda sin permiso — nosotros lo manejamos. Notificación, cobro, proceso jurídico si es necesario. Usted no tiene que lidiar con nada.', color: '#dc2626' }
  ];

  benefits.forEach(b => {
    h += '<div style="display:flex;gap:14px;margin-bottom:20px;align-items:flex-start">';
    h += '<div style="width:44px;height:44px;border-radius:12px;background:' + b.color + '15;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">' + b.icon + '</div>';
    h += '<div><div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:4px">' + b.title + '</div>';
    h += '<div style="font-size:13px;color:var(--sub);line-height:1.6">' + b.desc + '</div></div>';
    h += '</div>';
  });
  h += '</div>';

  // How it works
  h += '<div style="background:var(--cd2);padding:24px 16px;border-top:1px solid var(--brd);border-bottom:1px solid var(--brd)">';
  h += '<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;text-align:center;margin-bottom:20px;color:var(--tx)">¿Cómo funciona?</div>';
  const steps = [
    { n: '1', t: 'Usted nos contacta', d: 'Nos llama, nos escribe por WhatsApp, o viene a nuestra oficina. Le explicamos todo sin compromiso.' },
    { n: '2', t: 'Visitamos su inmueble', d: 'Nuestro equipo visita el inmueble, toma fotografías profesionales y evalúa las condiciones.' },
    { n: '3', t: 'Firmamos contrato de administración', d: 'Un contrato claro y transparente. Usted nos entrega las llaves y nosotros nos hacemos cargo de todo.' },
    { n: '4', t: 'Publicamos y buscamos inquilino', d: 'Publicación en 4 canales (inmobiliariahouse.com.co + Metrocuadrado + Fincaraíz + Facebook) y red de asesores buscando activamente. Promedio de arriendo: menos de 30 días.' },
    { n: '5', t: 'Usted recibe su plata cada mes', d: 'Cada 10 del mes, transferimos el 90% del canon a su cuenta. Sin excusas, sin demoras.' }
  ];
  steps.forEach(s => {
    h += '<div style="display:flex;gap:12px;margin-bottom:16px;align-items:flex-start">';
    h += '<div style="width:32px;height:32px;border-radius:50%;background:var(--b600);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0">' + s.n + '</div>';
    h += '<div><div style="font-size:14px;font-weight:700;color:var(--tx)">' + s.t + '</div>';
    h += '<div style="font-size:12px;color:var(--sub);line-height:1.5;margin-top:2px">' + s.d + '</div></div>';
    h += '</div>';
  });
  h += '</div>';

  // Canales de exposición
  h += '<div style="padding:24px 16px">';
  h += '<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;text-align:center;margin-bottom:6px;color:var(--tx)">📢 4 canales de exposición</div>';
  h += '<div style="font-size:13px;color:var(--sub);text-align:center;margin-bottom:20px">Su inmueble visible donde están los inquilinos buscando</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  const canales = [
    { icon: '🏠', name: 'inmobiliariahouse.com.co', desc: 'Nuestro portal oficial', color: '#1e3a5f', highlight: true },
    { icon: '🌐', name: 'Metrocuadrado', desc: 'Portal #1 en Colombia', color: '#0891b2' },
    { icon: '🔍', name: 'Fincaraíz', desc: 'Líder en búsquedas', color: '#7c3aed' },
    { icon: '📱', name: 'Facebook Marketplace', desc: 'Alcance masivo', color: '#2563eb' }
  ];
  canales.forEach(c => {
    h += '<div style="background:' + (c.highlight ? c.color : 'var(--cd)') + ';border:2px solid ' + c.color + ';border-radius:14px;padding:14px;text-align:center;color:' + (c.highlight ? '#fff' : 'var(--tx)') + ';position:relative">';
    if (c.highlight) h += '<div style="position:absolute;top:-8px;right:-8px;background:#fbbf24;color:#78350f;font-size:9px;font-weight:800;padding:3px 8px;border-radius:10px;letter-spacing:.5px">EXCLUSIVO</div>';
    h += '<div style="font-size:28px;margin-bottom:6px">' + c.icon + '</div>';
    h += '<div style="font-size:12px;font-weight:800;margin-bottom:2px;word-break:break-word">' + c.name + '</div>';
    h += '<div style="font-size:10px;opacity:.85">' + c.desc + '</div>';
    h += '</div>';
  });
  h += '</div>';
  h += '<div style="margin-top:14px;padding:14px;background:var(--cd2);border:1.5px solid var(--brd);border-radius:12px;text-align:center"><div style="font-size:12px;color:var(--sub);margin-bottom:6px">+ Red de asesores buscando inquilinos activamente</div>';
  h += '<a href="https://inmobiliariahouse.com.co" target="_blank" style="display:inline-block;margin-top:4px;padding:10px 22px;background:var(--b600);color:#fff;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none">🌐 Visitar nuestro sitio web</a></div>';
  h += '</div>';

  // Calculator
  h += '<div style="padding:24px 16px;text-align:center">';
  h += '<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;margin-bottom:6px;color:var(--tx)">¿Cuánto recibe usted?</div>';
  h += '<div style="font-size:13px;color:var(--sub);margin-bottom:16px">Ingrese el canon mensual de su inmueble</div>';
  h += '<input id="propCalcInput" type="number" inputmode="numeric" placeholder="Ej: 2500000" style="width:100%;max-width:300px;padding:14px;border:2px solid var(--b300);border-radius:12px;font-size:18px;font-weight:700;text-align:center;font-family:inherit;color:var(--tx);background:var(--cd)" oninput="propCalcUpdate()">';
  h += '<div id="propCalcResult" style="margin-top:16px"></div>';
  h += '</div>';

  // Trust
  h += '<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);padding:24px 16px;border-top:1px solid #bbf7d0">';
  h += '<div style="font-family:Fraunces,serif;font-size:18px;font-weight:800;text-align:center;color:#065f46;margin-bottom:12px">¿Por qué confiar en nosotros?</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  [['📅','14+ años','de experiencia'],['🏠','500+','inmuebles administrados'],['👥','Equipo','profesional dedicado'],['📍','Pereira','presencia local']].forEach(t => {
    h += '<div style="text-align:center;padding:14px;background:#fff;border-radius:12px;border:1px solid #bbf7d0"><div style="font-size:20px;margin-bottom:4px">' + t[0] + '</div><div style="font-size:16px;font-weight:800;color:#065f46">' + t[1] + '</div><div style="font-size:10px;color:#065f46">' + t[2] + '</div></div>';
  });
  h += '</div></div>';

  // CTA
  h += '<div style="padding:28px 16px;text-align:center;background:var(--cd)">';
  h += '<div style="font-family:Fraunces,serif;font-size:22px;font-weight:800;color:var(--tx);margin-bottom:8px">¿Listo para arrendar sin estrés?</div>';
  h += '<div style="font-size:13px;color:var(--sub);margin-bottom:20px">Contáctenos hoy. Sin compromiso.</div>';
  h += '<a href="https://wa.me/' + waTel + '?text=' + waMsg + '" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:16px 32px;background:#25d366;color:#fff;border-radius:14px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(37,211,102,.3)">💬 Contactar por WhatsApp</a>';
  h += '<div style="margin-top:12px"><a href="tel:+573105922763" style="font-size:14px;color:var(--b600);font-weight:700;text-decoration:none">📞 Llamar: 310 592 2763</a></div>';
  h += '<div style="margin-top:10px"><a href="https://inmobiliariahouse.com.co" target="_blank" style="font-size:14px;color:var(--b600);font-weight:700;text-decoration:none">🌐 inmobiliariahouse.com.co</a></div>';
  h += '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--brd)">';
  h += '<div style="font-size:12px;color:var(--sub);margin-bottom:4px">📍 Visítenos</div>';
  h += '<div style="font-size:14px;font-weight:700;color:var(--tx)">Cl. 14 #14-09, Pereira, Risaralda</div>';
  h += '</div>';
  h += '</div>';

  // Footer
  h += '<div style="padding:20px 16px;text-align:center;background:var(--cd2);border-top:1px solid var(--brd)">';
  h += '<div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:4px">Inmobiliaria House</div>';
  h += '<div style="font-size:12px;color:var(--sub);margin-bottom:2px">📍 Cl. 14 #14-09, Pereira, Risaralda</div>';
  h += '<div style="font-size:12px;color:var(--sub);margin-bottom:8px">📞 310 592 2763</div>';
  h += '<div style="font-size:10px;color:var(--g400)">© ' + new Date().getFullYear() + ' Inmobiliaria House · Asesores Inmobiliarios · Pereira, Colombia</div>';
  h += '</div>';

  el.innerHTML = h;
};

// Calculator for propietarios landing
window.propCalcUpdate = function() {
  const input = document.getElementById('propCalcInput');
  const box = document.getElementById('propCalcResult');
  if (!input || !box) return;
  const canon = parseFloat(input.value) || 0;
  if (canon <= 0) { box.innerHTML = ''; return; }
  const comision = Math.round(canon * 0.10);
  const ustedRecibe = canon - comision;
  box.innerHTML = '<div style="background:var(--cd);border:2px solid var(--b300);border-radius:16px;padding:20px;max-width:320px;margin:0 auto">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:13px;color:var(--sub)">Canon mensual</span><span style="font-size:14px;font-weight:700">' + fm(canon) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:13px;color:var(--sub)">Comisión House (10%)</span><span style="font-size:14px;font-weight:700;color:var(--red)">-' + fm(comision) + '</span></div>' +
    '<div style="border-top:2px solid var(--brd);padding-top:8px;display:flex;justify-content:space-between"><span style="font-size:14px;font-weight:800;color:var(--tx)">Usted recibe</span><span style="font-family:Fraunces,serif;font-size:24px;font-weight:800;color:#065f46">' + fm(ustedRecibe) + '</span></div>' +
    '<div style="font-size:11px;color:var(--sub);text-align:center;margin-top:8px">Cada mes, sin falta, el día 10</div>' +
    '</div>';
};

// ══════════════════════════════════════════════════════════════════
// LANDING PAGE: /referidos-landing — Landing pública del programa de referidos
// ══════════════════════════════════════════════════════════════════

window.renderReferidosLanding = async function() {
  const el = document.getElementById('referidosLandingC'); if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--sub)">Cargando...</div>';

  // Fetch real stats
  let totalReferidos = 0, totalPagado = 0, totalArrendados = 0;
  try {
    const { count: refCount } = await SB().from('referidos').select('id', { count: 'exact', head: true }).not('estado', 'eq', 'rechazado');
    const { count: arrCount } = await SB().from('referidos').select('id', { count: 'exact', head: true }).eq('estado', 'arrendado');
    const { data: pagos } = await SB().from('pagos_referidos').select('monto').eq('estado', 'pagado');
    totalReferidos = refCount || 0;
    totalArrendados = arrCount || 0;
    totalPagado = (pagos || []).reduce((s, p) => s + (p.monto || 0), 0);
  } catch(e) { console.error('[Landing]', e); }

  // Fetch recent payouts for feed
  let recentPayouts = [];
  try {
    const { data } = await SB().from('pagos_referidos').select('monto,tipo_pago,inmueble_tipo,inmueble_barrio,pagado_at,referidor:usuarios!referidor_id(nombre)').eq('estado', 'pagado').order('pagado_at', { ascending: false }).limit(10);
    recentPayouts = data || [];
  } catch(e) {}

  let h = '';

  // Hero
  h += '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:40px 20px 32px;text-align:center;color:#fff;border-radius:0 0 24px 24px">';
  h += '<div style="font-size:48px;margin-bottom:10px">💰</div>';
  h += '<div style="font-family:Fraunces,serif;font-size:28px;font-weight:800;line-height:1.2;margin-bottom:8px">Gana dinero<br>refiriendo inmuebles</div>';
  h += '<div style="font-size:14px;opacity:.9;margin-bottom:20px;max-width:400px;margin-left:auto;margin-right:auto">¿Conoces un apartamento, casa o local en arriendo? Refiérelo a Inmobiliaria House y gana hasta el <strong>10%</strong> del canon mensual.</div>';
  h += '<div style="font-family:Fraunces,serif;font-size:22px;font-weight:700;margin-bottom:20px">Un apto de $2.5M = $250.000 para ti</div>';
  h += '<button onclick="go(\'referir\')" style="padding:16px 36px;border:none;border-radius:30px;background:#fff;color:#1e3a5f;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(0,0,0,.15)">🤝 Quiero referir</button>';
  h += '</div>';

  // Real stats
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:20px 16px">';
  h += '<div style="text-align:center;padding:16px;background:var(--cd);border-radius:14px;border:1.5px solid var(--brd)"><div style="font-family:Fraunces,serif;font-size:28px;font-weight:800;color:var(--b700)">' + totalReferidos + '</div><div style="font-size:10px;color:var(--sub);font-weight:600">Inmuebles referidos</div></div>';
  h += '<div style="text-align:center;padding:16px;background:var(--cd);border-radius:14px;border:1.5px solid var(--brd)"><div style="font-family:Fraunces,serif;font-size:28px;font-weight:800;color:var(--green)">' + totalArrendados + '</div><div style="font-size:10px;color:var(--sub);font-weight:600">Arrendados</div></div>';
  h += '<div style="text-align:center;padding:16px;background:var(--cd);border-radius:14px;border:1.5px solid var(--brd)"><div style="font-family:Fraunces,serif;font-size:28px;font-weight:800;color:#065f46">' + fm(totalPagado) + '</div><div style="font-size:10px;color:var(--sub);font-weight:600">Pagado a referidores</div></div>';
  h += '</div>';

  // How it works (using the existing renderer)
  h += '<div style="padding:0 16px 16px">';
  h += window.renderHowItWorks(true);
  h += '</div>';

  // Recent payouts feed
  if (recentPayouts.length > 0) {
    h += '<div style="padding:0 16px 20px">';
    h += '<div style="font-family:Fraunces,serif;font-size:18px;font-weight:800;margin-bottom:12px;text-align:center;color:var(--tx)">💸 Pagos recientes a referidores</div>';
    h += '<div style="background:var(--cd);border:1.5px solid var(--brd);border-radius:14px;overflow:hidden">';
    recentPayouts.forEach((p, i) => {
      const nombre = p.referidor?.nombre || 'Referidor';
      const masked = nombre.length > 3 ? nombre[0] + '***' + nombre[nombre.length - 1] : '***';
      const fecha = p.pagado_at ? new Date(p.pagado_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '';
      h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px' + (i < recentPayouts.length - 1 ? ';border-bottom:1px solid var(--g100)' : '') + '">';
      h += '<div style="width:32px;height:32px;border-radius:50%;background:' + (p.tipo_pago === 'bono' ? 'var(--goldbg)' : 'var(--greenbg)') + ';display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">' + (p.tipo_pago === 'bono' ? '🟡' : '🟢') + '</div>';
      h += '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:var(--tx)">' + masked + ' recibió <span style="color:var(--green)">' + fm(p.monto) + '</span></div>';
      h += '<div style="font-size:10px;color:var(--sub)">' + (p.tipo_pago === 'bono' ? 'Bono' : 'Comisión') + ' · ' + (p.inmueble_tipo || '') + ' en ' + (p.inmueble_barrio || '?') + ' · ' + fecha + '</div></div></div>';
    });
    h += '</div></div>';
  }

  // Calculator
  h += '<div style="padding:20px 16px;text-align:center;background:var(--cd2);border-top:1px solid var(--brd);border-bottom:1px solid var(--brd)">';
  h += '<div style="font-family:Fraunces,serif;font-size:18px;font-weight:800;margin-bottom:4px;color:var(--tx)">💰 ¿Cuánto puedes ganar?</div>';
  h += '<div style="font-size:12px;color:var(--sub);margin-bottom:14px">Ingresa el canon del inmueble que quieres referir</div>';
  h += '<input id="refLandCalc" type="number" inputmode="numeric" placeholder="Ej: 2500000" style="width:100%;max-width:280px;padding:14px;border:2px solid var(--b300);border-radius:12px;font-size:18px;font-weight:700;text-align:center;font-family:inherit;color:var(--tx);background:var(--cd)" oninput="refLandCalcUpdate()">';
  h += '<div id="refLandCalcResult" style="margin-top:12px"></div>';
  h += '</div>';

  // Who can participate
  h += '<div style="padding:24px 16px">';
  h += '<div style="font-family:Fraunces,serif;font-size:18px;font-weight:800;text-align:center;margin-bottom:16px;color:var(--tx)">¿Quién puede participar?</div>';
  [['🛡️','Celadores y vigilantes','Ustedes saben cuándo se desocupa un apto antes que nadie.'],['🏢','Administradores de conjuntos','Información privilegiada sobre inmuebles vacíos.'],['👨‍👩‍👧','Amigos y familiares','¿Tu vecino arrienda? ¿Tu tía tiene un apto vacío?'],['🧑‍💼','Asesores de la inmobiliaria','Ganan extra por cada referido que consigan.'],['🤷','Cualquier persona','Mayor de edad, sin requisitos ni experiencia.']].forEach(p => {
    h += '<div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start"><div style="font-size:24px;flex-shrink:0">' + p[0] + '</div><div><div style="font-size:13px;font-weight:700;color:var(--tx)">' + p[1] + '</div><div style="font-size:12px;color:var(--sub)">' + p[2] + '</div></div></div>';
  });
  h += '</div>';

  // Policies
  h += '<div style="padding:0 16px 16px">';
  h += window.renderReferralPolicies();
  h += '</div>';

  // CTA final
  h += '<div style="padding:28px 16px;text-align:center;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff">';
  h += '<div style="font-family:Fraunces,serif;font-size:22px;font-weight:800;margin-bottom:8px">¿Listo para ganar?</div>';
  h += '<div style="font-size:13px;opacity:.9;margin-bottom:20px">Registra tu primer referido en menos de 2 minutos</div>';
  h += '<button onclick="go(\'referir\')" style="padding:16px 36px;border:none;border-radius:30px;background:#fff;color:#1e3a5f;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;margin-bottom:12px">🤝 Referir ahora</button>';
  h += '<div style="font-size:12px;opacity:.7;margin-top:8px">📍 Inmobiliaria House · Cl. 14 #14-09, Pereira</div>';
  h += '</div>';

  el.innerHTML = h;
};

window.refLandCalcUpdate = function() {
  const input = document.getElementById('refLandCalc');
  const box = document.getElementById('refLandCalcResult');
  if (!input || !box) return;
  const canon = parseFloat(input.value) || 0;
  if (canon <= 0) { box.innerHTML = ''; return; }
  const total = Math.round(canon * 0.10);
  const bono = 50000;
  const neto = Math.max(0, total - bono);
  box.innerHTML = '<div style="background:var(--cd);border:2px solid #bbf7d0;border-radius:14px;padding:16px;max-width:300px;margin:0 auto;text-align:center">' +
    '<div style="font-size:11px;color:#065f46;font-weight:600;margin-bottom:4px">Tu ganancia total</div>' +
    '<div style="font-family:Fraunces,serif;font-size:30px;font-weight:800;color:#065f46">' + fm(total) + '</div>' +
    '<div style="display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:11px;color:#065f46"><div>' + fm(bono) + '<br><span style="font-size:9px;opacity:.7">al firmar contrato</span></div><div style="width:1px;background:#bbf7d0"></div><div>' + fm(neto) + '<br><span style="font-size:9px;opacity:.7">al arrendar</span></div></div></div>';
};

// ══════════════════════════════════════════════════════════════════
// PAYMENT SETUP — Configurar método de pago
// ══════════════════════════════════════════════════════════════════

window.renderPaymentSetup = async function() {
  const el = document.getElementById('metodoPagoContent'); if (!el) return;
  const u = U(); if (!u) return;
  const metodo = await window.obtenerMetodoPago(u.id);
  const labels = { nequi: 'Nequi 📱', bancolombia: 'Bancolombia 🏦', daviplata: 'Daviplata 📱', davivienda: 'Davivienda 🏦', bre: 'Bre (Dale!) 📱' };
  let h = '';

  if (metodo) {
    h += '<div style="background:var(--greenbg);border:1.5px solid var(--gb);border-radius:12px;padding:16px;margin-bottom:16px"><div style="font-size:14px;font-weight:800;color:#065f46;margin-bottom:8px">✅ Método configurado</div>';
    h += '<div style="font-size:13px;color:#065f46"><strong>' + (labels[metodo.metodo] || metodo.metodo) + '</strong></div>';
    h += '<div style="font-size:12px;color:#065f46">' + window.maskAccount(metodo.numero_cuenta, metodo.metodo) + '</div>';
    h += '<div style="font-size:12px;color:#065f46">Titular: ' + metodo.titular_nombre + '</div>';
    h += '<button onclick="document.getElementById(\'payFormDiv\').style.display=\'block\'" style="margin-top:10px;padding:8px 16px;border:1.5px solid #065f46;border-radius:8px;font-size:12px;font-weight:700;background:transparent;color:#065f46;cursor:pointer;font-family:inherit">✏️ Cambiar método</button></div>';
  }

  h += '<div id="payFormDiv" style="' + (metodo ? 'display:none' : '') + '">';
  h += '<div style="font-size:14px;font-weight:700;margin-bottom:12px">Selecciona tu método preferido:</div>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">';
  [['nequi','Nequi','📱'],['bancolombia','Bancol.','🏦'],['daviplata','Daviplata','📱'],['davivienda','Davivi.','🏦'],['bre','Bre','📱']].forEach(m => {
    h += '<button class="wiz-type-btn" onclick="window._payMetodo=\'' + m[0] + '\';_updatePayForm()" style="padding:12px 16px;min-width:80px"><span class="wiz-emoji">' + m[2] + '</span><span class="wiz-tname">' + m[1] + '</span></button>';
  });
  h += '</div>';
  h += '<input type="hidden" id="payMetodo" value="">';
  h += '<div id="payDynamicFields"></div>';
  h += '<div class="ff"><label class="ffl">Nombre completo del titular (como aparece en el banco) <span class="ffr">*</span></label><input class="ffi" id="payTitular" placeholder="Ana María López Gómez" value="' + (u.nombre || '') + '"></div>';
  h += '<div class="ff"><label class="ffl">Número de cédula del titular <span class="ffr">*</span></label><input class="ffi" id="payCedula" type="tel" placeholder="1.088.234.567"></div>';
  h += '<div style="padding:10px;background:var(--goldbg);border:1px solid var(--yb);border-radius:8px;font-size:11px;color:#92400e;margin-bottom:14px">⚠️ Verifica que los datos sean correctos. Si hay un error, el pago podría enviarse a otra persona.</div>';
  h += '<button class="bt bp" style="width:100%;padding:14px;font-size:14px" onclick="guardarMetodoPago()">💳 Guardar método de pago</button>';
  h += '</div>';

  el.innerHTML = h;
};

window._updatePayForm = function() {
  const m = window._payMetodo; if (!m) return;
  document.getElementById('payMetodo').value = m;
  document.querySelectorAll('.wiz-type-btn').forEach(b => b.classList.remove('act'));
  event.target.closest('.wiz-type-btn')?.classList.add('act');
  const cfg = PAY_VALIDATIONS[m]; if (!cfg) return;
  let h = '<div class="ff"><label class="ffl">' + cfg.label + ' <span class="ffr">*</span></label><input class="ffi" id="payNumero" type="tel" inputmode="numeric" maxlength="' + cfg.ml + '" placeholder="' + cfg.ph + '"></div>';
  if (cfg.bank) h += '<div class="ff"><label class="ffl">Tipo de cuenta <span class="ffr">*</span></label><select class="esel" id="payTipoCuenta" style="width:100%;padding:10px;font-size:13px"><option value="">— Selecciona —</option><option value="Ahorros">Ahorros</option><option value="Corriente">Corriente</option></select></div>';
  document.getElementById('payDynamicFields').innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════
// ADMIN PAYMENT PANEL — Pagos pendientes + historial
// ══════════════════════════════════════════════════════════════════

window.renderAdminPaymentPanel = async function() {
  const el = document.getElementById('adminPagosContent'); if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--sub)">Cargando pagos...</div>';
  const u = U(); if (!u) return;
  const labels = { nequi: 'Nequi', bancolombia: 'Bancolombia', daviplata: 'Daviplata', davivienda: 'Davivienda', bre: 'Bre' };

  // Load pending payments
  const { data: pend } = await SB().from('referidos').select('*,referidor:usuarios!referidor_id(id,nombre,telefono_contacto,usuario,email,foto)').or('and(estado.in.(contrato_firmado,publicado),bono_pagado.eq.false),and(estado.eq.arrendado,comision_pagada.eq.false)').order('updated_at', { ascending: false });

  // Load payment history
  const { data: historial } = await SB().from('pagos_referidos').select('*,referidor:usuarios!referidor_id(nombre)').eq('estado', 'pagado').order('pagado_at', { ascending: false }).limit(20);

  let h = '<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;margin-bottom:16px">💳 Panel de Pagos</div>';

  // Tabs
  h += '<div style="display:flex;gap:6px;margin-bottom:16px">';
  h += '<button id="payTabPend" onclick="document.getElementById(\'payPendDiv\').style.display=\'\';document.getElementById(\'payHistDiv\').style.display=\'none\';this.style.background=\'var(--b600)\';this.style.color=\'#fff\';document.getElementById(\'payTabHist\').style.background=\'var(--cd)\';document.getElementById(\'payTabHist\').style.color=\'var(--tx)\'" style="padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;border:1.5px solid var(--b600);background:var(--b600);color:#fff;cursor:pointer;font-family:inherit">⏳ Pendientes (' + ((pend || []).length) + ')</button>';
  h += '<button id="payTabHist" onclick="document.getElementById(\'payHistDiv\').style.display=\'\';document.getElementById(\'payPendDiv\').style.display=\'none\';this.style.background=\'var(--b600)\';this.style.color=\'#fff\';document.getElementById(\'payTabPend\').style.background=\'var(--cd)\';document.getElementById(\'payTabPend\').style.color=\'var(--tx)\'" style="padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;border:1.5px solid var(--brd);background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">📜 Historial (' + ((historial || []).length) + ')</button>';
  h += '</div>';

  // Pending payments
  h += '<div id="payPendDiv">';
  if (!pend || !pend.length) {
    h += '<div class="emp"><span class="emp-i">✅</span><h3>Sin pagos pendientes</h3></div>';
  } else {
    for (const r of pend) {
      const metodo = await window.obtenerMetodoPago(r.referidor_id);
      const esBono = !r.bono_pagado && ['contrato_firmado', 'publicado'].includes(r.estado);
      const esComision = r.estado === 'arrendado' && !r.comision_pagada;
      const canon = r.canon_real || r.canon_aproximado || 0;
      const monto = esBono ? (r.bono_monto || 50000) : Math.max(0, Math.round(canon * (r.comision_porcentaje || 0.10)) - (r.bono_monto || 50000));
      const tipo = esBono ? 'bono' : 'comision';
      const concepto = (esBono ? 'Bono' : 'Comisión') + ' referido - ' + (r.tipo_inmueble || '') + ' ' + (r.barrio || '');

      h += '<div style="background:var(--cd);border:1.5px solid var(--brd);border-left:4px solid ' + (esBono ? 'var(--gold)' : 'var(--green)') + ';border-radius:0 12px 12px 0;padding:14px;margin-bottom:10px">';
      h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px;background:' + (esBono ? 'var(--goldbg)' : 'var(--greenbg)') + ';color:' + (esBono ? '#92400e' : '#065f46') + '">' + (esBono ? '🟡 BONO' : '🟢 COMISIÓN') + '</span><span style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--tx)">' + fm(monto) + '</span></div>';
      h += '<div style="font-size:13px;font-weight:700">' + (r.referidor?.nombre || '?') + '</div>';
      h += '<div style="font-size:12px;color:var(--sub)">' + (r.tipo_inmueble || '') + ' · ' + (r.barrio || r.ciudad || '') + (canon > 0 ? ' · Canon ' + fm(canon) + '/mes' : '') + '</div>';

      if (metodo) {
        h += '<div style="background:var(--cd2);border:1px solid var(--brd);border-radius:8px;padding:10px;margin:8px 0;font-size:12px">';
        h += '<div style="font-weight:700;margin-bottom:4px">💳 Pagar a:</div>';
        h += '<div>' + (labels[metodo.metodo] || metodo.metodo) + ' ' + window.maskAccount(metodo.numero_cuenta, metodo.metodo) + '</div>';
        h += '<div>Titular: ' + metodo.titular_nombre + '</div>';
        h += '<div>Cédula: ' + window.maskCedula(metodo.titular_cedula) + '</div>';
        h += '</div>';
        h += '<div style="display:flex;gap:6px"><button class="bt bs2" style="flex:1;font-size:11px;padding:8px" onclick="copiarDatosPago(\'' + metodo.metodo + '\',\'' + metodo.numero_cuenta + '\',\'' + metodo.titular_nombre.replace(/'/g, "\\'") + '\',\'' + metodo.titular_cedula + '\',' + monto + ',\'' + concepto.replace(/'/g, "\\'") + '\')">📋 Copiar datos</button>';
        h += '<button class="bt bp" style="flex:1;font-size:11px;padding:8px" onclick="registrarPagoReferido(\'' + r.id + '\',\'' + tipo + '\',' + monto + ')">💰 Registrar pago</button></div>';
      } else {
        h += '<div style="background:var(--goldbg);border:1px solid var(--yb);border-radius:8px;padding:10px;margin:8px 0;font-size:12px;color:#92400e;font-weight:700">⚠️ SIN MÉTODO DE PAGO CONFIGURADO</div>';
        h += '<a href="https://wa.me/57' + (r.referidor?.telefono_contacto || '').replace(/^57/, '') + '?text=' + encodeURIComponent('Hola ' + (r.referidor?.nombre || '') + ', tienes un pago pendiente de ' + fm(monto) + ' por tu referido. Configura tu método de pago en la app para poder transferirte.') + '" target="_blank" style="display:block;padding:8px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:#25d366;color:#fff;text-align:center;text-decoration:none">📞 Contactar por WhatsApp</a>';
      }
      h += '</div>';
    }
  }
  h += '</div>';

  // Payment history
  h += '<div id="payHistDiv" style="display:none">';
  if (!historial || !historial.length) {
    h += '<div class="emp"><span class="emp-i">📜</span><h3>Sin historial</h3></div>';
  } else {
    const totalPagado = historial.reduce((s, p) => s + (p.monto || 0), 0);
    h += '<div style="font-size:13px;color:var(--sub);margin-bottom:12px">Total pagado: <strong style="color:var(--green)">' + fm(totalPagado) + '</strong></div>';
    historial.forEach(p => {
      h += '<div style="display:flex;gap:10px;padding:10px;background:var(--cd);border:1px solid var(--brd);border-radius:10px;margin-bottom:6px;align-items:center">';
      h += '<div style="font-size:16px">' + (p.tipo_pago === 'bono' ? '🟡' : '🟢') + '</div>';
      h += '<div style="flex:1"><div style="font-size:12px;font-weight:700">' + (p.tipo_pago === 'bono' ? 'Bono' : 'Comisión') + ' · ' + fm(p.monto) + '</div>';
      h += '<div style="font-size:11px;color:var(--sub)">' + (p.referidor?.nombre || '?') + ' · ' + (p.inmueble_tipo || '') + ' ' + (p.inmueble_barrio || '') + '</div>';
      h += '<div style="font-size:10px;color:var(--sub)">' + (p.pagado_at ? new Date(p.pagado_at).toLocaleDateString('es-CO') : '') + ' → ' + p.metodo_snapshot + ' ' + p.cuenta_snapshot + '</div>';
      h += '</div></div>';
    });
  }
  h += '</div>';

  el.innerHTML = h;
};

console.log('[sections] All route renderers registered');
