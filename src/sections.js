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

  // P6: Arriendos column (gestor) — Tarjeta rica
  if (u.es_gestor_arriendos) {
    h += `<div class="pcol" style="border-color:#065f46;border-width:2px"><div class="pch" style="background:rgba(6,95,70,.08)"><span class="pct" style="color:#065f46">🔑 Arriendos del inventario</span><span class="pcc" style="background:#065f46">${arrDisp.length}</span></div><div class="pcb">`;
    if (!arrDisp.length) h += `<div style="text-align:center;padding:16px;font-size:12px;color:var(--sub)">✅ Sin arriendos pendientes</div>`;
    arrDisp.forEach(p => {
      const idx = allD.indexOf(p);
      const dias2 = p._dias || 0;
      const cod = p.codigo_house || '';
      const pa = p.precio_arriendo || 0;
      const hab = p.habitaciones || '';
      const ban = p.banos || '';
      const area = p.area_construida || '';
      const est = p.estrato || '';
      const propTel = p.propietario_telefono || '';
      const propNom = p.propietario_nombre || '';
      const capNom = p.captador ? p.captador.nombre : '?';
      const ubPub = p.direccion_publica || p.barrio || p.ciudad || '';
      const sortedF = p.fotos ? [...p.fotos].sort((a,b) => (a.orden||0) - (b.orden||0)) : [];
      const thumb = sortedF.length > 0 ? (sortedF[0].url_thumb || sortedF[0].url) : '';
      const specs = [];
      if (hab && hab != 0) specs.push('🛏️ '+hab);
      if (ban && ban != 0) specs.push('🚿 '+ban);
      if (area) specs.push('📐 '+area+'m²');
      if (est) specs.push('E'+est);

      h += `<div class="pkc" style="border-color:#065f46;border-width:2px;position:relative;padding:0;overflow:hidden">`;
      // Checkbox seleccion masiva
      h += `<input type="checkbox" class="arr-check" onclick="event.stopPropagation();toggleArrSelect('${p.id}',this)" style="position:absolute;top:8px;left:8px;width:18px;height:18px;cursor:pointer;z-index:2;accent-color:#065f46">`;
      // Zona superior: foto + info
      h += `<div style="display:flex;gap:0" onclick="oM&&oM(${idx >= 0 ? idx : 0})">`;
      if (thumb) h += `<div style="width:90px;min-height:90px;flex-shrink:0;background:url('${thumb}') center/cover no-repeat;border-radius:0"></div>`;
      h += `<div style="flex:1;padding:12px 12px 8px ${thumb?'10px':'12px'}">`;
      // Codigo + badge antiguedad
      h += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">`;
      if (cod) h += `<span style="font-family:monospace;font-size:9px;font-weight:800;color:var(--b700);background:var(--b50);padding:1px 6px;border-radius:4px;border:1px solid var(--b200)">${cod}</span>`;
      h += `<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:#065f4615;color:#065f46;border:1px solid #065f4630">Arriendo</span>`;
      h += timerBadge(dias2, 15);
      h += `</div>`;
      // Tipo + ubicacion
      h += `<div style="font-size:14px;font-weight:800">${emo(p.tipo)} ${p.tipo || 'Inmueble'}</div>`;
      h += `<div style="font-size:11px;color:var(--sub);margin-top:1px">📍 ${ubPub}</div>`;
      // Precio
      if (pa > 0) h += `<div style="font-family:Fraunces,serif;font-size:18px;font-weight:700;color:#065f46;margin-top:4px">${fm(pa)}<span style="font-size:11px;font-weight:500;color:var(--sub)">/mes</span></div>`;
      h += `</div></div>`;
      // Specs + propietario
      h += `<div style="padding:0 12px 8px" onclick="oM&&oM(${idx >= 0 ? idx : 0})">`;
      if (specs.length) h += `<div style="display:flex;gap:8px;font-size:11px;color:var(--sub);font-weight:600;margin-bottom:4px">${specs.join(' · ')}</div>`;
      h += `<div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--sub)"><span>👤 Captador: <b>${capNom}</b></span>`;
      if (propTel) h += `<span>· 📞 Dueño: <b>${propNom||'—'}</b></span>`;
      h += `</div></div>`;
      // Acciones
      h += `<div style="padding:6px 10px 10px;display:flex;flex-wrap:wrap;gap:4px" onclick="event.stopPropagation()">`;
      // Primarias
      h += `<button style="flex:1;min-width:100px;padding:8px;border:none;border-radius:6px;font-size:11px;font-weight:700;background:var(--b600);color:#fff;font-family:inherit;cursor:pointer" onclick="abrirAgendarEvt('${p.id}',null,null,'visita')">📅 Agendar visita</button>`;
      h += `<button style="flex:1;min-width:80px;padding:8px;border:none;border-radius:6px;font-size:11px;font-weight:700;background:#065f46;color:#fff;font-family:inherit;cursor:pointer" onclick="quickMove('${p.id}','Arrendado')">🔑 Arrendado</button>`;
      // Secundarias
      h += `<button style="padding:8px 10px;border:1.5px solid var(--brd);border-radius:6px;font-size:10px;font-weight:700;background:var(--cd);color:var(--tx);font-family:inherit;cursor:pointer" onclick="shareInm('${p.id}')">📤</button>`;
      if (propTel) h += `<a href="tel:+${propTel}" style="padding:8px 10px;border:1.5px solid var(--brd);border-radius:6px;font-size:10px;font-weight:700;background:var(--cd);color:var(--tx);text-decoration:none;display:inline-flex;align-items:center" onclick="event.stopPropagation()">📞</a>`;
      h += `<button style="padding:8px 10px;border:1.5px solid var(--red);border-radius:6px;font-size:10px;font-weight:700;background:var(--redbg);color:var(--red);font-family:inherit;cursor:pointer" onclick="gestorEliminar('${p.id}')">🗑️</button>`;
      h += `</div></div>`;
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

window.rReg = function () { if (typeof window.iForm === 'function') window.iForm(); };

// ══════════════════════════════════════════════════════════════════
// F28: rAl — Alertas (click abre inmueble)
// ══════════════════════════════════════════════════════════════════

window.rAl = function () {
  const el = document.getElementById('all'); if (!el) return;
  const all = window.ALU || [];
  const em = {inmueble_nuevo:'🆕',cambio_estado:'🔄',solicitud_info:'📩',portal_pendiente:'🌐',portal_listo:'✅',verificar:'🔍',tiempo_estado:'⏰',cambio_precio:'💲',actualizar_portal:'🌐'};
  const urg = all.filter(a => a.tipo==='verificar'||a.tipo==='cambio_precio').length;
  const pv2 = all.filter(a => a.tipo==='verificar'&&!a.leida).length;

  let h = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><div style="flex:1;min-width:80px;padding:10px;background:var(--redbg);border:1px solid var(--rb);border-radius:8px;text-align:center"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--red)">${urg}</div><div style="font-size:7px;color:var(--red);text-transform:uppercase;letter-spacing:1px">Urgentes</div></div><div style="flex:1;min-width:80px;padding:10px;background:var(--goldbg);border:1px solid var(--yb);border-radius:8px;text-align:center"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--gold)">${pv2}</div><div style="font-size:7px;color:var(--gold);text-transform:uppercase;letter-spacing:1px">Verificar</div></div><div style="flex:1;min-width:80px;padding:10px;background:var(--b50);border:1px solid var(--b200);border-radius:8px;text-align:center"><div style="font-family:Fraunces,serif;font-size:20px;font-weight:700;color:var(--b700)">${all.length}</div><div style="font-size:7px;color:var(--b700);text-transform:uppercase;letter-spacing:1px">Total</div></div></div>`;
  if (!all.length) { el.innerHTML = h+'<div class="emp"><span class="emp-i">🎉</span><h3>Todo al día</h3></div>'; return; }

  const sorted = [...all].sort((a,b) => {const pa=(a.tipo==='verificar'||a.tipo==='cambio_precio')?0:1;const pb=(b.tipo==='verificar'||b.tipo==='cambio_precio')?0:1;return pa-pb;});
  h += sorted.slice(0,50).map(a => {
    const e2=em[a.tipo]||'📌', n=a.nivel||'info';
    const f=a.created_at?new Date(a.created_at).toLocaleDateString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    const idI=a.inmueble_id||'';
    const click=idI?` onclick="openAlertInm('${idI}')" style="cursor:pointer"`:'';
    const isU=a.tipo==='verificar'||a.tipo==='cambio_precio';
    let ub='';if(isU)ub='<span style="font-size:7px;font-weight:800;background:var(--red);color:#fff;padding:1px 5px;border-radius:8px;margin-left:4px">URGENTE</span>';
    return`<div class="ali ${n}"${click}${isU?' style="border-width:3px;cursor:pointer"':''}><div class="ale">${e2}</div><div class="alinf"><div class="altt">${a.titulo||''}${ub}</div><div class="aldsc">${a.mensaje||''}</div><div class="alusr">👤 ${a.emisor?a.emisor.nombre:''}</div><div class="altm">${f}</div></div></div>`;
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

    h+=`</div></div>`;el.innerHTML=h;

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

// ══════════════════════════════════════════════════════════════════
// F14-F16: rUsers — Usuarios COMPLETO
// ══════════════════════════════════════════════════════════════════

window.rUsers = async function () {
  const el = document.getElementById('usrl'); if (!el) return;
  el.innerHTML = '<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';
  const { data } = await SB().from('usuarios').select('*').order('nombre');
  if (!data) { el.innerHTML='<div class="emp"><span class="emp-i">❌</span></div>'; return; }

  el.innerHTML = data.map(u2 => {
    const act=u2.activo, rol=u2.rol||'asesor';
    // F16: Badge de rol con color — gestor de arriendos overrides asesor label
    const isGestor = u2.es_gestor_arriendos === true;
    const displayRol = isGestor ? 'Gestor Arriendos' : rol;
    const rolColor = rol==='admin' ? 'background:rgba(139,92,246,.1);color:var(--purple)' : rol==='oficina' ? 'background:var(--goldbg);color:#92400e' : isGestor ? 'background:#065f4615;color:#065f46' : 'background:var(--b50);color:var(--b700)';
    const gestorBadge = isGestor ? '<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:#065f4615;color:#065f46;border:1px solid #065f4630;font-weight:700;margin-left:4px">🔑 Gestor</span>' : '';
    const toggleBtn = rol!=='admin' ? `<button onclick="tUsr('${u2.id}',${act})" style="padding:5px 12px;border-radius:14px;font-size:10px;font-weight:700;border:1.5px solid ${act?'var(--green)':'var(--red)'};background:${act?'var(--greenbg)':'var(--redbg)'};color:${act?'#065f46':'var(--red)'};cursor:pointer;font-family:inherit">${act?'✅ Activo':'🔒 Bloqueado'}</button>` : '';
    return `<div class="uc"><img src="${u2.foto||''}" onerror="this.style.display='none'" style="width:36px;height:36px;border-radius:50%;object-fit:cover"><div class="ui"><div class="uinm">${u2.nombre}${gestorBadge}</div><div class="uiem">${u2.usuario||u2.email||''}</div></div><span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:2px 7px;border-radius:4px;${rolColor}">${displayRol}</span>${toggleBtn}</div>`;
  }).join('');
};

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

console.log('[sections] All route renderers registered');
