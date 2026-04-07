/**
 * HOUSE CRM — functions.js
 *
 * ALL 56 missing window functions restored from the original monolithic HTML.
 * Adapted to use modular imports (supabase.js, sanitizer.js, user.js).
 *
 * This file restores FULL interactivity:
 *   - Modal detalle (oM, cm, saveAll, ldAn, addA)
 *   - Gallery (galNav, galGo, cardNav, drFallback)
 *   - Pipeline actions (quickMove, reVal, dStart, responderSol, solicitarVerif)
 *   - Registration wizard (rFS, fNx, fPr, tgC, tgAm, nextHouseCode)
 *   - Agenda (abrirAgendarEvt, guardarEvt, cancelarEvt)
 *   - Bell (toggleBell, closeBell, renderBell)
 *   - Share (shareInm, showPublicView, pubNav, pubGo)
 *   - Users (newUsr, tUsr)
 *   - Profile (savePerfil)
 *   - Portales (sPrt)
 *   - Papelera (restaurarInm)
 *   - Conciliacion (concNuevo, concGuardar, concFilt, concToggle, concCheck, concAddNote, ldConcNotas)
 *   - Filters (tc, toggleMis, populateAsesorFilter, renderRecent, iSl)
 *   - State changes (chgE, confD, eliminarInm, reasignarCap, delFoto)
 *   - Notifications (noti, openAlertInm)
 */

import { getSupabaseClient } from './config/supabase.js';

// ─── Shortcuts ───────────────────────────────────────────────────

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const D = () => window.D || [];
const fm = window.fm || ((n) => n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : '');
const emo = window.emo || ((t) => { t=(t||'').toLowerCase(); if(t.includes('penthouse'))return'👑';if(t.includes('campestre'))return'🌿';if(t.includes('finca'))return'🌾';if(t.includes('apto')||t.includes('apartamento'))return'🏢';if(t.includes('casa'))return'🏡';if(t.includes('local'))return'🏪';if(t.includes('oficina'))return'💼';if(t.includes('lote'))return'🌳';if(t.includes('bodega'))return'🏭';return'🏠'; });
const diasDesde = window.diasDesde || ((f) => { if(!f)return 999; return Math.floor((Date.now()-new Date(f).getTime())/864e5); });
const eV = window.eV || ((p) => (p.negociacion||'').toLowerCase().includes('venta'));
const eA = window.eA || ((p) => { const n=(p.negociacion||'').toLowerCase(); return n.includes('arriendo')||n.includes('renta'); });
const eA2 = window.eA2 || ((p) => eV(p)&&eA(p));
const findInm = (id) => D().find(p => p.id === id);
const descInm = (p) => p ? (p.tipo||'Inmueble')+' en '+(p.ciudad||'?') : 'inmueble';
const PCOLS = window.PCOLS || [{id:'Disponible',l:'Disponible',c:'c-d',e:'✅'},{id:'Aún Disponible',l:'Aún Disponible',c:'c-ad',e:'✓'},{id:'Arrendado',l:'Arrendado',c:'c-ar',e:'🔑'},{id:'Vendido',l:'Vendido',c:'c-ve',e:'💰'},{id:'Retirado',l:'Retirado',c:'c-re',e:'⛔'}];
const UMBRAL = window.UMBRAL || {Disponible:15,'Aún Disponible':10,Arrendado:30,Vendido:30,Retirado:999};
const FINAL_STATES = window.FINAL_STATES || ['Arrendado','Vendido','Retirado'];

function timerBadge(d,umb){if(d<=Math.floor(umb*.5))return`<span class="pk-timer ok">⏱️ ${d}d</span>`;if(d<=umb)return`<span class="pk-timer warn">⏱️ ${d}d</span>`;return`<span class="pk-timer danger">🔴 ${d}d</span>`;}

// ══════════════════════════════════════════════════════════════════
// 1. NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════

// window.noti se define en core/notifications.js (bridge al nuevo sistema notificaciones)

window.openAlertInm = function(id) {
  const idx = D().findIndex(p => p.id === id);
  if (idx > -1) window.oM(idx);
};

// ══════════════════════════════════════════════════════════════════
// 2. BELL (Campana de notificaciones)
// ══════════════════════════════════════════════════════════════════

window.toggleBell = function() {
  const dd = document.getElementById('belldd');
  if (!dd) return;
  dd.classList.toggle('show');
  if (dd.classList.contains('show')) window.renderBell();
};

window.closeBell = function() {
  document.getElementById('belldd')?.classList.remove('show');
};

document.addEventListener('click', e => {
  if (!e.target.closest('.bell-wrap')) window.closeBell();
});

// Helper: tiempo relativo (hace 5min, 2h, 3d)
window._timeAgo = function(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return Math.floor(diff/60) + 'm';
  if (diff < 86400) return Math.floor(diff/3600) + 'h';
  if (diff < 604800) return Math.floor(diff/86400) + 'd';
  return new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'short'});
};

window.renderBell = function() {
  const el = document.getElementById('belllist');
  if (!el) return;
  const notifs = (window.NOTIFS || window.ALU || []).filter(n => !n.descartada);
  if (!notifs.length) { el.innerHTML='<div class="bell-empty">🎉 Sin notificaciones</div>'; return; }

  // Agrupar por contexto_id (las del mismo inmueble/referido se colapsan)
  const grupos = {};
  const sueltas = [];
  notifs.forEach(n => {
    if (n.contexto_id) {
      if (!grupos[n.contexto_id]) grupos[n.contexto_id] = [];
      grupos[n.contexto_id].push(n);
    } else {
      sueltas.push(n);
    }
  });

  // Construir lista combinada (grupos + sueltas) ordenada por fecha de la más reciente
  const items = [];
  Object.values(grupos).forEach(grupo => {
    grupo.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    items.push({ kind: 'group', items: grupo, latest: grupo[0] });
  });
  sueltas.forEach(n => items.push({ kind: 'single', latest: n }));
  items.sort((a,b) => new Date(b.latest.created_at) - new Date(a.latest.created_at));

  const top = items.slice(0, 8);

  el.innerHTML = top.map(it => {
    const n = it.latest;
    const count = it.kind === 'group' ? it.items.length : 1;
    const noLeidas = it.kind === 'group' ? it.items.filter(x => !x.leida).length : (n.leida ? 0 : 1);
    const ico = n.icono || '📌';
    const color = n.color || '#3b82f6';
    const titulo = (n.titulo || '').replace(/'/g,"\\'");
    const mensaje = (n.mensaje || '').replace(/</g,'&lt;');
    const tiempo = window._timeAgo(n.created_at);
    const dotPrio = (n.prioridad === 'critica') ? '#ef4444'
      : (n.prioridad === 'alta') ? '#f59e0b' : '';
    const opacity = noLeidas === 0 ? '.55' : '1';

    // Botones rápidos para verificar
    let actions = '';
    if (n.tipo === 'verificar' && n.accion_destino) {
      const idI = n.accion_destino;
      actions = `<div style="display:flex;gap:4px;margin-top:6px"><button style="flex:1;padding:4px;border:none;border-radius:4px;font-size:9px;font-weight:700;background:#10b981;color:#fff;cursor:pointer" onclick="event.stopPropagation();closeBell();quickMove('${idI}','Aún Disponible')">✅ Disponible</button><button style="flex:1;padding:4px;border:none;border-radius:4px;font-size:9px;font-weight:700;background:#ef4444;color:#fff;cursor:pointer" onclick="event.stopPropagation();closeBell();quickMove('${idI}','Retirado')">❌ No disponible</button></div>`;
    }

    return `<div class="bell-item" style="opacity:${opacity};display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--brd);cursor:pointer" onclick="handleNotifClick('${n.id}','${n.accion_tipo||''}','${n.accion_destino||''}','${n.accion_seccion||''}')">
      <div style="position:relative;flex-shrink:0">
        <div style="width:34px;height:34px;border-radius:9px;background:${color}1a;display:flex;align-items:center;justify-content:center;font-size:17px">${ico}</div>
        ${count > 1 ? `<div style="position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:50%;background:${color};color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center">${count}</div>` : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;color:var(--tx);line-height:1.3">${n.titulo || ''}</div>
        ${mensaje ? `<div style="font-size:11px;color:var(--sub);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${mensaje}</div>` : ''}
        <div style="font-size:10px;color:var(--sub);margin-top:3px;opacity:.7">${tiempo}${n.emisor?.nombre ? ' · ' + n.emisor.nombre : ''}</div>
        ${actions}
      </div>
      ${dotPrio ? `<div style="width:8px;height:8px;border-radius:50%;background:${dotPrio};flex-shrink:0;margin-top:6px"></div>` : ''}
    </div>`;
  }).join('');
};

// ── Click en notificación: marcar leída + navegar contextual ──
window.handleNotifClick = async function(notifId, accionTipo, accionDestino, accionSeccion) {
  const SBc = SB();
  const u = U();
  if (!u) return;

  // 1. Marcar leída
  try {
    await SBc.from('notificaciones').update({
      leida: true, leida_at: new Date().toISOString(),
      actuada: true, actuada_at: new Date().toISOString()
    }).eq('id', notifId);

    // 2. Si tiene contexto, marcar todas las del mismo contexto
    const n = (window.NOTIFS || []).find(x => x.id === notifId);
    if (n?.contexto_id) {
      await SBc.from('notificaciones').update({
        leida: true, leida_at: new Date().toISOString()
      })
      .eq('destinatario_id', u.id)
      .eq('contexto_id', n.contexto_id)
      .eq('leida', false);
    }
  } catch (e) { console.error('[notif click]', e); }

  // 3. Cerrar dropdown
  if (window.closeBell) window.closeBell();

  // 4. Navegar según accion_tipo
  switch (accionTipo) {
    case 'abrir_inmueble':
      if (accionDestino) {
        const idx = (window.D || []).findIndex(p => p.id === accionDestino);
        if (idx > -1) {
          if (window.go) window.go('inv');
          setTimeout(() => window.oM && window.oM(idx), 200);
        } else if (window.go) {
          window.go('inv');
        }
      } else if (window.go) window.go('inv');
      break;
    case 'abrir_referido':
      if (window.go) window.go('mis-referidos');
      if (accionDestino) {
        setTimeout(() => {
          const card = document.querySelector('[data-referido-id="' + accionDestino + '"]');
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 0 0 3px #3b82f6';
            setTimeout(() => { card.style.boxShadow = ''; }, 3000);
          }
        }, 500);
      }
      break;
    case 'abrir_solicitud':
      if (window.go) window.go('mis');
      break;
    case 'abrir_pago':
      if (u.rol === 'admin' || u.rol === 'oficina') {
        if (window.go) window.go('admin-pagos');
      } else {
        if (window.go) window.go('metodo-pago');
      }
      break;
    case 'abrir_agenda':
      if (window.go) window.go('agenda');
      break;
    case 'abrir_mensaje':
      if (window.go) window.go('mensajes');
      break;
    case 'abrir_usuario':
      if (window.go) window.go('users');
      break;
    case 'abrir_seccion':
      if (accionSeccion && window.go) window.go(accionSeccion);
      break;
    default:
      console.warn('[notif] acción no reconocida:', accionTipo);
  }

  // 5. Recargar conteos
  if (window.load) window.load();
};

// ── Marcar todas como leídas ──
window.marcarTodasLeidas = async function() {
  const u = U();
  if (!u) return;
  await SB().from('notificaciones').update({
    leida: true, leida_at: new Date().toISOString()
  }).eq('destinatario_id', u.id).eq('leida', false);
  if (window.load) window.load();
  if (window.toast) window.toast('✅ Todas marcadas como leídas');
};

// ── Descartar una notificación ──
window.descartarNotificacion = async function(notifId) {
  await SB().from('notificaciones').update({
    descartada: true, leida: true, leida_at: new Date().toISOString()
  }).eq('id', notifId);
  if (window.load) window.load();
};

// ══════════════════════════════════════════════════════════════════
// 3. GALLERY & CAROUSEL
// ══════════════════════════════════════════════════════════════════

let _galFotos=[], _galIdx=0;

window.drFallback = function(img) {
  if(img._tried)return; img._tried=true;
  if(img.src.includes('lh3.google')){img.src=img.src.replace('lh3.googleusercontent.com/d/','drive.google.com/thumbnail?id=').split('=s')[0]+'&sz=w800';}
  else{img.style.opacity='.3';}
};

window.galNav = function(dir) {
  if(!_galFotos.length)return;
  _galIdx=(_galIdx+dir+_galFotos.length)%_galFotos.length;
  window.galGo(_galIdx);
};

window.galGo = function(i) {
  if(!_galFotos.length)return; _galIdx=i;
  const img=document.getElementById('gal-img');
  if(img){img._tried=false;img.onerror=function(){drFallback(this);};img.src=_galFotos[i];}
  const ct=document.getElementById('gal-ct');
  if(ct)ct.textContent=(i+1)+'/'+_galFotos.length;
  const th=document.getElementById('gal-th');
  if(th){th.querySelectorAll('img').forEach((t,j)=>{t.className=j===i?'act':'';});th.children[i]&&th.children[i].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
};

window.cardNav = function(cid,dir) {
  const car=document.getElementById(cid);if(!car)return;
  const fts=JSON.parse(car.dataset.fotos||'[]');if(fts.length<2)return;
  let idx=parseInt(car.dataset.idx||'0');
  idx=(idx+dir+fts.length)%fts.length;car.dataset.idx=idx;
  const img=car.querySelector('img');
  if(img){img._tried=false;img.onerror=function(){drFallback(this);};img.src=fts[idx];}
  const dots=car.querySelectorAll('.car-dot');
  dots.forEach((d,j)=>d.className='car-dot'+(j===idx?' act':''));
};

// Card swipe (touch)
(function(){let sx=0,sy=0,cid='',swiping=false;
document.addEventListener('touchstart',e=>{const car=e.target.closest('.pc-car');if(!car)return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;cid=car.id;swiping=true;},{passive:true});
document.addEventListener('touchmove',e=>{if(!swiping)return;const dx=e.touches[0].clientX-sx;const dy=e.touches[0].clientY-sy;if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>10)e.preventDefault();},{passive:false});
document.addEventListener('touchend',e=>{if(!swiping||!cid)return;swiping=false;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40){cardNav(cid,dx<0?1:-1);}cid='';},{passive:true});
})();

// Modal gallery swipe
(function(){let sx2=0,swiping2=false;
document.addEventListener('touchstart',e=>{if(!e.target.closest('.gal'))return;sx2=e.touches[0].clientX;swiping2=true;},{passive:true});
document.addEventListener('touchend',e=>{if(!swiping2)return;swiping2=false;const dx=e.changedTouches[0].clientX-sx2;if(Math.abs(dx)>40)galNav(dx<0?1:-1);},{passive:true});
})();

// ══════════════════════════════════════════════════════════════════
// 4. MODAL DETALLE (oM) — THE BIG ONE
// ══════════════════════════════════════════════════════════════════

let _modalDirty = false;
let _pendingFotos = [];
let _cmBusy = false;
Object.defineProperty(window,'_cmBusy',{get(){return _cmBusy;},set(v){_cmBusy=v;}});
window._modalDirtyReset=function(){_modalDirty=false;_cmBusy=false;};

window.oM = function(idx) {
  const p = D()[idx];
  if (!p) return;
  const u = U();
  const esMio = u && p.captador_id === u.id;
  const esP = u && (u.rol === 'admin' || u.rol === 'oficina');
  const esGestor = u && u.es_gestor_arriendos;
  const canEdit = esMio || esP || esGestor;
  _modalDirty = false;

  const canSeeRealDir = esMio || esP || esGestor;

  document.getElementById('mtt').textContent = (p.codigo_house ? p.codigo_house + ' · ' : '') + (p.tipo || 'Inmueble');
  document.getElementById('msb3').textContent = (p.ciudad ? '📍 ' + p.ciudad : '') + (canSeeRealDir && p.direccion ? ' · ' + p.direccion : p.direccion_publica ? ' · ' + p.direccion_publica : '');

  const inp = (id,val,ph,type) => `<input id="${id}" type="${type||'text'}" autocomplete="off" value="${(val||'').toString().replace(/"/g,'&quot;')}" placeholder="${ph||''}" style="width:100%;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:11px;font-family:inherit;color:var(--tx);background:var(--cd)">`;
  const sel = (id,opts,cur) => `<select id="${id}" class="esel" style="width:100%;font-size:11px">${opts.map(o=>`<option ${o===(cur||'')?'selected':''}>${o}</option>`).join('')}</select>`;

  let b = '';

  // GALLERY
  const fotos = p.fotos ? p.fotos.sort((a,b2) => a.orden - b2.orden) : [];
  if (fotos.length > 0) {
    b += `<div class="gal" id="gal"><img class="gal-main" id="gal-img" src="${fotos[0].url}" onclick="window.open(this.src,'_blank')" onerror="drFallback(this)">`;
    if (fotos.length > 1) b += `<button class="gal-nav prev" onclick="event.stopPropagation();galNav(-1)">‹</button><button class="gal-nav next" onclick="event.stopPropagation();galNav(1)">›</button>`;
    b += `<span class="gal-count" id="gal-ct">1/${fotos.length}</span></div>`;
    if (fotos.length > 1) {
      b += `<div class="gal-thumbs" id="gal-th">`;
      fotos.forEach((f,i) => { b += `<img src="${f.url_thumb||f.url}" class="${i===0?'act':''}" onclick="event.stopPropagation();galGo(${i})" onerror="drFallback(this)">`; });
      b += '</div>';
    }
  } else {
    b += `<div style="padding:20px;text-align:center;background:var(--cd2);border:1.5px dashed var(--brd);border-radius:10px;margin-bottom:12px"><span style="font-size:28px;display:block;margin-bottom:6px;opacity:.4">📷</span><span style="font-size:12px;color:var(--g400);font-weight:700">Sin fotos disponibles</span></div>`;
  }

  if (canEdit) {
    // EDITABLE MODE
    b += `<div class="msc"><div class="msct">🏠 Información <span style="font-size:12px;color:var(--gold)">(editable)</span></div><div class="mgr">`;
    b += `<div class="mf"><div class="mfl">Tipo</div>${sel('me_tipo',['Casa','Apartamento','Finca','Local comercial','Oficina','Lote','Casa campestre','Bodega','Penthouse'],p.tipo)}</div>`;
    b += `<div class="mf"><div class="mfl">Negociación</div>${sel('me_neg',['Venta','Arriendo','Venta y Arriendo'],p.negociacion)}</div>`;
    b += `<div class="mf ful"><div class="mfl">🔒 Dirección real</div>${inp('me_dir',p.direccion,'Dirección completa')}<div style="font-size:10px;color:var(--gold);margin-top:3px">🔒 Solo tú y admin</div></div>`;
    b += `<div class="mf ful"><div class="mfl">📍 Ubicación pública</div>${inp('me_dir_pub',p.direccion_publica||'','Barrio, zona')}<div style="font-size:10px;color:var(--green);margin-top:3px">👁️ Visible para todos</div></div>`;
    b += `<div class="mf"><div class="mfl">Ciudad</div>${inp('me_ciu',p.ciudad,'Pereira')}</div>`;
    b += `<div class="mf"><div class="mfl">Estrato</div>${sel('me_est',['','1','2','3','4','5','6'],p.estrato)}</div>`;
    b += `</div></div>`;

    b += `<div class="msc"><div class="msct">💰 Precios</div><div class="mgr"><div class="mf hlb"><div class="mfl">Venta</div>${inp('me_pv',p.precio_venta||'','450000000','number')}</div><div class="mf hlg"><div class="mfl">Arriendo/mes</div>${inp('me_pa',p.precio_arriendo||'','2500000','number')}</div></div></div>`;

    b += `<div class="msc"><div class="msct">📐 Características</div><div class="mgr">`;
    b += `<div class="mf"><div class="mfl">Habitaciones</div>${inp('me_hab',p.habitaciones||'','3','number')}</div>`;
    b += `<div class="mf"><div class="mfl">Baños</div>${inp('me_ban',p.banos||'','2','number')}</div>`;
    b += `<div class="mf"><div class="mfl">Área construida m²</div>${inp('me_area',p.area_construida||'','120','number')}</div>`;
    b += `<div class="mf"><div class="mfl">Área total m²</div>${inp('me_areatot',p.area_total||'','500','number')}</div>`;
    b += `<div class="mf"><div class="mfl">Parqueos</div>${inp('me_parq',p.parqueaderos||'','1','number')}</div>`;
    b += `<div class="mf ful"><div class="mfl">Características</div>${inp('me_carac',p.caracteristicas||'','piscina, gimnasio...')}</div>`;
    b += `</div></div>`;

    // Propietario
    b += `<div class="msc"><div class="msct">👤 Propietario</div><div style="background:var(--greenbg);border:1.5px solid var(--gb);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:13px;color:#065f46;font-weight:700">🔒 Solo tú y admin</div><div class="mgr">`;
    b += `<div class="mf ful"><div class="mfl">Nombre</div>${inp('me_prop',p.propietario_nombre,'Nombre')}</div>`;
    b += `<div class="mf"><div class="mfl">Teléfono</div>${inp('me_tel',p.propietario_telefono,'3001234567','tel')}</div>`;
    b += `<div class="mf"><div class="mfl">Email</div>${inp('me_email',p.propietario_email,'correo@mail.com','email')}</div>`;
    b += `</div></div>`;

    // Reasignar (admin)
    if (esP) {
      b += `<div class="msc"><div class="msct">🔄 Reasignar Captador</div><div style="background:var(--b50);border:1.5px solid var(--b200);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:var(--b700)">👤 Actual: <b>${p.captador?p.captador.nombre:'Sin asignar'}</b></div><select id="me_captador" class="esel" style="width:100%;font-size:12px;padding:8px"><option value="">— Seleccionar —</option>${(window.USERS||[]).filter(u2=>u2.id!==p.captador_id).map(u2=>`<option value="${u2.id}">👤 ${u2.nombre} (${u2.rol})</option>`).join('')}</select><button class="bt bp" style="width:100%;margin-top:8px" onclick="reasignarCap('${p.id}')">🔄 Reasignar</button></div>`;
    }

    // Descripciones
    b += `<div class="msc"><div class="msct">📝 Descripciones</div>`;
    b += `<div class="desc-box"><div class="desc-hdr priv">🔒 Privada — Solo tú y admin</div><textarea id="me_desc_priv" placeholder="Notas internas...">${p.descripcion_privada||''}</textarea></div>`;
    b += `<div class="desc-box"><div class="desc-hdr pub">👁️ Para cliente — Visible en enlace</div><textarea id="me_desc_cli" placeholder="Texto comercial...">${p.descripcion_cliente||''}</textarea></div>`;
    b += `<div class="desc-box"><div class="desc-hdr team">👥 Para equipo — Todos los asesores</div><textarea id="me_obs" placeholder="Info general...">${p.observaciones||''}</textarea></div></div>`;

    // Foto upload
    b += `<div class="msc"><div class="msct">📷 Fotos (${fotos.length}) <span style="font-size:10px;color:var(--sub);font-weight:500">— mantén presionado para reordenar</span></div>`;
    if (fotos.length > 0) {
      b += `<div id="fotoSortWrap" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">`;
      fotos.forEach((f,i) => { b += `<div class="foto-prev-item foto-sortable" draggable="true" data-foto-id="${f.id}" data-foto-idx="${i}" data-inm-id="${p.id}" style="cursor:grab;position:relative;touch-action:none"><img src="${f.url_thumb||f.url}" onerror="this.src='${f.url}'" style="pointer-events:none"><button class="foto-del" onclick="event.stopPropagation();delFoto('${f.id}','${p.id}')" type="button">✕</button><span style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,.6);color:#fff;font-size:8px;font-weight:800;padding:1px 5px;border-radius:3px">${i+1}</span></div>`; });
      b += '</div>';
    }
    b += `<div id="fotoUpModal"></div></div>`;

  } else {
    // READ-ONLY MODE
    const pv=p.precio_venta||0, pa=p.precio_arriendo||0;
    if(pv>0||pa>0){b+='<div class="msc"><div class="msct">💰 Precios</div><div class="mgr">';if(pv>0)b+=`<div class="mf hlb"><div class="mfl">Venta</div><div class="mfv">${fm(pv)}</div></div>`;if(pa>0)b+=`<div class="mf hlg"><div class="mfl">Arriendo</div><div class="mfv">${fm(pa)}/mes</div></div>`;b+='</div></div>';}

    const canSeeDir2 = esMio||esP||esGestor;
    const isArriendo = (p.negociacion||'').toLowerCase().includes('arriendo');
    const flds=[['tipo','Tipo'],['ciudad','Ciudad']];
    if(canSeeDir2)flds.push(['direccion','Dirección']);else if(p.direccion_publica)flds.push(['direccion_publica','Ubicación']);
    flds.push(['habitaciones','Hab.'],['banos','Baños'],['area_construida','Área construida'],['area_total','Área total'],['estrato','Estrato']);
    let fH='';flds.forEach(([k,l])=>{const v=p[k];if(v)fH+=`<div class="mf"><div class="mfl">${l}</div><div class="mfv">${v}${k.startsWith('area')?'m²':''}</div></div>`;});
    if(fH)b+=`<div class="msc"><div class="msct">🏠 Características</div><div class="mgr">${fH}</div></div>`;

    // Propietario for gestor
    if(esGestor&&isArriendo&&!canEdit){
      b+=`<div class="msc"><div class="msct">👤 Propietario</div><div style="background:var(--greenbg);border:1.5px solid var(--gb);border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:#065f46;font-weight:700">🔑 Visible para gestor</div><div class="mgr">`;
      if(p.propietario_nombre)b+=`<div class="mf ful"><div class="mfl">Nombre</div><div class="mfv">${p.propietario_nombre}</div></div>`;
      if(p.propietario_telefono)b+=`<div class="mf"><div class="mfl">Teléfono</div><div class="mfv">${p.propietario_telefono}</div></div>`;
      if(p.propietario_email)b+=`<div class="mf"><div class="mfl">Email</div><div class="mfv">${p.propietario_email}</div></div>`;
      b+=`</div></div>`;
    }

    if(p.observaciones)b+=`<div class="msc"><div class="msct">👥 Descripción equipo</div><div style="font-size:12px;line-height:1.5;padding:8px;background:var(--cd2);border-radius:6px">${p.observaciones}</div></div>`;
    if(p.captador)b+=`<div class="msc"><div class="msct">👤 Asesor</div><div class="mgr"><div class="mf ful"><div class="mfl">Captador</div><div class="mfv">👤 ${p.captador.nombre}</div></div></div></div>`;
  }

  // PORTALES
  const m2=(p.url_metrocuadrado||'').trim(), fr2=(p.url_fincaraiz||'').trim();
  if(canEdit){
    b+=`<div class="msc"><div class="msct">🌐 Portales</div><div class="mgr"><div class="mf ful"><div class="mfl">Metrocuadrado</div><div style="display:flex;gap:4px"><input id="me_m2" type="url" value="${m2}" placeholder="https://metrocuadrado.com/..." style="flex:1;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:10px;font-family:inherit;color:var(--tx);background:var(--cd)">${m2?`<a href="${m2}" target="_blank" style="font-size:10px;color:var(--b600);font-weight:700">Abrir↗</a>`:''}</div></div><div class="mf ful"><div class="mfl">Fincaraíz</div><div style="display:flex;gap:4px"><input id="me_fr" type="url" value="${fr2}" placeholder="https://fincaraiz.com.co/..." style="flex:1;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:10px;font-family:inherit;color:var(--tx);background:var(--cd)">${fr2?`<a href="${fr2}" target="_blank" style="font-size:10px;color:var(--b600);font-weight:700">Abrir↗</a>`:''}</div></div></div></div>`;
  }

  // ESTADO
  if(canEdit){
    b+=`<div class="msc"><div class="msct">⚙️ Estado</div><div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap"><select class="esel" onchange="chgE('${p.id}',this.value)">${PCOLS.map(e=>`<option ${e.id===p.estado?'selected':''}>${e.id}</option>`).join('')}</select><button class="bt bsm bgr" onclick="confD('${p.id}')">✓ Confirmar</button></div></div>`;
  }

  // SHARE
  b+=`<div style="margin-top:10px;padding:10px;background:var(--b50);border:1.5px solid var(--b200);border-radius:8px"><button style="width:100%;padding:10px;background:var(--b600);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer" onclick="event.stopPropagation();shareInm('${p.id}')">📤 Compartir con cliente</button></div>`;

  // ANOTACIONES
  b+=`<div class="abx"><div style="font-size:9px;font-weight:800;color:var(--sub);margin-bottom:4px">📝 ANOTACIONES</div><div id="anl"><span style="font-size:10px;color:var(--g400)">Cargando...</span></div>`;
  if(canEdit)b+=`<div class="ainp" style="flex-direction:column;gap:6px"><textarea id="ant" placeholder="Agregar anotación..."></textarea><div style="display:flex;gap:6px;align-items:center"><select id="ant_vis" class="esel" style="font-size:10px;padding:5px 8px"><option value="privada">🔒 Solo admin y yo</option><option value="equipo">👥 Equipo</option></select><button class="bt bsm bp" onclick="addA('${p.id}')">Agregar</button></div></div>`;
  b+=`</div>`;

  // DELETE (admin)
  if(u&&u.rol==='admin')b+=`<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--g100)"><button class="bt bd" style="width:100%" onclick="eliminarInm('${p.id}')">🗑️ Eliminar</button></div>`;

  // SAVE
  if(canEdit)b+=`<div id="saveAnchor" style="margin-top:14px"><button class="bt bp" style="width:100%;padding:14px;font-size:14px" onclick="saveAll('${p.id}')">💾 Guardar cambios</button></div>`;
  if(canEdit)b+=`<div class="fab-save"><button onclick="document.getElementById('saveAnchor').scrollIntoView({behavior:'smooth'})" title="Guardar">💾</button></div>`;

  document.getElementById('mbd').innerHTML = b;
  document.getElementById('mdl').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _galFotos = fotos.map(f => f.url);
  _galIdx = 0;

  window.ldAn(p.id);

  if(canEdit){
    _pendingFotos=[];
    setTimeout(()=>{
      if(typeof window.initFotoUpload==='function')window.initFotoUpload('fotoUpModal',r=>{_pendingFotos.push(r);_modalDirty=true;},fotos.length);
      const mbd=document.getElementById('mbd');
      if(mbd)mbd.querySelectorAll('input,textarea,select').forEach(el=>{el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{_modalDirty=true;});});
    },100);
  }
};

window.cm = function() {
  if(_cmBusy)return;
  if(_modalDirty){
    _cmBusy=true;
    // Custom confirm dialog
    const ov=document.createElement('div');
    ov.id='confirmOverlay';
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fi .15s';
    ov.innerHTML=`<div style="background:var(--cd);border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:su2 .2s;text-align:center"><div style="width:52px;height:52px;border-radius:50%;background:var(--goldbg);border:2px solid var(--yb);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px">⚠️</div><div style="font-family:'Fraunces',serif;font-size:17px;font-weight:700;margin-bottom:6px;color:var(--tx)">Cambios sin guardar</div><div style="font-size:13px;color:var(--sub);margin-bottom:20px;line-height:1.5">Tienes cambios que no has guardado.<br>¿Qué deseas hacer?</div><div style="display:flex;gap:8px"><button onclick="document.getElementById('confirmOverlay').remove();window._cmBusy=false;window._modalDirtyReset();window.cmForce()" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid var(--brd);background:var(--cd2);font-size:13px;font-weight:700;color:var(--tx);font-family:inherit;cursor:pointer">Descartar</button><button onclick="document.getElementById('confirmOverlay').remove();window._cmBusy=false;var sb=document.querySelector('#saveAnchor button');if(sb)sb.click();" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--b600);font-size:13px;font-weight:700;color:#fff;font-family:inherit;cursor:pointer">💾 Guardar</button></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click',e=>{if(e.target===ov){ov.remove();_cmBusy=false;}});
    return;
  }
  window.cmForce();
};

window.cmForce = function() {
  _modalDirty=false;
  document.getElementById('mdl').style.display='none';
  document.body.style.overflow='';
};

document.addEventListener('keydown', e => { if(e.key==='Escape')window.cm(); });

// Modal swipe to close
(function(){let sy=0,moving=false;
document.addEventListener('touchstart',e=>{const h=e.target.closest('.m-handle')||e.target.closest('.mhd2');if(h){sy=e.touches[0].clientY;moving=true;}},{passive:true});
document.addEventListener('touchmove',e=>{if(!moving)return;if(e.touches[0].clientY-sy>60){window.cm();moving=false;}},{passive:true});
document.addEventListener('touchend',()=>{moving=false;},{passive:true});
})();

// ══════════════════════════════════════════════════════════════════
// 5. SAVE ALL (modal save)
// ══════════════════════════════════════════════════════════════════

window.saveAll = async function(id) {
  const cambios={};
  const map=[['me_tipo','tipo'],['me_neg','negociacion'],['me_dir','direccion'],['me_dir_pub','direccion_publica'],['me_ciu','ciudad'],['me_est','estrato'],['me_pv','precio_venta'],['me_pa','precio_arriendo'],['me_hab','habitaciones'],['me_ban','banos'],['me_area','area_construida'],['me_areatot','area_total'],['me_parq','parqueaderos'],['me_carac','caracteristicas'],['me_prop','propietario_nombre'],['me_tel','propietario_telefono'],['me_email','propietario_email'],['me_obs','observaciones'],['me_m2','url_metrocuadrado'],['me_fr','url_fincaraiz'],['me_desc_priv','descripcion_privada'],['me_desc_cli','descripcion_cliente']];
  map.forEach(([elId,col])=>{const el=document.getElementById(elId);if(el){const v=el.value;if(v!==undefined){if(['precio_venta','precio_arriendo','area_construida','area_total','habitaciones','banos','parqueaderos'].includes(col))cambios[col]=v?parseFloat(v)||null:null;else if(['url_metrocuadrado','url_fincaraiz','direccion_publica','descripcion_privada','descripcion_cliente'].includes(col))cambios[col]=v||null;else if(v!=='')cambios[col]=v;}}});
  cambios.updated_at=new Date().toISOString();

  const p=findInm(id);const desc=descInm(p);const u=U();

  // Historial de precios
  if(p){
    const oldPV=p.precio_venta||0,oldPA=p.precio_arriendo||0;
    const newPV=cambios.precio_venta!==undefined?cambios.precio_venta||0:oldPV;
    const newPA=cambios.precio_arriendo!==undefined?cambios.precio_arriendo||0:oldPA;
    if(newPV!==oldPV&&(newPV>0||oldPV>0)){
      await SB().from('historial').insert({inmueble_id:id,usuario_id:u.id,accion:'cambio_precio',campo_modificado:'precio_venta',valor_anterior:String(oldPV),valor_nuevo_detalle:String(newPV)});
      await window.noti('cambio_precio','rojo','💲 Precio venta cambió: '+desc,u.nombre+' cambió precio de '+desc+': '+fm(oldPV)+' → '+fm(newPV),null,'all',id);
    }
    if(newPA!==oldPA&&(newPA>0||oldPA>0)){
      await SB().from('historial').insert({inmueble_id:id,usuario_id:u.id,accion:'cambio_precio',campo_modificado:'precio_arriendo',valor_anterior:String(oldPA),valor_nuevo_detalle:String(newPA)});
      await window.noti('cambio_precio','rojo','💲 Precio arriendo cambió: '+desc,u.nombre+' cambió arriendo de '+desc+': '+fm(oldPA)+' → '+fm(newPA),null,'all',id);
    }
  }

  const{error}=await SB().from('inmuebles').update(cambios).eq('id',id);
  if(!error){
    if(_pendingFotos.length>0){for(let i=0;i<_pendingFotos.length;i++){await SB().from('fotos').insert({inmueble_id:id,url:_pendingFotos[i].url,url_thumb:_pendingFotos[i].thumb,origen:'cloudinary',tipo:_pendingFotos[i].tipo||'imagen',orden:i});}_pendingFotos=[];}
    window.toast('✅ Inmueble actualizado');_modalDirty=false;window.load();window.cmForce();
  }else window.toast('Error: '+error.message,'terr');
};

// ══════════════════════════════════════════════════════════════════
// 6. ANNOTATIONS
// ══════════════════════════════════════════════════════════════════

window.ldAn = async function(id) {
  const{data}=await SB().from('anotaciones').select('*,autor:usuarios!usuario_id(nombre)').eq('inmueble_id',id).order('created_at',{ascending:false});
  const el=document.getElementById('anl');if(!el)return;
  if(!data||!data.length){el.innerHTML='<span style="font-size:10px;color:var(--g400)">Sin anotaciones</span>';return;}
  const p=findInm(id);const u=U();
  const esMio=p&&u&&p.captador_id===u.id;const esP=u&&(u.rol==='admin'||u.rol==='oficina');
  const filtered=data.filter(a=>{if(esMio||esP||a.usuario_id===u.id)return true;return(a.visibilidad||'privada')==='equipo';});
  el.innerHTML=filtered.map(a=>{
    const f=a.created_at?new Date(a.created_at).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    const vis=(a.visibilidad||'privada')==='privada'?'<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--goldbg);color:#92400e;border:1px solid var(--yb);font-weight:700">🔒 Privada</span>':'<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:var(--b50);color:var(--b700);border:1px solid var(--b200);font-weight:700">👥 Equipo</span>';
    return`<div class="ait"><div class="aim"><b>👤 ${a.autor?a.autor.nombre:'?'}</b> · ${f} ${vis}</div>${a.texto}</div>`;
  }).join('');
};

window.addA = async function(id) {
  const t=document.getElementById('ant').value.trim();if(!t)return;
  const vis=document.getElementById('ant_vis')?.value||'privada';
  const u=U();
  await SB().from('anotaciones').insert({inmueble_id:id,usuario_id:u.id,texto:t,visibilidad:vis});
  await SB().from('inmuebles').update({fecha_estado:new Date().toISOString(),ultima_confirmacion:new Date().toISOString()}).eq('id',id);
  document.getElementById('ant').value='';
  window.toast('📝 Nota guardada + timer reiniciado');
  window.ldAn(id);window.load();
};

// ══════════════════════════════════════════════════════════════════
// 7. STATE CHANGES
// ══════════════════════════════════════════════════════════════════

window.chgE = async function(id,e) {
  if(FINAL_STATES.includes(e)){const ok=await window.cfShow(e==='Arrendado'?'🔑':e==='Vendido'?'💰':'⛔','¿Cambiar a '+e+'?','Genera alertas a todo el equipo');if(!ok)return;}
  const p=findInm(id);const desc=descInm(p);const u=U();const capNom=p?.captador?.nombre||'?';
  await SB().from('inmuebles').update({estado:e,fecha_estado:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
  await SB().from('historial').insert({inmueble_id:id,usuario_id:u.id,accion:'cambio_estado',campo:'estado',valor_nuevo:e});
  if(FINAL_STATES.includes(e)){const ico=e==='Arrendado'?'🔑':e==='Vendido'?'💰':'⛔';await window.noti('cambio_estado','verde',ico+' Cierre: '+desc+' → '+e,u.nombre+' cerró '+desc+'. Captador: '+capNom,null,'all',id);}
  else await window.noti('cambio_estado','info','🔄 '+desc+' → '+e,u.nombre+' cambió '+desc+' a '+e,null,'all',id);
  window.toast('✅ Estado: '+e);window.load();window.cmForce();
};

window.confD = async function(id) {
  await SB().from('inmuebles').update({ultima_confirmacion:new Date().toISOString(),fecha_estado:new Date().toISOString()}).eq('id',id);
  window.toast('✅ Confirmado');window.load();window.cmForce();
};

window.eliminarInm = async function(id) {
  const ok=await window.cfShow('🗑️','¿Eliminar?','Se moverá a la papelera.');if(!ok)return;
  const p=findInm(id);const u=U();
  await SB().from('inmuebles').update({eliminado:true,eliminado_por:u.id,fecha_eliminacion:new Date().toISOString()}).eq('id',id);
  await SB().from('historial').insert({inmueble_id:id,usuario_id:u.id,accion:'eliminacion'});
  window.toast('🗑️ Enviado a papelera');window.load();window.cmForce();
};

window.restaurarInm = async function(id) {
  try {
    const{error}=await SB().from('inmuebles').update({eliminado:false,eliminado_por:null,fecha_eliminacion:null}).eq('id',id);
    if(error){console.error('[restaurar]',error);window.toast('Error: '+error.message,'terr');return;}
    await SB().from('historial').insert({inmueble_id:id,usuario_id:U().id,accion:'restauracion'});
    window.toast('✅ Restaurado');window.rPapelera();window.load();
  }catch(e){console.error('[restaurar]',e);window.toast('Error: '+e.message,'terr');}
};

window.reasignarCap = async function(id) {
  const sel=document.getElementById('me_captador');if(!sel||!sel.value){window.toast('Selecciona un asesor','twarn');return;}
  const p=findInm(id);const desc=descInm(p);const u=U();const newUsr=(window.USERS||[]).find(u2=>u2.id===sel.value);
  const ok=await window.cfShow('🔄','¿Reasignar?','Mover a '+(newUsr?newUsr.nombre:'?'));if(!ok)return;
  await SB().from('inmuebles').update({captador_id:sel.value,updated_at:new Date().toISOString()}).eq('id',id);
  window.toast('✅ Reasignado');window.load();window.cmForce();
};

window.delFoto = async function(fotoId,inmId) {
  const ok=await window.cfShow('🗑️','¿Eliminar foto?','Permanente.');if(!ok)return;
  await SB().from('fotos').delete().eq('id',fotoId);
  window.toast('📷 Eliminada');window.load();
  const idx=D().findIndex(p=>p.id===inmId);if(idx>=0)setTimeout(()=>window.oM(idx),500);
};

// ══════════════════════════════════════════════════════════════════
// 8. PIPELINE ACTIONS
// ══════════════════════════════════════════════════════════════════

window.quickMove = async function(id,estado) {
  if(!id||!estado)return;
  const p=findInm(id);const desc=descInm(p);const u=U();const capNom=p?.captador?.nombre||'?';const capEmail=p?.captador?.usuario||p?.captador?.email||'';
  if(FINAL_STATES.includes(estado)){
    const ico=estado==='Arrendado'?'🔑':estado==='Vendido'?'💰':'⛔';
    const ok=await window.cfShow(ico,'¿Mover a '+estado+'?','Este inmueble dejará de aparecer en el inventario.\nSe notificará al administrador para revisión.');
    if(!ok)return;
  }
  await SB().from('inmuebles').update({estado,fecha_estado:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
  await SB().from('historial').insert({inmueble_id:id,usuario_id:u.id,accion:'cambio_estado',campo:'estado',valor_nuevo:estado});
  if(estado==='Verificar Disponibilidad'){await window.noti('verificar','rojo','🔍 '+u.nombre+' solicita verificar: '+desc,u.nombre+' necesita saber si tu '+desc+' sigue disponible.',capEmail,null,id);}
  else if(estado==='Aún Disponible'){await window.noti('cambio_estado','verde','✅ '+capNom+' confirmó: '+desc+' disponible',capNom+' verificó que '+desc+' está disponible.',null,'all',id);}
  else if(FINAL_STATES.includes(estado)){
    const ico=estado==='Arrendado'?'🔑':estado==='Vendido'?'💰':'⛔';
    // Notify everyone about the closure
    await window.noti('cambio_estado','verde',ico+' Cierre: '+desc+' → '+estado,u.nombre+' cerró '+desc+'.',null,'all',id);
    // Specific notification to admin to review/delete
    await window.noti('eliminar_inmueble','rojo','🗑️ Revisar: '+desc+' fue marcado como '+estado,u.nombre+' marcó '+desc+' como '+estado+'. Revisar si se debe eliminar del sistema.','admin',null,id);
  }
  else{await window.noti('cambio_estado','info','🔄 '+desc+' → '+estado,u.nombre+' movió '+desc+' a '+estado,null,'all',id);}
  // Auto-register comision if Arrendado and has referido
  if (estado === 'Arrendado' && typeof window.registrarComisionArrendado === 'function') {
    try { await window.registrarComisionArrendado(id); } catch(e) { console.error('[quickMove] comision referido:', e); }
  }
  window.toast(estado==='Arrendado'?'🔑':estado==='Vendido'?'💰':estado==='Retirado'?'⛔':'✅'+' Movido a '+estado+'. Ya no aparecerá en inventario.');window.load();
};

window.reVal = async function(id) {
  await SB().from('inmuebles').update({fecha_estado:new Date().toISOString(),ultima_confirmacion:new Date().toISOString()}).eq('id',id);
  window.toast('✅ Timer reiniciado');window.load();
};

window.dStart = function(e,id) {
  e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';
  const card=document.getElementById('pkc-'+id);if(card)card.classList.add('dragging');
};

window.solicitarVerif = async function(inmId) {
  const p=findInm(inmId);const desc=descInm(p);const capNom=p?.captador?.nombre||'?';const u=U();
  const ok=await window.cfShow('🔍','¿Consultar disponibilidad?','Se enviará solicitud a '+capNom);if(!ok)return;
  const nota=prompt('Nota (opcional):','Mi cliente está interesado')||'';
  await SB().from('solicitudes').insert({inmueble_id:inmId,solicitante_id:u.id,nota_solicitante:nota});
  const capEmail=p?.captador?.usuario||p?.captador?.email||'';
  await window.noti('verificar','rojo','🔍 '+u.nombre+' consulta: '+desc,u.nombre+' pregunta si '+desc+' sigue disponible.'+(nota?' "'+nota+'"':''),capEmail,null,inmId);
  window.toast('🔍 Solicitud enviada');window.load();
};

window.responderSol = async function(solId,respuesta) {
  const u=U();const estados={si:'confirmado',no:'no_disponible'};
  const{data:sol}=await SB().from('solicitudes').select('*,solicitante:usuarios!solicitante_id(nombre,usuario,email)').eq('id',solId).single();
  if(!sol)return;
  const p=findInm(sol.inmueble_id);const desc=descInm(p);const solEmail=sol.solicitante?.usuario||sol.solicitante?.email||'';
  const nota=prompt('Nota de respuesta (opcional):',respuesta==='si'?'Disponible para visita':'Ya no está disponible')||'';
  await SB().from('solicitudes').update({estado:estados[respuesta],nota_respuesta:nota,respondido_at:new Date().toISOString()}).eq('id',solId);
  if(respuesta==='si'){
    await SB().from('inmuebles').update({estado:'Aún Disponible',fecha_estado:new Date().toISOString()}).eq('id',sol.inmueble_id);
    await window.noti('cambio_estado','verde','✅ '+u.nombre+' confirmó: '+desc+' disponible',u.nombre+' confirmó a '+sol.solicitante?.nombre,solEmail,null,sol.inmueble_id);
  }else{
    await window.noti('cambio_estado','rojo','❌ '+desc+' no disponible',u.nombre+' indicó que '+desc+' ya no está disponible.',solEmail,null,sol.inmueble_id);
  }
  window.toast(respuesta==='si'?'✅ Confirmado':'❌ No disponible');window.load();
};

// ══════════════════════════════════════════════════════════════════
// 9. SHARE (WhatsApp)
// ══════════════════════════════════════════════════════════════════

window.shareInm = function(id) {
  const p=findInm(id);if(!p)return;const u=U();
  const tip=p.tipo||'Inmueble',ciu=p.ciudad||'',cod=p.codigo_house||'';
  const ubPub=p.direccion_publica||p.barrio||ciu;
  const pv=p.precio_venta||0,pa=p.precio_arriendo||0;
  const hab=p.habitaciones||'',ban=p.banos||'',area=p.area_construida||'',est=p.estrato||'';
  const capTel=u?.telefono_contacto||'573105922763';
  const capNom=u?.nombre||'Inmobiliaria House';

  // Clean URL with custom domain
  const previewUrl = cod
    ? 'https://inmobiliariahouse.com.co/ver/' + encodeURIComponent(cod)
    : 'https://inmobiliariahouse.com.co/ver/' + id;

  const specs=[];
  if(hab&&hab!=0)specs.push(hab+' Hab');
  if(ban&&ban!=0)specs.push(ban+' Baños');
  if(area)specs.push(area+'m²');
  if(est)specs.push('E'+est);

  // Only the link — WhatsApp auto-generates the preview card from OG tags
  let msg = previewUrl;

  const sortedF=p.fotos?[...p.fotos].sort((a,b)=>a.orden-b.orden):[];
  const fotoThumb=sortedF.length>0?(sortedF[0].url_thumb||sortedF[0].url):'';

  const html=`<div style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" id="shareModal" onclick="if(event.target===this)this.remove()"><div style="background:var(--cd);border-radius:14px;padding:20px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);max-height:90vh;overflow-y:auto">
  <div style="font-size:16px;font-weight:800;margin-bottom:12px">📤 Compartir inmueble</div>
  ${fotoThumb?`<div style="margin-bottom:10px;border-radius:10px;overflow:hidden;border:1px solid var(--brd)"><img src="${fotoThumb}" style="width:100%;height:160px;object-fit:cover;display:block" onerror="this.parentElement.style.display='none'"></div>`:''}
  <div style="background:var(--cd2);border:1px solid var(--brd);border-radius:10px;padding:12px;margin-bottom:10px;font-size:11px;white-space:pre-wrap;line-height:1.5;max-height:140px;overflow-y:auto">${msg.replace(/\*/g,'').replace(/\n/g,'<br>')}</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <button style="width:100%;padding:14px;border:none;border-radius:10px;font-size:14px;font-weight:700;font-family:inherit;background:#25d366;color:#fff;cursor:pointer" onclick="window.open('https://wa.me/?text='+encodeURIComponent(window._shareMsg),'_blank');document.getElementById('shareModal').remove()">💬 Enviar por WhatsApp</button>
    <button style="width:100%;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:700;font-family:inherit;background:var(--b600);color:#fff;cursor:pointer" onclick="navigator.clipboard.writeText(window._shareMsg);toast('📋 Copiado');document.getElementById('shareModal').remove()">📋 Copiar mensaje</button>
    <button style="width:100%;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:700;font-family:inherit;background:var(--cd2);color:var(--tx);border:1.5px solid var(--brd);cursor:pointer" onclick="navigator.clipboard.writeText(window._sharePreview);toast('🔗 Enlace copiado');document.getElementById('shareModal').remove()">🔗 Copiar solo el enlace</button>
    <button style="width:100%;padding:10px;border:none;border-radius:10px;font-size:12px;font-family:inherit;background:var(--cd);color:var(--sub);cursor:pointer" onclick="document.getElementById('shareModal').remove()">Cancelar</button>
  </div></div></div>`;
  window._shareMsg=msg;
  window._sharePreview=previewUrl;
  document.body.insertAdjacentHTML('beforeend',html);
};

// ══════════════════════════════════════════════════════════════════
// 10. REGISTRATION WIZARD
// ══════════════════════════════════════════════════════════════════

const fD = {tipo:'',negociacion:'VENTA',precioVenta:'',precioArriendo:'',direccion:'',ciudad:'',barrio:'',nombre:'',telefono:'',email:'',area:120,areaTotal:'',estrato:0,habitaciones:3,banos:2,parqueos:1,caracteristicas:[],amenidades:[],observaciones:''};
let fS = 1;
const fLb=['Lo esencial','Propietario','Características','Amenidades','Revisar'];
const fTp=[{id:'Casa',i:'🏠'},{id:'Apartamento',i:'🏢'},{id:'Finca',i:'🌾'},{id:'Local comercial',i:'🏪'},{id:'Oficina',i:'💼'},{id:'Lote',i:'🌳'},{id:'Casa campestre',i:'🌿'},{id:'Bodega',i:'🏭'},{id:'Penthouse',i:'👑'}];
const fAP=[{id:'parqueadero',l:'Parqueo',i:'🚗'},{id:'ascensor',l:'Ascensor',i:'🛗'},{id:'piscina',l:'Piscina',i:'🏊'},{id:'gimnasio',l:'Gimnasio',i:'🏋️'},{id:'zonas_verdes',l:'Zonas V.',i:'🌿'},{id:'seguridad',l:'Seguridad',i:'🛡️'},{id:'salon_comunal',l:'Salón',i:'🎉'},{id:'terraza',l:'Terraza',i:'☀️'}];
const fAX=[{id:'cancha_tennis',l:'Tenis',i:'🎾'},{id:'cancha_futbol',l:'Fútbol',i:'⚽'},{id:'sauna',l:'Sauna',i:'🧖'},{id:'juegos_ninos',l:'Juegos',i:'🎠'},{id:'bbq',l:'BBQ',i:'🔥'},{id:'coworking',l:'Cowork',i:'💻'},{id:'pet_friendly',l:'Pet',i:'🐕'},{id:'cuarto_util',l:'Útil',i:'📦'},{id:'lavanderia',l:'Lavand.',i:'🧺'},{id:'deposito',l:'Depósito',i:'🗄️'}];

window.fD = fD;
window.nextHouseCode = async function(){
  try {
    const{data}=await SB().from('inmuebles').select('codigo_house').not('codigo_house','is',null).order('codigo_house',{ascending:false}).limit(1);
    let maxN=0;
    if(data&&data[0]&&data[0].codigo_house){maxN=parseInt(data[0].codigo_house.replace('HOUSE-',''))||0;}
    // Also check local data as fallback
    D().forEach(p=>{if(p.codigo_house){const n=parseInt(p.codigo_house.replace('HOUSE-',''));if(n>maxN)maxN=n;}});
    return'HOUSE-'+String(maxN+1).padStart(3,'0');
  }catch(e){
    let maxN=0;D().forEach(p=>{if(p.codigo_house){const n=parseInt(p.codigo_house.replace('HOUSE-',''));if(n>maxN)maxN=n;}});return'HOUSE-'+String(maxN+1).padStart(3,'0');
  }
};

window.tgC = function(id){const i=fD.caracteristicas.indexOf(id);if(i>-1)fD.caracteristicas.splice(i,1);else fD.caracteristicas.push(id);window.rFS();};
window.tgAm = function(id){const i=fD.amenidades.indexOf(id);if(i>-1)fD.amenidades.splice(i,1);else fD.amenidades.push(id);window.rFS();};

window.iForm = function(){try{const m=JSON.parse(localStorage.getItem('hcrm_fmem')||'{}');if(m.ciudad&&!fD.ciudad)fD.ciudad=m.ciudad;if(m.tipo&&!fD.tipo)fD.tipo=m.tipo;}catch(e){}window.rFS();};

window.rFS = function(){
  document.getElementById('fsl').textContent=`Paso ${fS}/5 · ${fLb[fS-1]}`;
  let d='';for(let i=1;i<=5;i++)d+=`<div class="pd ${i===fS?'act':i<fS?'dn':''}"></div>`;
  document.getElementById('fdt').innerHTML=d;
  document.getElementById('fp').style.display=fS>1?'flex':'none';
  document.getElementById('fn').textContent=fS<5?'Continuar →':'✓ Publicar';
  const c=document.getElementById('fc');
  if(fS===1)rF1(c);else if(fS===2)rF2(c);else if(fS===3)rF3(c);else if(fS===4)rF4(c);else{c.innerHTML='<div style="text-align:center;padding:20px;color:var(--sub)">Generando código...</div>';rF5(c);}
};

async function rF1(c){const nxt=await nextHouseCode();let h=`<div style="background:var(--b50);border:2px solid var(--b200);border-radius:10px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:9px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:1px">ID INMUEBLE</div><div style="font-family:monospace;font-size:20px;font-weight:800;color:var(--b700);margin-top:2px">${nxt}</div></div><button type="button" style="padding:6px 12px;border:1.5px solid var(--b200);border-radius:6px;background:var(--cd);font-size:11px;font-weight:700;color:var(--b600);cursor:pointer" onclick="navigator.clipboard.writeText('${nxt}');toast('📋 Copiado')">📋</button></div>`;
h+='<div class="ff"><label class="ffl">Tipo <span class="ffr">*</span></label><div class="ftg">';fTp.forEach(t=>{h+=`<div class="ftc ${fD.tipo===t.id?'sel':''}" onclick="fD.tipo='${t.id}';rFS()"><div class="fti">${t.i}</div>${t.id}</div>`;});
h+=`</div></div><div class="ff"><label class="ffl">Negociación <span class="ffr">*</span></label><div class="fsg"><button class="fsgb ${fD.negociacion==='VENTA'?'act':''}" onclick="fD.negociacion='VENTA';rFS()">Venta</button><button class="fsgb ${fD.negociacion==='ARRIENDO'?'act':''}" onclick="fD.negociacion='ARRIENDO';rFS()">Arriendo</button><button class="fsgb ${fD.negociacion==='AMBAS'?'act':''}" onclick="fD.negociacion='AMBAS';rFS()">Ambas</button></div></div>`;
if(fD.negociacion!=='ARRIENDO')h+=`<div class="ff"><label class="ffl">Precio Venta</label><input class="ffi" type="number" value="${fD.precioVenta}" onchange="fD.precioVenta=this.value" placeholder="450000000"></div>`;
if(fD.negociacion!=='VENTA')h+=`<div class="ff"><label class="ffl">Arriendo/mes</label><input class="ffi" type="number" value="${fD.precioArriendo}" onchange="fD.precioArriendo=this.value" placeholder="2500000"></div>`;
h+=`<div class="ff"><label class="ffl">Dirección <span class="ffr">*</span></label><input class="ffi" value="${fD.direccion}" onchange="fD.direccion=this.value" placeholder="Calle 50 #32-15"></div><div class="ffg"><div class="ff"><label class="ffl">Ciudad <span class="ffr">*</span></label><input class="ffi" value="${fD.ciudad}" onchange="fD.ciudad=this.value" placeholder="Pereira"></div><div class="ff"><label class="ffl">Barrio</label><input class="ffi" value="${fD.barrio}" onchange="fD.barrio=this.value"></div></div>`;
c.innerHTML=h;}

function rF2(c){c.innerHTML=`<div class="ff"><label class="ffl">Propietario <span class="ffr">*</span></label><input class="ffi" value="${fD.nombre}" onchange="fD.nombre=this.value" placeholder="Nombre"></div><div class="ff"><label class="ffl">Teléfono <span class="ffr">*</span></label><input class="ffi" type="tel" value="${fD.telefono}" onchange="fD.telefono=this.value" placeholder="3001234567"></div><div class="ff"><label class="ffl">Email</label><input class="ffi" type="email" value="${fD.email}" onchange="fD.email=this.value"></div><div style="background:var(--goldbg);border:1px solid var(--yb);border-radius:6px;padding:8px;font-size:10px">🔒 Solo visible para ti y admin</div>`;}

function rF3(c){let h=`<div class="ffg"><div class="ff"><label class="ffl">Área construida m²</label><input class="ffi" type="number" value="${fD.area}" onchange="fD.area=this.value"></div><div class="ff"><label class="ffl">Área total m²</label><input class="ffi" type="number" value="${fD.areaTotal}" onchange="fD.areaTotal=this.value"></div></div><div class="ff"><label class="ffl">Estrato</label><div style="display:flex;gap:5px">`;
for(let i=1;i<=6;i++)h+=`<button style="flex:1;height:34px;border-radius:4px;border:2px solid ${fD.estrato==i?'var(--b500)':'var(--brd)'};background:${fD.estrato==i?'var(--b50)':'var(--cd)'};font-weight:700;font-size:12px;color:var(--tx)" onclick="fD.estrato=${i};rFS()">${i}</button>`;
h+=`</div></div><div class="ctr"><div class="ctrl">🛏️ Habitaciones</div><div class="ctrc"><button class="cb" onclick="fD.habitaciones=Math.max(0,fD.habitaciones-1);rFS()">−</button><div class="cv">${fD.habitaciones}</div><button class="cb" onclick="fD.habitaciones++;rFS()">+</button></div></div><div class="ctr"><div class="ctrl">🚿 Baños</div><div class="ctrc"><button class="cb" onclick="fD.banos=Math.max(0,fD.banos-1);rFS()">−</button><div class="cv">${fD.banos}</div><button class="cb" onclick="fD.banos++;rFS()">+</button></div></div><div class="ctr"><div class="ctrl">🚗 Parqueos</div><div class="ctrc"><button class="cb" onclick="fD.parqueos=Math.max(0,fD.parqueos-1);rFS()">−</button><div class="cv">${fD.parqueos}</div><button class="cb" onclick="fD.parqueos++;rFS()">+</button></div></div>`;
h+=`<div class="ff"><label class="ffl">Características</label><div class="cps">${[{id:'cocina_integral',l:'🍳 Cocina'},{id:'balcon',l:'🏞️ Balcón'},{id:'patio',l:'🌳 Patio'},{id:'estudio',l:'📚 Estudio'},{id:'zona_ropas',l:'👕 Ropas'},{id:'doble_altura',l:'📐 Doble alt.'}].map(x=>`<div class="ch ${fD.caracteristicas.includes(x.id)?'on':''}" onclick="tgC('${x.id}')">${x.l}</div>`).join('')}</div></div>`;
c.innerHTML=h;}

function rF4(c){let h='<div class="ff"><label class="ffl">Amenidades</label><div class="amg">';fAP.forEach(a=>{h+=`<button class="amb ${fD.amenidades.includes(a.id)?'on':''}" onclick="tgAm('${a.id}')"><div class="ami">${a.i}</div>${a.l}</button>`;});
h+='</div><div class="cps">';fAX.forEach(a=>{h+=`<div class="ch ${fD.amenidades.includes(a.id)?'on':''}" onclick="tgAm('${a.id}')">${a.i} ${a.l}</div>`;});
h+=`</div></div><div class="ff"><label class="ffl">📷 Fotos</label><div id="fotoUpReg"></div></div><div class="ff"><label class="ffl">Observaciones</label><textarea class="ffi" style="min-height:60px;resize:vertical" onchange="fD.observaciones=this.value">${fD.observaciones}</textarea></div>`;
c.innerHTML=h;_pendingFotos=[];if(typeof window.initFotoUpload==='function')window.initFotoUpload('fotoUpReg',r=>{_pendingFotos.push(r);},0);}

async function rF5(c){const nl=fD.negociacion==='AMBAS'?'Venta y Arriendo':fD.negociacion==='VENTA'?'Venta':'Arriendo';const nxt=await nextHouseCode();
c.innerHTML=`<div style="background:var(--b50);border:2px solid var(--b200);border-radius:9px;padding:14px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:20px">${emo(fD.tipo)}</span><span class="cod-badge" style="font-size:13px;padding:4px 10px">${nxt}</span></div><div style="font-family:Fraunces,serif;font-size:18px;font-weight:700;color:var(--b800)">${fD.tipo||'Sin tipo'}</div><div style="font-size:10px;color:var(--sub);margin-top:2px">📍 ${fD.direccion}, ${fD.ciudad}</div>${fD.precioVenta?`<div style="font-family:Fraunces,serif;font-size:16px;font-weight:700;color:var(--b700);margin-top:4px">${fm(+fD.precioVenta)}</div>`:''}${fD.precioArriendo?`<div style="font-size:13px;font-weight:700;color:#065f46;margin-top:2px">${fm(+fD.precioArriendo)}/mes</div>`:''}<div style="display:flex;gap:3px;margin-top:6px;flex-wrap:wrap"><span class="sp">${nl}</span>${fD.habitaciones?`<span class="sp">🛏️${fD.habitaciones}</span>`:''}${fD.banos?`<span class="sp">🚿${fD.banos}</span>`:''}${fD.area?`<span class="sp">📐${fD.area}m²</span>`:''}</div></div><div style="font-size:10px;color:var(--sub);margin-top:6px">👤 ${fD.nombre} · ${fD.telefono}</div>`;}

window.fPr = function(){if(fS>1){fS--;window.rFS();}};

window.fNx = async function(){
  if(fS<5){fS++;window.rFS();return;}
  const btn=document.getElementById('fn');btn.disabled=true;btn.textContent='Enviando...';
  try{localStorage.setItem('hcrm_fmem',JSON.stringify({ciudad:fD.ciudad,tipo:fD.tipo}));}catch(e){}
  const neg=fD.negociacion==='AMBAS'?'Venta y Arriendo':fD.negociacion==='VENTA'?'Venta':'Arriendo';
  const u=U();
  let newInm=null,error=null;
  for(let attempt=0;attempt<3;attempt++){
    const codigo=await nextHouseCode();
    const res=await SB().from('inmuebles').insert({captador_id:u.id,codigo_house:codigo,tipo:fD.tipo,negociacion:neg,direccion:fD.direccion,ciudad:fD.ciudad,barrio:fD.barrio,precio_venta:fD.precioVenta?parseFloat(fD.precioVenta):null,precio_arriendo:fD.precioArriendo?parseFloat(fD.precioArriendo):null,area_construida:fD.area?parseFloat(fD.area):null,area_total:fD.areaTotal?parseFloat(fD.areaTotal):null,estrato:fD.estrato?String(fD.estrato):null,habitaciones:fD.habitaciones||null,banos:fD.banos||null,parqueaderos:fD.parqueos||null,caracteristicas:fD.amenidades.join(', '),observaciones:fD.observaciones,propietario_nombre:fD.nombre,propietario_telefono:fD.telefono,propietario_email:fD.email,estado:'Disponible'}).select().single();
    if(!res.error){newInm=res.data;error=null;break;}
    if(res.error?.message?.includes('codigo_house')){error=res.error;continue;}
    error=res.error;break;
  }
  if(!error&&newInm){
    if(_pendingFotos.length>0){for(let i=0;i<_pendingFotos.length;i++){await SB().from('fotos').insert({inmueble_id:newInm.id,url:_pendingFotos[i].url,url_thumb:_pendingFotos[i].thumb,origen:'cloudinary',tipo:_pendingFotos[i].tipo||'imagen',orden:i});}_pendingFotos=[];}
    const desc2=(fD.tipo||'Inmueble')+' en '+(fD.ciudad||'?');
    await window.noti('inmueble_nuevo','info','🆕 '+u.nombre+' registró: '+desc2,u.nombre+' registró nuevo '+desc2,null,'all',newInm.id);
    window.toast('✅ Inmueble registrado');
    const lastC=fD.ciudad,lastT=fD.tipo;Object.assign(fD,{tipo:lastT,negociacion:'VENTA',precioVenta:'',precioArriendo:'',direccion:'',ciudad:lastC,barrio:'',nombre:'',telefono:'',email:'',area:120,areaTotal:'',estrato:0,habitaciones:3,banos:2,parqueos:1,caracteristicas:[],amenidades:[],observaciones:''});
    fS=1;window.rFS();window.load();window.go('inv');
  }else window.toast(error?.message||'Error','terr');
  btn.disabled=false;btn.textContent='✓ Publicar';
};

// ══════════════════════════════════════════════════════════════════
// 11. AGENDA
// ══════════════════════════════════════════════════════════════════

window.abrirAgendarEvt = function(inmId,fecha,hora,tipoEvento) {
  const u=U();const p=inmId?findInm(inmId):null;const hoy=fecha||new Date().toISOString().split('T')[0];const horaD=hora||'09:00';
  const tipoD=tipoEvento||'visita';
  const inmSel=p?`<div style="background:#065f4610;border:1.5px solid #065f4630;border-radius:8px;padding:10px;margin-bottom:10px"><div style="font-size:13px;font-weight:700">${emo(p.tipo)} ${p.tipo} en ${p.ciudad}${p.codigo_house?' · <span style="font-family:monospace;font-size:10px;color:var(--b700)">'+p.codigo_house+'</span>':''}</div></div>`:'';
  const inmOpts=D().filter(q=>(q.negociacion||'').toLowerCase().includes('arriendo')&&!q.eliminado&&(q.estado==='Disponible'||q.estado==='Aún Disponible')).map(q=>`<option value="${q.id}" ${q.id===inmId?'selected':''}>${q.tipo} — ${q.ciudad}${q.codigo_house?' ('+q.codigo_house+')':''}</option>`).join('');
  const isAdmin=u.rol==='admin'||u.rol==='oficina';
  const gestores=(window.USERS||[]).filter(g=>g.es_gestor_arriendos&&g.id!==u.id&&g.activo);
  const asignarHTML=isAdmin&&gestores.length?`<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">ASIGNAR A</label><select id="agAsignar" class="esel" style="width:100%;font-size:12px;padding:8px" onchange="document.getElementById('agNotaAdminWrap').style.display=this.value?'block':'none'"><option value="">Para mí</option>${gestores.map(g=>'<option value="'+g.id+'">🔑 '+g.nombre+' (gestor)</option>').join('')}</select></div><div id="agNotaAdminWrap" style="margin-bottom:10px;display:none"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">NOTA PARA EL GESTOR</label><textarea id="agNotaAdmin" placeholder="Instrucciones..." style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;font-family:inherit;min-height:40px;resize:none;color:var(--tx);background:var(--cd)"></textarea></div>`:'';
  const tipoOpts=['visita','entrega','firma','otro','personal'].map(t=>{const lbl={visita:'🔑 Visita',entrega:'🔑 Entrega llaves',firma:'📝 Firma',otro:'📌 Otro',personal:'🔒 Personal'};return`<option value="${t}" ${t===tipoD?'selected':''}>${lbl[t]}</option>`;}).join('');
  const inmWrapDisplay=inmId?'none':'block';
  const html=`<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" id="agModal" onclick="if(event.target===this)this.remove()"><div style="background:var(--cd);border-radius:14px;padding:24px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
  <div style="font-size:18px;font-weight:800;margin-bottom:16px">📅 Nuevo Evento</div>${inmSel}
  ${asignarHTML}
  <div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">TIPO</label><select id="agTipo" class="esel" style="width:100%;font-size:12px;padding:8px" onchange="var v=this.value;document.getElementById('agInmWrap').style.display=v==='personal'?'none':'block';document.getElementById('agCliWrap').style.display=v==='personal'?'none':'block'">${tipoOpts}</select></div>
  <div id="agInmWrap" style="margin-bottom:10px;display:${inmWrapDisplay}"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">INMUEBLE</label><select id="agInm" class="esel" style="width:100%;font-size:12px;padding:8px"><option value="">— Seleccionar —</option>${inmOpts}</select></div>
  ${inmId?`<input type="hidden" id="agInmFixed" value="${inmId}">`:''}
  <div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">FECHA</label><input id="agFecha" type="date" value="${hoy}" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;color:var(--tx);background:var(--cd)"></div><div style="flex:1"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">HORA</label><input id="agHora" type="time" value="${horaD}" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;color:var(--tx);background:var(--cd)"></div><div style="flex:1"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">FIN</label><input id="agHoraFin" type="time" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;color:var(--tx);background:var(--cd)"></div></div>
  <div id="agCliWrap"><div style="display:flex;gap:8px;margin-bottom:10px"><div style="flex:1"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">CLIENTE</label><input id="agCliente" placeholder="Nombre" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;color:var(--tx);background:var(--cd)"></div><div style="flex:1"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">TEL</label><input id="agCliTel" type="tel" placeholder="300..." style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;color:var(--tx);background:var(--cd)"></div></div></div>
  <div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">NOTA</label><input id="agTitulo" placeholder="Nota..." style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;color:var(--tx);background:var(--cd)"></div>
  <div style="display:flex;gap:8px"><button style="flex:1;padding:12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit" onclick="document.getElementById('agModal').remove()">Cancelar</button><button style="flex:1;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;background:var(--b600);color:#fff;cursor:pointer;font-family:inherit" onclick="guardarEvt()">💾 Guardar</button></div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
};

window.guardarEvt = async function() {
  const tipo=document.getElementById('agTipo').value;const isPers=tipo==='personal';
  const fixedInm=document.getElementById('agInmFixed');
  const inmId=isPers?null:(fixedInm?fixedInm.value:(document.getElementById('agInm').value||null));
  const fecha=document.getElementById('agFecha').value;const hora=document.getElementById('agHora').value;
  const horaFin=document.getElementById('agHoraFin').value||null;
  if(!fecha||!hora){window.toast('Fecha y hora obligatorias','twarn');return;}
  const u=U();
  const asignarEl=document.getElementById('agAsignar');
  const asignadoA=asignarEl?asignarEl.value:'';
  const notaAdminEl=document.getElementById('agNotaAdmin');
  const notaAdmin=notaAdminEl?notaAdminEl.value:'';
  const targetUserId=asignadoA||u.id;
  try {
    const{error}=await SB().from('agenda').insert({usuario_id:targetUserId,creado_por:u.id,inmueble_id:inmId||null,fecha,hora_inicio:hora,hora_fin:horaFin,tipo_evento:tipo,es_personal:isPers,titulo:document.getElementById('agTitulo').value||null,cliente_nombre:isPers?null:(document.getElementById('agCliente').value||null),cliente_telefono:isPers?null:(document.getElementById('agCliTel').value||null),nota_admin:notaAdmin||null,estado:'pendiente'});
    if(error){console.error('[guardarEvt]',error);window.toast('Error: '+error.message,'terr');return;}
    // Alertas bidireccionales
    if(asignadoA&&asignadoA!==u.id){
      const gestorUser=(window.USERS||[]).find(x=>x.id===asignadoA);
      const gestorEmail=gestorUser?(gestorUser.usuario||gestorUser.email):'';
      const p=inmId?findInm(inmId):null;const desc=p?descInm(p):(document.getElementById('agTitulo').value||'evento');
      await window.noti('agenda_gestor','amarillo','📅 '+u.nombre+' te asignó: '+tipo+' '+desc,u.nombre+' agendó '+tipo+' para ti: '+desc+' — '+fecha+' '+hora+(notaAdmin?'. Nota: "'+notaAdmin+'"':''),gestorEmail,null,inmId);
    } else if(u.es_gestor_arriendos){
      const p=inmId?findInm(inmId):null;const desc=p?descInm(p):(document.getElementById('agTitulo').value||'evento');
      await window.noti('agenda_gestor','info','📅 '+u.nombre+' agendó: '+tipo+' '+desc,u.nombre+' (gestor) agendó '+tipo+': '+desc+' — '+fecha+' '+hora,null,'admin',inmId);
    }
    document.getElementById('agModal').remove();window.toast('📅 Agendado');if(typeof window.rAgenda==='function')window.rAgenda();
  }catch(e){console.error('[guardarEvt]',e);window.toast('Error: '+e.message,'terr');}
};

window.cancelarEvt = async function(id) {
  const ok=await window.cfShow('🗑️','¿Cancelar evento?','Se eliminará.');if(!ok)return;
  try{await SB().from('agenda').delete().eq('id',id);window.toast('✅ Cancelado');window.rAgenda();}catch(e){console.error('[cancelarEvt]',e);window.toast('Error','terr');}
};

// ══════════════════════════════════════════════════════════════════
// 12. USERS + PROFILE + PORTALES
// ══════════════════════════════════════════════════════════════════

window.newUsr = function() {
  const n=prompt('Nombre:');if(!n)return;const usr=prompt('Usuario:');if(!usr)return;const pwd=prompt('Contraseña:');if(!pwd)return;const em=prompt('Email (opcional):','');const rl=prompt('Rol (asesor/oficina):','asesor');if(!rl)return;
  window.hashPwd(pwd).then(h2=>{SB().from('usuarios').insert({nombre:n,usuario:usr.toLowerCase(),password_hash:h2,email:em||null,rol:rl.toLowerCase(),activo:true}).then(({error})=>{if(!error){window.toast('✅ Creado');window.rUsers();}else window.toast(error.message,'terr');});});
};

window.tUsr = async function(id,cur) {
  try {
    const{error}=await SB().from('usuarios').update({activo:!cur}).eq('id',id);
    if(error){console.error('[tUsr]',error);window.toast('Error: '+error.message,'terr');return;}
    window.toast(!cur?'✅ Activado':'🔒 Bloqueado');window.rUsers();
  }catch(e){console.error('[tUsr]',e);window.toast('Error: '+e.message,'terr');}
};

window.savePerfil = async function() {
  const u=U();const upd={};
  const nm=document.getElementById('pf_nombre')?.value.trim();if(nm&&nm!==u.nombre)upd.nombre=nm;
  const em=document.getElementById('pf_email')?.value.trim();if(em!==(u.email||''))upd.email=em||null;
  const usr=document.getElementById('pf_usuario')?.value.trim().toLowerCase();if(usr&&usr!==(u.usuario||''))upd.usuario=usr;
  const pwd=document.getElementById('pf_pwd')?.value;if(pwd)upd.password_hash=await window.hashPwd(pwd);
  const tel=document.getElementById('pf_tel')?.value.trim();if(tel!==(u.telefono_contacto||''))upd.telefono_contacto=tel||null;
  if(!Object.keys(upd).length){window.toast('Sin cambios','twarn');return;}
  const{error}=await SB().from('usuarios').update(upd).eq('id',u.id);
  if(!error){window.toast('✅ Perfil actualizado');if(upd.nombre)u.nombre=upd.nombre;if(upd.email!==undefined)u.email=upd.email;if(upd.telefono_contacto!==undefined)u.telefono_contacto=upd.telefono_contacto;window.userStore?.set(u);if(upd.password_hash||upd.usuario){window.toast('🔄 Vuelve a ingresar','tinfo');setTimeout(()=>window.logout(),2000);}else window.rPerfil();}
  else window.toast(error.message,'terr');
};

window.sPrt = async function(id,field) {
  const url=prompt('Pega el enlace del portal:');if(!url)return;
  await SB().from('inmuebles').update({[field]:url,updated_at:new Date().toISOString()}).eq('id',id);
  const p=findInm(id);const desc=descInm(p);const portal=field==='url_metrocuadrado'?'Metrocuadrado':'Fincaraíz';
  await window.noti('portal_listo','verde','🌐 '+desc+' en '+portal,U().nombre+' subió '+desc+' a '+portal,null,'admin',id);
  window.toast('✅ Portal actualizado');window.load();if(window.rPort)window.rPort();
};

// ══════════════════════════════════════════════════════════════════
// 13. FILTERS (Inventario)
// ══════════════════════════════════════════════════════════════════

const F = {neg:new Set(),ciu:new Set(),tipo:new Set()};
window.F = F;
window._myFilter = false;
window._favFilterActive = false;
window._tiempoFiltro = null;
window._openPanel = null;
window._asesorFilter = null;

// ── Filter options data ──
const NEG_OPTS = [{v:'venta',l:'Comprar',e:'🏠',d:'En venta',c:'#059669'},{v:'arriendo',l:'Arrendar',e:'🔑',d:'En arriendo',c:'#d97706'},{v:'ambas',l:'Las dos',e:'🔄',d:'Ver todo',c:'#7c3aed'}];
const CIU_OPTS = [{v:'Pereira',e:'🏙️',d:'Centro, Pinares, Álamos, Cuba...'},{v:'Dosquebradas',e:'🌆',d:'La Pradera, Camilo Torres...'},{v:'Santa Rosa',e:'🌿',d:'Centro, Termales, veredas'},{v:'Cerritos',e:'🌳',d:'Condominios, fincas, campestre'}];
const TIPO_OPTS = [{v:'Apartamento',e:'🏢',l:'Apto'},{v:'Casa',e:'🏡',l:'Casa'},{v:'Finca',e:'🌾',l:'Finca'},{v:'Local',e:'🏪',l:'Local'},{v:'Lote',e:'📐',l:'Lote'},{v:'Oficina',e:'💼',l:'Oficina'},{v:'Bodega',e:'🏭',l:'Bodega'},{v:'Penthouse',e:'✨',l:'PH'}];
const NEG_MAP = {venta:'Comprar',arriendo:'Arrendar',ambas:'Las dos'};

// ── Format price input with thousands separator ──
window.fmtPrice = function(el) {
  const clean = el.value.replace(/\D/g,'');
  el.value = clean ? Number(clean).toLocaleString('es-CO') : '';
};
window.autoHasta = function(fromId, toId, tipo) {
  const desde = parsePriceInput(fromId);
  if (!desde) return;
  const toEl = document.getElementById(toId);
  if (!toEl || toEl.value.replace(/\D/g,'')) return; // don't overwrite manual value
  const delta = tipo === 'arr' ? 300000 : 50000000;
  const hasta = desde + delta;
  toEl.value = hasta.toLocaleString('es-CO');
};
function parsePriceInput(id) {
  const v = (document.getElementById(id)?.value||'').replace(/\D/g,'');
  return v ? Number(v) : 0;
}
function fmShort(n) {
  if(!n&&n!==0)return'';
  if(n>=1e9)return'$'+(n/1e9).toFixed(1).replace('.0','')+'B';
  if(n>=1e6)return'$'+(n/1e6).toFixed(1).replace('.0','')+'M';
  if(n>=1e3)return'$'+(n/1e3).toFixed(0)+'K';
  return'$'+n.toLocaleString();
}

// ── SVG chevron helper ──
function chevSvg(open, light) { return `<svg class="pill-chev${open?' open':''}" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5L5 6.5L8 3.5" stroke="${light?'#fff':'#8b7e6e'}" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`; }

// ── Toggle panel ──
window.togglePanel = function(name) {
  // Cancela cualquier auto-cierre pendiente al abrir/cerrar manualmente
  if (window._panelCloseTimer) { clearTimeout(window._panelCloseTimer); window._panelCloseTimer = null; }
  const prev = window._openPanel;
  window._openPanel = (prev === name) ? null : name;
  ['neg','ciudad','tipo','precio','asesor'].forEach(p => {
    const el = document.getElementById('panel' + p.charAt(0).toUpperCase() + p.slice(1));
    if (el) el.style.display = (p === window._openPanel) ? '' : 'none';
  });
  if (window._openPanel) renderPanel(window._openPanel);
  updatePills();
};

// ── Render panel content ──
function renderPanel(name) {
  const el = document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1));
  if (!el) return;
  if (name === 'neg') {
    el.innerHTML = `<div class="fpanel"><div class="fpanel-title">¿Qué estás buscando?</div><div style="display:flex;gap:8px">${NEG_OPTS.map(o => { const s = F.neg.has(o.v); return `<button class="fopt-neg${s?' sel':''}" onclick="pillToggle('neg','${o.v}')" style="${s?'border-color:'+o.c+';background:'+o.c+'0c':''}"><span style="font-size:30px">${o.e}</span><span style="font-size:15px;font-weight:800;color:${s?o.c:'#3a3530'}">${o.l}</span><span style="font-size:11px;color:#a8977f">${o.d}</span>${s?`<div class="fopt-check" style="background:${o.c}">✓</div>`:''}</button>`; }).join('')}</div></div>`;
  } else if (name === 'ciudad') {
    el.innerHTML = `<div class="fpanel"><div class="fpanel-title">¿En qué ciudad buscas?</div><div style="display:flex;flex-direction:column;gap:6px">${CIU_OPTS.map(c => { const s = F.ciu.has(c.v); return `<button class="fopt-ciu${s?' sel':''}" onclick="pillToggle('ciu','${c.v}')"><span style="font-size:24px">${c.e}</span><div style="flex:1"><div style="font-size:16px;font-weight:800;color:${s?'#1a4f8b':'#3a3530'}">${c.v}</div><div style="font-size:12px;color:#a8977f;margin-top:1px">${c.d}</div></div>${s?'<div class="fopt-check-ciu">✓</div>':''}</button>`; }).join('')}</div></div>`;
  } else if (name === 'tipo') {
    el.innerHTML = `<div class="fpanel"><div class="fpanel-title">¿Qué tipo de inmueble?</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${TIPO_OPTS.map(t => { const s = F.tipo.has(t.v); return `<button class="fopt-tipo${s?' sel':''}" onclick="pillToggle('tipo','${t.v}')"><span style="font-size:28px">${t.e}</span><span style="font-size:13px;font-weight:800;color:${s?'#d4a853':'#5a5550'}">${t.l}</span></button>`; }).join('')}</div></div>`;
  } else if (name === 'precio') {
    const showArr = F.neg.size===0||F.neg.has('arriendo')||F.neg.has('ambas');
    const showVnt = F.neg.size===0||F.neg.has('venta')||F.neg.has('ambas');
    let h = '<div class="fpanel">';
    if (showArr) {
      h += `<div style="${showVnt?'margin-bottom:16px':''}"><div style="font-size:15px;font-weight:800;color:#2c2520;margin-bottom:10px">💰 Precio arriendo <span style="font-size:11px;color:#a8977f;font-weight:600">/mes</span></div><div style="display:flex;gap:8px;align-items:center"><div style="flex:1"><div style="font-size:9px;color:#8b8178;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.8px">Desde</div><div class="precio-input" style="border:1.5px solid rgba(217,119,6,.15)"><span style="font-size:12px;color:#d97706;font-weight:800">$</span><input id="arMin" placeholder="1.000.000" inputmode="numeric" oninput="fmtPrice(this)" onblur="autoHasta('arMin','arMax','arr')" value="${document.getElementById('arMin')?.value||''}"></div></div><span style="color:#d4cdc4;font-weight:800;margin-top:16px">—</span><div style="flex:1"><div style="font-size:9px;color:#8b8178;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.8px">Hasta</div><div class="precio-input" style="border:1.5px solid rgba(217,119,6,.15)"><span style="font-size:12px;color:#d97706;font-weight:800">$</span><input id="arMax" placeholder="10.000.000" inputmode="numeric" oninput="fmtPrice(this)" value="${document.getElementById('arMax')?.value||''}"></div></div></div></div>`;
    }
    if (showVnt) {
      const vnMinVal = document.getElementById('vnMin')?.value || '';
      const vnMaxVal = document.getElementById('vnMax')?.value || '';
      h += `<div><div style="font-size:15px;font-weight:800;color:#2c2520;margin-bottom:10px">🏦 Precio venta</div><div style="display:flex;gap:8px;align-items:center"><div style="flex:1"><div style="font-size:9px;color:#8b8178;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.8px">Desde</div><div class="precio-input" style="border:1.5px solid rgba(5,150,105,.15)"><span style="font-size:12px;color:#059669;font-weight:800">$</span><input id="vnMin" placeholder="100.000.000" inputmode="numeric" oninput="fmtPrice(this)" onblur="autoHasta('vnMin','vnMax','vnt')" value="${vnMinVal}"></div></div><span style="color:#d4cdc4;font-weight:800;margin-top:16px">—</span><div style="flex:1"><div style="font-size:9px;color:#8b8178;font-weight:700;margin-bottom:3px;text-transform:uppercase;letter-spacing:.8px">Hasta</div><div class="precio-input" style="border:1.5px solid rgba(5,150,105,.15)"><span style="font-size:12px;color:#059669;font-weight:800">$</span><input id="vnMax" placeholder="3.000.000.000" inputmode="numeric" oninput="fmtPrice(this)" value="${vnMaxVal}"></div></div></div></div>`;
    }
    h += `<button class="precio-apply" onclick="togglePanel(null);doSearch()">🔍 Aplicar precio</button></div>`;
    el.innerHTML = h;
    // Auto-fill venta desde 100M when "Comprar" is selected
    if (F.neg.has('venta') && showVnt) {
      const vnMinEl = document.getElementById('vnMin');
      const vnMaxEl = document.getElementById('vnMax');
      if (vnMinEl && !vnMinEl.value) { vnMinEl.value = '100.000.000'; }
      if (vnMaxEl && !vnMaxEl.value) { vnMaxEl.value = '150.000.000'; }
    }
  } else if (name === 'asesor') {
    const asesores = {};
    D().forEach(p => { if(p.captador){asesores[p.captador_id]=asesores[p.captador_id]||{id:p.captador_id,nombre:p.captador.nombre,gestor:p.captador.gestor_arriendos,count:0};asesores[p.captador_id].count++;} });
    const sorted = Object.values(asesores).sort((a,b)=>b.count-a.count);
    el.innerHTML = `<div class="fpanel"><div class="fpanel-title">Filtrar por asesor</div><div style="font-size:12px;color:#a8977f;margin-bottom:12px">Ordenados por cantidad de inmuebles</div><div style="display:flex;flex-direction:column;gap:6px">${sorted.map(a => { const s = window._asesorFilter===a.id; return `<button class="fopt-ase${s?' sel':''}" onclick="pickAsesor('${a.id}')"><div style="width:36px;height:36px;border-radius:10px;background:${s?'#1a4f8b':'#eae6e1'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:${s?'#fff':'#5a5550'}">${a.nombre.charAt(0)}</div><div style="flex:1"><div style="font-size:15px;font-weight:800;color:${s?'#1a4f8b':'#3a3530'}">${a.nombre}${a.gestor?' 🔑':''}</div><div style="font-size:12px;color:#a8977f;margin-top:1px">${a.count} inmuebles</div></div><div style="font-size:16px;font-weight:800;color:${s?'#1a4f8b':'#c4b9a8'}">${a.count}</div>${s?'<div class="fopt-check-ciu">✓</div>':''}</button>`; }).join('')}</div></div>`;
  }
}

// ── Update pill styles ──
function updatePills() {
  const negMap = {venta:'Comprar',arriendo:'Arrendar',ambas:'Las dos'};
  // Neg pill
  const pNeg = document.getElementById('pillNeg');
  if(pNeg) { const on=F.neg.size>0||window._openPanel==='neg'; pNeg.className='pill '+(on?'pill-on':'pill-off'); const txt=document.getElementById('pillNegTxt'); if(txt)txt.textContent=F.neg.size>0?Array.from(F.neg).map(v=>negMap[v]).join(', '):'Negocio'; pNeg.querySelector('.pill-chev')?.classList.toggle('open',window._openPanel==='neg'); const badge=pNeg.querySelector('.pill-badge'); if(F.neg.size>0&&!badge){const b=document.createElement('span');b.className='pill-badge';b.textContent=F.neg.size;pNeg.insertBefore(b,pNeg.querySelector('.pill-chev'));}else if(F.neg.size===0&&badge)badge.remove();else if(badge)badge.textContent=F.neg.size; }
  // Ciudad pill
  const pCiu = document.getElementById('pillCiu');
  if(pCiu) { const on=F.ciu.size>0||window._openPanel==='ciudad'; pCiu.className='pill '+(on?'pill-on':'pill-off'); const txt=document.getElementById('pillCiuTxt'); if(txt)txt.textContent=F.ciu.size>0?Array.from(F.ciu).join(', '):'Ciudad'; pCiu.querySelector('.pill-chev')?.classList.toggle('open',window._openPanel==='ciudad'); const badge=pCiu.querySelector('.pill-badge'); if(F.ciu.size>0&&!badge){const b=document.createElement('span');b.className='pill-badge';b.textContent=F.ciu.size;pCiu.insertBefore(b,pCiu.querySelector('.pill-chev'));}else if(F.ciu.size===0&&badge)badge.remove();else if(badge)badge.textContent=F.ciu.size; }
  // Tipo pill
  const pTipo = document.getElementById('pillTipo');
  if(pTipo) { const on=F.tipo.size>0||window._openPanel==='tipo'; pTipo.className='pill '+(on?'pill-on':'pill-off'); const txt=document.getElementById('pillTipoTxt'); if(txt)txt.textContent=F.tipo.size>0?Array.from(F.tipo).join(', '):'Tipo'; pTipo.querySelector('.pill-chev')?.classList.toggle('open',window._openPanel==='tipo'); const badge=pTipo.querySelector('.pill-badge'); if(F.tipo.size>0&&!badge){const b=document.createElement('span');b.className='pill-badge';b.textContent=F.tipo.size;pTipo.insertBefore(b,pTipo.querySelector('.pill-chev'));}else if(F.tipo.size===0&&badge)badge.remove();else if(badge)badge.textContent=F.tipo.size; }
  // Precio pill
  const pPrecio = document.getElementById('pillPrecio');
  if(pPrecio) { const hasP=parsePriceInput('arMin')>0||parsePriceInput('arMax')>0||parsePriceInput('vnMin')>0||parsePriceInput('vnMax')>0; const on=hasP||window._openPanel==='precio'; pPrecio.className='pill '+(on?'pill-on':'pill-off'); const txt=document.getElementById('pillPrecioTxt'); if(txt)txt.textContent=hasP?'Precio ✓':'Precio'; pPrecio.querySelector('.pill-chev')?.classList.toggle('open',window._openPanel==='precio'); }
  // Asesor pill
  const pAse = document.getElementById('pillAsesor');
  if(pAse) { const on=!!window._asesorFilter||window._openPanel==='asesor'; pAse.className='pill '+(on?'pill-on':'pill-off'); const txt=document.getElementById('pillAseTxt'); if(txt){ const aseData=window._asesorFilter?D().find(p=>p.captador_id===window._asesorFilter)?.captador?.nombre:null; txt.textContent=aseData||'Asesores'; } pAse.querySelector('.pill-chev')?.classList.toggle('open',window._openPanel==='asesor'); }
  // Update chevron stroke colors
  document.querySelectorAll('.pill').forEach(p => { const svg = p.querySelector('.pill-chev path'); if(svg) svg.setAttribute('stroke', p.classList.contains('pill-on')||p.classList.contains('pill-mis')||p.classList.contains('pill-fav')?'#fff':'#8b7e6e'); });
}

// ── Toggle filter value from panel ──
window.pillToggle = function(g,v) {
  if(F[g].has(v))F[g].delete(v); else F[g].add(v);
  if(window._openPanel)renderPanel(window._openPanel);
  updatePills();
  window.renderSel();
  window.doSearch();
  // Auto-cierre del panel 400ms tras la última selección (debounced)
  // permite multi-select continuo: cada click reinicia el timer
  if (window._panelCloseTimer) clearTimeout(window._panelCloseTimer);
  window._panelCloseTimer = setTimeout(() => {
    window._panelCloseTimer = null;
    if (window._openPanel) window.togglePanel(null);
  }, 400);
};

// ── Asesor pick (single select, close panel) ──
window.pickAsesor = function(id) {
  window._asesorFilter = (window._asesorFilter===id) ? null : id;
  togglePanel(null);
  window.renderSel();
  window.doSearch();
};

// ── Selection bar ──
window.renderSel = function() {
  const chips = [];
  F.neg.forEach(v=>{const o=NEG_OPTS.find(x=>x.v===v);chips.push({key:'n-'+v,label:o?o.e+' '+o.l:v,remove:`pillToggle('neg','${v}')`});});
  F.ciu.forEach(v=>{chips.push({key:'c-'+v,label:'📍 '+v,remove:`pillToggle('ciu','${v}')`});});
  F.tipo.forEach(v=>{const o=TIPO_OPTS.find(x=>x.v===v);chips.push({key:'t-'+v,label:o?o.l:v,remove:`pillToggle('tipo','${v}')`});});
  if(window._asesorFilter){const a=D().find(p=>p.captador_id===window._asesorFilter)?.captador;chips.push({key:'ase',label:'👤 '+(a?.nombre||'Asesor'),remove:"pickAsesor('"+window._asesorFilter+"')"});}
  const arMn=parsePriceInput('arMin'),arMx=parsePriceInput('arMax');
  if(arMn>0||arMx>0)chips.push({key:'arr',label:'💰 '+(fmShort(arMn)||'$0')+'-'+(arMx?fmShort(arMx):'∞'),remove:"document.getElementById('arMin').value='';document.getElementById('arMax').value='';renderSel();doSearch()"});
  const vnMn=parsePriceInput('vnMin'),vnMx=parsePriceInput('vnMax');
  if(vnMn>0||vnMx>0)chips.push({key:'vnt',label:'🏦 '+(fmShort(vnMn)||'$0')+'-'+(vnMx?fmShort(vnMx):'∞'),remove:"document.getElementById('vnMin').value='';document.getElementById('vnMax').value='';renderSel();doSearch()"});
  if(window._tiempoFiltro)chips.push({key:'tiempo',label:'📅 Últimos '+window._tiempoFiltro+'d',remove:"setTiempo(null)"});
  if(window._favFilterActive)chips.push({key:'fav',label:'♥ Favoritos',remove:"toggleFavFilter()"});
  if(window._myFilter)chips.push({key:'mis',label:'📌 Mis inmuebles',remove:"toggleMis()"});
  const qv=(document.getElementById('q')?.value||'').trim();
  if(qv)chips.push({key:'q',label:'🔍 "'+qv+'"',remove:"document.getElementById('q').value='';document.getElementById('qClear').style.display='none';renderSel();doSearch()"});

  const bar=document.getElementById('selBar');
  const chipsEl=document.getElementById('selChips');
  if(!bar||!chipsEl)return;
  if(chips.length===0){bar.style.display='none';return;}
  bar.style.display='';
  chipsEl.innerHTML=chips.map(s=>`<span class="sel-chip" onclick="${s.remove}">${s.label}<span class="sel-x">✕</span></span>`).join('');
  const qC=document.getElementById('qClear');if(qC)qC.style.display=qv?'flex':'none';
  updatePills();
};

// ── Toggles ──
window.toggleMis = function() {
  window._myFilter = !window._myFilter;
  const btn=document.getElementById('myToggle');
  if(btn){
    if(window._myFilter){btn.className='pill pill-mis';btn.textContent='📌 Míos ✓';}
    else{btn.className='pill pill-off';btn.style.color='#1a4f8b';btn.style.borderColor='#d0dff2';btn.textContent='📌 Míos';}
  }
  window.renderSel();window.doSearch();
};

window.toggleFavFilter = function() {
  window._favFilterActive = !window._favFilterActive;
  const btn=document.getElementById('favToggle');
  if(btn){
    if(window._favFilterActive){btn.className='pill pill-fav';btn.innerHTML='♥ Favs ✓';}
    else{btn.className='pill pill-off';btn.style.color='#b91c3a';btn.style.borderColor='#f5d0d7';btn.innerHTML='♡ Favs';}
  }
  window.renderSel();window.doSearch();
};

// ── Time filter ──
window.toggleTiempo = function() {
  const dd=document.getElementById('tiempoDD');
  if(!dd)return;
  if(dd.style.display==='none'||!dd.style.display){
    dd.style.display='block';
    dd.innerHTML=[{v:null,l:'Más recientes',d:'Todos'},{v:'7',l:'Últimos 7 días',d:'Esta semana'},{v:'15',l:'Últimos 15 días',d:'2 semanas'}].map(o=>`<button class="tiempo-opt${window._tiempoFiltro===o.v?' sel':''}" onclick="setTiempo(${o.v?"'"+o.v+"'":"null"})"><div style="font-size:14px;font-weight:700;color:${window._tiempoFiltro===o.v?'#1a4f8b':'#3a3530'}">${o.l}</div><div style="font-size:10px;color:#a8977f">${o.d}</div></button>`).join('');
  } else dd.style.display='none';
};
window.setTiempo = function(v) {
  window._tiempoFiltro=v;
  const btn=document.getElementById('tiempoBtn');
  if(btn){
    if(v){btn.style.color='#1a4f8b';btn.style.background='#eef3fb';btn.style.border='1.5px solid #b8d4f0';btn.textContent='📅 Últimos '+v+' días ▾';}
    else{btn.style.color='#6b5c4d';btn.style.background='#fff';btn.style.border='1.5px solid #e8e4df';btn.textContent='📅 Más recientes ▾';}
  }
  const dd=document.getElementById('tiempoDD');if(dd)dd.style.display='none';
  window.renderSel();window.doSearch();
};

// ── Asesor pill visibility ──
window.populateAsesorFilter = function() {
  const pAse=document.getElementById('pillAsesor');if(!pAse)return;
  const u=U();const isAdmin=u&&(u.rol==='admin'||u.rol==='oficina');
  pAse.style.display=isAdmin?'flex':'none';
};

// ── Init pills (called after data load) ──
window.renderAccOpts = function() {
  // Render tiempo dropdown
  const tdC=document.getElementById('tiempoDD');
  if(tdC)tdC.innerHTML='';
  updatePills();
  window.populateAsesorFilter();
};

window.renderRecent = function() {
  const el=document.getElementById('rsrch');if(!el)return;
  let r=[];try{r=JSON.parse(localStorage.getItem('hcrm_recent')||'[]');}catch(e){}
  if(!r.length){el.textContent='';return;}
  el.innerHTML='<span style="font-size:8px;color:#a8977f;font-weight:700">Recientes:</span>'+r.map(q=>`<span style="font-size:11px;padding:4px 10px;border-radius:8px;background:#f5f2ee;color:#5a5550;font-weight:600;border:1px solid #e0dbd5;cursor:pointer;margin-left:4px" onclick="document.getElementById('q').value='${q}';doSearch()">${q}</span>`).join('');
};

// ── Main doSearch ──
window.doSearch = function() {
  const allD = D();
  if (!allD.length) return;
  window.renderSel();
  const qv = (document.getElementById('q')?.value || '').trim().toLowerCase();
  if (qv.length >= 2) { let r = []; try { r = JSON.parse(localStorage.getItem('hcrm_recent') || '[]'); } catch(e){} r = r.filter(x => x !== qv); r.unshift(qv); localStorage.setItem('hcrm_recent', JSON.stringify(r.slice(0, 5))); }
  const qC=document.getElementById('qClear');if(qC)qC.style.display=qv?'flex':'none';

  const arMin = parsePriceInput('arMin'), arMax = parsePriceInput('arMax');
  const vnMin = parsePriceInput('vnMin'), vnMax = parsePriceInput('vnMax');

  let list = allD;
  if (window._myFilter) list = list.filter(p => p.captador_id === U()?.id);
  if (window._favFilterActive) list = list.filter(p => (window.FAVS||[]).includes(p.id));
  if (window._asesorFilter) list = list.filter(p => p.captador_id === window._asesorFilter);
  if (window._tiempoFiltro) { const maxD = parseInt(window._tiempoFiltro); list = list.filter(p => (p._dias||999) <= maxD); }

  const hasFilters = Object.values(F).some(s => s.size > 0) || qv.length > 0 || arMin > 0 || arMax > 0 || vnMin > 0 || vnMax > 0;
  if (hasFilters) {
    list = list.filter(p => {
      const c = (p.ciudad || '').toLowerCase(), t = (p.tipo || '').toLowerCase();
      const pa = p.precio_arriendo || 0, pv = p.precio_venta || 0;
      if (F.neg.size > 0) { let ok = false; if (F.neg.has('venta') && eV(p)) ok = true; if (F.neg.has('arriendo') && eA(p)) ok = true; if (F.neg.has('ambas') && eA2(p)) ok = true; if (!ok) return false; }
      if (F.ciu.size > 0 && !Array.from(F.ciu).some(x => c.includes(x.toLowerCase()))) return false;
      if (F.tipo.size > 0 && !Array.from(F.tipo).some(x => t.includes(x.toLowerCase()))) return false;
      if (arMin > 0 && (pa <= 0 || pa < arMin)) return false;
      if (arMax > 0 && (pa <= 0 || pa > arMax)) return false;
      if (vnMin > 0 && (pv <= 0 || pv < vnMin)) return false;
      if (vnMax > 0 && (pv <= 0 || pv > vnMax)) return false;
      if (qv) { const all = Object.values(p).join(' ').toLowerCase() + (p.captador ? p.captador.nombre : ''); if (!qv.split(/\s+/).every(w => all.toLowerCase().includes(w))) return false; }
      return true;
    });
  }
  window.render(list);
};

window.autoSearch = function() { clearTimeout(window._searchTimer); window._searchTimer = setTimeout(() => window.doSearch(), 300); };
window._searchTimer = null;

// Close panels on outside click
document.addEventListener('click', function(e) { if(window._openPanel && !e.target.closest('.fpanel') && !e.target.closest('.pill') && !e.target.closest('.pill-bar')) togglePanel(null); });

// Autocomplete
window._acIdx = -1;
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function hlMatch(text, q) {
  if (!q) return escHtml(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return escHtml(text);
  return escHtml(text.slice(0, i)) + '<b>' + escHtml(text.slice(i, i + q.length)) + '</b>' + escHtml(text.slice(i + q.length));
}
function acBuild(q) {
  const sections = [];
  const ql = (q || '').trim().toLowerCase();

  // Recent searches
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem('hcrm_recent') || '[]'); } catch(e){}
  if (ql) recent = recent.filter(r => r.toLowerCase().includes(ql));
  if (recent.length) sections.push({ cat: '🕐 Recientes', items: recent.slice(0, 3).map(r => ({ label: r, val: r })) });

  // Barrios from data
  const allD = D();
  if (allD.length && ql) {
    const barrios = [...new Set(allD.map(p => p.barrio).filter(Boolean))];
    const matched = barrios.filter(b => b.toLowerCase().includes(ql)).sort((a,b) => {
      const ai = a.toLowerCase().indexOf(ql), bi = b.toLowerCase().indexOf(ql);
      return ai - bi || a.localeCompare(b);
    }).slice(0, 5);
    if (matched.length) sections.push({ cat: '📍 Barrios', items: matched.map(b => ({ label: b, val: b })) });
  }

  // Tipos
  const tipoMatch = TIPO_OPTS.filter(o => !ql || o.v.toLowerCase().includes(ql) || o.l.toLowerCase().includes(ql));
  if (tipoMatch.length && tipoMatch.length < TIPO_OPTS.length) {
    sections.push({ cat: '🏢 Tipos', items: tipoMatch.slice(0, 4).map(o => ({ label: o.v, val: o.v, icon: o.e })) });
  }

  // Ciudades
  const ciuMatch = CIU_OPTS.filter(o => !ql || o.v.toLowerCase().includes(ql));
  if (ciuMatch.length && ciuMatch.length < CIU_OPTS.length) {
    sections.push({ cat: '🗺️ Ciudades', items: ciuMatch.map(o => ({ label: o.v, val: o.v, icon: o.e })) });
  }

  // If no query, show all recents
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

window.showAC = function() {
  const drop = document.getElementById('acDrop');
  if (!drop) return;
  const q = document.getElementById('q')?.value || '';
  const html = acBuild(q);
  if (!html) { drop.style.display = 'none'; return; }
  drop.innerHTML = html;
  drop.style.display = 'block';
  window._acIdx = -1;
};

window.updateAC = function() {
  const drop = document.getElementById('acDrop');
  if (!drop) return;
  const q = document.getElementById('q')?.value || '';
  const html = acBuild(q);
  if (!html) { drop.style.display = 'none'; return; }
  drop.innerHTML = html;
  drop.style.display = 'block';
  window._acIdx = -1;
};

window.hideAC = function() {
  const drop = document.getElementById('acDrop');
  if (drop) drop.style.display = 'none';
  window._acIdx = -1;
};

window.pickAC = function(el) {
  const val = el.dataset.val || el.textContent;
  const inp = document.getElementById('q');
  if (inp) inp.value = val;
  hideAC();
  doSearch();
};

window.acKey = function(e) {
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
      pickAC(items[window._acIdx]);
    } else {
      hideAC();
      doSearch();
    }
  } else if (e.key === 'Escape') {
    hideAC();
  }
};

document.addEventListener('click', function(e) { if (!e.target.closest('#acDrop') && e.target.id !== 'q') hideAC(); });

// Legacy compat
window.collapseFilters = function() {};
window.expandFilters = function() {};
window.qf = function(g,v) { F[g]?.delete(v); updatePills(); window.renderSel(); window.doSearch(); };
window.tc = function() {};

// ══════════════════════════════════════════════════════════════════
// 14. CONCILIACION
// ══════════════════════════════════════════════════════════════════

let _concFilter = 'all', _concItems = [], _concOpen = new Set();

window.concFilt = function(f) { _concFilter = f; window.rConc(); };
window.concToggle = function(id) { if (_concOpen.has(id)) _concOpen.delete(id); else { _concOpen.add(id); setTimeout(() => window.ldConcNotas(id), 50); } window.rConc(); };

window.concCheck = async function(id, isDone) {
  if (isDone) await SB().from('conciliacion').update({ estado: 'pendiente', completado_por: null, completado_at: null }).eq('id', id);
  else await SB().from('conciliacion').update({ estado: 'completado', completado_por: U().id, completado_at: new Date().toISOString() }).eq('id', id);
  window.toast(isDone ? '↩️ Pendiente' : '✅ Completado');
  window.rConc();
};

window.ldConcNotas = async function(concId) {
  const el = document.getElementById('cn-' + concId); if (!el) return;
  const { data } = await SB().from('conciliacion_notas').select('*,autor:usuarios!usuario_id(nombre)').eq('conciliacion_id', concId).order('created_at', { ascending: true });
  if (!data || !data.length) { el.innerHTML = '<span style="font-size:11px;color:var(--g400)">Sin anotaciones</span>'; return; }
  el.innerHTML = data.map(n => { const f = n.created_at ? new Date(n.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; return `<div class="conc-nota"><div class="conc-nota-meta">👤 ${n.autor ? n.autor.nombre : '?'} · ${f}</div>${n.texto}</div>`; }).join('');
};

window.concAddNote = async function(concId) {
  const ta = document.getElementById('cnt-' + concId); if (!ta) return;
  const txt = ta.value.trim(); if (!txt) { window.toast('Escribe algo', 'twarn'); return; }
  await SB().from('conciliacion_notas').insert({ conciliacion_id: concId, usuario_id: U().id, texto: txt });
  ta.value = ''; window.toast('💬 Agregado'); window.ldConcNotas(concId);
};

window.concNuevo = function() {
  const html = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" id="concModal" onclick="if(event.target===this)this.remove()"><div style="background:var(--cd);border-radius:14px;padding:24px;max-width:460px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
  <div style="font-size:18px;font-weight:800;margin-bottom:16px">🔄 Nueva diferencia</div>
  <div style="margin-bottom:10px"><select id="ccTipo" class="esel" style="width:100%;padding:8px"><option value="precio">💲 Precio</option><option value="fotos">📷 Fotos</option><option value="descripcion">📝 Descripción</option><option value="solo_m2">❌ Solo M²</option><option value="solo_fr">❌ Solo FR</option><option value="retirar">🗑️ Retirar</option></select></div>
  <div style="display:flex;gap:8px;margin-bottom:10px"><input id="ccTipoInm" class="ffi" placeholder="Tipo inmueble" style="flex:1;padding:8px"><select id="ccNeg" class="esel" style="flex:1;padding:8px"><option>Arriendo</option><option>Venta</option></select></div>
  <div style="display:flex;gap:8px;margin-bottom:10px"><input id="ccCiu" class="ffi" placeholder="Ciudad" style="flex:1;padding:8px"><input id="ccDir" class="ffi" placeholder="Dirección" style="flex:1;padding:8px"></div>
  <textarea id="ccDet" class="ffi" style="padding:8px;min-height:50px;resize:vertical;margin-bottom:10px" placeholder="Detalle del problema..."></textarea>
  <div style="display:flex;gap:8px"><button style="flex:1;padding:12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer" onclick="document.getElementById('concModal').remove()">Cancelar</button><button style="flex:1;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;background:var(--b600);color:#fff;cursor:pointer" onclick="concGuardar()">💾 Guardar</button></div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.concGuardar = async function() {
  const { error } = await SB().from('conciliacion').insert({
    tipo_diferencia: document.getElementById('ccTipo').value,
    tipo_inmueble: document.getElementById('ccTipoInm').value,
    negocio: document.getElementById('ccNeg').value,
    ciudad: document.getElementById('ccCiu').value,
    direccion: document.getElementById('ccDir').value,
    detalle: document.getElementById('ccDet').value,
  });
  if (!error) { document.getElementById('concModal').remove(); window.toast('✅ Registrada'); window.rConc(); }
  else window.toast('Error', 'terr');
};

// ══════════════════════════════════════════════════════════════════
// 15. PUBLIC VIEW
// ══════════════════════════════════════════════════════════════════

window.showPublicView = async function(id) {
  const lov = document.getElementById('lov');
  if (lov) lov.style.display = 'none';
  const app = document.getElementById('app');

  try {
    const { data: p } = await SB().from('inmuebles').select('*,captador:usuarios!captador_id(nombre,telefono_contacto),fotos(id,url,url_thumb,origen,orden)').eq('id', id).eq('eliminado', false).single();
    if (!p) { app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">🏠</div><h3 style="font-size:18px;font-weight:800;color:#1e293b">Inmueble no encontrado</h3><p style="color:#94a3b8;font-size:13px;margin-top:6px">Este enlace puede haber expirado o el inmueble fue retirado.</p></div></div>'; return; }

    const fotos = p.fotos ? p.fotos.sort((a, b) => a.orden - b.orden) : [];
    const capTel = p.captador?.telefono_contacto || '573105922763';
    const capNom = p.captador?.nombre || 'House';
    const cod = p.codigo_house || '';
    const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;
    const neg = pv > 0 && pa > 0 ? 'Venta y Arriendo' : pa > 0 ? 'Arriendo' : 'Venta';

    // Visitor gate: sin login, contactos protegidos
    const _isVisitor = !U();
    const _waUrl = 'https://wa.me/' + capTel + '?text=' + encodeURIComponent('Hola ' + capNom + ', estoy interesado en este inmueble: https://inmobiliariahouse.com.co/ver/' + (cod || id));
    const _telUrl = 'tel:+' + capTel;
    if (_isVisitor) { window._pendingContactInmuebleId = id; }
    const _gateCall = `window._pendingContactInmuebleId='${id}';window.showAuthPrompt('contacto',{icono:'📞',titulo:'Contactar al asesor',mensaje:'Crea tu cuenta gratis para acceder a los datos de contacto del asesor.',beneficios:['📱 Número directo del asesor','💬 WhatsApp para consultas rápidas','🔔 Solo te enviamos notificaciones si tú lo autorizas','🔒 Tus datos están protegidos'],cta:'Crear cuenta gratis',ctaSecundario:'Ahora no'});return false;`;
    const _waHref = _isVisitor ? 'javascript:void(0)' : _waUrl;
    const _telHref = _isVisitor ? 'javascript:void(0)' : _telUrl;
    const _waClick = _isVisitor ? `onclick="${_gateCall}"` : '';
    const _telClick = _isVisitor ? `onclick="${_gateCall}"` : '';
    const _waTarget = _isVisitor ? '' : 'target="_blank"';

    let h = '';

    // ── HEADER FIJO ──
    h += `<div style="position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <img src="/img/logo.png" style="height:30px">
      <span style="font-family:'Fraunces',serif;font-size:16px;font-weight:800;color:#1e293b;letter-spacing:-.3px">House</span>
      <div style="flex:1"></div>
      <a href="${_waHref}" ${_waTarget} ${_waClick} style="padding:6px 14px;background:#25d366;color:#fff;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none">${_isVisitor ? '🔒 Contactar' : 'Contactar'}</a>
    </div>`;

    h += '<div style="max-width:560px;margin:0 auto;padding:0 0 80px;background:#fff;min-height:100vh">';

    // ── GALERÍA ──
    if (fotos.length > 0) {
      h += `<div style="position:relative;background:#000" id="pub-gal">
        <img id="pub-img" src="${fotos[0].url}" style="width:100%;height:320px;object-fit:contain;display:block" onerror="drFallback&&drFallback(this)">`;
      if (fotos.length > 1) {
        h += `<button onclick="pubNav(-1)" style="position:absolute;top:50%;left:8px;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;border:none;font-size:18px;cursor:pointer;backdrop-filter:blur(4px)">‹</button>`;
        h += `<button onclick="pubNav(1)" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;border:none;font-size:18px;cursor:pointer;backdrop-filter:blur(4px)">›</button>`;
      }
      h += `<span id="pub-ct" style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:12px">1/${fotos.length}</span>`;
      h += `</div>`;

      // Thumbnails
      if (fotos.length > 1) {
        h += `<div style="display:flex;gap:3px;overflow-x:auto;padding:8px 12px;background:#f8fafc">`;
        fotos.forEach((f, i) => {
          h += `<img src="${f.url_thumb || f.url}" onclick="pubGo(${i})" style="width:52px;height:52px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i === 0 ? '#3b82f6' : 'transparent'};opacity:${i === 0 ? '1' : '.6'};flex-shrink:0" onerror="drFallback&&drFallback(this)" data-pub-thumb="${i}">`;
        });
        h += `</div>`;
      }
    }

    // ── INFO PRINCIPAL ──
    h += `<div style="padding:20px 16px">`;

    // Tipo + negociación
    h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#3b82f6">${p.tipo || 'Inmueble'} en ${neg}</span>
      ${cod ? `<span style="font-size:9px;font-weight:800;padding:2px 8px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:4px;font-family:monospace;letter-spacing:1px">${cod}</span>` : ''}
    </div>`;

    // Ubicación
    h += `<h1 style="font-family:'Fraunces',serif;font-size:22px;font-weight:800;color:#1e293b;line-height:1.2;margin:0">${p.direccion_publica || p.barrio || ''}</h1>`;
    h += `<p style="font-size:13px;color:#64748b;margin-top:4px">${p.ciudad || ''}</p>`;

    // Precios
    h += `<div style="margin-top:16px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">`;
    if (pv > 0) h += `<div style="margin-bottom:${pa > 0 ? '10px' : '0'}"><div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:2px">Precio de Venta</div><div style="font-family:'Fraunces',serif;font-size:26px;font-weight:800;color:#1e293b">${fm(pv)}</div></div>`;
    if (pa > 0) h += `<div><div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:2px">Canon de Arriendo</div><div style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:#065f46">${fm(pa)}<span style="font-size:13px;font-weight:500;color:#64748b"> /mes</span></div></div>`;
    h += `</div>`;

    // Specs grid
    const specs = [];
    if (p.habitaciones) specs.push({ v: p.habitaciones, l: 'Habitaciones', i: '🛏️' });
    if (p.banos) specs.push({ v: p.banos, l: 'Baños', i: '🚿' });
    if (p.area_construida) specs.push({ v: p.area_construida + 'm²', l: 'Área Construida', i: '📐' });
    if (p.area_total) specs.push({ v: p.area_total + 'm²', l: 'Área Total', i: '📏' });
    if (p.estrato) specs.push({ v: p.estrato, l: 'Estrato', i: '⭐' });
    if (p.parqueaderos) specs.push({ v: p.parqueaderos, l: 'Parqueaderos', i: '🚗' });

    if (specs.length) {
      h += `<div style="margin-top:20px"><div style="font-size:12px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Detalles de la Propiedad</div>`;
      h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">`;
      specs.forEach(s => {
        h += `<div style="padding:12px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center">
          <div style="font-size:18px;margin-bottom:4px">${s.i}</div>
          <div style="font-size:16px;font-weight:800;color:#1e293b">${s.v}</div>
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">${s.l}</div>
        </div>`;
      });
      h += `</div></div>`;
    }

    // Amenidades
    const ams = (p.caracteristicas || '').split(',').map(s => s.trim()).filter(Boolean);
    if (ams.length) {
      h += `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0">
        <div style="font-size:12px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Amenidades</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${ams.map(a => `<span style="padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569">${a}</span>`).join('')}</div>
      </div>`;
    }

    // Descripción
    if (p.descripcion_cliente) {
      h += `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0">
        <div style="font-size:12px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Descripción</div>
        <div style="font-size:14px;line-height:1.7;color:#475569">${p.descripcion_cliente}</div>
      </div>`;
    }

    // Asesor
    h += `<div style="margin-top:20px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;font-weight:800">${(capNom || 'H')[0].toUpperCase()}</div>
      <div style="flex:1"><div style="font-size:14px;font-weight:700;color:#1e293b">${capNom}</div><div style="font-size:11px;color:#94a3b8">Asesor inmobiliario · House</div></div>
    </div>`;

    h += `</div>`; // close padding div

    // ── FOOTER CON BOTONES STICKY ──
    if (_isVisitor) {
      h += `<div style="position:fixed;bottom:0;left:0;right:0;z-index:50;background:#fff;border-top:1px solid #e2e8f0;padding:10px 16px;box-shadow:0 -2px 10px rgba(0,0,0,.06)">
        <div style="max-width:720px;margin:0 auto">
          <div style="display:flex;gap:8px;margin-bottom:6px">
            <a href="javascript:void(0)" ${_waClick} style="flex:1;padding:14px;background:#25d366;color:#fff;border-radius:10px;text-align:center;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">🔒 WhatsApp</a>
            <a href="javascript:void(0)" ${_telClick} style="flex:1;padding:14px;background:#2563eb;color:#fff;border-radius:10px;text-align:center;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">🔒 Llamar</a>
          </div>
          <div style="font-size:10px;color:#64748b;text-align:center;font-weight:600">Crea tu cuenta gratis para contactar al asesor · Solo enviamos notificaciones si las autorizas</div>
        </div>
      </div>`;
    } else {
      h += `<div style="position:fixed;bottom:0;left:0;right:0;z-index:50;background:#fff;border-top:1px solid #e2e8f0;padding:10px 16px;box-shadow:0 -2px 10px rgba(0,0,0,.06)">
        <div style="max-width:720px;margin:0 auto;display:flex;gap:8px">
          <a href="${_waUrl}" target="_blank" style="flex:1;padding:14px;background:#25d366;color:#fff;border-radius:10px;text-align:center;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">💬 WhatsApp</a>
          <a href="${_telUrl}" style="flex:1;padding:14px;background:#2563eb;color:#fff;border-radius:10px;text-align:center;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">📞 Llamar</a>
        </div>
      </div>`;
    }

    // ── BANNERS CTA ──
    const baseUrl = window.location.origin;
    h += `<div style="padding:0 16px 20px">`;
    // Banner principal
    h += `<div style="margin-top:20px;padding:24px 20px;border-radius:14px;background:linear-gradient(135deg,#eff6ff,#f0f1ff);border:1.5px solid #bfdbfe;text-align:center">
      <div style="font-size:32px;margin-bottom:6px">🏠</div>
      <div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;color:#1e293b;margin-bottom:4px">Encuentra tu inmueble ideal</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:14px">Explora propiedades en Pereira y el Eje Cafetero</div>
      <a href="${baseUrl}/#/portafolio" style="display:inline-block;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;background:#2563eb;color:#fff;text-decoration:none;margin-bottom:6px">🔍 Explorar inmuebles</a>
      <div style="font-size:10px;color:#94a3b8;margin-top:8px">Gratis. Sin spam. Cancela cuando quieras.</div>
    </div>`;
    // Banner secundario
    h += `<div style="margin-top:12px;padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,#f0fdf4,#f0fdf8);border:1.5px solid #bbf7d0;text-align:center">
      <div style="font-size:14px;font-weight:800;color:#065f46;margin-bottom:6px">¿También tienes un inmueble?</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:10px">Llega a miles de clientes en Pereira</div>
      <a href="${baseUrl}/?reg=1" style="display:inline-block;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;background:#065f46;color:#fff;text-decoration:none">🏠 Publicar mi inmueble gratis</a>
    </div>`;
    h += `</div>`;

    h += `</div>`; // close max-width container

    app.innerHTML = h;
    window._pubFotos = fotos.map(f => f.url);
    window._pubIdx = 0;

    // Swipe gallery
    const gal = document.getElementById('pub-gal');
    if (gal) {
      let sx = 0;
      gal.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
      gal.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) pubNav(dx < 0 ? 1 : -1); }, { passive: true });
    }

  } catch (e) {
    app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">❌</div><h3 style="font-size:18px;color:#1e293b">Error de conexión</h3><p style="color:#94a3b8;font-size:13px;margin-top:6px">' + e.message + '</p></div></div>';
  }
};

window.pubNav = function(dir) {
  const f = window._pubFotos; if (!f || !f.length) return;
  window._pubIdx = (window._pubIdx + dir + f.length) % f.length;
  window.pubGo(window._pubIdx);
};

window.pubGo = function(i) {
  const f = window._pubFotos; if (!f) return;
  window._pubIdx = i;
  const img = document.getElementById('pub-img');
  if (img) { img._tried = false; img.onerror = function() { drFallback && drFallback(this); }; img.src = f[i]; }
  const ct = document.getElementById('pub-ct');
  if (ct) ct.textContent = (i + 1) + '/' + f.length;
  // Update thumbnail borders
  document.querySelectorAll('[data-pub-thumb]').forEach((t, j) => {
    t.style.border = '2px solid ' + (j === i ? '#3b82f6' : 'transparent');
    t.style.opacity = j === i ? '1' : '.6';
  });
};

// ══════════════════════════════════════════════════════════════════
// 16. SLIDERS (placeholder — sliders work via DOM events in App.js)
// ══════════════════════════════════════════════════════════════════

window.iSl = function() {
  // Sliders are initialized via the HTML in App.js
  // The onchange events on the range inputs call doSearch()
  // This is a no-op placeholder for backward compat
};

// ══════════════════════════════════════════════════════════════════
// DONE — Log confirmation
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 17. PHOTO REORDER (drag & drop + touch)
// ══════════════════════════════════════════════════════════════════

(function initPhotoReorder() {
  let dragEl = null;
  let dragIdx = -1;
  let touchClone = null;
  let touchStartY = 0, touchStartX = 0;
  let touchMoved = false;

  // Desktop drag & drop
  document.addEventListener('dragstart', e => {
    const item = e.target.closest('.foto-sortable');
    if (!item) return;
    dragEl = item;
    dragIdx = +item.dataset.fotoIdx;
    item.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.fotoId);
  });

  document.addEventListener('dragover', e => {
    const item = e.target.closest('.foto-sortable');
    if (!item || !dragEl || item === dragEl) return;
    e.preventDefault();
    const wrap = document.getElementById('fotoSortWrap');
    if (!wrap) return;
    const items = [...wrap.querySelectorAll('.foto-sortable')];
    const dragI = items.indexOf(dragEl);
    const overI = items.indexOf(item);
    if (dragI < overI) wrap.insertBefore(dragEl, item.nextSibling);
    else wrap.insertBefore(dragEl, item);
  });

  document.addEventListener('dragend', async e => {
    if (!dragEl) return;
    dragEl.style.opacity = '1';
    await savePhotoOrder();
    dragEl = null;
    dragIdx = -1;
  });

  // Touch reorder (mobile)
  document.addEventListener('touchstart', e => {
    const item = e.target.closest('.foto-sortable');
    if (!item) return;
    touchMoved = false;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    // Long press detection
    item._longPressTimer = setTimeout(() => {
      dragEl = item;
      dragIdx = +item.dataset.fotoIdx;
      item.style.opacity = '0.4';
      item.style.transform = 'scale(1.1)';
      item.style.zIndex = '100';
      touchMoved = true;

      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400);
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    const item = e.target.closest('.foto-sortable');
    if (!item || !dragEl) {
      if (item?._longPressTimer) { clearTimeout(item._longPressTimer); item._longPressTimer = null; }
      return;
    }
    if (!touchMoved) { clearTimeout(item._longPressTimer); return; }

    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const over = target?.closest('.foto-sortable');

    if (over && over !== dragEl) {
      const wrap = document.getElementById('fotoSortWrap');
      if (!wrap) return;
      const items = [...wrap.querySelectorAll('.foto-sortable')];
      const dragI = items.indexOf(dragEl);
      const overI = items.indexOf(over);
      if (dragI < overI) wrap.insertBefore(dragEl, over.nextSibling);
      else wrap.insertBefore(dragEl, over);
    }
  }, { passive: false });

  document.addEventListener('touchend', async e => {
    const item = e.target.closest('.foto-sortable');
    if (item?._longPressTimer) { clearTimeout(item._longPressTimer); item._longPressTimer = null; }

    if (dragEl && touchMoved) {
      dragEl.style.opacity = '1';
      dragEl.style.transform = '';
      dragEl.style.zIndex = '';
      await savePhotoOrder();
      dragEl = null;
      dragIdx = -1;
      touchMoved = false;
    }
  }, { passive: true });

  // Save new order to Supabase
  async function savePhotoOrder() {
    const wrap = document.getElementById('fotoSortWrap');
    if (!wrap) return;
    const items = [...wrap.querySelectorAll('.foto-sortable')];
    const newOrder = items.map((el, i) => {
      // Update visual number badge
      const badge = el.querySelector('span:last-child');
      if (badge && badge.style.position === 'absolute') badge.textContent = i + 1;
      return { id: el.dataset.fotoId, orden: i };
    });

    try {
      // Try RPC first (batch update)
      const { error } = await SB().rpc('update_foto_orden', { items: JSON.stringify(newOrder) });
      if (error) {
        // Fallback: update one by one
        for (const item of newOrder) {
          await SB().from('fotos').update({ orden: item.orden }).eq('id', item.id);
        }
      }
      window.toast('📷 Orden actualizado');
    } catch(e) {
      console.error('[photos] Reorder error:', e);
      window.toast('Error al reordenar', 'terr');
    }
  }
})();

// ══════════════════════════════════════════════════════════════════
// 15. GESTOR ARRIENDOS — Eliminar con motivo
// ══════════════════════════════════════════════════════════════════

window.gestorEliminar = function(id) {
  const p = findInm(id);
  if (!p) return;
  const neg = (p.negociacion || '').toLowerCase();
  if (!neg.includes('arriendo')) { window.toast('Solo puedes eliminar inmuebles de arriendo', 'twarn'); return; }
  const desc = descInm(p);
  const capNom = p.captador ? p.captador.nombre : '?';
  const cod = p.codigo_house || '';
  const motivos = ['Ya se arrendó por otro medio','Propietario retiró el inmueble','Información incorrecta','Duplicado','Otro'];
  const html = `<div class="cfdlg" id="gestorDelDlg" style="display:flex">
    <div class="cfbox" style="text-align:left;max-width:400px">
      <div style="font-size:40px;text-align:center;margin-bottom:10px">🗑️</div>
      <div style="font-size:16px;font-weight:800;text-align:center;margin-bottom:4px">¿Eliminar inmueble?</div>
      <div style="font-size:12px;color:var(--sub);text-align:center;margin-bottom:12px">${desc}${cod ? ' · '+cod : ''}<br>Captador: ${capNom}</div>
      <div style="margin-bottom:10px">
        <label style="font-size:10px;font-weight:800;color:var(--sub);display:block;margin-bottom:4px">MOTIVO (obligatorio)</label>
        <select id="gdMotivo" class="esel" style="width:100%;font-size:12px;padding:8px">
          <option value="">— Selecciona el motivo —</option>
          ${motivos.map(m => '<option value="'+m+'">'+m+'</option>').join('')}
        </select>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:10px;font-weight:800;color:var(--sub);display:block;margin-bottom:4px">NOTA ADICIONAL (opcional)</label>
        <textarea id="gdNota" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;font-family:inherit;min-height:40px;resize:none;color:var(--tx);background:var(--cd)" placeholder="Detalle adicional..."></textarea>
      </div>
      <div style="display:flex;gap:8px">
        <button style="flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:700;border:1.5px solid var(--brd);background:var(--cd);color:var(--tx);font-family:inherit;cursor:pointer" onclick="document.getElementById('gestorDelDlg').remove()">Cancelar</button>
        <button style="flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:700;border:none;background:var(--red);color:#fff;font-family:inherit;cursor:pointer" onclick="confirmarGestorDel('${id}')">🗑️ Eliminar</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.confirmarGestorDel = async function(id) {
  const motivo = document.getElementById('gdMotivo').value;
  if (!motivo) { window.toast('Selecciona un motivo', 'twarn'); return; }
  const nota = document.getElementById('gdNota').value || '';
  const p = findInm(id);
  const desc = descInm(p);
  const capNom = p?.captador?.nombre || '?';
  const capEmail = p?.captador?.usuario || p?.captador?.email || '';
  const u = U();
  try {
    await SB().from('inmuebles').update({ eliminado: true, fecha_eliminacion: new Date().toISOString() }).eq('id', id);
    await SB().from('historial').insert({ inmueble_id: id, usuario_id: u.id, accion: 'eliminacion_gestor', campo_modificado: 'eliminado', valor_anterior: 'false', valor_nuevo: motivo + (nota ? ' — ' + nota : '') });
    await window.noti('cambio_estado', 'rojo', '🗑️ ' + u.nombre + ' eliminó: ' + desc, u.nombre + ' (gestor arriendos) eliminó ' + desc + ' de ' + capNom + '. Motivo: ' + motivo, capEmail, null, id);
    await window.noti('cambio_estado', 'rojo', '🗑️ Eliminado por gestor: ' + desc, u.nombre + ' eliminó ' + desc + ' de ' + capNom + '. Motivo: ' + motivo, null, 'admin', id);
    document.getElementById('gestorDelDlg').remove();
    window.toast('🗑️ Inmueble eliminado');
    window.load();
  } catch(e) { console.error('[gestorDel]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// ══════════════════════════════════════════════════════════════════
// 16. GESTOR — Selección masiva confirmación disponibilidad
// ══════════════════════════════════════════════════════════════════

window._selectedArriendos = new Set();

window.toggleArrSelect = function(id, cb) {
  if (cb.checked) window._selectedArriendos.add(id);
  else window._selectedArriendos.delete(id);
  _renderMasiveBar();
};

function _renderMasiveBar() {
  let bar = document.getElementById('masiveBar');
  if (window._selectedArriendos.size === 0) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'masiveBar';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--cd);border-top:2px solid #065f46;padding:12px 16px;z-index:100;display:flex;align-items:center;gap:10px;box-shadow:0 -4px 20px rgba(0,0,0,.15)';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `<span style="font-size:13px;font-weight:700;color:#065f46">✅ ${window._selectedArriendos.size} seleccionado(s)</span><div style="flex:1"></div><button onclick="confirmarMasivo()" style="padding:10px 20px;border:none;border-radius:8px;font-size:13px;font-weight:700;background:#065f46;color:#fff;font-family:inherit;cursor:pointer">✅ Confirmar disponibles</button><button onclick="cancelarSeleccion()" style="padding:10px 16px;border:1.5px solid var(--brd);border-radius:8px;font-size:12px;font-weight:700;background:var(--cd);color:var(--tx);font-family:inherit;cursor:pointer">✕ Cancelar</button>`;
}

window.confirmarMasivo = async function() {
  const ids = Array.from(window._selectedArriendos);
  if (!ids.length) return;
  const ok = await window.cfShow('✅', '¿Confirmar ' + ids.length + ' inmuebles como disponibles?', 'Se actualiza la fecha de verificación de todos.');
  if (!ok) return;
  const now = new Date().toISOString();
  const u = U();
  try {
    for (const id of ids) {
      await SB().from('inmuebles').update({ estado: 'Aún Disponible', fecha_estado: now, updated_at: now }).eq('id', id);
    }
    await window.noti('cambio_estado', 'verde', '✅ ' + u.nombre + ' confirmó ' + ids.length + ' arriendos disponibles', u.nombre + ' verificó disponibilidad de ' + ids.length + ' inmuebles de arriendo.', null, 'admin', null);
    window._selectedArriendos.clear();
    const bar = document.getElementById('masiveBar');
    if (bar) bar.remove();
    window.toast('✅ ' + ids.length + ' inmuebles confirmados');
    window.load();
  } catch(e) { console.error('[confirmarMasivo]', e); window.toast('Error: ' + e.message, 'terr'); }
};

window.cancelarSeleccion = function() {
  window._selectedArriendos.clear();
  const bar = document.getElementById('masiveBar');
  if (bar) bar.remove();
  document.querySelectorAll('.arr-check').forEach(c => c.checked = false);
};

// ══════════════════════════════════════════════════════════════════
// 17. AGENDA — Completar evento asignado
// ══════════════════════════════════════════════════════════════════

window.completarEvt = async function(id) {
  try {
    await SB().from('agenda').update({ estado: 'completado' }).eq('id', id);
    window.toast('✅ Tarea completada');
    window.rAgenda();
  } catch(e) { console.error('[completarEvt]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// 18. EXTERNAL REGISTRATION — Email/password
// ══════════════════════════════════════════════════════════════════

window.toggleRegForm = function() {
  const loginPanel = document.getElementById('lov_login');
  const regPanel = document.getElementById('lov_register');
  if (!loginPanel || !regPanel) return;

  const showingLogin = loginPanel.style.display !== 'none';
  loginPanel.style.display = showingLogin ? 'none' : '';
  regPanel.style.display = showingLogin ? '' : 'none';

  // Render Google button in register panel if not already done
  if (showingLogin && typeof google !== 'undefined' && google.accounts) {
    const regGoogleBtn = document.getElementById('g_id_signin_reg');
    if (regGoogleBtn && !regGoogleBtn.hasChildNodes()) {
      google.accounts.id.renderButton(regGoogleBtn, { theme: 'outline', size: 'large', width: 260, text: 'signup_with', shape: 'pill' });
    }
  }

  // Clear errors
  const regErr = document.getElementById('reg_err');
  if (regErr) regErr.style.display = 'none';
};

window.registerExternal = async function() {
  const nombre = (document.getElementById('reg_nombre')?.value || '').trim();
  const email = (document.getElementById('reg_email')?.value || '').trim();
  const pwd = (document.getElementById('reg_pwd')?.value || '').trim();
  const tel = (document.getElementById('reg_tel')?.value || '').trim();
  const errEl = document.getElementById('reg_err');
  const btn = document.getElementById('reg_btn');

  if (!nombre || !email || !pwd) {
    errEl.textContent = 'Nombre, email y contraseña son obligatorios';
    errEl.style.display = 'block';
    return;
  }
  if (pwd.length < 4) {
    errEl.textContent = 'La contraseña debe tener al menos 4 caracteres';
    errEl.style.display = 'block';
    return;
  }
  if (!email.includes('@')) {
    errEl.textContent = 'Ingresa un email válido';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = 'Creando cuenta...';
  errEl.style.display = 'none';

  try {
    // Check if email already exists
    const { data: existing } = await SB().from('usuarios').select('id,activo,tipo_usuario').eq('email', email).single();
    if (existing) {
      if (existing.activo) {
        errEl.textContent = 'Este email ya está registrado. Intenta iniciar sesión.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Crear mi cuenta';
        return;
      }
      // Reactivate inactive user
      const h2 = await window.hashPwd(pwd);
      await SB().from('usuarios').update({ activo: true, nombre, password_hash: h2, telefono_contacto: tel || null }).eq('id', existing.id);
      // Show onboarding
      window.showOnboarding({ email, nombre, foto: '' });
      btn.disabled = false; btn.textContent = 'Crear mi cuenta';
      return;
    }

    // Hash password
    const h2 = await window.hashPwd(pwd);
    const usuario = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    // Show onboarding modal to choose profile type
    // Store registration data temporarily
    window._pendingReg = { nombre, email, pwd_hash: h2, usuario, tel, foto: '' };

    // Show onboarding (this will handle the INSERT based on profile choice)
    window.showOnboardingEmail();

    btn.disabled = false; btn.textContent = 'Crear mi cuenta';

  } catch(e) {
    console.error('[registerExternal]', e);
    errEl.textContent = 'Error: ' + (e.message || 'No se pudo crear la cuenta');
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Crear mi cuenta';
  }
};

// Onboarding for email registration (uses _pendingReg data)
window.showOnboardingEmail = function() {
  const html = `<div class="onb-modal" id="onbModal">
    <div class="onb-box">
      <div style="font-size:40px;margin-bottom:8px">🏠</div>
      <div style="font-family:Fraunces,serif;font-size:22px;font-weight:800;margin-bottom:4px">Bienvenido a House</div>
      <div style="font-size:13px;color:var(--sub);margin-bottom:20px">¿Cómo vas a usar la plataforma?</div>
      <button class="onb-opt" onclick="completeEmailReg('cliente')">
        <div class="onb-icon">🔍</div>
        <div class="onb-title">Busco un inmueble</div>
        <div class="onb-sub">Quiero arrendar o comprar una propiedad en Pereira</div>
      </button>
      <button class="onb-opt" onclick="completeEmailReg('vendedor_externo')">
        <div class="onb-icon">🏢</div>
        <div class="onb-title">Quiero publicar inmuebles</div>
        <div class="onb-sub">Soy propietario o inmobiliaria y quiero llegar a más clientes</div>
        <div style="font-size:10px;color:#065f46;margin-top:4px;font-weight:600">✓ 3 publicaciones gratis</div>
      </button>
      <div style="margin-top:14px;font-size:10px;color:var(--g400)">Gratis. Sin spam. Cancela cuando quieras.</div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.completeEmailReg = async function(tipo) {
  const reg = window._pendingReg;
  if (!reg) return;
  const modal = document.getElementById('onbModal');
  if (modal) modal.innerHTML = '<div class="onb-box" style="padding:40px"><div style="font-size:32px;margin-bottom:10px">⏳</div><div style="font-size:13px;color:var(--sub)">Creando tu cuenta...</div></div>';

  try {
    // Todos los registros externos crean cliente — vendedor_externo ya no se crea
    const tipoU = 'cliente';
    const quierePublicar = tipo === 'vendedor_externo';

    const { data: newUser, error } = await SB().from('usuarios').insert({
      email: reg.email, nombre: reg.nombre, foto: reg.foto || null,
      rol: 'cliente', tipo_usuario: tipoU, activo: true,
      usuario: reg.usuario, password_hash: reg.pwd_hash,
      telefono_contacto: reg.tel || null
    }).select().single();
    if (error) throw error;

    const notiTitulo = quierePublicar ? '👤 Nuevo cliente registrado (interesado en publicar)' : '👤 Nuevo cliente registrado';
    await window.noti('registro_externo', 'info', notiTitulo, reg.nombre + ' (' + reg.email + ') se registró como cliente' + (quierePublicar ? ' — manifestó interés en publicar inmuebles' : ''), null, 'admin', null);

    // Log in
    const userData = {
      id: newUser.id, email: newUser.email, nombre: newUser.nombre,
      rol: newUser.rol, foto: newUser.foto || '', usuario: newUser.usuario || '',
      telefono_contacto: newUser.telefono_contacto || '', es_gestor_arriendos: false,
      tipo_usuario: newUser.tipo_usuario, token: 'cred:' + newUser.usuario + ':' + reg.pwd_hash
    };
    window.userStore.set(userData);
    window._pendingReg = null;
    if (modal) modal.remove();
    if (typeof window.sApp === 'function') window.sApp();
    window.go('portafolio');
    // Carga el inventario público para que el portafolio muestre inmuebles inmediatamente
    // (el registro manual no dispara el evento LOGIN que normalmente llama a load())
    if (typeof window.load === 'function') window.load();

  } catch(e) {
    console.error('[completeEmailReg]', e);
    if (modal) modal.remove();
    window.toast('Error al crear cuenta: ' + e.message, 'terr');
    window._pendingReg = null;
  }
};

// ══════════════════════════════════════════════════════════════════
// 19. EXTERNAL USERS — Onboarding, Favoritos, Owner Wizard, Approval
// ══════════════════════════════════════════════════════════════════

// --- Onboarding modal (called from auth.js when new Google user) ---
window.showOnboarding = function(googlePayload) {
  const { email, nombre, foto } = googlePayload;
  const html = `<div class="onb-modal" id="onbModal">
    <div class="onb-box">
      <div style="font-size:40px;margin-bottom:8px">🏠</div>
      <div style="font-family:Fraunces,serif;font-size:22px;font-weight:800;margin-bottom:4px">Bienvenido a House</div>
      <div style="font-size:13px;color:var(--sub);margin-bottom:20px">¿Cómo vas a usar la plataforma?</div>
      <button class="onb-opt" onclick="selectProfile('cliente','${email.replace(/'/g,"\\'")}','${(nombre||'').replace(/'/g,"\\'")}','${(foto||'').replace(/'/g,"\\'")}')">
        <div class="onb-icon">🔍</div>
        <div class="onb-title">Busco un inmueble</div>
        <div class="onb-sub">Quiero arrendar o comprar una propiedad en Pereira</div>
      </button>
      <button class="onb-opt" onclick="selectProfile('vendedor_externo','${email.replace(/'/g,"\\'")}','${(nombre||'').replace(/'/g,"\\'")}','${(foto||'').replace(/'/g,"\\'")}')">
        <div class="onb-icon">🏢</div>
        <div class="onb-title">Quiero publicar inmuebles</div>
        <div class="onb-sub">Soy propietario o inmobiliaria y quiero llegar a más clientes</div>
        <div style="font-size:10px;color:#065f46;margin-top:4px;font-weight:600">✓ 3 publicaciones gratis</div>
      </button>
      <div style="margin-top:14px;font-size:10px;color:var(--g400)">Gratis. Sin spam. Cancela cuando quieras.</div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.selectProfile = async function(tipo, email, nombre, foto) {
  const modal = document.getElementById('onbModal');
  if (modal) modal.innerHTML = '<div class="onb-box" style="padding:40px"><div style="font-size:32px;margin-bottom:10px">⏳</div><div style="font-size:13px;color:var(--sub)">Creando tu cuenta...</div></div>';
  // Todos los registros externos crean cliente — vendedor_externo ya no se crea
  const tipoU = 'cliente';
  const quierePublicar = tipo === 'vendedor_externo';
  try {
    // Check if user already exists (could be inactive)
    const { data: existingUser } = await SB().from('usuarios').select('*').eq('email', email).single();
    if (existingUser) {
      // Reactivate existing user (preserve existing tipo_usuario if it was internal/propietario)
      const keepTipo = (existingUser.tipo_usuario === 'interno' || existingUser.tipo_usuario === 'propietario') ? existingUser.tipo_usuario : tipoU;
      await SB().from('usuarios').update({ activo: true, tipo_usuario: keepTipo, foto: foto || existingUser.foto }).eq('id', existingUser.id);
      existingUser.activo = true; existingUser.tipo_usuario = keepTipo;
      const userData = { id: existingUser.id, email, nombre: existingUser.nombre, rol: existingUser.rol || 'cliente', foto: foto || existingUser.foto || '', usuario: existingUser.usuario || '', telefono_contacto: existingUser.telefono_contacto || '', es_gestor_arriendos: false, tipo_usuario: keepTipo, token: 'google:' + email };
      window.userStore.set(userData);
      if (modal) modal.remove();
      if (typeof window.sApp === 'function') window.sApp();
      window.go('portafolio');
      // Carga el inventario público (igual que el flujo de login normal)
      if (typeof window.load === 'function') window.load();
      return;
    }
    const { data: newUser, error } = await SB().from('usuarios').insert({
      email, nombre: nombre || email.split('@')[0], foto: foto || null,
      rol: 'cliente', tipo_usuario: tipoU, activo: true,
      usuario: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'')
    }).select().single();
    if (error) throw error;

    const notiTitulo = quierePublicar ? '👤 Nuevo cliente registrado (interesado en publicar)' : '👤 Nuevo cliente registrado';
    await window.noti('registro_externo', 'info', notiTitulo, nombre + ' (' + email + ') se registró como cliente' + (quierePublicar ? ' — manifestó interés en publicar inmuebles' : ''), null, 'admin', null);

    // Log in the new user
    const userData = {
      id: newUser.id, email: newUser.email, nombre: newUser.nombre,
      rol: newUser.rol, foto: newUser.foto || '', usuario: newUser.usuario || '',
      telefono_contacto: '', es_gestor_arriendos: false,
      tipo_usuario: newUser.tipo_usuario, token: 'google:' + email
    };
    window.userStore.set(userData);
    if (modal) modal.remove();
    if (typeof window.sApp === 'function') window.sApp();
    window.go('portafolio');
    // Carga el inventario público (igual que el flujo de login normal)
    if (typeof window.load === 'function') window.load();
  } catch(e) {
    console.error('[selectProfile]', e);
    if (modal) modal.remove();
    window.toast('Error al crear cuenta: ' + e.message, 'terr');
  }
};

// --- Favoritos filter toggle (replaces toggleMis for external users) ---
window._favFilterActive = false;
window.toggleFavFilter = function() {
  window._favFilterActive = !window._favFilterActive;
  const btn = document.getElementById('myToggle');
  if (btn) {
    btn.style.background = window._favFilterActive ? '#e11d73' : 'linear-gradient(135deg,#fdf2f8,#fce7f3)';
    btn.style.color = window._favFilterActive ? '#fff' : '#be185d';
  }
  // Filter window.D to show only favorites
  const D = window.D || [];
  const favs = window.FAVS || [];
  if (window._favFilterActive && favs.length) {
    window.render(D.filter(p => favs.includes(p.id)));
  } else {
    window._favFilterActive = false;
    if (typeof window.doSearch === 'function') window.doSearch();
    else window.render(D);
  }
};

// --- Favoritos ---
window.toggleFavorito = async function(inmId) {
  const u = U();
  if (!u) {
    window._pendingFavoriteId = inmId;
    window.showAuthPrompt('favorito', {
      icono: '❤️',
      titulo: 'Guarda tus favoritos',
      mensaje: 'Crea tu cuenta gratis para guardar inmuebles y verlos cuando quieras. Solo toma 30 segundos.',
      beneficios: ['❤️ Guarda inmuebles que te gustan', '🔔 Te avisamos si baja de precio', '📱 Accede desde cualquier dispositivo'],
      cta: 'Crear cuenta gratis',
      ctaSecundario: 'Ahora no',
    });
    return;
  }
  try {
    // Check if already favorited
    const { data: existing } = await SB().from('favoritos').select('id').eq('usuario_id', u.id).eq('inmueble_id', inmId).single();
    if (existing) {
      await SB().from('favoritos').delete().eq('id', existing.id);
      window.toast('💔 Eliminado de favoritos');
    } else {
      await SB().from('favoritos').insert({ usuario_id: u.id, inmueble_id: inmId });
      window.toast('❤️ Guardado en favoritos');
    }
    // Update FAVS array
    if (existing) { window.FAVS = (window.FAVS||[]).filter(id => id !== inmId); }
    else { window.FAVS = [...(window.FAVS||[]), inmId]; }
    // Refresh UI
    if (typeof window.rFavoritos === 'function' && location.hash === '#/favoritos') window.rFavoritos();
    window.render(window.D || []);
  } catch(e) { console.error('[toggleFavorito]', e); }
};

// --- Request upgrade to asesor externo ---
window.requestUpgrade = async function() {
  const u = U(); if (!u) return;
  const desc = prompt('Cuéntanos sobre ti (ej: "Soy propietario con 2 aptos en Pinares" o "Soy inmobiliaria XYZ")');
  if (!desc) return;
  try {
    await SB().from('registro_solicitudes').insert({ usuario_id: u.id, tipo_solicitado: 'vendedor_externo', estado: 'pendiente', descripcion: desc });
    await window.noti('registro_externo', 'info', '🏠 Solicitud upgrade a asesor externo', u.nombre + ' (' + u.email + ') quiere publicar: "' + desc + '"', null, 'admin', null);
    window.toast('📨 Solicitud enviada. Te notificaremos cuando sea aprobada.');
  } catch(e) { console.error('[requestUpgrade]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// --- Owner Wizard State ---
window._ownerStep = 1;
window._ownerData = {};

window.ownerWizardInit = function() { window._ownerStep = 1; window._ownerData = {}; if (typeof window.rPublicar === 'function') window.rPublicar(); };
window.ownerWizardNext = function() { if (window._ownerStep < 3) { window._ownerStep++; window.rPublicar(); } };
window.ownerWizardPrev = function() { if (window._ownerStep > 1) { window._ownerStep--; window.rPublicar(); } };

window.ownerSaveStep = function(step) {
  const d = window._ownerData;
  if (step === 1) {
    d.tipo = document.getElementById('ow_tipo')?.value || '';
    d.negociacion = document.getElementById('ow_neg')?.value || '';
    d.precio_venta = parseFloat(document.getElementById('ow_pv')?.value) || 0;
    d.precio_arriendo = parseFloat(document.getElementById('ow_pa')?.value) || 0;
    d.ciudad = document.getElementById('ow_ciudad')?.value || '';
    d.direccion = document.getElementById('ow_dir')?.value || '';
    d.barrio = document.getElementById('ow_barrio')?.value || '';
    if (!d.tipo || !d.negociacion || !d.ciudad) { window.toast('Completa tipo, negociación y ciudad', 'twarn'); return false; }
    if (d.negociacion.includes('Venta') && !d.precio_venta) { window.toast('Indica el precio de venta', 'twarn'); return false; }
    if (d.negociacion.includes('Arriendo') && !d.precio_arriendo) { window.toast('Indica el precio de arriendo', 'twarn'); return false; }
  } else if (step === 2) {
    d.habitaciones = parseInt(document.getElementById('ow_hab')?.value) || 0;
    d.banos = parseInt(document.getElementById('ow_ban')?.value) || 0;
    d.area_construida = parseFloat(document.getElementById('ow_area')?.value) || 0;
    d.estrato = parseInt(document.getElementById('ow_est')?.value) || 0;
    d.parqueaderos = parseInt(document.getElementById('ow_parq')?.value) || 0;
    d.descripcion_cliente = document.getElementById('ow_desc')?.value || '';
  }
  return true;
};

window.showPaywall = function(usados, limite) {
  const u = U();
  const waMsg = encodeURIComponent('Hola, quiero activar el plan profesional para publicar más inmuebles. Mi cuenta: ' + (u?.email||'') + ' (' + (u?.nombre||'') + ')');
  const html = `<div class="cfdlg" id="paywallDlg" style="display:flex">
    <div class="cfbox" style="text-align:left;max-width:380px">
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:14px;font-weight:800;margin-bottom:6px">🏠 Plan Gratuito: ${usados}/${limite} inmuebles</div>
        <div style="height:6px;background:var(--g200);border-radius:3px;overflow:hidden"><div style="height:100%;width:100%;background:var(--gold);border-radius:3px"></div></div>
      </div>
      <div style="font-size:13px;color:var(--sub);margin-bottom:16px;text-align:center">Has alcanzado el límite gratuito. Activa tu plan mensual para publicar más.</div>
      <div style="background:var(--b50);border:1.5px solid var(--b200);border-radius:10px;padding:16px;margin-bottom:14px">
        <div style="font-size:15px;font-weight:800;color:var(--b700);margin-bottom:8px">📦 Plan Profesional</div>
        <div style="font-size:12px;color:var(--sub);line-height:1.6">✓ Publicaciones ilimitadas<br>✓ Tus inmuebles destacados<br>✓ Estadísticas de contacto<br>✓ Soporte prioritario</div>
      </div>
      <button style="width:100%;padding:14px;border:none;border-radius:10px;font-size:14px;font-weight:700;background:#25d366;color:#fff;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px" onclick="window.open('https://wa.me/573105922763?text=${waMsg}','_blank')">📲 Contactar para activar</button>
      <button style="width:100%;padding:10px;border:none;border-radius:8px;font-size:12px;font-weight:600;background:none;color:var(--sub);font-family:inherit;cursor:pointer;margin-top:8px" onclick="document.getElementById('paywallDlg').remove()">← Volver a mis publicaciones</button>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.ownerPublish = async function() {
  const u = U(); if (!u) return;
  const d = window._ownerData;
  try {
    // Check max 5
    const { data: existing } = await SB().from('inmuebles').select('id').eq('captador_id', u.id).eq('origen', 'externo').eq('eliminado', false);
    const LIMITE_GRATIS = 3;
    if (existing && existing.length >= LIMITE_GRATIS) { window.showPaywall(existing.length, LIMITE_GRATIS); return; }

    // Generate next HOUSE code
    const code = typeof window.nextHouseCode === 'function' ? await window.nextHouseCode() : null;

    const { data: newInm, error } = await SB().from('inmuebles').insert({
      tipo: d.tipo, negociacion: d.negociacion, ciudad: d.ciudad,
      direccion: d.direccion, barrio: d.barrio, direccion_publica: d.barrio + ', ' + d.ciudad,
      precio_venta: d.precio_venta || 0, precio_arriendo: d.precio_arriendo || 0,
      habitaciones: d.habitaciones || 0, banos: d.banos || 0,
      area_construida: d.area_construida || 0, estrato: d.estrato || 0,
      parqueaderos: d.parqueaderos || 0, descripcion_cliente: d.descripcion_cliente || '',
      captador_id: u.id, origen: 'externo', estado_revision: 'en_revision',
      estado: 'Disponible', codigo_house: code, eliminado: false
    }).select('id').single();
    if (error) throw error;

    // Save photos to fotos table
    if (d._fotos && d._fotos.length && newInm?.id) {
      for (let i = 0; i < d._fotos.length; i++) {
        await SB().from('fotos').insert({
          inmueble_id: newInm.id, url: d._fotos[i].url,
          url_thumb: d._fotos[i].thumb, origen: 'cloudinary', orden: i
        });
      }
    }

    await window.noti('inmueble_externo', 'amarillo', '🏠 Nuevo inmueble externo: ' + d.tipo + ' en ' + d.ciudad, u.nombre + ' publicó ' + d.tipo + ' en ' + d.barrio + ', ' + d.ciudad + (d._fotos?.length ? ' (' + d._fotos.length + ' fotos)' : ''), null, 'admin', newInm?.id);
    window.toast('🏠 Tu inmueble fue enviado para revisión');
    window._ownerStep = 1; window._ownerData = {};
    window.go('mis-pub');
  } catch(e) { console.error('[ownerPublish]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// --- Admin Approval ---
window.aprobarRegistro = async function(userId, tipo) {
  try {
    // Always set to vendedor_externo regardless of old tipo_solicitado value
    await SB().from('usuarios').update({ tipo_usuario: 'vendedor_externo' }).eq('id', userId);
    await SB().from('registro_solicitudes').update({ estado: 'aprobado' }).eq('usuario_id', userId).eq('estado', 'pendiente');
    const { data: usr } = await SB().from('usuarios').select('nombre,email').eq('id', userId).single();
    await window.noti('registro_aprobado', 'verde', '✅ Tu solicitud fue aprobada', 'Ya puedes publicar tus inmuebles en House.', usr?.email, null, null);
    window.toast('✅ Registro aprobado');
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) { console.error('[aprobarRegistro]', e); window.toast('Error: ' + e.message, 'terr'); }
};

window.rechazarRegistro = async function(userId) {
  const motivo = prompt('Motivo del rechazo:');
  if (!motivo) return;
  try {
    await SB().from('registro_solicitudes').update({ estado: 'rechazado', motivo_rechazo: motivo }).eq('usuario_id', userId).eq('estado', 'pendiente');
    const { data: usr } = await SB().from('usuarios').select('nombre,email').eq('id', userId).single();
    await window.noti('registro_rechazado', 'rojo', '❌ Solicitud rechazada', 'Motivo: ' + motivo, usr?.email, null, null);
    window.toast('❌ Registro rechazado');
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) { console.error('[rechazarRegistro]', e); window.toast('Error: ' + e.message, 'terr'); }
};

window.aprobarInmuebleExterno = async function(inmId) {
  try {
    await SB().from('inmuebles').update({ estado_revision: 'aprobado' }).eq('id', inmId);
    const { data: inm } = await SB().from('inmuebles').select('tipo,ciudad,captador:usuarios!captador_id(nombre,email)').eq('id', inmId).single();
    const capEmail = inm?.captador?.email || '';
    await window.noti('inmueble_aprobado', 'verde', '✅ Tu inmueble fue aprobado', 'Tu ' + (inm?.tipo||'inmueble') + ' en ' + (inm?.ciudad||'') + ' ya está publicado.', capEmail, null, inmId);
    await window.noti('inmueble_aprobado', 'verde', '✅ Inmueble externo aprobado', (inm?.captador?.nombre||'Propietario') + ': ' + (inm?.tipo||'') + ' en ' + (inm?.ciudad||''), null, 'admin', inmId);
    window.toast('✅ Inmueble aprobado y publicado');
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) { console.error('[aprobarInmuebleExterno]', e); window.toast('Error: ' + e.message, 'terr'); }
};

window.rechazarInmuebleExterno = async function(inmId) {
  const motivo = prompt('Motivo del rechazo:');
  if (!motivo) return;
  try {
    await SB().from('inmuebles').update({ estado_revision: 'rechazado' }).eq('id', inmId);
    const { data: inm } = await SB().from('inmuebles').select('tipo,ciudad,captador:usuarios!captador_id(nombre,email)').eq('id', inmId).single();
    await window.noti('inmueble_rechazado', 'rojo', '❌ Tu inmueble fue rechazado', 'Tu ' + (inm?.tipo||'') + ' en ' + (inm?.ciudad||'') + '. Motivo: ' + motivo, inm?.captador?.email, null, inmId);
    window.toast('❌ Inmueble rechazado');
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) { console.error('[rechazarInmuebleExterno]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// ══════════════════════════════════════════════════════════════════
// 20. MESSAGING — Chat interno
// ══════════════════════════════════════════════════════════════════

function _escHtml(t){if(typeof t!=='string')return'';return t.replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','`':'&#x60;'}[c]));}
function _hashConvId(a,b,inm){const s=[a,b].sort();const r=s[0]+':'+s[1]+':'+(inm||'general');let h=0;for(let i=0;i<r.length;i++){h=((h<<5)-h)+r.charCodeAt(i);h|=0;}const x=Math.abs(h).toString(16).padStart(8,'0');return x.slice(0,8)+'-'+x.slice(0,4)+'-4'+x.slice(4,7)+'-8'+x.slice(0,3)+'-'+x.padEnd(12,'0');}
function _tiempoRel(f){const d=Date.now()-new Date(f).getTime();const m=Math.floor(d/60000);if(m<1)return'ahora';if(m<60)return m+' min';const h=Math.floor(m/60);if(h<24)return h+'h';const dd=Math.floor(h/24);if(dd===1)return'ayer';if(dd<7)return dd+'d';return new Date(f).toLocaleDateString('es-CO',{day:'2-digit',month:'short'});}

window.abrirChat = async function(receptorId, inmuebleId) {
  const u=U(); if(!u){window.toast('Inicia sesión para contactar','twarn');return;}
  const convId=_hashConvId(u.id,receptorId,inmuebleId);
  try {
    const{data:msgs}=await SB().from('mensajes').select('*,emisor:usuarios!emisor_id(nombre,foto)').eq('conversacion_id',convId).order('created_at',{ascending:true});
    const{data:receptor}=await SB().from('usuarios').select('id,nombre,foto,tipo_usuario').eq('id',receptorId).single();
    let inmueble=null;
    if(inmuebleId){const{data}=await SB().from('inmuebles').select('id,tipo,ciudad,precio_arriendo,precio_venta,direccion_publica,fotos(url_thumb,orden)').eq('id',inmuebleId).single();inmueble=data;}
    // Mark as read
    if(msgs&&msgs.length){const nr=msgs.filter(m=>m.receptor_id===u.id&&!m.leido).map(m=>m.id);if(nr.length)await SB().from('mensajes').update({leido:true}).in('id',nr);}
    _renderChatModal(receptor,inmueble,msgs||[],convId);
  }catch(e){console.error('[abrirChat]',e);window.toast('Error al abrir chat','terr');}
};

function _renderChatModal(receptor,inmueble,msgs,convId) {
  const u=U();const rNom=receptor?.nombre||'?';const rFoto=receptor?.foto;const rIni=rNom[0].toUpperCase();
  const rTipo=(receptor?.tipo_usuario==='vendedor_externo'||receptor?.tipo_usuario==='propietario')?'Asesor externo':'Cliente';
  // Inmueble header
  let inmH='';
  if(inmueble){const ft=inmueble.fotos?.length?[...inmueble.fotos].sort((a,b)=>a.orden-b.orden)[0].url_thumb:'';
    inmH=`<div style="padding:8px 10px;background:var(--cd2);border-bottom:1px solid var(--brd);display:flex;gap:8px;align-items:center">${ft?`<img src="${ft}" style="width:36px;height:36px;border-radius:6px;object-fit:cover">`:'<div style="width:36px;height:36px;border-radius:6px;background:var(--b50);display:flex;align-items:center;justify-content:center;font-size:16px">🏠</div>'}<div><div style="font-size:11px;font-weight:700">${inmueble.tipo} en ${inmueble.ciudad}</div><div style="font-size:9px;color:var(--sub)">${inmueble.precio_arriendo>0?fm(inmueble.precio_arriendo)+'/mes':fm(inmueble.precio_venta||0)}</div></div></div>`;}
  // Messages
  const msgsH=msgs.length?msgs.map(m=>{const esMio=m.emisor_id===u.id;const hr=new Date(m.created_at).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});return`<div style="display:flex;justify-content:${esMio?'flex-end':'flex-start'};margin-bottom:10px"><div style="max-width:75%;padding:10px 14px;border-radius:${esMio?'12px 12px 4px 12px':'12px 12px 12px 4px'};background:${esMio?'var(--b600)':'var(--cd2)'};color:${esMio?'#fff':'var(--tx)'}"><div style="font-size:12px;line-height:1.5">${_escHtml(m.texto)}</div><div style="font-size:9px;${esMio?'opacity:.7':'color:var(--g400)'};text-align:right;margin-top:4px">${hr}${esMio?(m.leido?' ✓✓':' ✓'):''}</div></div></div>`;}).join(''):`<div style="text-align:center;padding:16px 10px;color:var(--sub)"><div style="font-size:22px;margin-bottom:4px;opacity:.4">💬</div><div style="font-size:11px">Envía el primer mensaje</div></div>`;

  const html=`<div id="chatModal" onclick="if(event.target===this)this.remove()" style="position:fixed;inset:0;z-index:300;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:fi .2s"><div style="background:var(--cd);border-radius:14px;width:92%;max-width:360px;max-height:400px;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.25);animation:su2 .25s;overflow:hidden"><div style="padding:8px 12px;border-bottom:1px solid var(--brd);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0"><div style="display:flex;align-items:center;gap:8px;flex:1">${rFoto?`<img src="${rFoto}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`:`<div style="width:28px;height:28px;border-radius:50%;background:var(--b50);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--b700)">${rIni}</div>`}<div><div style="font-size:13px;font-weight:700">${_escHtml(rNom)}</div><div style="font-size:9px;color:var(--sub)">${rTipo}</div></div></div><button onclick="document.getElementById('chatModal').remove()" style="width:30px;height:30px;border-radius:8px;border:1.5px solid var(--brd);background:var(--cd2);font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;color:var(--sub);cursor:pointer;flex-shrink:0">✕</button></div>${inmH}<div id="chatMsgs" style="flex:1;overflow-y:auto;padding:10px;-webkit-overflow-scrolling:touch">${msgsH}</div><div style="padding:8px 10px;border-top:1px solid var(--brd);display:flex;gap:6px;align-items:flex-end;flex-shrink:0"><textarea id="chatInput" placeholder="Escribe un mensaje..." style="flex:1;padding:8px 10px;border:1.5px solid var(--brd);border-radius:10px;font-size:12px;font-family:inherit;color:var(--tx);background:var(--cd);resize:none;min-height:36px;max-height:70px" onkeypress="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();enviarMsg('${convId}','${receptor.id}','${inmueble?.id||''}')}"></textarea><button onclick="enviarMsg('${convId}','${receptor.id}','${inmueble?.id||''}')" style="width:36px;height:36px;border-radius:50%;background:var(--b600);color:#fff;border:none;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">➤</button></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
  const c=document.getElementById('chatMsgs');if(c)c.scrollTop=c.scrollHeight;
}

window.enviarMsg = async function(convId,receptorId,inmuebleId) {
  const input=document.getElementById('chatInput');const texto=(input?.value||'').trim();if(!texto)return;
  input.value='';
  const u=U();
  try {
    const{error}=await SB().from('mensajes').insert({conversacion_id:convId,emisor_id:u.id,receptor_id:receptorId,inmueble_id:inmuebleId||null,texto});
    if(error){window.toast('Error al enviar','terr');return;}
    const c=document.getElementById('chatMsgs');const hr=new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
    const ph=c?.querySelector('[style*="text-align:center"]');if(ph)ph.remove();
    if(c){c.insertAdjacentHTML('beforeend',`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><div style="max-width:75%;padding:10px 14px;border-radius:12px 12px 4px 12px;background:var(--b600);color:#fff"><div style="font-size:12px;line-height:1.5">${_escHtml(texto)}</div><div style="font-size:9px;opacity:.7;text-align:right;margin-top:4px">${hr} ✓</div></div></div>`);c.scrollTop=c.scrollHeight;}
    // Notification
    const p=inmuebleId?findInm(inmuebleId):null;const asunto=p?p.tipo+' en '+p.ciudad:'mensaje directo';
    const textoCorto=texto.length>60?texto.substring(0,60)+'...':texto;
    // If sender is a cliente, attach contact info so the captador (and admin/oficina) can reach out
    const esCli=u.tipo_usuario==='cliente';
    let titulo='💬 '+u.nombre+' te escribió';
    let mensajeNoti=u.nombre+': "'+textoCorto+'" — Re: '+asunto;
    if(esCli){
      const cliInfo='👤 '+u.nombre+(u.telefono_contacto?' · 📱 '+u.telefono_contacto:'')+(u.email?' · ✉️ '+u.email:'');
      titulo='🏠 Cliente interesado: '+u.nombre+' — '+asunto;
      mensajeNoti=cliInfo+' — "'+textoCorto+'"';
    }
    await window.noti('mensaje','info',titulo,mensajeNoti,receptorId,null,inmuebleId);
    // Replicate to admin and oficina when sender is cliente
    if(esCli){
      await window.noti('mensaje','info',titulo,mensajeNoti,null,'admin',inmuebleId);
      await window.noti('mensaje','info',titulo,mensajeNoti,null,'oficina',inmuebleId);
    }
  }catch(e){console.error('[enviarMsg]',e);window.toast('Error','terr');}
};

// ══════════════════════════════════════════════════════════════════
// 21. CONVERSATIONS LIST (renderMensajes)
// ══════════════════════════════════════════════════════════════════

window.renderMensajes = async function() {
  const el=document.getElementById('mensajesc');if(!el)return;const u=U();if(!u)return;
  el.innerHTML='<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';
  try {
    const{data:allMsgs}=await SB().from('mensajes').select('*,emisor:usuarios!emisor_id(id,nombre,foto),receptor:usuarios!receptor_id(id,nombre,foto),inmueble:inmuebles!inmueble_id(id,tipo,ciudad,precio_arriendo,precio_venta)').or(`emisor_id.eq.${u.id},receptor_id.eq.${u.id}`).order('created_at',{ascending:false});
    if(!allMsgs||!allMsgs.length){el.innerHTML='<div class="emp"><span class="emp-i">💬</span><h3>Sin mensajes</h3><p style="font-size:12px;color:var(--sub)">Cuando alguien te contacte por un inmueble, aparecerá aquí</p></div>';return;}
    // Group by conversacion_id
    const convMap={};allMsgs.forEach(m=>{if(!convMap[m.conversacion_id]||new Date(m.created_at)>new Date(convMap[m.conversacion_id].created_at))convMap[m.conversacion_id]=m;});
    const convs=Object.values(convMap).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const noLeidosMap={};allMsgs.forEach(m=>{if(m.receptor_id===u.id&&!m.leido)noLeidosMap[m.conversacion_id]=(noLeidosMap[m.conversacion_id]||0)+1;});

    let h='<div style="font-family:Fraunces,serif;font-size:18px;font-weight:800;margin-bottom:14px">💬 Mensajes</div>';
    convs.forEach(m=>{
      const otro=m.emisor_id===u.id?m.receptor:m.emisor;const oNom=otro?.nombre||'?';const oIni=oNom[0].toUpperCase();const oFoto=otro?.foto;
      const nl=noLeidosMap[m.conversacion_id]||0;const inm=m.inmueble;
      const inmTxt=inm?(inm.tipo+' — '+(inm.precio_arriendo>0?fm(inm.precio_arriendo)+'/mes':fm(inm.precio_venta||0))):'';
      const tRel=_tiempoRel(m.created_at);const esNL=nl>0;
      const recId=m.emisor_id===u.id?m.receptor_id:m.emisor_id;
      h+=`<div style="padding:10px 12px;display:flex;gap:10px;align-items:center;border-bottom:.5px solid var(--g100);cursor:pointer;${esNL?'background:var(--b50)':''}" onclick="abrirChat('${recId}','${m.inmueble_id||''}')">`;
      h+=oFoto?`<img src="${oFoto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">`:`<div style="width:40px;height:40px;border-radius:50%;background:var(--cd2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--sub);flex-shrink:0">${oIni}</div>`;
      h+=`<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:13px;font-weight:${esNL?'700':'500'}">${_escHtml(oNom)}</div><div style="font-size:10px;color:var(--sub)">${tRel}</div></div><div style="font-size:11px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${esNL?'font-weight:600;color:var(--tx)':''}">${m.emisor_id===u.id?'Tú: ':''}${_escHtml(m.texto)}</div>${inmTxt?`<div style="font-size:9px;color:var(--b600);font-weight:500;margin-top:2px">Re: ${inmTxt}</div>`:''}</div>`;
      if(nl>0)h+=`<span style="background:var(--red);color:#fff;font-size:10px;font-weight:800;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 5px;flex-shrink:0">${nl}</span>`;
      h+=`</div>`;
    });
    el.innerHTML=h;
  }catch(e){el.innerHTML='<div style="color:var(--red)">Error: '+e.message+'</div>';}
};

// ══════════════════════════════════════════════════════════════════
// 22. MIS INMUEBLES — Asesor externo dashboard
// ══════════════════════════════════════════════════════════════════

window.renderMisInmueblesExt = async function() {
  const el=document.getElementById('misinmc');if(!el)return;const u=U();if(!u)return;
  const LIMITE=3;
  el.innerHTML='<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';
  try {
    const{data}=await SB().from('inmuebles').select('*,fotos(url,url_thumb,orden)').eq('captador_id',u.id).eq('origen','externo').eq('eliminado',false).order('created_at',{ascending:false});
    const mis=data||[];const pct=Math.min(100,Math.round(mis.length/LIMITE*100));const rest=Math.max(0,LIMITE-mis.length);
    window._misExtData=mis;

    let h='<div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;margin-bottom:14px">🏠 Mis Inmuebles</div>';
    // Progress bar
    h+=`<div style="background:var(--cd);border:1.5px solid var(--brd);border-radius:10px;padding:14px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:12px;font-weight:700">📦 Plan gratuito: ${mis.length}/${LIMITE}</span>${rest>0?`<button style="padding:6px 14px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:var(--b600);color:#fff;font-family:inherit;cursor:pointer" onclick="go('publicar')">➕ Publicar nuevo</button>`:`<button style="padding:6px 14px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:var(--gold);color:#fff;font-family:inherit;cursor:pointer" onclick="showPaywall(${mis.length},${LIMITE})">📦 Ver Plan Pro</button>`}</div><div style="height:6px;background:var(--g100);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct>=100?'var(--gold)':'var(--b500)'};border-radius:3px;transition:width .3s"></div></div></div>`;
    // Filters
    h+=`<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap"><select id="misExtTipo" class="esel" style="font-size:11px;padding:6px 10px" onchange="filtrarMisExt()"><option value="">Todos los tipos</option><option value="Apartamento">🏢 Apto</option><option value="Casa">🏡 Casa</option><option value="Finca">🌾 Finca</option><option value="Local">🏪 Local</option></select><select id="misExtOrden" class="esel" style="font-size:11px;padding:6px 10px" onchange="filtrarMisExt()"><option value="reciente">Más recientes</option><option value="precio_desc">Mayor precio</option><option value="precio_asc">Menor precio</option></select></div>`;

    if(!mis.length){h+='<div class="emp"><span class="emp-i">🏠</span><h3>Sin publicaciones aún</h3><p style="font-size:12px;color:var(--sub)">Publica tu primer inmueble y llega a cientos de clientes</p><button class="bt bp" style="margin-top:10px" onclick="go(\'publicar\')">➕ Publicar mi primer inmueble</button></div>';el.innerHTML=h;return;}

    h+='<div id="misExtGrid" class="pgr">';
    mis.forEach(p=>{
      const fotos=(p.fotos||[]).sort((a,b)=>a.orden-b.orden);const thumb=fotos.length>0?(fotos[0].url_thumb||fotos[0].url):'';
      const pv=p.precio_venta||0,pa=p.precio_arriendo||0;const rev=p.estado_revision||'aprobado';
      const revBadge=rev==='aprobado'?'<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--greenbg);color:#065f46;border:1px solid var(--gb)">Publicado</span>':rev==='en_revision'?'<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--goldbg);color:#92400e;border:1px solid var(--yb)">En revisión</span>':'<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--redbg);color:var(--red);border:1px solid var(--rb)">Rechazado</span>';
      h+=`<div class="pc" data-tipo="${p.tipo}" data-pv="${pv}" data-pa="${pa}">${thumb?`<img src="${thumb}" style="width:100%;height:140px;object-fit:cover;display:block" onerror="this.style.display='none'">`:`<div style="height:80px;background:var(--cd2);display:flex;align-items:center;justify-content:center;font-size:24px;border-bottom:1px solid var(--brd)">${emo(p.tipo)}</div>`}<div class="pcbd"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:14px;font-weight:800">${p.tipo||'Inmueble'}</span>${revBadge}</div><div style="font-size:11px;color:var(--sub)">📍 ${p.direccion_publica||p.ciudad||''}</div><div style="background:var(--cd2);border-radius:8px;padding:8px 10px;margin:6px 0;border:1px solid var(--brd)">${pv>0?`<div style="font-family:Fraunces,serif;font-size:16px;font-weight:700;color:var(--b700)">${fm(pv)}</div>`:''}${pa>0?`<div style="font-size:13px;font-weight:700;color:#065f46">${fm(pa)}/mes</div>`:''}</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${p.habitaciones?`<span class="sp">🛏️${p.habitaciones}</span>`:''}${p.banos?`<span class="sp">🚿${p.banos}</span>`:''}${p.area_construida?`<span class="sp">📐${p.area_construida}m²</span>`:''}</div><div style="display:flex;gap:4px"><button class="bt bsm bp" style="flex:1" onclick="shareInm('${p.id}')">📤 Compartir</button><button class="bt bsm bd" onclick="eliminarMiInmueble('${p.id}')">🗑️</button></div></div></div>`;
    });
    h+='</div>';
    // Empty slot
    if(rest>0)h+=`<div style="border:2px dashed var(--brd);border-radius:12px;padding:20px;text-align:center;margin-top:8px"><div style="font-size:13px;color:var(--sub)">Espacio disponible: ${rest} restante${rest!==1?'s':''}</div><button onclick="go('publicar')" style="margin-top:8px;padding:8px 16px;border:none;border-radius:8px;font-size:12px;font-weight:700;background:var(--b50);color:var(--b700);cursor:pointer;font-family:inherit">➕ Publicar nuevo</button></div>`;
    // Plan CTA
    h+=`<div style="margin-top:20px;padding:16px;border-top:1px solid var(--brd);text-align:center"><div style="font-size:13px;color:var(--sub);margin-bottom:8px">¿Necesitas más espacio?</div><button onclick="showPaywall(${mis.length},${LIMITE})" style="padding:8px 16px;border:1.5px solid var(--b300);border-radius:8px;font-size:12px;font-weight:700;background:var(--cd);color:var(--b700);cursor:pointer;font-family:inherit">📦 Ver Plan Profesional →</button></div>`;
    el.innerHTML=h;
  }catch(e){el.innerHTML='<div style="color:var(--red)">Error: '+e.message+'</div>';}
};

window.filtrarMisExt = function() {
  const tipo=document.getElementById('misExtTipo')?.value||'';
  const grid=document.getElementById('misExtGrid');if(!grid)return;
  grid.querySelectorAll('.pc').forEach(card=>{
    const ct=card.dataset.tipo||'';
    card.style.display=(!tipo||ct.toLowerCase().includes(tipo.toLowerCase()))?'':'none';
  });
};

window.eliminarMiInmueble = async function(id) {
  const u=U();const mis=window._misExtData||[];const p=mis.find(x=>x.id===id);if(!p)return;
  if(p.captador_id!==u.id){window.toast('Solo puedes eliminar tus propios inmuebles','terr');return;}
  const desc=(p.tipo||'Inmueble')+' en '+(p.ciudad||'?');
  const ok=await window.cfShow('🗑️','¿Eliminar '+desc+'?','Se retirará de la plataforma. Recuperas 1 espacio de publicación.');
  if(!ok)return;
  await SB().from('inmuebles').update({eliminado:true,fecha_eliminacion:new Date().toISOString()}).eq('id',id);
  await window.noti('cambio_estado','info','🗑️ Asesor externo eliminó: '+desc,u.nombre+' eliminó su '+desc,null,'admin',id);
  window.toast('🗑️ Inmueble eliminado · 1 espacio liberado');
  window.renderMisInmueblesExt();
};

// ══════════════════════════════════════════════════════════════════
// 23. REFERRAL UX — Desplegables informativos + Dashboard ganancias + Inbox admin
// ══════════════════════════════════════════════════════════════════

window.renderHowItWorks = function(startOpen) {
  const open = startOpen ? ' open' : '';
  const steps = [
    { icon: '👀', color: '#f59e0b', title: 'Paso 1 · Encuentra un inmueble', desc: 'Camina por tu barrio, tu conjunto, o pregunta a conocidos. ¿Ves un aviso de "Se Arrienda"? ¡Ese es tu negocio!' },
    { icon: '🤝', color: '#3b82f6', title: 'Paso 2 · Habla con el propietario', desc: 'Cuéntale los beneficios: pago garantizado, estudio al inquilino, contrato legal, publicación en 3 portales. Tienes material de apoyo para compartir por WhatsApp.' },
    { icon: '📝', color: '#8b5cf6', title: 'Paso 3 · Registra el referido aquí', desc: 'Llena el formulario con los datos del propietario y del inmueble. ¡Toma menos de 2 minutos!' },
    { icon: '📄', color: '#10b981', title: 'Paso 4 · Contrato con propietario = $50.000 para ti', desc: 'Si el propietario acepta nuestros servicios y firma contrato de administración con la inmobiliaria, recibes tu bono de $50.000. ¡Así de simple!' },
    { icon: '💰', color: '#059669', title: 'Paso 5 · Inmueble arrendado = el resto de tu comisión', desc: 'Cuando consigamos inquilino y se firme contrato de arriendo, ganas el resto de la comisión (10% del canon - bono). Un apto de $2.5M = $250.000 para ti.' }
  ];
  let timeline = steps.map((s, i) => '<div style="position:relative;padding-bottom:' + (i < 4 ? '24px' : '0') + '">' + (i < 4 ? '<div style="position:absolute;left:-20px;top:28px;bottom:0;width:2px;background:var(--g200)"></div>' : '') + '<div style="position:absolute;left:-28px;top:2px;width:20px;height:20px;border-radius:50%;background:' + s.color + ';display:flex;align-items:center;justify-content:center;font-size:10px">' + s.icon + '</div><div style="font-size:13px;font-weight:700;color:' + s.color + ';margin-bottom:3px">' + s.title + '</div><div style="font-size:12px;color:var(--sub);line-height:1.5">' + s.desc + '</div></div>').join('');
  return '<details' + open + ' style="background:var(--cd);border:1.5px solid var(--brd);border-radius:14px;margin-bottom:16px;overflow:hidden"><summary style="padding:16px;cursor:pointer;font-family:Fraunces,serif;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;user-select:none"><span style="font-size:20px">📖</span> ¿Cómo funciona el programa de referidos?</summary><div style="padding:0 16px 20px"><div style="position:relative;padding-left:32px;margin-top:8px">' + timeline + '</div><div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #bbf7d0;border-radius:12px;padding:16px;margin-top:20px;text-align:center"><div style="font-size:13px;font-weight:700;color:#065f46;margin-bottom:8px">💡 Ejemplo real</div><div style="font-size:12px;color:#065f46;line-height:1.6">Don Carlos, celador de un conjunto, refirió <strong>3 apartamentos</strong> en un mes. Canon promedio: $1.800.000. <strong>Ganó $540.000</strong> sin salir de su trabajo.</div></div></div></details>';
};

window.renderReferralPolicies = function() {
  return '<details style="background:var(--cd);border:1.5px solid var(--brd);border-radius:14px;margin-bottom:16px;overflow:hidden"><summary style="padding:16px;cursor:pointer;font-family:Fraunces,serif;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;user-select:none"><span style="font-size:20px">📋</span> Políticas y condiciones</summary><div style="padding:0 16px 20px;font-size:12px;color:var(--sub);line-height:1.7">' +
    '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-top:12px;margin-bottom:6px">💰 Sobre la comisión</div><div style="padding-left:12px;border-left:2px solid var(--b600);margin-bottom:14px">• Hasta el <strong>10% del primer canon</strong> mensual.<br>• Dos partes: <strong>$50.000 de bono</strong> cuando el propietario firma contrato con la inmobiliaria + <strong>el resto</strong> cuando se arriende el inmueble (contrato con inquilino).<br>• Se calcula sobre el canon final pactado.</div>' +
    '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">✅ Requisitos</div><div style="padding-left:12px;border-left:2px solid var(--green);margin-bottom:14px">• Propietario dispuesto a firmar contrato de administración.<br>• Inmueble en condiciones habitables.<br>• Sin contrato vigente con otra inmobiliaria.<br>• Datos reales y verificables.</div>' +
    '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">⏰ Tiempos</div><div style="padding-left:12px;border-left:2px solid var(--gold);margin-bottom:14px">• Verificación: máximo <strong>5 días hábiles</strong>.<br>• Bono: se confirma al verificar.<br>• Comisión final: dentro de <strong>15 días</strong> después del arriendo.<br>• Pago: transferencia o efectivo.</div>' +
    '<div style="font-weight:700;color:var(--tx);font-size:13px;margin-bottom:6px">📌 General</div><div style="padding-left:12px;border-left:2px solid var(--sub);margin-bottom:14px">• Cualquier persona mayor de edad puede participar.<br>• No hay límite de referidos.<br>• Si uno es rechazado, puedes referir otro diferente.</div>' +
    '<div style="text-align:center;padding:12px;background:var(--cd2);border-radius:10px;margin-top:8px"><div style="font-size:11px;color:var(--sub)">¿Dudas?</div><a href="https://wa.me/573105922763?text=Hola,%20tengo%20una%20pregunta%20sobre%20referidos" target="_blank" style="display:inline-block;margin-top:6px;padding:8px 20px;background:#25d366;color:#fff;border-radius:20px;font-size:12px;font-weight:700;text-decoration:none">📞 WhatsApp</a></div></div></details>';
};

window.renderReferralStrategies = function() {
  const strats = [
    { n: 1, c: '#3b82f6', t: 'El enfoque del "Vecino que ayuda"', q: '"Vi que está arrendando. Yo trabajo con una inmobiliaria que consigue inquilino, le hace estudio, y le paga cada 10 sin falta. ¿Le cuento?"', tip: 'No vendas. Ayuda. Ofreces solución a un problema que ya tiene.' },
    { n: 2, c: '#8b5cf6', t: 'El miedo al mal inquilino', q: '"La ventaja es que hacen estudio de crédito, verifican en DataCrédito, piden referencias... No entra cualquier persona. Y si hay problemas, ellos se encargan."', tip: 'El estudio de crédito y la póliza son los argumentos más fuertes.' },
    { n: 3, c: '#10b981', t: 'El argumento del 10% vs. la "joda"', q: '"¿Cuánto tiempo lleva con el aviso? Cada mes vacío son $X que pierde. Por el 10% se olvida de todo: cobros, contratos, mantenimiento."', tip: 'Si lleva +1 mes vacío, enfatiza el costo de oportunidad.' },
    { n: 4, c: '#f59e0b', t: 'Para celadores y administradores', q: '"Don/Doña [nombre], vi que desocuparon el apto del [piso]. Conozco una inmobiliaria seria que le ayuda a arrendar rápido."', tip: 'Ustedes saben cuándo se desocupan los aptos antes que nadie. Ese timing es oro.' },
    { n: 5, c: '#ef4444', t: 'El WhatsApp de seguimiento', q: '"Hola [nombre], ¿pudo revisar la info de la inmobiliaria? Quedo atento por si tiene dudas."', tip: 'Usa el botón "Enviar propuesta" de esta app. Si no responde en 3 días, envía mensaje corto.' }
  ];
  const objs = [
    ['"No quiero pagar comisión"', '"No paga nada inicial. Solo se cobra cuando YA está arrendado y generando plata."'],
    ['"Ya tengo inquilino"', '"Perfecto, la inmobiliaria le hace estudio y contrato a su inquilino. Se protege legalmente."'],
    ['"Las inmobiliarias son lentas"', '"Esta publica en 3 portales al tiempo. Promedio de arriendo: menos de 30 días."'],
    ['"Prefiero manejarlo yo"', '"Si el inquilino queda mal, ¿tiene abogado para desalojo? ¿Póliza de daños? Todo eso está en el 10%."'],
    ['"Déjeme pensarlo"', '"Sin presión. Le envío la info por WhatsApp. Y puede llamar directo a la inmobiliaria."']
  ];
  let sh = strats.map(s => '<div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="width:24px;height:24px;border-radius:50%;background:' + s.c + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700">' + s.n + '</div><div style="font-size:13px;font-weight:700">' + s.t + '</div></div><div style="padding-left:32px;font-size:12px;color:var(--sub);line-height:1.5"><div style="background:var(--cd2);border-radius:8px;padding:10px;font-style:italic;margin-bottom:6px">' + s.q + '</div><div style="font-size:11px"><strong>Tip:</strong> ' + s.tip + '</div></div></div>').join('');
  let oh = objs.map(o => '<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:2px">' + o[0] + '</div><div style="font-size:11px;color:var(--sub);padding-left:12px;border-left:2px solid var(--green);line-height:1.5">' + o[1] + '</div></div>').join('');
  return '<details style="background:var(--cd);border:1.5px solid var(--brd);border-radius:14px;margin-bottom:16px;overflow:hidden"><summary style="padding:16px;cursor:pointer;font-family:Fraunces,serif;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;user-select:none"><span style="font-size:20px">🎯</span> Guía: estrategias para cerrar más referidos</summary><div style="padding:0 16px 20px"><div style="margin-top:12px">' + sh + '</div><div style="margin-top:12px;margin-bottom:12px"><div style="font-size:13px;font-weight:700;margin-bottom:8px">💬 Objeciones comunes</div>' + oh + '</div><div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:16px;text-align:center"><div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:4px">🏆 Meta del mes</div><div style="font-size:12px;color:#78350f">3 referidos cerrados = entre <strong>$200K y $750K</strong> de ingreso extra.</div></div></div></details>';
};

window.renderCommissionDashboard = function(stats, refs) {
  const pendPago = (refs||[]).filter(r => r.bono_pagado && !r.comision_pagada && r.estado === 'arrendado').reduce((s, r) => s + (r.comision_monto || 0), 0);
  const enProc = (refs||[]).filter(r => r.estado === 'registrado' || r.estado === 'verificando').length;
  const potencial = (refs||[]).filter(r => !['rechazado', 'arrendado'].includes(r.estado)).reduce((s, r) => s + Math.max(0, Math.round((r.canon_aproximado || 0) * 0.10)), 0);
  let h = '<div style="background:linear-gradient(135deg,#1e3a5f,#1e40af);border-radius:16px;padding:24px;margin-bottom:16px;color:#fff;text-align:center">';
  h += '<div style="font-size:11px;opacity:.8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Total ganado</div>';
  h += '<div style="font-family:Fraunces,serif;font-size:36px;font-weight:700">' + fm(stats.totalGanado) + '</div>';
  h += '<div style="display:flex;justify-content:center;gap:24px;margin-top:12px;font-size:12px;opacity:.9"><div><div style="font-size:18px;font-weight:700">' + fm(stats.bonosCobrados) + '</div><div style="font-size:10px;opacity:.7">Bonos</div></div><div style="width:1px;background:rgba(255,255,255,.3)"></div><div><div style="font-size:18px;font-weight:700">' + fm(stats.comisionesCobradas) + '</div><div style="font-size:10px;opacity:.7">Comisiones</div></div></div>';
  h += '<div style="display:flex;justify-content:center;gap:16px;margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2)">';
  if (pendPago > 0) h += '<div style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 16px;font-size:11px"><span style="color:#fbbf24">⏳</span> Pendiente: <strong>' + fm(pendPago) + '</strong></div>';
  if (enProc > 0) h += '<div style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 16px;font-size:11px">🔄 ' + enProc + ' en proceso' + (potencial > 0 ? ' · Potencial: <strong>' + fm(potencial) + '</strong>' : '') + '</div>';
  h += '</div></div>';
  const contratoProp = (refs||[]).filter(r => r.estado === 'contrato_firmado').length;
  h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px">';
  const _f = (e) => "window._refFiltro='" + e + "';renderMisReferidos()";
  h += '<div style="text-align:center;padding:10px 4px;background:var(--cd);border-radius:10px;border:1px solid var(--brd);cursor:pointer" onclick="window._refFiltro=\'en_proceso\';renderMisReferidos()"><div style="font-size:18px;font-weight:700;color:var(--gold)">' + enProc + '</div><div style="font-size:9px;color:var(--sub)">En proceso</div></div>';
  h += '<div style="text-align:center;padding:10px 4px;background:var(--cd);border-radius:10px;border:1px solid var(--b600);cursor:pointer" onclick="' + _f('contrato_firmado') + '"><div style="font-size:18px;font-weight:700;color:var(--b600)">' + contratoProp + '</div><div style="font-size:9px;color:var(--sub)">Contrato prop.</div></div>';
  h += '<div style="text-align:center;padding:10px 4px;background:var(--cd);border-radius:10px;border:1px solid var(--green);cursor:pointer" onclick="' + _f('arrendado') + '"><div style="font-size:18px;font-weight:700;color:var(--green)">' + stats.arrendados + '</div><div style="font-size:9px;color:var(--sub)">Arrendados</div></div>';
  h += '<div style="text-align:center;padding:10px 4px;background:var(--cd);border-radius:10px;border:1px solid var(--red);cursor:pointer" onclick="' + _f('rechazado') + '"><div style="font-size:18px;font-weight:700;color:var(--red)">' + stats.rechazados + '</div><div style="font-size:9px;color:var(--sub)">Rechazados</div></div>';
  h += '</div>';
  return h;
};

window.renderReferralInbox = async function(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  const { data: pend } = await SB().from('referidos').select('*,referidor:usuarios!referidor_id(nombre,foto,telefono_contacto)').in('estado', ['registrado', 'verificando']).order('created_at', { ascending: false }).limit(10);
  if (!pend?.length) { el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--sub);font-size:12px">✅ Sin referidos pendientes</div>'; return; }
  let h = '<div style="font-family:Fraunces,serif;font-size:16px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px"><span style="font-size:18px">📥</span> Referidos recibidos <span style="background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">' + pend.length + '</span></div>';
  pend.forEach(r => {
    const mins = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000);
    const tTxt = mins < 60 ? 'Hace ' + mins + ' min' : mins < 1440 ? 'Hace ' + Math.floor(mins / 60) + 'h' : 'Hace ' + Math.floor(mins / 1440) + ' días';
    const esNuevo = r.estado === 'registrado';
    h += '<div style="background:var(--cd);border:1.5px solid ' + (esNuevo ? 'var(--gold)' : 'var(--brd)') + ';border-radius:12px;padding:12px;margin-bottom:8px">';
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += r.referidor?.foto ? '<img src="' + r.referidor.foto + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover">' : '<div style="width:32px;height:32px;border-radius:50%;background:var(--b600);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">' + (r.referidor?.nombre?.[0] || '?') + '</div>';
    h += '<div style="flex:1"><div style="font-size:13px;font-weight:700">' + (r.referidor?.nombre || '?') + '</div><div style="font-size:10px;color:var(--sub)">' + tTxt + '</div></div>';
    h += '<span style="font-size:9px;font-weight:700;padding:3px 8px;border-radius:10px;background:' + (esNuevo ? '#fef3c7' : '#dbeafe') + ';color:' + (esNuevo ? '#92400e' : '#1e40af') + '">' + (esNuevo ? 'NUEVO' : 'VERIFICANDO') + '</span></div>';
    h += '<div style="background:var(--cd2);border-radius:8px;padding:10px;margin-bottom:8px;font-size:12px">';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--sub)">Propietario</span><span style="font-weight:700">' + r.propietario_nombre + '</span></div>';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--sub)">Inmueble</span><span style="font-weight:700">' + (r.tipo_inmueble || '?') + ' · ' + (r.barrio || r.ciudad || '') + '</span></div>';
    if (r.canon_aproximado) h += '<div style="display:flex;justify-content:space-between"><span style="color:var(--sub)">Canon</span><span style="font-weight:700;color:var(--green)">' + fm(r.canon_aproximado) + '/mes</span></div>';
    if (r.foto_aviso_url) h += '<div style="margin-top:8px"><img src="' + r.foto_aviso_url + '" style="width:100%;max-height:100px;object-fit:cover;border-radius:6px"></div>';
    h += '</div>';
    h += '<div style="display:flex;gap:6px">';
    h += '<a href="https://wa.me/57' + (r.propietario_telefono || '').replace(/^57/, '') + '" target="_blank" style="flex:1;padding:8px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:#25d366;color:#fff;text-align:center;text-decoration:none">📞 Propietario</a>';
    if (esNuevo) h += '<button style="flex:1;padding:8px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:var(--gold);color:#fff;font-family:inherit;cursor:pointer" onclick="iniciarVerificacion(\'' + r.id + '\').then(()=>renderReferralInbox(\'' + containerId + '\'))">🔍 Verificar</button>';
    else h += '<button style="flex:1;padding:8px;border:none;border-radius:8px;font-size:11px;font-weight:700;background:var(--green);color:#fff;font-family:inherit;cursor:pointer" onclick="aprobarReferido(\'' + r.id + '\').then(()=>renderReferralInbox(\'' + containerId + '\'))">✅ Aprobar</button>';
    h += '<button style="padding:8px 12px;border:1.5px solid var(--rb);border-radius:8px;font-size:11px;font-weight:700;background:var(--redbg);color:var(--red);font-family:inherit;cursor:pointer" onclick="rechazarConMotivo(\'' + r.id + '\').then(()=>renderReferralInbox(\'' + containerId + '\'))">❌</button>';
    h += '</div></div>';
  });
  h += '<div style="text-align:center;margin-top:8px"><a onclick="go(\'mis-referidos\')" style="font-size:12px;color:var(--b600);cursor:pointer;font-weight:600">Ver todos los referidos →</a></div>';
  el.innerHTML = h;
};

// ══════════════════════════════════════════════════════════════════
// 24. REFERRAL PROGRAM — Referir arriendos y ganar comisiones
// ══════════════════════════════════════════════════════════════════

const BONO_BASE = 50000;
const COMISION_PCT = 0.10;

// --- Helpers de normalización y dedup ---
window.normTelRef = function(t) {
  let x = (t || '').replace(/\D/g, '');
  if (x.startsWith('57') && x.length === 12) x = x.slice(2);
  return x;
};
window.normEmailRef = function(e) {
  const v = (e || '').trim().toLowerCase();
  return v || null;
};

// Rate limit: máx por referidor
const REF_RATE_DAY = 5;
const REF_RATE_WEEK = 20;

// --- Crear referido ---
window.crearReferido = async function(d) {
  if (!d.propNombre?.trim()) { window.toast('Nombre del propietario obligatorio', 'twarn'); return null; }
  if (!d.propTelefono?.trim()) { window.toast('Teléfono del propietario obligatorio', 'twarn'); return null; }
  if (!d.comoEncontro) { window.toast('Selecciona cómo lo encontraste', 'twarn'); return null; }

  // Capa 1 — Normalización y validación estricta
  const tel = window.normTelRef(d.propTelefono);
  const email = window.normEmailRef(d.propEmail);
  if (tel.length !== 10 || !tel.startsWith('3')) {
    window.toast('Teléfono inválido. Debe ser celular colombiano de 10 dígitos (3XXXXXXXXX)', 'twarn');
    return null;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.toast('Email inválido', 'twarn'); return null;
  }

  const u = U();
  if (!u) { window.toast('Sesión expirada', 'twarn'); return null; }

  // Capa 2 — Self-referral guard
  const myTel = window.normTelRef(u.telefono_contacto);
  const myEmail = window.normEmailRef(u.email || u.usuario);
  if (tel && myTel && tel === myTel) {
    window.toast('No puedes referirte a ti mismo', 'twarn'); return null;
  }
  if (email && myEmail && email === myEmail) {
    window.toast('No puedes referirte a ti mismo', 'twarn'); return null;
  }

  // Capa 5 — Rate limit por referidor
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: cDay }, { count: cWeek }] = await Promise.all([
    SB().from('referidos').select('id', { count: 'exact', head: true }).eq('referidor_id', u.id).gte('created_at', dayAgo),
    SB().from('referidos').select('id', { count: 'exact', head: true }).eq('referidor_id', u.id).gte('created_at', weekAgo)
  ]);
  if ((cDay || 0) >= REF_RATE_DAY) {
    window.toast('Límite diario alcanzado (' + REF_RATE_DAY + ' referidos/día). Intenta mañana.', 'twarn');
    return null;
  }
  if ((cWeek || 0) >= REF_RATE_WEEK) {
    window.toast('Límite semanal alcanzado (' + REF_RATE_WEEK + ' referidos/semana).', 'twarn');
    return null;
  }

  // Capa 3 — Cruce multi-tabla (referidos, inmuebles, usuarios)
  // Cooldown para rechazos subjetivos: 30 días
  const COOLDOWN_DAYS = 30;
  const cooldownCut = new Date(now.getTime() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).getTime();
  const isBlockingReferral = (rows) => {
    if (!rows?.length) return null;
    for (const r of rows) {
      if (r.estado !== 'rechazado') return r; // activo → bloquea siempre
      if (r.tipo_rechazo === 'objetivo') return r; // rechazo objetivo → bloquea siempre
      if (r.tipo_rechazo === 'subjetivo' && new Date(r.created_at).getTime() > cooldownCut) return r; // aún en cooldown
    }
    return null;
  };

  const checks = [
    SB().from('referidos').select('id,estado,tipo_rechazo,created_at,referidor:usuarios!referidor_id(nombre)').eq('propietario_telefono', tel).order('created_at', { ascending: false }).limit(5),
    SB().from('inmuebles').select('id,codigo_house,captador:usuarios!captador_id(nombre)').eq('propietario_telefono', tel).eq('eliminado', false).limit(1),
    SB().from('usuarios').select('id,nombre,tipo_usuario').eq('telefono_contacto', tel).limit(1)
  ];
  if (email) {
    checks.push(SB().from('referidos').select('id,estado,tipo_rechazo,created_at,referidor:usuarios!referidor_id(nombre)').eq('propietario_email', email).order('created_at', { ascending: false }).limit(5));
    checks.push(SB().from('inmuebles').select('id,codigo_house,captador:usuarios!captador_id(nombre)').eq('propietario_email', email).eq('eliminado', false).limit(1));
    checks.push(SB().from('usuarios').select('id,nombre,tipo_usuario').eq('email', email).limit(1));
  }
  // Capa 7 — foto hash (solo si viene)
  if (d.fotoHash) {
    checks.push(SB().from('referidos').select('id,referidor:usuarios!referidor_id(nombre)').eq('foto_hash', d.fotoHash).not('estado', 'eq', 'rechazado').limit(1));
  }
  const results = await Promise.all(checks);
  let idx = 0;
  const refTel = results[idx++];
  const invTel = results[idx++];
  const usrTel = results[idx++];
  const refMail = email ? results[idx++] : null;
  const invMail = email ? results[idx++] : null;
  const usrMail = email ? results[idx++] : null;
  const fotoDup = d.fotoHash ? results[idx++] : null;

  const blockRefTel = isBlockingReferral(refTel?.data);
  if (blockRefTel) {
    window.toast('Este propietario ya fue referido por ' + (blockRefTel.referidor?.nombre || 'otro referidor'), 'twarn');
    return null;
  }
  const blockRefMail = isBlockingReferral(refMail?.data);
  if (blockRefMail) {
    window.toast('Este email ya fue referido por ' + (blockRefMail.referidor?.nombre || 'otro referidor'), 'twarn');
    return null;
  }
  if (invTel?.data?.length) {
    window.toast('Este propietario ya está en el inventario House (código ' + (invTel.data[0].codigo_house || '?') + ')', 'twarn');
    return null;
  }
  if (invMail?.data?.length) {
    window.toast('Este email ya está en el inventario House (código ' + (invMail.data[0].codigo_house || '?') + ')', 'twarn');
    return null;
  }
  if (usrTel?.data?.length) {
    const tipo = usrTel.data[0].tipo_usuario || 'interno';
    window.toast('Este teléfono ya pertenece a un usuario del portal (' + tipo + ')', 'twarn');
    return null;
  }
  if (usrMail?.data?.length) {
    const tipo = usrMail.data[0].tipo_usuario || 'interno';
    window.toast('Este email ya pertenece a un usuario del portal (' + tipo + ')', 'twarn');
    return null;
  }
  if (fotoDup?.data?.length) {
    window.toast('Esta misma foto del aviso ya fue usada por ' + (fotoDup.data[0].referidor?.nombre || 'otro referidor'), 'twarn');
    return null;
  }
  const { data, error } = await SB().from('referidos').insert({
    referidor_id: u.id, propietario_nombre: d.propNombre.trim(), propietario_telefono: tel,
    propietario_email: email, tipo_inmueble: d.tipo || null,
    ciudad: d.ciudad?.trim() || 'Pereira', barrio: d.barrio?.trim() || null,
    direccion_aprox: d.direccion?.trim() || null, canon_aproximado: d.canon ? parseFloat(d.canon) : null,
    foto_aviso_url: d.fotoUrl || null, foto_hash: d.fotoHash || null,
    como_encontro: d.comoEncontro, notas: d.notas?.trim() || null,
    estado: 'registrado', bono_monto: BONO_BASE, comision_porcentaje: COMISION_PCT
  }).select().single();
  if (error) {
    // Capa 4 — race condition: unique_violation (DB constraint)
    if (error.code === '23505') {
      window.toast('Este propietario ya fue referido (conflicto de concurrencia)', 'twarn');
      return null;
    }
    window.toast('Error: ' + error.message, 'terr');
    return null;
  }
  const _admins = await window.getAdminIds();
  await window.notificar({
    tipo: 'referido_nuevo', categoria: 'referido',
    titulo: '🤝 Nuevo referido de ' + u.nombre,
    mensaje: u.nombre + ' refirió ' + (d.tipo || 'inmueble') + ' en ' + (d.barrio || d.ciudad || '?') + '. Propietario: ' + d.propNombre + ' (' + tel + ')' + (d.canon ? '. Canon aprox: ' + fm(d.canon) : ''),
    icono: '🤝', color: '#f59e0b',
    destinatarios: _admins,
    accion_tipo: 'abrir_referido', accion_destino: data.id,
    contexto_tipo: 'referido', contexto_id: data.id,
    prioridad: 'alta',
  });
  window.toast('🤝 Referido registrado exitosamente'); return data;
};

// --- Admin actions ---
window.iniciarVerificacion = async function(id) {
  await SB().from('referidos').update({ estado: 'verificando' }).eq('id', id);
  const { data: r } = await SB().from('referidos').select('referidor_id,tipo_inmueble,barrio').eq('id', id).single();
  if (r?.referidor_id) await window.notificar({
    tipo: 'referido_verificando', categoria: 'referido',
    titulo: '🔍 Tu referido está siendo verificado',
    mensaje: 'Estamos contactando al propietario del ' + (r.tipo_inmueble || 'inmueble') + ' en ' + (r.barrio || ''),
    icono: '🔍', color: '#3b82f6',
    destinatarios: [r.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: id,
    contexto_tipo: 'referido', contexto_id: id,
    prioridad: 'normal',
  });
  window.toast('🔍 En verificación');
};

window.aprobarReferido = async function(id) {
  const u = U();
  await SB().from('referidos').update({ estado: 'contrato_firmado', verificado_por: u.id, verificado_at: new Date().toISOString() }).eq('id', id);
  const { data: r } = await SB().from('referidos').select('referidor:usuarios!referidor_id(id,nombre,usuario,email),tipo_inmueble,barrio,ciudad').eq('id', id).single();
  const refId = r?.referidor?.id;
  // Check if referrer has payment method
  const metodo = await window.obtenerMetodoPago(refId);
  if (!metodo && refId) {
    await window.notificar({
      tipo: 'configurar_pago', categoria: 'pago',
      titulo: '💳 Configura tu método de pago',
      mensaje: '¡Tu referido fue aprobado! Para recibir tu bono de ' + fm(BONO_BASE) + ', configura dónde quieres recibir tus pagos en Mi cuenta → Método de pago.',
      icono: '💳', color: '#f59e0b',
      destinatarios: [refId],
      accion_tipo: 'abrir_pago', accion_destino: null,
      contexto_tipo: 'referido', contexto_id: id,
      prioridad: 'alta',
    });
  }
  if (refId) await window.notificar({
    tipo: 'referido_aprobado', categoria: 'referido',
    titulo: '🎉 ¡Tu referido fue aprobado!',
    mensaje: '¡Felicidades ' + (r?.referidor?.nombre || '') + '! Contrato con propietario firmado. Tu bono de ' + fm(BONO_BASE) + ' está pendiente de pago.' + (!metodo ? ' Configura tu método de pago para recibirlo.' : ''),
    icono: '🎉', color: '#10b981',
    destinatarios: [refId],
    accion_tipo: 'abrir_referido', accion_destino: id,
    contexto_tipo: 'referido', contexto_id: id,
    prioridad: 'alta',
  });
  window.toast('✅ Aprobado · Bono ' + fm(BONO_BASE) + ' pendiente de pago');
};

window.rechazarConMotivo = function(id) {
  const motivos = [
    'Propietario no está interesado en inmobiliaria',
    'Propietario ya tiene contrato con otra inmobiliaria',
    'Inmueble ya está arrendado',
    'Inmueble no cumple condiciones para arriendo',
    'Datos falsos o teléfono inexistente',
    'Inmueble ya está en el inventario de House',
    'Propietario tiene impedimentos legales',
    'No se pudo contactar al propietario',
    'Otro motivo'
  ];
  const html = '<div class="cfdlg" id="rechazoDlg" style="display:flex"><div class="cfbox" style="text-align:left;max-width:400px">' +
    '<div style="font-size:16px;font-weight:800;text-align:center;margin-bottom:12px">❌ Rechazar referido</div>' +
    '<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">Motivo del rechazo</label>' +
    '<select id="rechazoMotivo" class="esel" style="width:100%;font-size:12px;padding:8px"><option value="">— Selecciona el motivo —</option>' +
    motivos.map(m => '<option value="' + m + '">' + m + '</option>').join('') + '</select></div>' +
    '<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:700;color:var(--sub);display:block;margin-bottom:4px">Nota adicional (opcional)</label>' +
    '<textarea id="rechazoNota" style="width:100%;padding:8px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;font-family:inherit;min-height:40px;resize:none;color:var(--tx);background:var(--cd)" placeholder="Detalle adicional..."></textarea></div>' +
    '<div style="display:flex;gap:8px"><button style="flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:700;border:1.5px solid var(--brd);background:var(--cd);color:var(--tx);font-family:inherit;cursor:pointer" onclick="document.getElementById(\'rechazoDlg\').remove()">Cancelar</button>' +
    '<button style="flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:700;border:none;background:var(--red);color:#fff;font-family:inherit;cursor:pointer" onclick="_ejecutarRechazo(\'' + id + '\')">❌ Rechazar</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  return new Promise(r => { window._rechazoResolve = r; });
};

window._ejecutarRechazo = async function(id) {
  const motivo = document.getElementById('rechazoMotivo')?.value;
  if (!motivo) { window.toast('Selecciona un motivo', 'twarn'); return; }
  const nota = document.getElementById('rechazoNota')?.value?.trim();
  const motivoFinal = motivo + (nota ? ' — ' + nota : '');
  // Capa 6 — categorizar el motivo como objetivo (bloqueo permanente) o subjetivo (permite reintento en 30 días)
  const motivosObjetivos = [
    'Datos falsos o teléfono inexistente',
    'Inmueble ya está en el inventario de House',
    'Propietario tiene impedimentos legales'
  ];
  const tipoRechazo = motivosObjetivos.includes(motivo) ? 'objetivo' : 'subjetivo';
  document.getElementById('rechazoDlg')?.remove();
  const u = U();
  await SB().from('referidos').update({ estado: 'rechazado', motivo_rechazo: motivoFinal, tipo_rechazo: tipoRechazo, verificado_por: u.id, verificado_at: new Date().toISOString() }).eq('id', id);
  const { data: r } = await SB().from('referidos').select('referidor_id,tipo_inmueble,barrio').eq('id', id).single();
  if (r?.referidor_id) await window.notificar({
    tipo: 'referido_rechazado', categoria: 'referido',
    titulo: '❌ Referido no aprobado',
    mensaje: 'Tu referido del ' + (r.tipo_inmueble || 'inmueble') + ' en ' + (r.barrio || '') + ' no fue aprobado. Motivo: ' + motivoFinal,
    icono: '❌', color: '#ef4444',
    destinatarios: [r.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: id,
    contexto_tipo: 'referido', contexto_id: id,
    prioridad: 'alta',
  });
  window.toast('❌ Rechazado');
  if (window._rechazoResolve) { window._rechazoResolve(); window._rechazoResolve = null; }
  if (typeof window.renderMisReferidos === 'function') window.renderMisReferidos();
};

window.vincularPorCodigo = async function(refId) {
  const input = document.getElementById('vinc_' + refId); if (!input) return;
  const cod = input.value.trim(); if (!cod) { window.toast('Ingresa código', 'twarn'); return; }
  let q = SB().from('inmuebles').select('id');
  if (cod.startsWith('HOUSE-')) q = q.eq('codigo_house', cod); else q = q.eq('id', cod);
  const { data } = await q.single();
  if (!data) { window.toast('Inmueble no encontrado', 'terr'); return; }
  await SB().from('referidos').update({ inmueble_id: data.id, estado: 'publicado', publicado_at: new Date().toISOString() }).eq('id', refId);
  const { data: r } = await SB().from('referidos').select('referidor_id,tipo_inmueble,barrio,ciudad').eq('id', refId).single();
  if (r?.referidor_id) await window.notificar({
    tipo: 'referido_publicado', categoria: 'referido',
    titulo: '📢 ¡Tu referido está publicado!',
    mensaje: 'El ' + (r.tipo_inmueble || 'inmueble') + ' en ' + (r.barrio || r.ciudad || '') + ' ya está en portales. Te avisaremos cuando se arriende.',
    icono: '📢', color: '#3b82f6',
    destinatarios: [r.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: refId,
    contexto_tipo: 'referido', contexto_id: refId,
    prioridad: 'normal',
  });
  window.toast('📋 Vinculado y publicado'); window.renderMisReferidos();
};

window.marcarComisionPagada = async function(id) {
  const ok = await window.cfShow('💰', '¿Marcar comisión como pagada?', 'Confirma que ya transferiste al referidor.'); if (!ok) return;
  await SB().from('referidos').update({ comision_pagada: true, comision_fecha_pago: new Date().toISOString() }).eq('id', id);
  const { data: r } = await SB().from('referidos').select('referidor_id,comision_monto').eq('id', id).single();
  if (r?.referidor_id) await window.notificar({
    tipo: 'comision_pagada', categoria: 'pago',
    titulo: '✅ ¡Comisión pagada!',
    mensaje: 'Tu comisión de ' + fm(r.comision_monto || 0) + ' fue pagada. ¡Gracias por referir!',
    icono: '✅', color: '#10b981',
    destinatarios: [r.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: id,
    contexto_tipo: 'referido', contexto_id: id,
    prioridad: 'normal',
  });
  window.toast('💰 Comisión pagada');
};

window.guardarNotasAdmin = async function(id, notas) {
  await SB().from('referidos').update({ notas_admin: notas }).eq('id', id); window.toast('📝 Nota guardada');
};

// --- Auto-comision when Arrendado ---
window.registrarComisionArrendado = async function(inmuebleId) {
  const { data: ref } = await SB().from('referidos').select('*,referidor:usuarios!referidor_id(nombre,usuario,email)').eq('inmueble_id', inmuebleId).in('estado', ['contrato_firmado', 'publicado']).single();
  if (!ref) return;
  const { data: inm } = await SB().from('inmuebles').select('precio_arriendo').eq('id', inmuebleId).single();
  const canon = inm?.precio_arriendo || ref.canon_real || ref.canon_aproximado || 0;
  const comNeta = Math.max(0, Math.round(canon * ref.comision_porcentaje) - ref.bono_monto);
  await SB().from('referidos').update({ estado: 'arrendado', comision_monto: comNeta, canon_real: canon, arrendado_at: new Date().toISOString() }).eq('id', ref.id);
  if (ref.referidor_id) await window.notificar({
    tipo: 'comision_lista', categoria: 'pago',
    titulo: '💰 ¡Comisión lista! ' + fm(comNeta),
    mensaje: '¡Felicidades ' + (ref.referidor?.nombre || '') + '! Canon: ' + fm(canon) + '/mes. Comisión: ' + fm(comNeta),
    icono: '💰', color: '#10b981',
    destinatarios: [ref.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: ref.id,
    contexto_tipo: 'referido', contexto_id: ref.id,
    prioridad: 'alta',
  });
  const _admins2 = await window.getAdminIds();
  await window.notificar({
    tipo: 'comision_pendiente', categoria: 'pago',
    titulo: '💰 Comisión pendiente: ' + fm(comNeta),
    mensaje: 'Referido de ' + (ref.referidor?.nombre || '?') + ' fue arrendado. Pagar ' + fm(comNeta),
    icono: '💰', color: '#f59e0b',
    destinatarios: _admins2,
    accion_tipo: 'abrir_referido', accion_destino: ref.id,
    contexto_tipo: 'referido', contexto_id: ref.id,
    prioridad: 'alta', escalable: true, horas_para_escalar: 48,
  });
};

// --- WhatsApp propuesta al propietario ---
window.compartirPropuestaPropietario = function(ref) {
  const tel = ref?.propietario_telefono || '';
  const msg = '💰 *Arriende su inmueble y reciba el 90% del canon cada mes SIN MOVER UN DEDO*\n\n' +
    '✅ Sin costo inicial\n' +
    '✅ Pago garantizado\n' +
    '✅ Nosotros manejamos TODO\n\n' +
    'Conozca el sistema:\n' +
    'https://inmobiliariahouse.com.co/#/propietarios';
  window.open('https://wa.me/57' + tel.replace(/^57/, '') + '?text=' + encodeURIComponent(msg), '_blank');
};

// --- Helper: generate proposal text (plain, no WhatsApp bold) ---
function _getPropuestaTexto(nombre) {
  return '💰 Arriende su inmueble y reciba el 90% del canon cada mes SIN MOVER UN DEDO\n\n' +
    '✅ Sin costo inicial\n' +
    '✅ Pago garantizado\n' +
    '✅ Nosotros manejamos TODO\n\n' +
    'Conozca el sistema:\n' +
    'https://inmobiliariahouse.com.co/#/propietarios';
}

window.copiarPropuesta = function(nombre) {
  const texto = _getPropuestaTexto(nombre);
  navigator.clipboard.writeText(texto).then(() => {
    window.toast('📋 Texto copiado al portapapeles');
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = texto; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    window.toast('📋 Texto copiado');
  });
};

window.actualizarTelReferido = async function(refId, nuevoTel) {
  const tel = (nuevoTel || '').replace(/\D/g, '');
  if (tel.length < 7) { window.toast('Teléfono inválido', 'twarn'); return; }
  try {
    await SB().from('referidos').update({ propietario_telefono: tel }).eq('id', refId);
    window.toast('📞 Teléfono actualizado');
  } catch(e) { window.toast('Error: ' + e.message, 'terr'); }
};

// --- Referral Form Wizard ---
window._refData = {}; window._refStep = 1;
window.refNext = function() {
  const n = document.getElementById('ref_prop_nom')?.value?.trim();
  const t = document.getElementById('ref_prop_tel')?.value?.trim();
  const c = document.getElementById('ref_como')?.value;
  if (!n) { window.toast('Nombre obligatorio', 'twarn'); return; }
  if (!t) { window.toast('Teléfono obligatorio', 'twarn'); return; }
  if (!c) { window.toast('Selecciona cómo lo encontraste', 'twarn'); return; }
  window._refData.propNombre = n; window._refData.propTelefono = t;
  window._refData.propEmail = document.getElementById('ref_prop_email')?.value?.trim() || '';
  window._refData.comoEncontro = c; window._refStep = 2; window.renderReferralForm();
};
window.refPrev = function() { window._refStep = 1; window.renderReferralForm(); };
window.refSubmit = async function() {
  window._refData.ciudad = document.getElementById('ref_ciudad')?.value?.trim() || 'Pereira';
  window._refData.barrio = document.getElementById('ref_barrio')?.value?.trim() || '';
  window._refData.direccion = document.getElementById('ref_dir')?.value?.trim() || '';
  window._refData.canon = parseFloat(document.getElementById('ref_canon')?.value) || null;
  window._refData.notas = document.getElementById('ref_notas')?.value?.trim() || '';
  const result = await window.crearReferido(window._refData);
  if (result) { window._refData = {}; window._refStep = 1; window.go('mis-referidos'); }
};
window.refUpdateCalc = function() {
  const box = document.getElementById('refCalcBox'); const input = document.getElementById('ref_canon');
  if (!box || !input) return; const canon = parseFloat(input.value) || 0;
  if (canon <= 0) { box.innerHTML = ''; return; }
  const total = Math.round(canon * 0.10); const neto = Math.max(0, total - 50000);
  box.innerHTML = '<div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #bbf7d0;border-radius:12px;padding:16px;margin:8px 0;text-align:center"><div style="font-size:11px;color:#065f46;font-weight:600;margin-bottom:6px">💰 Si se arrienda, ganas:</div><div style="font-family:Fraunces,serif;font-size:28px;font-weight:700;color:#065f46">' + fm(total) + '</div><div style="font-size:11px;color:#065f46;margin-top:4px">' + fm(50000) + ' al aprobar + ' + fm(neto) + ' al firmar contrato con inquilino</div></div>';
};

// --- Referral Banner for portal ---
window.renderReferralBanner = function() {
  const u = window.userStore?.get();
  const cta = u ? "go('referir')" : "go('referidos-landing')";
  const btnTxt = u ? '🤝 Quiero referir un inmueble' : '🤝 Conoce el programa';
  return '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:16px;padding:24px;margin:20px 14px;text-align:center;color:#fff"><div style="font-size:36px;margin-bottom:10px">💰</div><div style="font-family:Fraunces,serif;font-size:22px;font-weight:700;margin-bottom:6px">Gana dinero refiriendo inmuebles</div><div style="font-size:13px;opacity:.9;margin-bottom:16px;max-width:400px;margin-left:auto;margin-right:auto">¿Conoces un inmueble en arriendo? Refiérelo y gana hasta el <strong>10%</strong> del primer canon.</div><div style="font-family:Fraunces,serif;font-size:24px;font-weight:700;margin-bottom:16px">Un apto de $2.5M = $250.000 para ti</div><button onclick="' + cta + '" style="padding:14px 32px;border:none;border-radius:30px;background:#fff;color:#1e3a5f;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">' + btnTxt + '</button></div>';
};

// ══════════════════════════════════════════════════════════════════
// 25. GAMIFICATION — Niveles, progreso, logros
// ══════════════════════════════════════════════════════════════════

const REF_LEVELS = [
  { name: 'Bronce', emoji: '🥉', min: 0, color: '#cd7f32', bg: 'linear-gradient(135deg,#cd7f32,#a0522d)' },
  { name: 'Plata', emoji: '🥈', min: 3, color: '#a8a9ad', bg: 'linear-gradient(135deg,#a8a9ad,#71706e)' },
  { name: 'Oro', emoji: '🥇', min: 8, color: '#ffd700', bg: 'linear-gradient(135deg,#ffd700,#daa520)' },
  { name: 'Diamante', emoji: '💎', min: 15, color: '#b9f2ff', bg: 'linear-gradient(135deg,#48d1cc,#0097a7)' }
];

window.getRefLevel = function(refs) {
  const count = (refs || []).filter(r => !['rechazado'].includes(r.estado)).length;
  let lvl = REF_LEVELS[0];
  for (let i = REF_LEVELS.length - 1; i >= 0; i--) {
    if (count >= REF_LEVELS[i].min) { lvl = REF_LEVELS[i]; break; }
  }
  const nextIdx = REF_LEVELS.indexOf(lvl) + 1;
  const next = nextIdx < REF_LEVELS.length ? REF_LEVELS[nextIdx] : null;
  const progress = next ? Math.min(100, Math.round(((count - lvl.min) / (next.min - lvl.min)) * 100)) : 100;
  return { ...lvl, count, next, progress };
};

window.renderGamificationCard = function(refs) {
  const lv = window.getRefLevel(refs);
  const totalGanado = (refs || []).reduce((s, r) => {
    let g = 0;
    if (r.bono_pagado) g += (r.bono_monto || 0);
    if (r.comision_pagada) g += (r.comision_monto || 0);
    return s + g;
  }, 0);
  let h = '<div style="background:' + lv.bg + ';border-radius:16px;padding:20px;margin-bottom:16px;color:#fff;text-align:center;position:relative;overflow:hidden">';
  h += '<div style="position:absolute;top:-20px;right:-20px;font-size:80px;opacity:.15">' + lv.emoji + '</div>';
  h += '<div style="font-size:36px;margin-bottom:4px">' + lv.emoji + '</div>';
  h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;opacity:.8;margin-bottom:2px">Nivel</div>';
  h += '<div style="font-family:Fraunces,serif;font-size:24px;font-weight:800">' + lv.name + '</div>';
  h += '<div style="font-size:12px;opacity:.9;margin-top:4px">' + lv.count + ' referido' + (lv.count !== 1 ? 's' : '') + ' activos</div>';
  if (lv.next) {
    h += '<div style="margin-top:12px;background:rgba(0,0,0,.25);border-radius:10px;height:8px;overflow:hidden"><div style="height:100%;background:rgba(255,255,255,.8);border-radius:10px;width:' + lv.progress + '%;transition:width .5s"></div></div>';
    h += '<div style="font-size:10px;opacity:.8;margin-top:4px">' + (lv.next.min - lv.count) + ' más para ' + lv.next.emoji + ' ' + lv.next.name + '</div>';
  } else {
    h += '<div style="font-size:12px;margin-top:8px;font-weight:700">🏆 ¡Nivel máximo alcanzado!</div>';
  }
  if (totalGanado > 0) h += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.3);font-size:12px">Total ganado: <strong style="font-size:16px">' + fm(totalGanado) + '</strong></div>';
  h += '</div>';
  return h;
};

// ══════════════════════════════════════════════════════════════════
// 26. PAYMENT SYSTEM — Métodos de pago + Panel admin + Historial
// ══════════════════════════════════════════════════════════════════

// --- Masking functions ---
window.maskAccount = function(num, metodo) {
  const c = (num || '').replace(/\D/g, '');
  if (['nequi','daviplata','bre'].includes(metodo)) return c.length >= 10 ? c.slice(0, 3) + ' *** ** ' + c.slice(-2) : '****';
  return c.length >= 4 ? '****' + c.slice(-4) : '****';
};
window.maskName = function(n) { if (!n || n.length < 3) return '****'; const p = n.trim().split(' '); const l = p[p.length - 1]; return n[0] + '****' + l[l.length - 1]; };
window.maskCedula = function(c) { const d = (c || '').replace(/\D/g, ''); return d.length >= 6 ? '****' + d.slice(-6) : '****'; };

window.PAY_VALIDATIONS = {
  nequi: { label: 'Número Nequi', ph: '3001234567', ml: 10, val: v => /^3\d{9}$/.test(v.replace(/\D/g, '')), err: 'Debe tener 10 dígitos y empezar por 3', bank: false },
  bancolombia: { label: 'Cuenta Bancolombia', ph: '12345678901', ml: 11, val: v => /^\d{11}$/.test(v.replace(/\D/g, '')), err: 'Debe tener 11 dígitos', bank: true },
  daviplata: { label: 'Número Daviplata', ph: '3001234567', ml: 10, val: v => /^3\d{9}$/.test(v.replace(/\D/g, '')), err: 'Debe tener 10 dígitos y empezar por 3', bank: false },
  davivienda: { label: 'Cuenta Davivienda', ph: '123456789012', ml: 12, val: v => /^\d{10,12}$/.test(v.replace(/\D/g, '')), err: 'Debe tener entre 10 y 12 dígitos', bank: true },
  bre: { label: 'Número Bre (Dale!)', ph: '3001234567', ml: 10, val: v => /^3\d{9}$/.test(v.replace(/\D/g, '')), err: 'Debe tener 10 dígitos y empezar por 3', bank: false }
};

// --- Save payment method ---
window.guardarMetodoPago = async function() {
  const metodo = document.getElementById('payMetodo')?.value; if (!metodo) { window.toast('Selecciona un método', 'twarn'); return; }
  const cfg = PAY_VALIDATIONS[metodo]; if (!cfg) return;
  const num = (document.getElementById('payNumero')?.value || '').replace(/\D/g, '');
  if (!cfg.val(num)) { window.toast(cfg.err, 'twarn'); return; }
  const titular = (document.getElementById('payTitular')?.value || '').trim();
  if (titular.length < 5 || !/\s/.test(titular)) { window.toast('Ingresa nombre y apellido completo', 'twarn'); return; }
  const cedula = (document.getElementById('payCedula')?.value || '').replace(/\D/g, '');
  if (cedula.length < 6) { window.toast('Cédula inválida', 'twarn'); return; }
  const tipoCuenta = cfg.bank ? (document.getElementById('payTipoCuenta')?.value || null) : null;

  // Show confirmation modal
  const masked = window.maskAccount(num, metodo);
  const metodoLabels = { nequi: 'Nequi 📱', bancolombia: 'Bancolombia 🏦', daviplata: 'Daviplata 📱', davivienda: 'Davivienda 🏦', bre: 'Bre (Dale!) 📱' };
  const html = '<div class="cfdlg" id="payConfirmDlg" style="display:flex"><div class="cfbox" style="text-align:left;max-width:380px">' +
    '<div style="font-size:16px;font-weight:800;text-align:center;margin-bottom:14px">🔒 Confirma tus datos de pago</div>' +
    '<div style="background:var(--cd2);border:1.5px solid var(--brd);border-radius:10px;padding:14px;margin-bottom:14px;font-size:13px">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--sub)">Método</span><span style="font-weight:700">' + (metodoLabels[metodo] || metodo) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--sub)">Número</span><span style="font-weight:700">' + masked + '</span></div>' +
    (tipoCuenta ? '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--sub)">Tipo</span><span style="font-weight:700">' + tipoCuenta + '</span></div>' : '') +
    '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--sub)">Titular</span><span style="font-weight:700">' + titular + '</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span style="color:var(--sub)">Cédula</span><span style="font-weight:700">' + window.maskCedula(cedula) + '</span></div></div>' +
    '<label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--sub);margin-bottom:14px;cursor:pointer"><input type="checkbox" id="payConfirmCheck" style="margin-top:2px;accent-color:var(--b600)"><span>Confirmo que estos datos son correctos y que la cuenta me pertenece. Entiendo que si hay un error, el pago podría enviarse a otra persona.</span></label>' +
    '<div style="display:flex;gap:8px"><button style="flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:700;border:1.5px solid var(--brd);background:var(--cd);color:var(--tx);font-family:inherit;cursor:pointer" onclick="document.getElementById(\'payConfirmDlg\').remove()">← Corregir</button>' +
    '<button id="payConfirmBtn" disabled style="flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:700;border:none;background:var(--g300);color:#fff;font-family:inherit;cursor:not-allowed" onclick="_confirmarMetodoPago(\'' + metodo + '\',\'' + num + '\',\'' + titular.replace(/'/g, "\\'") + '\',\'' + cedula + '\',\'' + (tipoCuenta || '') + '\')">✅ Confirmar</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('payConfirmCheck').addEventListener('change', function() {
    const btn = document.getElementById('payConfirmBtn');
    btn.disabled = !this.checked; btn.style.background = this.checked ? 'var(--b600)' : 'var(--g300)'; btn.style.cursor = this.checked ? 'pointer' : 'not-allowed';
  });
};

window._confirmarMetodoPago = async function(metodo, num, titular, cedula, tipoCuenta) {
  document.getElementById('payConfirmDlg')?.remove();
  const u = U();
  try {
    await SB().from('metodos_pago').update({ activo: false }).eq('usuario_id', u.id).eq('activo', true);
    const { error } = await SB().from('metodos_pago').insert({ usuario_id: u.id, metodo, tipo_cuenta: tipoCuenta || null, numero_cuenta: num, titular_nombre: titular, titular_cedula: cedula, confirmado: true, confirmado_at: new Date().toISOString(), activo: true });
    if (error) throw error;
    window.toast('✅ Método de pago configurado');
    if (typeof window.renderPaymentSetup === 'function') window.renderPaymentSetup();
  } catch(e) { window.toast('Error: ' + e.message, 'terr'); }
};

// --- Get active payment method ---
window.obtenerMetodoPago = async function(userId) {
  const { data } = await SB().from('metodos_pago').select('*').eq('usuario_id', userId || U()?.id).eq('activo', true).single();
  return data;
};

// --- Register payment (admin) ---
window.registrarPagoReferido = async function(refId, tipoPago, monto) {
  const { data: ref } = await SB().from('referidos').select('*,referidor:usuarios!referidor_id(id,nombre,usuario,email)').eq('id', refId).single();
  if (!ref) { window.toast('Referido no encontrado', 'terr'); return; }
  const metodo = await window.obtenerMetodoPago(ref.referidor_id);
  const u = U();
  const { error } = await SB().from('pagos_referidos').insert({
    referido_id: refId, referidor_id: ref.referidor_id, metodo_pago_id: metodo?.id || null,
    tipo_pago: tipoPago, monto,
    inmueble_tipo: ref.tipo_inmueble, inmueble_barrio: ref.barrio, inmueble_canon: ref.canon_real || ref.canon_aproximado,
    metodo_snapshot: metodo?.metodo || 'sin_metodo', cuenta_snapshot: metodo ? window.maskAccount(metodo.numero_cuenta, metodo.metodo) : 'N/A', titular_snapshot: metodo?.titular_nombre || 'Sin configurar',
    estado: 'pagado', pagado_por: u.id, pagado_at: new Date().toISOString()
  });
  if (error) { window.toast('Error: ' + error.message, 'terr'); return; }
  if (tipoPago === 'bono') await SB().from('referidos').update({ bono_pagado: true, bono_fecha_pago: new Date().toISOString() }).eq('id', refId);
  else await SB().from('referidos').update({ comision_pagada: true, comision_fecha_pago: new Date().toISOString() }).eq('id', refId);
  const ml = metodo ? metodo.metodo + ' ' + window.maskAccount(metodo.numero_cuenta, metodo.metodo) : '';
  if (ref.referidor_id) await window.notificar({
    tipo: 'pago_realizado', categoria: 'pago',
    titulo: '💰 ¡Pago recibido! ' + fm(monto),
    mensaje: 'Tu ' + (tipoPago === 'bono' ? 'bono' : 'comisión') + ' de ' + fm(monto) + ' fue enviado a tu ' + ml + '. ¡Gracias por referir!',
    icono: '💰', color: '#10b981',
    destinatarios: [ref.referidor_id],
    accion_tipo: 'abrir_referido', accion_destino: refId,
    contexto_tipo: 'referido', contexto_id: refId,
    prioridad: 'alta',
  });
  window.toast('✅ Pago registrado: ' + fm(monto));
  if (typeof window.renderAdminPaymentPanel === 'function') window.renderAdminPaymentPanel();
};

// --- Copy payment data (admin) ---
window.copiarDatosPago = function(metodo, numero, titular, cedula, monto, concepto) {
  const labels = { nequi: 'Nequi', bancolombia: 'Bancolombia', daviplata: 'Daviplata', davivienda: 'Davivienda', bre: 'Bre' };
  const txt = (labels[metodo] || metodo) + ': ' + numero + '\nTitular: ' + titular + '\nCédula: ' + cedula + '\nMonto: ' + fm(monto) + '\nConcepto: ' + concepto;
  navigator.clipboard.writeText(txt).then(() => window.toast('📋 Datos copiados')).catch(() => window.toast('📋 Copiado'));
};

// ══════════════════════════════════════════════════════════════════
// AUTH PROGRESIVA — Browse-first (Spec Abril 2026)
// ══════════════════════════════════════════════════════════════════

// --- Visitor state (localStorage) ---
window.initVisitorState = function() {
  if (U()) { window.VISITOR = null; return; }
  let vid = localStorage.getItem('house_visitor_id');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('house_visitor_id', vid);
  }
  window.VISITOR = {
    isAuthenticated: false,
    id: vid,
    viewedProperties: JSON.parse(localStorage.getItem('house_viewed') || '[]'),
    searches: JSON.parse(localStorage.getItem('house_searches') || '[]'),
    promptsShown: JSON.parse(localStorage.getItem('house_prompts') || '{}'),
    promptsDismissed: JSON.parse(localStorage.getItem('house_dismissed') || '{}'),
  };
};

window.isAuthenticated = function() {
  return !!U();
};

// --- Property view tracker ---
window.trackPropertyView = function(inmuebleId) {
  if (window.isAuthenticated()) return;
  if (!window.VISITOR) window.initVisitorState();
  let viewed = window.VISITOR.viewedProperties || [];
  viewed.push(inmuebleId);
  if (viewed.length > 50) viewed = viewed.slice(-50);
  window.VISITOR.viewedProperties = viewed;
  localStorage.setItem('house_viewed', JSON.stringify(viewed));
};

window.getViewCount = function(inmuebleId) {
  if (!window.VISITOR) window.initVisitorState();
  return (window.VISITOR?.viewedProperties || []).filter(id => id === inmuebleId).length;
};

// --- Auth prompt rules (anti-saturación) ---
const AUTH_PROMPT_RULES = {
  maxPromptsPerSession: 2,
  cooldownMinutes: 5,
  oneTimePerSession: ['scroll_banner', 'price_alert'],
  repeatable: ['favorito', 'contacto'],
};
let _promptsShownThisSession = 0;
let _lastPromptTime = 0;

window.canShowPrompt = function(promptId) {
  if (window.isAuthenticated()) return false;
  if (!window.VISITOR) window.initVisitorState();
  if (_promptsShownThisSession >= AUTH_PROMPT_RULES.maxPromptsPerSession) return false;
  if (Date.now() - _lastPromptTime < AUTH_PROMPT_RULES.cooldownMinutes * 60000 && _lastPromptTime > 0) return false;
  if (window.VISITOR?.promptsDismissed?.[promptId]) return false;
  if (AUTH_PROMPT_RULES.oneTimePerSession.includes(promptId) && window.VISITOR?.promptsShown?.[promptId]) return false;
  return true;
};

window.trackPromptShown = function(promptId) {
  _promptsShownThisSession++;
  _lastPromptTime = Date.now();
  if (!window.VISITOR) window.initVisitorState();
  if (!window.VISITOR.promptsShown) window.VISITOR.promptsShown = {};
  window.VISITOR.promptsShown[promptId] = true;
  localStorage.setItem('house_prompts', JSON.stringify(window.VISITOR.promptsShown));
};

window.dismissPrompt = function(promptId) {
  if (!window.VISITOR) window.initVisitorState();
  if (!window.VISITOR.promptsDismissed) window.VISITOR.promptsDismissed = {};
  window.VISITOR.promptsDismissed[promptId] = true;
  localStorage.setItem('house_dismissed', JSON.stringify(window.VISITOR.promptsDismissed));
};

// --- Universal Auth Prompt (bottom sheet) ---
window.showAuthPrompt = function(contexto, opts) {
  if (!window.canShowPrompt(contexto)) {
    // If cant show prompt (e.g. repeated) but action needs auth, fallback directly to register modal
    window.showRegisterModal(contexto);
    return;
  }
  window.trackPromptShown(contexto);
  const { icono = '✨', titulo = 'Crea tu cuenta', mensaje = '', beneficios = [], cta = 'Crear cuenta gratis', ctaSecundario = 'Ahora no' } = opts || {};
  const prev = document.getElementById('auth-prompt-sheet');
  if (prev) prev.remove();
  const sheet = document.createElement('div');
  sheet.id = 'auth-prompt-sheet';
  sheet.className = 'authps';
  sheet.innerHTML = `
    <div class="authps-backdrop" onclick="closeAuthPrompt()"></div>
    <div class="authps-box">
      <div class="authps-handle"></div>
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:36px;margin-bottom:8px">${icono}</div>
        <div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;color:var(--tx);line-height:1.2">${titulo}</div>
        <div style="font-size:13px;color:var(--sub);margin-top:6px;line-height:1.5">${mensaje}</div>
      </div>
      ${beneficios.length ? `<div class="authps-benefits">${beneficios.map(b => `<div class="authps-benefit">${b}</div>`).join('')}</div>` : ''}
      <button class="authps-cta" onclick="closeAuthPrompt();showRegisterModal('${contexto}')">${cta}</button>
      ${ctaSecundario ? `<button class="authps-skip" onclick="dismissPrompt('${contexto}');closeAuthPrompt()">${ctaSecundario}</button>` : ''}
      <div style="text-align:center;font-size:10px;color:var(--g400);margin-top:4px">Sin spam · Gratis · Google o email</div>
    </div>`;
  document.body.appendChild(sheet);
};

window.closeAuthPrompt = function() {
  const sheet = document.getElementById('auth-prompt-sheet');
  if (!sheet) return;
  sheet.classList.add('closing');
  setTimeout(() => sheet.remove(), 250);
};

// --- Register Modal ---
window.showRegisterModal = function(contexto) {
  const prev = document.getElementById('register-modal');
  if (prev) prev.remove();
  const ctxMsg = ({
    favorito: 'para guardar tus inmuebles favoritos',
    contacto: 'para contactar al asesor',
    publicar: 'para publicar tu inmueble',
    referir: 'para empezar a ganar dinero',
    precio: 'para recibir alertas de precio',
    scroll: 'para acceder a todas las funciones',
    menu: 'y desbloquea todas las funciones',
  })[contexto] || 'para acceder a todas las funciones';
  window._pendingAuthContext = contexto;
  const modal = document.createElement('div');
  modal.id = 'register-modal';
  modal.className = 'regmx';
  modal.innerHTML = `
    <div class="regmx-backdrop" onclick="document.getElementById('register-modal')?.remove()"></div>
    <div class="regmx-box">
      <button class="regmx-close" onclick="document.getElementById('register-modal')?.remove()">✕</button>
      <div style="text-align:center;margin-bottom:20px">
        <div class="regmx-logo">H</div>
        <div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;color:var(--tx)">Crear cuenta</div>
        <div style="font-size:12px;color:var(--sub);margin-top:4px">${ctxMsg}</div>
      </div>
      <div id="regmx-google-wrap" style="margin-bottom:10px"></div>
      <div style="display:flex;align-items:center;gap:12px;margin:12px 0">
        <div style="flex:1;height:1px;background:var(--brd)"></div>
        <span style="font-size:11px;color:var(--g400);font-weight:600">o con email</span>
        <div style="flex:1;height:1px;background:var(--brd)"></div>
      </div>
      <input id="regmx-nombre" type="text" placeholder="Tu nombre" class="regmx-input">
      <input id="regmx-email" type="email" placeholder="tu@email.com" class="regmx-input">
      <input id="regmx-pass" type="password" placeholder="Contraseña (mín. 6)" class="regmx-input">
      <button class="regmx-cta" onclick="window._registerFromModal('${contexto}')">Crear cuenta</button>
      <div id="regmx-err" style="display:none;color:var(--red);font-size:11px;margin-top:8px;text-align:center"></div>
      <div style="text-align:center;margin-top:12px">
        <span style="font-size:12px;color:var(--sub)">¿Ya tienes cuenta? </span>
        <a onclick="document.getElementById('register-modal')?.remove();document.getElementById('lov').style.display='flex'" style="font-size:12px;color:var(--b600);font-weight:700;cursor:pointer">Inicia sesión</a>
      </div>
      <div class="regmx-optin">
        <input type="checkbox" id="regmx-email-notifs">
        <label for="regmx-email-notifs">Quiero recibir notificaciones por email cuando los inmuebles que me gustan cambien de precio o estado. <span style="font-weight:700">Puedes desactivarlo cuando quieras.</span></label>
      </div>
    </div>`;
  document.body.appendChild(modal);
  // Re-render Google button inside modal if available
  try {
    if (window.google?.accounts?.id) {
      const container = document.getElementById('regmx-google-wrap');
      if (container) {
        window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 300, text: 'signup_with', shape: 'pill' });
      }
    }
  } catch(e) { console.warn('[register-modal] Google button render failed:', e); }
};

// --- Register from modal (email + pass) ---
window._registerFromModal = async function(contexto) {
  const nombre = (document.getElementById('regmx-nombre')?.value || '').trim();
  const email = (document.getElementById('regmx-email')?.value || '').trim().toLowerCase();
  const pass = (document.getElementById('regmx-pass')?.value || '').trim();
  const optInEmail = !!document.getElementById('regmx-email-notifs')?.checked;
  const err = document.getElementById('regmx-err');
  const showErr = (m) => { if (err) { err.textContent = m; err.style.display = 'block'; } };
  if (err) err.style.display = 'none';
  if (nombre.length < 2) return showErr('Ingresa tu nombre');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('Email inválido');
  if (pass.length < 6) return showErr('Contraseña mínimo 6 caracteres');
  try {
    // Check if email already exists
    const { data: existing } = await SB().from('usuarios').select('id').eq('email', email).maybeSingle();
    if (existing) return showErr('Ese email ya está registrado. Inicia sesión.');
    const hash = await window.hashPwd(pass);
    const { data: newUser, error } = await SB().from('usuarios').insert({
      nombre, email, usuario: email, password_hash: hash,
      rol: 'asesor', tipo_usuario: 'cliente', activo: true,
      notificaciones_email: optInEmail,
    }).select().single();
    if (error) return showErr(error.message || 'Error al crear cuenta');
    document.getElementById('register-modal')?.remove();
    window.userStore.set({
      id: newUser.id, email: newUser.email, nombre: newUser.nombre,
      rol: newUser.rol, tipo_usuario: newUser.tipo_usuario,
      token: 'cred:' + newUser.email + ':' + hash,
    });
    window.toast('🎉 ¡Bienvenido a House!');
    await window.onRegistrationComplete(contexto);
  } catch(e) {
    console.error('[register-modal]', e);
    showErr('Error: ' + (e.message || 'intenta de nuevo'));
  }
};

// --- Post-Registration Continuity ---
window.onRegistrationComplete = async function(contexto) {
  try {
    // Load user data (reuses existing load.js)
    if (typeof window.load === 'function') await window.load();
  } catch(e) { console.warn('[postreg] load error:', e); }
  // Resume pending action based on context
  switch (contexto) {
    case 'favorito':
      if (window._pendingFavoriteId) {
        await window.toggleFavorito(window._pendingFavoriteId);
        window._pendingFavoriteId = null;
      }
      break;
    case 'contacto':
      if (window._pendingContactInmuebleId && typeof window.oM === 'function') {
        window.oM(window._pendingContactInmuebleId);
        window._pendingContactInmuebleId = null;
      }
      break;
    case 'publicar':
      window.go?.('publicar');
      break;
    case 'referir':
      window.go?.('referir');
      break;
    case 'precio':
      window.toast?.('🔔 Alertas de precio activadas');
      break;
  }
  // Clean visitor state
  try {
    localStorage.removeItem('house_visitor_id');
    localStorage.removeItem('house_viewed');
    localStorage.removeItem('house_prompts');
    localStorage.removeItem('house_dismissed');
    window.VISITOR = null;
  } catch(e) {}
};

// --- Init visitor state on load ---
window.initVisitorState();

// ══════════════════════════════════════════════════════════════════
// Visitor chrome overrides — sec-inv (CRM filters) for unauth users
// ══════════════════════════════════════════════════════════════════
// Los visitantes usan la MISMA UI de filtros que el cliente (sec-inv con pills)
// a excepción de Favs (gated) y Míos (oculto).
window._applyVisitorChrome = function() {
  if (window.U && window.U()) return; // solo visitante
  // 1) Ocultar botón "Míos" (no aplica sin sesión)
  const myBtn = document.getElementById('myToggle');
  if (myBtn) myBtn.style.display = 'none';
  // 2) Gatear botón "Favs" — al click, mostrar prompt de suscripción
  const favBtn = document.getElementById('favToggle');
  if (favBtn && !favBtn.dataset.visitorGated) {
    favBtn.dataset.visitorGated = '1';
    favBtn.setAttribute('onclick', "window.showAuthPrompt('favorito',{icono:'❤️',titulo:'Mis favoritos · solo suscriptores',mensaje:'Crea tu cuenta gratis para guardar los inmuebles que te gustan y acceder a beneficios exclusivos.',beneficios:['❤️ Guarda todos tus favoritos','🔔 Alertas cuando bajen de precio','📱 Accede desde cualquier dispositivo','✅ Sin spam — solo si tú lo autorizas'],cta:'Crear cuenta gratis',ctaSecundario:'Ahora no'})");
    favBtn.innerHTML = '♡ Favs 🔒';
    favBtn.style.borderStyle = 'dashed';
  }
  // 3) Inyectar banner de visitante (Ingresar / Registrarse) al tope de sec-inv
  const invWrap = document.querySelector('#sec-inv .inv-wrap');
  if (invWrap && !document.getElementById('visitorTopBanner')) {
    const banner = document.createElement('div');
    banner.id = 'visitorTopBanner';
    banner.style.cssText = 'background:#fff;border-bottom:1px solid #e8e4df;padding:10px 16px;display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:60';
    banner.innerHTML = `
      <img src="/img/logo.png" style="height:26px" onerror="this.style.display='none'">
      <span style="font-family:Fraunces,serif;font-size:15px;font-weight:800;color:#1e293b;letter-spacing:-.3px">House</span>
      <div style="flex:1"></div>
      <a href="?login=1" style="padding:7px 14px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none">Ingresar</a>
      <a href="?reg=1" style="padding:7px 14px;background:#2563eb;color:#fff;border:2px solid #2563eb;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none">Registrarse gratis</a>
    `;
    invWrap.insertBefore(banner, invWrap.firstChild);
  }
};

console.log('[functions] ✅ All window functions registered');
