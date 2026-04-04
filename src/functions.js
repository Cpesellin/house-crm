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

window.noti = async function(tipo,nivel,titulo,mensaje,paraEmail,paraRol,inmId) {
  try {
    const u = U();
    await SB().from('alertas').insert({tipo,nivel,titulo,mensaje,para_email:paraEmail||null,para_rol:paraRol||null,inmueble_id:inmId||null,de_usuario:u?.id});
  } catch(e) { console.error('[noti]',e); }
};

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

window.renderBell = function() {
  const el = document.getElementById('belllist');
  if (!el) return;
  const all = (window.ALU||[]).slice(0,6);
  const em = {inmueble_nuevo:'🆕',cambio_estado:'🔄',solicitud_info:'📩',portal_pendiente:'🌐',portal_listo:'✅',verificar:'🔍',tiempo_estado:'⏰',autorizacion_vencer:'⚠️',autorizacion_vencida:'🔴',cambio_precio:'💲',actualizar_portal:'🌐'};
  if(!all.length){el.innerHTML='<div class="bell-empty">🎉 Sin notificaciones</div>';return;}
  el.innerHTML=all.map(a=>{
    const e2=em[a.tipo]||'📌',idI=a.inmueble_id||'';
    const f=a.created_at?new Date(a.created_at).toLocaleDateString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    let actions='';
    if(a.tipo==='verificar'&&idI){
      actions=`<div style="display:flex;gap:4px;margin-top:4px"><button style="flex:1;padding:4px;border:none;border-radius:4px;font-size:8px;font-weight:700;background:var(--green);color:#fff;font-family:inherit;cursor:pointer" onclick="event.stopPropagation();closeBell();quickMove('${idI}','Aún Disponible')">✅ Disponible</button><button style="flex:1;padding:4px;border:none;border-radius:4px;font-size:8px;font-weight:700;background:var(--red);color:#fff;font-family:inherit;cursor:pointer" onclick="event.stopPropagation();closeBell();quickMove('${idI}','Retirado')">❌ No disponible</button></div>`;
    }
    return`<div class="bell-item" onclick="closeBell();${idI?`openAlertInm('${idI}')`:''}"><div class="be">${e2}</div><div style="flex:1"><div class="bt2">${a.titulo||''}</div><div class="bd2">👤 ${a.emisor?a.emisor.nombre:''}</div><div class="bf">${f}</div>${actions}</div></div>`;
  }).join('');
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

window.oM = function(idx) {
  const p = D()[idx];
  if (!p) return;
  const u = U();
  const esMio = u && p.captador_id === u.id;
  const esP = u && (u.rol === 'admin' || u.rol === 'oficina');
  const esGestor = u && u.es_gestor_arriendos;
  const canEdit = esMio || esP;
  _modalDirty = false;

  const canSeeRealDir = esMio || esP || esGestor;

  document.getElementById('mtt').textContent = (p.codigo_house ? p.codigo_house + ' · ' : '') + (p.tipo || 'Inmueble');
  document.getElementById('msb3').textContent = (p.ciudad ? '📍 ' + p.ciudad : '') + (canSeeRealDir && p.direccion ? ' · ' + p.direccion : p.direccion_publica ? ' · ' + p.direccion_publica : '');

  const inp = (id,val,ph,type) => `<input id="${id}" type="${type||'text'}" value="${(val||'').toString().replace(/"/g,'&quot;')}" placeholder="${ph||''}" style="width:100%;padding:5px 8px;border:1.5px solid var(--brd);border-radius:5px;font-size:11px;font-family:inherit;color:var(--tx);background:var(--cd)">`;
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
    if(confirm('¿Descartar cambios sin guardar?')){_modalDirty=false;_cmBusy=false;window.cmForce();}
    else{_cmBusy=false;}
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
  if(FINAL_STATES.includes(estado)){const ok=await window.cfShow(estado==='Arrendado'?'🔑':estado==='Vendido'?'💰':'⛔','¿Mover a '+estado+'?','Genera alertas');if(!ok)return;}
  const p=findInm(id);const desc=descInm(p);const u=U();const capNom=p?.captador?.nombre||'?';const capEmail=p?.captador?.usuario||p?.captador?.email||'';
  await SB().from('inmuebles').update({estado,fecha_estado:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
  await SB().from('historial').insert({inmueble_id:id,usuario_id:u.id,accion:'cambio_estado',campo:'estado',valor_nuevo:estado});
  if(estado==='Verificar Disponibilidad'){await window.noti('verificar','rojo','🔍 '+u.nombre+' solicita verificar: '+desc,u.nombre+' necesita saber si tu '+desc+' sigue disponible.',capEmail,null,id);}
  else if(estado==='Aún Disponible'){await window.noti('cambio_estado','verde','✅ '+capNom+' confirmó: '+desc+' disponible',capNom+' verificó que '+desc+' está disponible.',null,'all',id);}
  else if(FINAL_STATES.includes(estado)){const ico=estado==='Arrendado'?'🔑':estado==='Vendido'?'💰':'⛔';await window.noti('cambio_estado','verde',ico+' Cierre: '+desc+' → '+estado,u.nombre+' cerró '+desc+'.',null,'all',id);}
  else{await window.noti('cambio_estado','info','🔄 '+desc+' → '+estado,u.nombre+' movió '+desc+' a '+estado,null,'all',id);}
  window.toast('✅ Movido a '+estado);window.load();
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

const fD = {tipo:'',negociacion:'VENTA',precioVenta:'',precioArriendo:'',direccion:'',ciudad:'',barrio:'',nombre:'',telefono:'',email:'',area:120,areaTotal:'',estrato:0,habitaciones:3,banos:2,parqueos:1,caracteristicas:[],amenidades:[],observaciones:'',fecha_vencimiento_autorizacion:''};
let fS = 1;
const fLb=['Lo esencial','Propietario','Características','Amenidades','Revisar'];
const fTp=[{id:'Casa',i:'🏠'},{id:'Apartamento',i:'🏢'},{id:'Finca',i:'🌾'},{id:'Local comercial',i:'🏪'},{id:'Oficina',i:'💼'},{id:'Lote',i:'🌳'},{id:'Casa campestre',i:'🌿'},{id:'Bodega',i:'🏭'},{id:'Penthouse',i:'👑'}];
const fAP=[{id:'parqueadero',l:'Parqueo',i:'🚗'},{id:'ascensor',l:'Ascensor',i:'🛗'},{id:'piscina',l:'Piscina',i:'🏊'},{id:'gimnasio',l:'Gimnasio',i:'🏋️'},{id:'zonas_verdes',l:'Zonas V.',i:'🌿'},{id:'seguridad',l:'Seguridad',i:'🛡️'},{id:'salon_comunal',l:'Salón',i:'🎉'},{id:'terraza',l:'Terraza',i:'☀️'}];
const fAX=[{id:'cancha_tennis',l:'Tenis',i:'🎾'},{id:'cancha_futbol',l:'Fútbol',i:'⚽'},{id:'sauna',l:'Sauna',i:'🧖'},{id:'juegos_ninos',l:'Juegos',i:'🎠'},{id:'bbq',l:'BBQ',i:'🔥'},{id:'coworking',l:'Cowork',i:'💻'},{id:'pet_friendly',l:'Pet',i:'🐕'},{id:'cuarto_util',l:'Útil',i:'📦'},{id:'lavanderia',l:'Lavand.',i:'🧺'},{id:'deposito',l:'Depósito',i:'🗄️'}];

window.fD = fD;
window.nextHouseCode = function(){let maxN=0;D().forEach(p=>{if(p.codigo_house){const n=parseInt(p.codigo_house.replace('HOUSE-',''));if(n>maxN)maxN=n;}});return'HOUSE-'+String(maxN+1).padStart(3,'0');};

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
  if(fS===1)rF1(c);else if(fS===2)rF2(c);else if(fS===3)rF3(c);else if(fS===4)rF4(c);else rF5(c);
};

function rF1(c){const nxt=nextHouseCode();let h=`<div style="background:var(--b50);border:2px solid var(--b200);border-radius:10px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:9px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:1px">ID INMUEBLE</div><div style="font-family:monospace;font-size:20px;font-weight:800;color:var(--b700);margin-top:2px">${nxt}</div></div><button type="button" style="padding:6px 12px;border:1.5px solid var(--b200);border-radius:6px;background:var(--cd);font-size:11px;font-weight:700;color:var(--b600);cursor:pointer" onclick="navigator.clipboard.writeText('${nxt}');toast('📋 Copiado')">📋</button></div>`;
h+='<div class="ff"><label class="ffl">Tipo <span class="ffr">*</span></label><div class="ftg">';fTp.forEach(t=>{h+=`<div class="ftc ${fD.tipo===t.id?'sel':''}" onclick="fD.tipo='${t.id}';rFS()"><div class="fti">${t.i}</div>${t.id}</div>`;});
h+=`</div></div><div class="ff"><label class="ffl">Negociación <span class="ffr">*</span></label><div class="fsg"><button class="fsgb ${fD.negociacion==='VENTA'?'act':''}" onclick="fD.negociacion='VENTA';rFS()">Venta</button><button class="fsgb ${fD.negociacion==='ARRIENDO'?'act':''}" onclick="fD.negociacion='ARRIENDO';rFS()">Arriendo</button><button class="fsgb ${fD.negociacion==='AMBAS'?'act':''}" onclick="fD.negociacion='AMBAS';rFS()">Ambas</button></div></div>`;
if(fD.negociacion!=='ARRIENDO')h+=`<div class="ff"><label class="ffl">Precio Venta</label><input class="ffi" type="number" value="${fD.precioVenta}" onchange="fD.precioVenta=this.value" placeholder="450000000"></div>`;
if(fD.negociacion!=='VENTA')h+=`<div class="ff"><label class="ffl">Arriendo/mes</label><input class="ffi" type="number" value="${fD.precioArriendo}" onchange="fD.precioArriendo=this.value" placeholder="2500000"></div>`;
h+=`<div class="ff"><label class="ffl">Dirección <span class="ffr">*</span></label><input class="ffi" value="${fD.direccion}" onchange="fD.direccion=this.value" placeholder="Calle 50 #32-15"></div><div class="ffg"><div class="ff"><label class="ffl">Ciudad <span class="ffr">*</span></label><input class="ffi" value="${fD.ciudad}" onchange="fD.ciudad=this.value" placeholder="Pereira"></div><div class="ff"><label class="ffl">Barrio</label><input class="ffi" value="${fD.barrio}" onchange="fD.barrio=this.value"></div></div><div class="ff"><label class="ffl">Vencimiento autorización</label><input class="ffi" type="date" value="${fD.fecha_vencimiento_autorizacion}" onchange="fD.fecha_vencimiento_autorizacion=this.value"></div>`;
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

function rF5(c){const nl=fD.negociacion==='AMBAS'?'Venta y Arriendo':fD.negociacion==='VENTA'?'Venta':'Arriendo';const nxt=nextHouseCode();
c.innerHTML=`<div style="background:var(--b50);border:2px solid var(--b200);border-radius:9px;padding:14px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:20px">${emo(fD.tipo)}</span><span class="cod-badge" style="font-size:13px;padding:4px 10px">${nxt}</span></div><div style="font-family:Fraunces,serif;font-size:18px;font-weight:700;color:var(--b800)">${fD.tipo||'Sin tipo'}</div><div style="font-size:10px;color:var(--sub);margin-top:2px">📍 ${fD.direccion}, ${fD.ciudad}</div>${fD.precioVenta?`<div style="font-family:Fraunces,serif;font-size:16px;font-weight:700;color:var(--b700);margin-top:4px">${fm(+fD.precioVenta)}</div>`:''}${fD.precioArriendo?`<div style="font-size:13px;font-weight:700;color:#065f46;margin-top:2px">${fm(+fD.precioArriendo)}/mes</div>`:''}<div style="display:flex;gap:3px;margin-top:6px;flex-wrap:wrap"><span class="sp">${nl}</span>${fD.habitaciones?`<span class="sp">🛏️${fD.habitaciones}</span>`:''}${fD.banos?`<span class="sp">🚿${fD.banos}</span>`:''}${fD.area?`<span class="sp">📐${fD.area}m²</span>`:''}</div></div><div style="font-size:10px;color:var(--sub);margin-top:6px">👤 ${fD.nombre} · ${fD.telefono}</div>`;}

window.fPr = function(){if(fS>1){fS--;window.rFS();}};

window.fNx = async function(){
  if(fS<5){fS++;window.rFS();return;}
  const btn=document.getElementById('fn');btn.disabled=true;btn.textContent='Enviando...';
  try{localStorage.setItem('hcrm_fmem',JSON.stringify({ciudad:fD.ciudad,tipo:fD.tipo}));}catch(e){}
  const neg=fD.negociacion==='AMBAS'?'Venta y Arriendo':fD.negociacion==='VENTA'?'Venta':'Arriendo';
  const u=U();
  const{data:newInm,error}=await SB().from('inmuebles').insert({captador_id:u.id,tipo:fD.tipo,negociacion:neg,direccion:fD.direccion,ciudad:fD.ciudad,barrio:fD.barrio,precio_venta:fD.precioVenta?parseFloat(fD.precioVenta):null,precio_arriendo:fD.precioArriendo?parseFloat(fD.precioArriendo):null,area_construida:fD.area?parseFloat(fD.area):null,area_total:fD.areaTotal?parseFloat(fD.areaTotal):null,estrato:fD.estrato?String(fD.estrato):null,habitaciones:fD.habitaciones||null,banos:fD.banos||null,parqueaderos:fD.parqueos||null,caracteristicas:fD.amenidades.join(', '),observaciones:fD.observaciones,propietario_nombre:fD.nombre,propietario_telefono:fD.telefono,propietario_email:fD.email,fecha_vencimiento_aut:fD.fecha_vencimiento_autorizacion||null,estado:'Disponible'}).select().single();
  if(!error&&newInm){
    if(_pendingFotos.length>0){for(let i=0;i<_pendingFotos.length;i++){await SB().from('fotos').insert({inmueble_id:newInm.id,url:_pendingFotos[i].url,url_thumb:_pendingFotos[i].thumb,origen:'cloudinary',tipo:_pendingFotos[i].tipo||'imagen',orden:i});}_pendingFotos=[];}
    const desc2=(fD.tipo||'Inmueble')+' en '+(fD.ciudad||'?');
    await window.noti('inmueble_nuevo','info','🆕 '+u.nombre+' registró: '+desc2,u.nombre+' registró nuevo '+desc2,null,'all',newInm.id);
    window.toast('✅ Inmueble registrado');
    const lastC=fD.ciudad,lastT=fD.tipo;Object.assign(fD,{tipo:lastT,negociacion:'VENTA',precioVenta:'',precioArriendo:'',direccion:'',ciudad:lastC,barrio:'',nombre:'',telefono:'',email:'',area:120,areaTotal:'',estrato:0,habitaciones:3,banos:2,parqueos:1,caracteristicas:[],amenidades:[],observaciones:'',fecha_vencimiento_autorizacion:''});
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

const F = {neg:new Set(),ciu:new Set(),tipo:new Set(),fresco:new Set()};
window.F = F;

window.tc = function(el) {
  const g=el.dataset.g,v=el.dataset.v,c=el.dataset.c||'';
  if(F[g].has(v)){F[g].delete(v);el.classList.remove('on','cg','cy');}
  else{F[g].add(v);el.classList.remove('cg','cy');el.classList.add('on');if(c)el.classList.add(c);}
  window.renderSel();
  window.doSearch();
};

// Remove a single filter tag
window.qf = function(g,v) {
  F[g].delete(v);
  const el=document.querySelector(`.ch[data-g="${g}"][data-v="${v}"]`);
  if(el)el.classList.remove('on','cg','cy');
  window.renderSel();
  window.doSearch();
};

// Render selection bar with active filter tags
window.renderSel = function() {
  const L={neg:{venta:'💰 Venta',arriendo:'🔑 Arriendo',ambas:'🔄 Ambas'},ciu:{pereira:'📍 Pereira',dosquebradas:'📍 Dosq.','santa rosa':'📍 Sta Rosa',cerritos:'📍 Cerritos'},tipo:{apartamento:'🏢 Apto',casa:'🏡 Casa',finca:'🌾 Finca',local:'🏪 Local',lote:'🌳 Lote',oficina:'💼 Oficina',bodega:'🏭 Bodega',penthouse:'👑 PH'},fresco:{si:'✅ Frescos ≤7d',atencion:'⚠️ Necesitan atención'}};
  let h='',n=0;
  for(const[g,s]of Object.entries(F))for(const v of s){n++;h+=`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--cd);border:1.5px solid var(--b300);color:var(--b700);border-radius:14px;padding:3px 9px;font-size:10px;font-weight:700">${L[g]?.[v]||v}<span style="cursor:pointer;color:var(--b400);font-size:9px;margin-left:2px" onclick="qf('${g}','${v}')">✕</span></span>`;}
  const arMin=document.getElementById('arMin')?.value,arMax=document.getElementById('arMax')?.value;
  if(arMin||arMax){n++;h+=`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--cd);border:1.5px solid var(--b300);color:var(--b700);border-radius:14px;padding:3px 9px;font-size:10px;font-weight:700">🔑 ${arMin?'$'+Number(arMin).toLocaleString('es-CO'):'$0'} – ${arMax?'$'+Number(arMax).toLocaleString('es-CO'):'∞'}<span style="cursor:pointer;color:var(--b400);font-size:9px;margin-left:2px" onclick="document.getElementById('arMin').value='';document.getElementById('arMax').value='';renderSel();doSearch()">✕</span></span>`;}
  const vnMin=document.getElementById('vnMin')?.value,vnMax=document.getElementById('vnMax')?.value;
  if(vnMin||vnMax){n++;h+=`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--cd);border:1.5px solid var(--green);color:#065f46;border-radius:14px;padding:3px 9px;font-size:10px;font-weight:700">💰 ${vnMin?'$'+Number(vnMin).toLocaleString('es-CO'):'$0'} – ${vnMax?'$'+Number(vnMax).toLocaleString('es-CO'):'∞'}<span style="cursor:pointer;color:var(--b400);font-size:9px;margin-left:2px" onclick="document.getElementById('vnMin').value='';document.getElementById('vnMax').value='';renderSel();doSearch()">✕</span></span>`;}
  const qv=(document.getElementById('q')?.value||'').trim();
  if(qv){n++;h+=`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--cd);border:1.5px solid var(--gold);color:#92400e;border-radius:14px;padding:3px 9px;font-size:10px;font-weight:700">🔍 "${qv}"<span style="cursor:pointer;color:var(--b400);font-size:9px;margin-left:2px" onclick="document.getElementById('q').value='';renderSel();doSearch()">✕</span></span>`;}
  // Update compact bar (collapsed state)
  const compact=document.getElementById('seltagsCompact');
  if(compact)compact.innerHTML=h;
  // Show/hide collapsed bar if filters are active and panel is collapsed
  const collapsed=document.getElementById('filterCollapsed');
  if(collapsed&&document.getElementById('filterExpanded')?.style.display==='none'){
    collapsed.style.display=n>0?'block':'none';
  }
};

window.toggleMis = function() {
  window._myFilter = !window._myFilter;
  const btn = document.getElementById('myToggle');
  const filterPanel = document.getElementById('filterExpanded');
  const filterCollapsed = document.getElementById('filterCollapsed');

  if (btn) {
    if (window._myFilter) {
      btn.style.background = '#e11d73';
      btn.style.color = '#fff';
      btn.style.borderColor = '#e11d73';
      btn.style.boxShadow = '0 2px 12px rgba(225,29,115,.35)';
      btn.innerHTML = '🏠 Mis inmuebles ✓';
      // Hide filters completely — only search bar stays
      if (filterPanel) filterPanel.style.display = 'none';
      if (filterCollapsed) filterCollapsed.style.display = 'none';
    } else {
      btn.style.background = 'linear-gradient(135deg,#fdf2f8,#fce7f3)';
      btn.style.color = '#be185d';
      btn.style.borderColor = '#e11d73';
      btn.style.boxShadow = '0 2px 8px rgba(225,29,115,.15)';
      btn.innerHTML = '🏠 Mostrar mis inmuebles';
      // Restore filters
      if (filterPanel) filterPanel.style.display = '';
      if (filterCollapsed) filterCollapsed.style.display = 'none';
    }
  }
  window.doSearch();
};
window._myFilter = false;

window.populateAsesorFilter = function() {
  const af=document.getElementById('asesorFilter');if(!af)return;
  const u=U();const isAdmin=u&&(u.rol==='admin'||u.rol==='oficina');
  if(!isAdmin){af.style.display='none';return;}
  af.style.display='block';
  const asesores={};D().forEach(p=>{if(p.captador){asesores[p.captador_id]=asesores[p.captador_id]||{nombre:p.captador.nombre,count:0};asesores[p.captador_id].count++;}});
  af.innerHTML='<option value="">👤 Todos</option>'+Object.entries(asesores).sort((a,b)=>b[1].count-a[1].count).map(([id,a])=>`<option value="${id}">👤 ${a.nombre} (${a.count})</option>`).join('');
};

window.renderRecent = function() {
  const el=document.getElementById('rsrch');if(!el)return;
  let r=[];try{r=JSON.parse(localStorage.getItem('hcrm_recent')||'[]');}catch(e){}
  if(!r.length){el.textContent='';return;}
  el.innerHTML='<span style="font-size:8px;color:var(--sub);font-weight:700">Recientes:</span>'+r.map(q=>`<span class="rsrch-ch" onclick="document.getElementById('q').value='${q}';doSearch()">${q}</span>`).join('');
};

// Override doSearch to actually filter
window.doSearch = function() {
  const allD = D();
  if (!allD.length) return;
  window.renderSel();
  const qv = (document.getElementById('q')?.value || '').trim().toLowerCase();
  if (qv.length >= 2) { let r = []; try { r = JSON.parse(localStorage.getItem('hcrm_recent') || '[]'); } catch(e){} r = r.filter(x => x !== qv); r.unshift(qv); localStorage.setItem('hcrm_recent', JSON.stringify(r.slice(0, 5))); }

  // Price range inputs
  const arMin = parseFloat(document.getElementById('arMin')?.value) || 0;
  const arMax = parseFloat(document.getElementById('arMax')?.value) || 0;
  const vnMin = parseFloat(document.getElementById('vnMin')?.value) || 0;
  const vnMax = parseFloat(document.getElementById('vnMax')?.value) || 0;

  let list = allD;
  if (window._myFilter) list = list.filter(p => p.captador_id === U()?.id);
  const af = document.getElementById('asesorFilter');
  if (af && af.value) list = list.filter(p => p.captador_id === af.value);

  const hasFilters = Object.values(F).some(s => s.size > 0) || qv.length > 0 || arMin > 0 || arMax > 0 || vnMin > 0 || vnMax > 0;
  if (hasFilters) {
    list = list.filter(p => {
      const c = (p.ciudad || '').toLowerCase(), t = (p.tipo || '').toLowerCase();
      const pa = p.precio_arriendo || 0, pv = p.precio_venta || 0;
      if (F.neg.size > 0) { let ok = false; if (F.neg.has('venta') && eV(p)) ok = true; if (F.neg.has('arriendo') && eA(p)) ok = true; if (F.neg.has('ambas') && eA2(p)) ok = true; if (!ok) return false; }
      if (F.ciu.size > 0 && !Array.from(F.ciu).some(x => c.includes(x))) return false;
      if (F.tipo.size > 0 && !Array.from(F.tipo).some(x => t.includes(x))) return false;
      if (F.fresco.size > 0) { const d = p._dias || 999; if (F.fresco.has('si') && d > 7) return false; if (F.fresco.has('atencion') && d <= 7) return false; }
      // Price ranges
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

// Collapse/expand filters
window.collapseFilters = function() {
  const hasAny = Object.values(F).some(s=>s.size>0) || document.getElementById('arMin')?.value || document.getElementById('arMax')?.value || document.getElementById('vnMin')?.value || document.getElementById('vnMax')?.value || (document.getElementById('q')?.value||'').trim();
  if (!hasAny) return; // Don't collapse if nothing selected
  document.getElementById('filterExpanded').style.display = 'none';
  const collapsed = document.getElementById('filterCollapsed');
  collapsed.style.display = 'block';
  // Copy tags to compact bar
  document.getElementById('seltagsCompact').innerHTML = document.getElementById('seltags')?.innerHTML || '';
};

window.expandFilters = function() {
  document.getElementById('filterExpanded').style.display = '';
  document.getElementById('filterCollapsed').style.display = 'none';
};

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

    let h = '';

    // ── HEADER FIJO ──
    h += `<div style="position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <img src="/img/logo.png" style="height:30px">
      <span style="font-family:'Fraunces',serif;font-size:16px;font-weight:800;color:#1e293b;letter-spacing:-.3px">House</span>
      <div style="flex:1"></div>
      <a href="https://wa.me/${capTel}?text=${encodeURIComponent('Hola ' + capNom + ', estoy interesado en este inmueble: https://inmobiliariahouse.com.co/ver/' + (cod || id))}" target="_blank" style="padding:6px 14px;background:#25d366;color:#fff;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none">Contactar</a>
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
    h += `<div style="position:fixed;bottom:0;left:0;right:0;z-index:50;background:#fff;border-top:1px solid #e2e8f0;padding:10px 16px;display:flex;gap:8px;box-shadow:0 -2px 10px rgba(0,0,0,.06)">
      <a href="https://wa.me/${capTel}?text=${encodeURIComponent('Hola ' + capNom + ', estoy interesado en este inmueble: https://inmobiliariahouse.com.co/ver/' + (cod || id))}" target="_blank" style="flex:1;padding:14px;background:#25d366;color:#fff;border-radius:10px;text-align:center;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">💬 WhatsApp</a>
      <a href="tel:+${capTel}" style="flex:1;padding:14px;background:#2563eb;color:#fff;border-radius:10px;text-align:center;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">📞 Llamar</a>
    </div>`;

    // ── BANNERS CTA ──
    // Count public properties for subtitle
    h += `<div style="padding:0 16px 20px">`;
    // Banner principal
    h += `<div style="margin-top:20px;padding:24px 20px;border-radius:14px;background:linear-gradient(135deg,#eff6ff,#f0f1ff);border:1.5px solid #bfdbfe;text-align:center">
      <div style="font-size:32px;margin-bottom:6px">🏠</div>
      <div style="font-family:Fraunces,serif;font-size:20px;font-weight:800;color:#1e293b;margin-bottom:4px">Encuentra tu inmueble ideal</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:14px">Explora propiedades en Pereira y el Eje Cafetero</div>
      <a href="#/portafolio" onclick="document.getElementById('lov')&&(document.getElementById('lov').style.display='none');document.getElementById('mhdr')&&(document.getElementById('mhdr').style.display='block')" style="display:inline-block;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;background:#2563eb;color:#fff;text-decoration:none;margin-bottom:6px">🔍 Explorar inmuebles</a>
      <div style="font-size:10px;color:#94a3b8;margin-top:8px">Gratis. Sin spam. Cancela cuando quieras.</div>
    </div>`;
    // Banner secundario
    h += `<div style="margin-top:12px;padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,#f0fdf4,#f0fdf8);border:1.5px solid #bbf7d0;text-align:center">
      <div style="font-size:14px;font-weight:800;color:#065f46;margin-bottom:6px">¿También tienes un inmueble?</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:10px">Llega a miles de clientes en Pereira</div>
      <a href="#/portafolio" onclick="document.getElementById('lov')&&(document.getElementById('lov').style.display='none');document.getElementById('mhdr')&&(document.getElementById('mhdr').style.display='block')" style="display:inline-block;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;background:#065f46;color:#fff;text-decoration:none">🏠 Publicar mi inmueble gratis</a>
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
// 18. EXTERNAL USERS — Onboarding, Favoritos, Owner Wizard, Approval
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
        <div class="onb-sub">Quiero arrendar o comprar</div>
      </button>
      <button class="onb-opt" onclick="selectProfile('propietario','${email.replace(/'/g,"\\'")}','${(nombre||'').replace(/'/g,"\\'")}','${(foto||'').replace(/'/g,"\\'")}')">
        <div class="onb-icon">🏠</div>
        <div class="onb-title">Tengo un inmueble</div>
        <div class="onb-sub">Quiero publicar para arrendar o vender</div>
      </button>
      <div style="margin-top:14px;font-size:10px;color:var(--g400)">Gratis. Sin spam. Cancela cuando quieras.</div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.selectProfile = async function(tipo, email, nombre, foto) {
  const modal = document.getElementById('onbModal');
  if (modal) modal.innerHTML = '<div class="onb-box" style="padding:40px"><div style="font-size:32px;margin-bottom:10px">⏳</div><div style="font-size:13px;color:var(--sub)">Creando tu cuenta...</div></div>';
  try {
    const tipoU = tipo === 'propietario' ? 'pendiente' : 'cliente';
    const { data: newUser, error } = await SB().from('usuarios').insert({
      email, nombre: nombre || email.split('@')[0], foto: foto || null,
      rol: 'cliente', tipo_usuario: tipoU, activo: true,
      usuario: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'')
    }).select().single();
    if (error) throw error;

    // If propietario request, create registro_solicitudes + alert admin
    if (tipo === 'propietario') {
      await SB().from('registro_solicitudes').insert({ usuario_id: newUser.id, tipo_solicitado: 'propietario', estado: 'pendiente' });
      await window.noti('registro_externo', 'info', '🏠 Nueva solicitud de propietario', nombre + ' (' + email + ') quiere publicar su inmueble', null, 'admin', null);
    } else {
      await window.noti('registro_externo', 'info', '👤 Nuevo cliente registrado', nombre + ' (' + email + ') se registró como cliente', null, 'admin', null);
    }

    // Log in the new user
    const userData = {
      id: newUser.id, email: newUser.email, nombre: newUser.nombre,
      rol: newUser.rol, foto: newUser.foto || '', usuario: newUser.usuario || '',
      telefono_contacto: '', es_gestor_arriendos: false,
      tipo_usuario: newUser.tipo_usuario, token: 'google:' + email
    };
    window.userStore.set(userData);
    if (modal) modal.remove();
    location.hash = tipoU === 'pendiente' ? '#/espera' : '#/portafolio';
    location.reload();
  } catch(e) {
    console.error('[selectProfile]', e);
    if (modal) modal.remove();
    window.toast('Error al crear cuenta: ' + e.message, 'terr');
  }
};

// --- Favoritos ---
window.toggleFavorito = async function(inmId) {
  const u = U(); if (!u) { window.toast('Inicia sesión para guardar favoritos', 'twarn'); return; }
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
    // Refresh UI if on favoritos or portafolio page
    if (typeof window.rFavoritos === 'function' && location.hash === '#/favoritos') window.rFavoritos();
    if (typeof window.rPortafolio === 'function' && location.hash === '#/portafolio') window.rPortafolio();
  } catch(e) { console.error('[toggleFavorito]', e); }
};

// --- Request upgrade to propietario ---
window.requestUpgrade = async function() {
  const u = U(); if (!u) return;
  const desc = prompt('Describe brevemente tu inmueble (ej: "Tengo un apto de 3 hab en Pinares que quiero arrendar")');
  if (!desc) return;
  try {
    await SB().from('registro_solicitudes').insert({ usuario_id: u.id, tipo_solicitado: 'propietario', estado: 'pendiente', descripcion: desc });
    await window.noti('registro_externo', 'info', '🏠 Solicitud upgrade a propietario', u.nombre + ' (' + u.email + ') quiere publicar: "' + desc + '"', null, 'admin', null);
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

window.ownerPublish = async function() {
  const u = U(); if (!u) return;
  const d = window._ownerData;
  try {
    // Check max 5
    const { data: existing } = await SB().from('inmuebles').select('id').eq('captador_id', u.id).eq('origen', 'externo').eq('eliminado', false);
    if (existing && existing.length >= 5) { window.toast('Máximo 5 publicaciones permitidas', 'twarn'); return; }

    // Generate next HOUSE code
    const code = typeof window.nextHouseCode === 'function' ? await window.nextHouseCode() : null;

    const { error } = await SB().from('inmuebles').insert({
      tipo: d.tipo, negociacion: d.negociacion, ciudad: d.ciudad,
      direccion: d.direccion, barrio: d.barrio, direccion_publica: d.barrio + ', ' + d.ciudad,
      precio_venta: d.precio_venta || 0, precio_arriendo: d.precio_arriendo || 0,
      habitaciones: d.habitaciones || 0, banos: d.banos || 0,
      area_construida: d.area_construida || 0, estrato: d.estrato || 0,
      parqueaderos: d.parqueaderos || 0, descripcion_cliente: d.descripcion_cliente || '',
      captador_id: u.id, origen: 'externo', estado_revision: 'en_revision',
      estado: 'Disponible', codigo_house: code, eliminado: false
    });
    if (error) throw error;

    await window.noti('inmueble_externo', 'amarillo', '🏠 Nuevo inmueble externo: ' + d.tipo + ' en ' + d.ciudad, u.nombre + ' publicó ' + d.tipo + ' en ' + d.barrio + ', ' + d.ciudad, null, 'admin', null);
    window.toast('🏠 Tu inmueble fue enviado para revisión');
    window._ownerStep = 1; window._ownerData = {};
    window.go('mis-pub');
  } catch(e) { console.error('[ownerPublish]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// --- Admin Approval ---
window.aprobarRegistro = async function(userId, tipo) {
  try {
    await SB().from('usuarios').update({ tipo_usuario: tipo || 'propietario' }).eq('id', userId);
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

console.log('[functions] ✅ All window functions registered');
