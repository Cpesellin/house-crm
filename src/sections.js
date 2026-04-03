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

window.rPipe = function () {
  const el = document.getElementById('pipeline');
  const nav = document.getElementById('mis-nav');
  if (!el) return;

  const u = U();
  if (!u) return;

  const allD = window.D || [];
  const MIS = allD.filter(p => p.captador_id === u.id);
  const SOL = window.SOL || [];

  // P7: Search & sort from inputs
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

  // P5: My pending solicitudes
  const mySolsPend = SOL.filter(s => s.solicitante_id === u.id && s.estado === 'pendiente');
  const solsOnMyInm = SOL.filter(s => MIS.some(p => p.id === s.inmueble_id) && s.estado === 'pendiente');

  // Column counts for nav
  const colCounts = {};
  PCOLS.forEach(col => {
    colCounts[col.id] = MIS.filter(p => p.estado === col.id || (col.id === 'Disponible' && (!p.estado || p.estado === 'Disponible' || p.estado === 'Verificar Disponibilidad'))).length;
  });

  // P6: Arriendos for gestor
  const arrDisp = u.es_gestor_arriendos ? allD.filter(p => p.captador_id !== u.id && !p.eliminado && (p.negociacion||'').toLowerCase().includes('arriendo') && (p.estado === 'Disponible' || p.estado === 'Aún Disponible' || !p.estado || p.estado === 'Verificar Disponibilidad')) : [];

  // NAV BADGES
  if (nav) {
    let navH = PCOLS.map((col, i) =>
      `<button class="pnav-btn ${col.c}" onclick="scrollToCol(${i})">${col.e} ${col.l} <span class="pnav-n">${colCounts[col.id]}</span></button>`
    ).join('');
    if (mySolsPend.length) navH += `<button class="pnav-btn c-vd" onclick="scrollToCol(${PCOLS.length})">🔍 Mis consultas <span class="pnav-n" style="background:var(--gold)">${mySolsPend.length}</span></button>`;
    if (solsOnMyInm.length) navH += `<button class="pnav-btn c-vd" onclick="scrollToCol(${PCOLS.length+1})">📩 Me consultan <span class="pnav-n" style="background:var(--red)">${solsOnMyInm.length}</span></button>`;
    if (u.es_gestor_arriendos) navH += `<button class="pnav-btn" style="border-color:#065f46" onclick="scrollToCol(99)">🔑 Arriendos <span class="pnav-n" style="background:#065f46">${arrDisp.length}</span></button>`;
    nav.innerHTML = navH;
  }

  // BUILD COLUMNS
  let h = '';

  PCOLS.forEach(col => {
    const items = MIS.filter(p => (p.estado === col.id || (col.id === 'Disponible' && (!p.estado || p.estado === 'Disponible' || p.estado === 'Verificar Disponibilidad'))) && pipeFilter(p));
    items.sort(pipeSortFn);
    const otherCols = PCOLS.filter(c2 => c2.id !== col.id);

    h += `<div class="pcol ${col.c}" data-estado="${col.id}"><div class="pch"><span class="pct">${col.e} ${col.l}</span><span class="pcc">${items.length}</span></div><div class="pcb">`;

    items.forEach(p => {
      const idx = allD.indexOf(p);
      const dias = p._dias || 0, umb = UMBRAL[col.id] || 15;
      const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;
      const m2 = !!(p.url_metrocuadrado||'').trim(), fr = !!(p.url_fincaraiz||'').trim();
      const hab = p.habitaciones||'', ban = p.banos||'', area = p.area_construida||'';
      const sps = [hab&&hab!=0?'🛏️ '+hab:'', ban&&ban!=0?'🚿 '+ban:'', area?'📐 '+area+'m²':''].filter(Boolean);

      // P3: Solicitudes on this property
      const pSols = SOL.filter(s => s.inmueble_id === p.id && s.estado === 'pendiente');

      // P1: Draggable card
      h += `<div class="pkc" id="pkc-${p.id}" draggable="true" ondragstart="dStart(event,'${p.id}')" onclick="oM&&oM(${idx})">`;

      // P3: Solicitud badge
      if (pSols.length > 0) h += `<span class="pk-new" style="background:var(--gold)">📩 ${pSols.length}</span>`;

      h += `<div class="pktp">${emo(p.tipo)} ${p.tipo || 'Inmueble'}${p.codigo_house ? ` <span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${p.codigo_house}');toast('📋 Copiado')" style="font-size:9px;margin-left:4px">${p.codigo_house}</span>` : ''}</div>`;
      h += `<div class="pkci">📍 ${p.ciudad || ''}</div>`;

      if (pv > 0 || pa > 0) h += `<div class="pkpr">${pv > 0 ? fm(pv) : ''}${pv > 0 && pa > 0 ? ' · ' : ''}${pa > 0 ? fm(pa) + '/mes' : ''}</div>`;

      if (sps.length) h += `<div class="pksp">${sps.map(s => '<span>' + s + '</span>').join('')}</div>`;

      h += timerBadge(dias, umb);

      // P3: Respond to solicitudes inline
      if (pSols.length > 0) {
        h += `<div style="margin-top:6px;padding:8px;background:var(--redbg);border:1px solid var(--rb);border-radius:6px">`;
        pSols.forEach(s => {
          h += `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:10px"><span>🔍 <b>${s.solicitante ? s.solicitante.nombre : '?'}</b>${s.nota_solicitante ? ' — "' + s.nota_solicitante + '"' : ''}</span></div>`;
          h += `<div style="display:flex;gap:4px" onclick="event.stopPropagation()"><button style="flex:1;padding:5px;border:none;border-radius:4px;font-size:10px;font-weight:700;background:var(--green);color:#fff;font-family:inherit;cursor:pointer" onclick="responderSol('${s.id}','si')">✅ Disponible</button><button style="flex:1;padding:5px;border:none;border-radius:4px;font-size:10px;font-weight:700;background:var(--red);color:#fff;font-family:inherit;cursor:pointer" onclick="responderSol('${s.id}','no')">❌ No disponible</button></div>`;
        });
        h += `</div>`;
      }

      // P4: Revalidate button
      if (col.id === 'Aún Disponible') h += `<button class="pk-reval" onclick="event.stopPropagation();reVal('${p.id}')">🔄 Volver a validar</button>`;

      // Footer: asesor + portals
      h += `<div class="pkbt"><span class="pkas">👤 ${p.captador ? p.captador.nombre : ''}</span><div class="pkpt">${m2 ? '<span class="pp ppok">M²</span>' : '<span class="pp ppno">M²</span>'}${fr ? '<span class="pp ppok">FR</span>' : '<span class="pp ppno">FR</span>'}</div></div>`;

      // P2: Move-to dropdown
      h += `<div class="pk-move" onclick="event.stopPropagation()"><select class="esel" style="width:100%;font-size:10px;margin-top:6px;padding:6px" onchange="if(this.value)quickMove('${p.id}',this.value)"><option value="">⇄ Mover a...</option>${otherCols.map(c2 => `<option value="${c2.id}">${c2.e} ${c2.l}</option>`).join('')}</select></div>`;

      h += `</div>`; // close pkc
    });

    h += '</div></div>'; // close pcb + pcol
  });

  // P5: "Mis consultas" column
  if (mySolsPend.length > 0) {
    h += `<div class="pcol c-vd" style="border-color:var(--gold)"><div class="pch" style="background:rgba(245,158,11,.08)"><span class="pct" style="color:var(--gold)">🔍 Mis consultas</span><span class="pcc">${mySolsPend.length}</span></div><div class="pcb">`;
    mySolsPend.forEach(s => {
      const p = allD.find(x => x.id === s.inmueble_id);
      if (!p) return;
      const idx = allD.indexOf(p);
      const dias2 = diasDesde(s.created_at);
      const capNom = p.captador ? p.captador.nombre : '?';
      h += `<div class="sol-card" onclick="oM&&oM(${idx})"><div class="sol-badge">🔍 Esperando respuesta de ${capNom}</div><div class="pktp">${emo(p.tipo)} ${p.tipo || 'Inmueble'}</div><div class="pkci">📍 ${p.ciudad || ''}</div>${timerBadge(dias2, 5)}${s.nota_solicitante ? `<div style="font-size:10px;color:var(--sub);margin-top:4px;font-style:italic">"${s.nota_solicitante}"</div>` : ''}</div>`;
    });
    h += '</div></div>';
  }

  // P6: Arriendos column (gestor)
  if (u.es_gestor_arriendos) {
    h += `<div class="pcol" style="border-color:#065f46;border-width:2px"><div class="pch" style="background:rgba(6,95,70,.08)"><span class="pct" style="color:#065f46">🔑 Arriendos del inventario</span><span class="pcc" style="background:#065f46">${arrDisp.length}</span></div><div class="pcb">`;
    if (!arrDisp.length) h += `<div style="text-align:center;padding:16px;font-size:12px;color:var(--sub)">✅ Sin arriendos pendientes</div>`;
    arrDisp.forEach(p => {
      const idx = allD.indexOf(p);
      const dias2 = p._dias || 0;
      h += `<div class="pkc" style="border-color:#065f46;border-width:2px" onclick="oM&&oM(${idx >= 0 ? idx : 0})"><div class="pktp">🔑 ${p.tipo || 'Inmueble'}</div><div class="pkci">📍 ${p.ciudad || ''}</div>`;
      if (p.precio_arriendo > 0) h += `<div class="pkpr">${fm(p.precio_arriendo)}/mes</div>`;
      h += timerBadge(dias2, 15);
      h += `<div class="pkbt"><span class="pkas">👤 ${p.captador ? p.captador.nombre : '?'}</span></div>`;
      h += `<div style="display:flex;gap:4px;margin-top:6px" onclick="event.stopPropagation()"><button style="flex:1;padding:6px;border:none;border-radius:5px;font-size:10px;font-weight:700;background:var(--b600);color:#fff;font-family:inherit;cursor:pointer" onclick="abrirAgendarEvt('${p.id}')">📅 Agendar</button><select class="esel" style="flex:1;font-size:10px;padding:6px" onchange="if(this.value)quickMove('${p.id}',this.value)"><option value="">⇄ Mover</option><option value="Arrendado">🔑 Arrendado</option><option value="Retirado">⛔ Retirado</option></select></div></div>`;
    });
    h += '</div></div>';
  }

  el.innerHTML = h;

  // P1: Bind drag-drop on columns
  el.querySelectorAll('.pcol').forEach(c => {
    c.addEventListener('dragover', e => { e.preventDefault(); c.classList.add('drag-over'); });
    c.addEventListener('dragleave', () => c.classList.remove('drag-over'));
    c.addEventListener('drop', e => {
      e.preventDefault(); c.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      if (id && c.dataset.estado) window.quickMove(id, c.dataset.estado);
    });
  });
};

window.scrollToCol = function (i) {
  const cols = document.querySelectorAll('.pcol');
  if (cols[i]) cols[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
};

// ══════════════════════════════════════════════════════════════════
// rReg — Registration (init wizard)
// ══════════════════════════════════════════════════════════════════

window.rReg = function () {
  if (typeof window.iForm === 'function') window.iForm();
};

// ══════════════════════════════════════════════════════════════════
// rAl — Alertas
// ══════════════════════════════════════════════════════════════════

window.rAl = function () {
  const el = document.getElementById('all');
  if (!el) return;

  const all = window.ALU || [];
  const em = { inmueble_nuevo: '🆕', cambio_estado: '🔄', solicitud_info: '📩', portal_pendiente: '🌐', portal_listo: '✅', verificar: '🔍', tiempo_estado: '⏰', cambio_precio: '💲', actualizar_portal: '🌐' };

  const urg = all.filter(a => a.tipo === 'verificar' || a.tipo === 'cambio_precio').length;

  let h = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
    <div style="flex:1;min-width:80px;padding:10px;background:var(--redbg);border:1px solid var(--rb);border-radius:8px;text-align:center"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--red)">${urg}</div><div style="font-size:7px;color:var(--red);text-transform:uppercase;letter-spacing:1px">Urgentes</div></div>
    <div style="flex:1;min-width:80px;padding:10px;background:var(--b50);border:1px solid var(--b200);border-radius:8px;text-align:center"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--b700)">${all.length}</div><div style="font-size:7px;color:var(--b700);text-transform:uppercase;letter-spacing:1px">Total</div></div></div>`;

  if (!all.length) { el.innerHTML = h + '<div class="emp"><span class="emp-i">🎉</span><h3>Todo al día</h3></div>'; return; }

  h += all.slice(0, 50).map(a => {
    const e2 = em[a.tipo] || '📌';
    const f = a.created_at ? new Date(a.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    return `<div class="ali ${a.nivel || 'info'}"><div class="ale">${e2}</div><div class="alinf"><div class="altt">${a.titulo || ''}</div><div class="aldsc">${a.mensaje || ''}</div><div class="alusr">👤 ${a.emisor ? a.emisor.nombre : ''}</div><div class="altm">${f}</div></div></div>`;
  }).join('');

  el.innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════
// rDash — Dashboard
// ══════════════════════════════════════════════════════════════════

window.rDash = function () {
  const el = document.getElementById('dsc');
  if (!el) return;

  const u = U();
  const D = window.D || [];
  const isAdmin = u?.rol === 'admin' || u?.rol === 'oficina';

  if (isAdmin) {
    const total = D.length;
    let h = `<div class="card"><div class="cdh"><div class="chl"><div class="chi">📊</div><div><div class="cht">Visión del Negocio</div></div></div></div><div class="cdb"><div class="dg">`;
    h += `<div class="dc"><div class="dn2">${total}</div><div class="dl">Total</div></div>`;
    PCOLS.forEach(col => {
      const n = D.filter(p => p.estado === col.id || (col.id === 'Disponible' && (!p.estado || p.estado === 'Disponible'))).length;
      h += `<div class="dc"><div class="dn2">${n}</div><div class="dl">${col.e} ${col.l}</div></div>`;
    });
    h += `</div></div></div>`;
    el.innerHTML = h;
  } else {
    const my = D.filter(p => p.captador_id === u?.id);
    const total = my.length;
    const fresh = my.filter(p => (p._dias || 999) <= 7).length;
    const pct = total > 0 ? Math.round(fresh / total * 100) : 100;
    el.innerHTML = `<div class="card"><div class="cdh"><div class="chl"><div class="chi">📊</div><div><div class="cht">Mi Gestión</div><div class="chsb">${u?.nombre || ''}</div></div></div><div style="font-family:Fraunces,serif;font-size:22px;font-weight:700;color:${pct >= 80 ? 'var(--green)' : 'var(--gold)'}">${pct}%</div></div><div class="cdb"><div class="dg"><div class="dc"><div class="dn2">${total}</div><div class="dl">Mis inmuebles</div></div><div class="dc"><div class="dn2" style="color:var(--green)">${fresh}</div><div class="dl">Al día (≤7d)</div></div></div></div></div>`;
  }
};

// ══════════════════════════════════════════════════════════════════
// rPort — Portales
// ══════════════════════════════════════════════════════════════════

window.rPort = function () {
  const el = document.getElementById('ptl');
  if (!el) return;

  const D = window.D || [];
  const u = U();
  const isAdmin = u?.rol === 'admin' || u?.rol === 'oficina';
  const ls = D.filter(p => {
    const pend = !(p.url_metrocuadrado || '').trim() || !(p.url_fincaraiz || '').trim();
    return isAdmin ? pend : pend && p.captador_id === u?.id;
  });

  if (!ls.length) {
    el.innerHTML = '<div class="emp"><span class="emp-i">✅</span><h3>Todo al día</h3><p>Todos los inmuebles tienen enlaces</p></div>';
    return;
  }

  el.innerHTML = `<div style="font-size:13px;font-weight:700;margin-bottom:10px">⏳ ${ls.length} inmuebles pendientes de portales</div>` +
    ls.map(p => `<div style="padding:10px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;margin-bottom:6px;display:flex;gap:8px;align-items:center"><span style="font-size:18px">${emo(p.tipo)}</span><div style="flex:1"><div style="font-size:12px;font-weight:700">${p.tipo} · ${p.ciudad || ''}</div><div style="font-size:10px;color:var(--sub)">👤 ${p.captador ? p.captador.nombre : ''}</div></div><div style="display:flex;gap:3px">${(p.url_metrocuadrado || '').trim() ? '<span class="pp ppok">M²</span>' : '<span class="pp ppno">M²</span>'}${(p.url_fincaraiz || '').trim() ? '<span class="pp ppok">FR</span>' : '<span class="pp ppno">FR</span>'}</div></div>`).join('');
};

// ══════════════════════════════════════════════════════════════════
// rUsers — Usuarios (admin only)
// ══════════════════════════════════════════════════════════════════

window.rUsers = async function () {
  const el = document.getElementById('usrl');
  if (!el) return;

  el.innerHTML = '<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';

  const { data } = await SB().from('usuarios').select('*').order('nombre');
  if (!data) { el.innerHTML = '<div class="emp"><span class="emp-i">❌</span></div>'; return; }

  el.innerHTML = data.map(u => {
    const act = u.activo, rol = u.rol || 'asesor';
    const rc = rol === 'admin' ? 'adm' : rol === 'oficina' ? 'ofi' : '';
    return `<div class="uc"><img src="${u.foto || ''}" onerror="this.style.display='none'" style="width:36px;height:36px;border-radius:50%;object-fit:cover"><div class="ui"><div class="uinm">${u.nombre}</div><div class="uiem">${u.usuario || u.email || ''}</div></div><span class="url2 ${rc}">${rol}</span></div>`;
  }).join('');
};

// ══════════════════════════════════════════════════════════════════
// rPerfil — Mi Perfil
// ══════════════════════════════════════════════════════════════════

window.rPerfil = function () {
  const el = document.getElementById('perfilc');
  if (!el) return;

  const u = U();
  if (!u) return;

  let h = `<div style="text-align:center;margin-bottom:16px">`;
  if (u.foto) h += `<img src="${u.foto}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:8px;border:3px solid var(--b200)">`;
  else h += `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--b500),var(--purple));display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:24px;color:#fff;font-weight:800">${(u.nombre || '?')[0].toUpperCase()}</div>`;
  h += `<div style="font-family:Fraunces,serif;font-size:18px;font-weight:800">${u.nombre}</div>`;
  h += `<div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-top:2px">${u.rol}</div></div>`;
  h += `<div class="msc"><div class="msct">📋 Información</div><div class="mgr">`;
  h += `<div class="mf"><div class="mfl">Email</div><div class="mfv">${u.email || '—'}</div></div>`;
  h += `<div class="mf"><div class="mfl">Usuario</div><div class="mfv">${u.usuario || '—'}</div></div>`;
  h += `<div class="mf"><div class="mfl">Teléfono</div><div class="mfv">${u.telefono_contacto || '—'}</div></div>`;
  h += `</div></div>`;
  el.innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════
// rPapelera — Papelera (admin only)
// ══════════════════════════════════════════════════════════════════

window.rPapelera = async function () {
  const el = document.getElementById('papc');
  if (!el) return;

  const { data } = await SB().from('inmuebles').select('*,captador:usuarios!captador_id(nombre)').eq('eliminado', true).order('fecha_eliminacion', { ascending: false });

  if (!data || !data.length) {
    el.innerHTML = '<div class="emp"><span class="emp-i">✅</span><h3>Papelera vacía</h3></div>';
    return;
  }

  el.innerHTML = data.map(p => `<div style="display:flex;gap:10px;align-items:center;padding:12px;background:var(--cd);border:1.5px solid var(--brd);border-left:4px solid var(--red);border-radius:10px;margin-bottom:6px"><span style="font-size:20px">${emo(p.tipo)}</span><div style="flex:1"><div style="font-size:13px;font-weight:700">${p.tipo} · ${p.ciudad}</div><div style="font-size:11px;color:var(--sub)">👤 ${p.captador ? p.captador.nombre : '?'}</div></div></div>`).join('');
};

// ══════════════════════════════════════════════════════════════════
// rAgenda — Agenda
// ══════════════════════════════════════════════════════════════════

window.rAgenda = async function () {
  const el = document.getElementById('agc');
  if (!el) return;

  const u = U();
  if (!u) return;

  el.innerHTML = '<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';

  const isAdmin = u.rol === 'admin' || u.rol === 'oficina';
  const hoy = new Date().toISOString().split('T')[0];

  let q = SB().from('agenda').select('*,inmueble:inmuebles(id,tipo,ciudad,direccion,precio_arriendo,captador:usuarios!captador_id(nombre))').eq('fecha', hoy).order('hora_inicio');
  if (!isAdmin) q = q.eq('usuario_id', u.id);

  const { data } = await q;
  const evts = data || [];

  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const d = new Date();

  let h = `<div class="card"><div class="cdh"><div class="chl"><div class="chi">📅</div><div><div class="cht">Agenda${isAdmin ? ' — Gestión' : ''}</div><div class="chsb">${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}</div></div></div></div><div class="cdb">`;

  if (!evts.length) {
    h += '<div style="text-align:center;padding:20px;color:var(--sub)">📅 Sin eventos para hoy</div>';
  } else {
    evts.forEach(e => {
      const isPers = e.es_personal;
      const inm = e.inmueble;
      h += `<div class="ag-slot"><div class="ag-hora">${(e.hora_inicio || '').slice(0, 5)}</div>`;
      h += `<div class="ag-evt ${isPers ? 'personal' : 'inmueble'}">`;
      h += `<div class="ag-evt-tipo">${isPers ? '🔒 Personal' : '🔑 ' + (e.tipo_evento || 'Evento')}</div>`;
      h += `<div class="ag-evt-titulo">${isPers ? (e.titulo || 'Evento personal') : (inm ? inm.tipo + ' en ' + inm.ciudad : e.titulo || 'Evento')}</div>`;
      if (!isPers && e.cliente_nombre) h += `<div class="ag-evt-sub">👤 ${e.cliente_nombre}</div>`;
      h += `</div></div>`;
    });
  }

  h += '</div></div>';
  el.innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════
// rConc — Conciliación Portales
// ══════════════════════════════════════════════════════════════════

window.rConc = async function () {
  const el = document.getElementById('concc');
  if (!el) return;

  el.innerHTML = '<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';

  const { data } = await SB().from('conciliacion').select('*').order('created_at', { ascending: false });
  const items = data || [];
  const pend = items.filter(c => c.estado === 'pendiente').length;

  let h = `<div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;padding:10px;background:var(--redbg);border:1.5px solid var(--rb);border-radius:10px;text-align:center"><div style="font-family:Fraunces,serif;font-size:24px;font-weight:800;color:var(--red)">${pend}</div><div style="font-size:10px;font-weight:700;color:var(--red)">Pendientes</div></div><div style="flex:1;padding:10px;background:var(--b50);border:1.5px solid var(--b200);border-radius:10px;text-align:center"><div style="font-family:Fraunces,serif;font-size:24px;font-weight:800;color:var(--b700)">${items.length}</div><div style="font-size:10px;font-weight:700;color:var(--b700)">Total</div></div></div>`;

  if (!items.length) {
    el.innerHTML = h + '<div class="emp"><span class="emp-i">✅</span><h3>Sin diferencias registradas</h3></div>';
    return;
  }

  items.forEach(c => {
    const isDone = c.estado === 'completado';
    h += `<div class="conc-card${isDone ? ' done' : ''}"><div class="conc-hdr"><span class="conc-badge ${c.tipo_diferencia}">${(c.tipo_diferencia || '').toUpperCase()}</span><div class="conc-info"><div class="conc-tipo">${c.tipo_inmueble || ''} · ${c.ciudad || ''}</div><div class="conc-det">${c.detalle || ''}</div></div></div></div>`;
  });

  el.innerHTML = h;
};

console.log('[sections] All route renderers registered');
