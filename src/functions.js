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
import { HOUSE_PHONE, HOUSE_PHONE_DISPLAY, houseWaUrl } from './core/constants.js';
import { analyzeContent } from './core/contentModerator.js';

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
// 1 + 2. NOTIFICATIONS + BELL → MOVIDO a src/domains/notifications/index.js
// (window.noti sigue en core/notifications.js — no se toca)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// EMISIÓN DE COMUNICADOS (ADMIN / OFICINA) — 3 pasos
// ══════════════════════════════════════════════════════════════════

window._emiState = { step: 1, alcance: 'todos', filtros: {}, titulo: '', mensaje: '', prioridad: 'normal', icono: '📢', color: '#6366f1' };

window.abrirEmisionComunicado = function() {
  const u = U();
  if (!u || (u.rol !== 'admin' && u.rol !== 'oficina')) {
    if (window.toast) window.toast('Solo admin/oficina', 'err');
    return;
  }
  window._emiState = { step: 1, alcance: 'todos', filtros: {}, titulo: '', mensaje: '', prioridad: 'normal', icono: '📢', color: '#6366f1' };
  const ov = document.createElement('div');
  ov.id = 'emiOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick = (e) => { if (e.target === ov) window.cerrarEmision(); };
  ov.innerHTML = `<div id="emiBox" style="background:var(--cd);border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)"></div>`;
  document.body.appendChild(ov);
  window.renderEmision();
};

window.cerrarEmision = function() {
  document.getElementById('emiOv')?.remove();
};

window.setEmiStep = function(n) { window._emiState.step = n; window.renderEmision(); };
window.setEmiAlcance = function(a) {
  window._emiState.alcance = a;
  window._emiState.filtros = {};
  window.renderEmision();
};
window.setEmiFiltro = function(k, v) { window._emiState.filtros[k] = v; window.renderEmision(); };
window.setEmiCampo = function(k, v) { window._emiState[k] = v; };

window.renderEmision = async function() {
  const box = document.getElementById('emiBox');
  if (!box) return;
  const s = window._emiState;

  let body = '';

  // HEADER con stepper
  body += `<div style="padding:18px 20px;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:16px;font-weight:800;color:var(--tx)">📢 Emitir comunicado</div>
    <button onclick="cerrarEmision()" style="background:none;border:none;font-size:22px;color:var(--sub);cursor:pointer">×</button>
  </div>`;
  body += `<div style="padding:14px 20px;display:flex;gap:6px">`;
  ['Alcance','Filtros','Contenido'].forEach((lb,i) => {
    const n = i+1;
    const act = s.step === n;
    const done = s.step > n;
    body += `<div style="flex:1;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:${act?'#6366f1':done?'#10b981':'var(--b50)'};color:${(act||done)?'#fff':'var(--sub)'}">${n}. ${lb}</div>`;
  });
  body += `</div>`;

  // STEP 1: ALCANCE
  if (s.step === 1) {
    const opciones = [
      { id:'todos',  emoji:'🌐', label:'Todos los usuarios',    desc:'Todo el CRM activo' },
      { id:'rol',    emoji:'🎖️', label:'Por rol',                desc:'Admin, oficina, gestor, asesor, público' },
      { id:'perfil', emoji:'👥', label:'Por perfil público',     desc:'Comprador, vendedor, comisionista, referenciador' },
    ];
    body += `<div style="padding:0 20px 18px">`;
    opciones.forEach(o => {
      const sel = s.alcance === o.id;
      body += `<div onclick="setEmiAlcance('${o.id}')" style="padding:14px;border-radius:12px;border:2px solid ${sel?'#6366f1':'var(--brd)'};background:${sel?'#6366f10d':'var(--cd)'};margin-bottom:8px;cursor:pointer;display:flex;gap:12px;align-items:center">
        <div style="font-size:24px">${o.emoji}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--tx)">${o.label}</div><div style="font-size:11px;color:var(--sub);margin-top:2px">${o.desc}</div></div>
        ${sel?'<div style="color:#6366f1;font-size:18px">✓</div>':''}
      </div>`;
    });
    body += `</div>`;
    body += `<div style="padding:14px 20px;border-top:1px solid var(--brd);display:flex;justify-content:flex-end;gap:8px">
      <button onclick="cerrarEmision()" style="padding:10px 16px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;font-weight:700;cursor:pointer;color:var(--tx)">Cancelar</button>
      <button onclick="setEmiStep(2)" style="padding:10px 18px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">Siguiente →</button>
    </div>`;
  }

  // STEP 2: FILTROS
  if (s.step === 2) {
    body += `<div style="padding:0 20px 18px">`;
    if (s.alcance === 'todos') {
      body += `<div style="padding:20px;text-align:center;background:var(--b50);border-radius:10px;font-size:12px;color:var(--sub)">Sin filtros adicionales. El comunicado irá a TODOS los usuarios activos.</div>`;
    } else if (s.alcance === 'rol') {
      const roles = [
        { id:'admin',   emoji:'🔴', label:'Admin' },
        { id:'oficina', emoji:'🟠', label:'Oficina' },
        { id:'gestor',  emoji:'🟢', label:'Gestor' },
        { id:'asesor',  emoji:'🔵', label:'Asesor' },
        { id:'publico', emoji:'⚫', label:'Público' },
      ];
      body += `<div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Selecciona rol:</div>`;
      roles.forEach(r => {
        const sel = s.filtros.rol === r.id;
        body += `<div onclick="setEmiFiltro('rol','${r.id}')" style="padding:12px;border-radius:10px;border:2px solid ${sel?'#6366f1':'var(--brd)'};background:${sel?'#6366f10d':'var(--cd)'};margin-bottom:6px;cursor:pointer;display:flex;gap:10px;align-items:center">
          <div style="font-size:18px">${r.emoji}</div>
          <div style="flex:1;font-size:13px;font-weight:700;color:var(--tx)">${r.label}</div>
          ${sel?'<div style="color:#6366f1;font-size:16px">✓</div>':''}
        </div>`;
      });
    } else if (s.alcance === 'perfil') {
      const perfs = [
        { id:'comprador',     emoji:'🛒', label:'Comprador' },
        { id:'vendedor',      emoji:'🏷️', label:'Vendedor' },
        { id:'comisionista',  emoji:'💼', label:'Comisionista' },
        { id:'referenciador', emoji:'🤝', label:'Referenciador' },
      ];
      body += `<div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Selecciona perfil:</div>`;
      perfs.forEach(p => {
        const sel = s.filtros.perfil === p.id;
        body += `<div onclick="setEmiFiltro('perfil','${p.id}')" style="padding:12px;border-radius:10px;border:2px solid ${sel?'#6366f1':'var(--brd)'};background:${sel?'#6366f10d':'var(--cd)'};margin-bottom:6px;cursor:pointer;display:flex;gap:10px;align-items:center">
          <div style="font-size:18px">${p.emoji}</div>
          <div style="flex:1;font-size:13px;font-weight:700;color:var(--tx)">${p.label}</div>
          ${sel?'<div style="color:#6366f1;font-size:16px">✓</div>':''}
        </div>`;
      });
    }
    body += `</div>`;

    const ok = s.alcance === 'todos' || (s.alcance === 'rol' && s.filtros.rol) || (s.alcance === 'perfil' && s.filtros.perfil);
    body += `<div style="padding:14px 20px;border-top:1px solid var(--brd);display:flex;justify-content:space-between;gap:8px">
      <button onclick="setEmiStep(1)" style="padding:10px 16px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;font-weight:700;cursor:pointer;color:var(--tx)">← Atrás</button>
      <button ${ok?'':'disabled'} onclick="setEmiStep(3)" style="padding:10px 18px;background:${ok?'#6366f1':'#ccc'};color:#fff;border:none;border-radius:8px;font-weight:800;cursor:${ok?'pointer':'not-allowed'}">Siguiente →</button>
    </div>`;
  }

  // STEP 3: CONTENIDO
  if (s.step === 3) {
    body += `<div style="padding:0 20px 18px">
      <div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Título*</div>
      <input id="emiTit" maxlength="80" placeholder="Ej: Mantenimiento programado este sábado" value="${(s.titulo||'').replace(/"/g,'&quot;')}" oninput="setEmiCampo('titulo',this.value)" style="width:100%;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:600;background:var(--cd);color:var(--tx);margin-bottom:12px"/>

      <div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Mensaje</div>
      <textarea id="emiMsg" maxlength="300" rows="4" placeholder="Detalles del comunicado..." oninput="setEmiCampo('mensaje',this.value)" style="width:100%;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:12px;background:var(--cd);color:var(--tx);margin-bottom:12px;resize:vertical">${(s.mensaje||'').replace(/</g,'&lt;')}</textarea>

      <div style="display:flex;gap:8px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Icono</div>
          <input maxlength="2" value="${s.icono}" oninput="setEmiCampo('icono',this.value||'📢')" style="width:100%;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:18px;text-align:center;background:var(--cd);color:var(--tx)"/>
        </div>
        <div style="flex:2">
          <div style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Prioridad</div>
          <select onchange="setEmiCampo('prioridad',this.value);renderEmision()" style="width:100%;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
            <option value="baja" ${s.prioridad==='baja'?'selected':''}>Baja</option>
            <option value="normal" ${s.prioridad==='normal'?'selected':''}>Normal</option>
            <option value="alta" ${s.prioridad==='alta'?'selected':''}>Alta</option>
            <option value="critica" ${s.prioridad==='critica'?'selected':''}>Crítica</option>
          </select>
        </div>
      </div>
    </div>`;

    const ok = !!(s.titulo && s.titulo.trim());
    body += `<div style="padding:14px 20px;border-top:1px solid var(--brd);display:flex;justify-content:space-between;gap:8px">
      <button onclick="setEmiStep(2)" style="padding:10px 16px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;font-weight:700;cursor:pointer;color:var(--tx)">← Atrás</button>
      <button ${ok?'':'disabled'} onclick="confirmarEmision()" style="padding:10px 18px;background:${ok?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#ccc'};color:#fff;border:none;border-radius:8px;font-weight:800;cursor:${ok?'pointer':'not-allowed'}">📤 Enviar</button>
    </div>`;
  }

  box.innerHTML = body;
};

window.confirmarEmision = async function() {
  const s = window._emiState;
  if (!s.titulo || !s.titulo.trim()) return;
  try {
    const r = await window.emitirNotificacion({
      alcance: s.alcance,
      filtros: s.filtros,
      titulo: s.titulo.trim(),
      mensaje: (s.mensaje || '').trim() || null,
      icono: s.icono || '📢',
      color: s.color || '#6366f1',
      prioridad: s.prioridad,
      accion_tipo: 'abrir_comunicado',
    });
    window.cerrarEmision();
    if (window.toast) window.toast(`📢 Comunicado enviado a ${r.total} usuario${r.total>1?'s':''}`);
    if (window.load) window.load();
  } catch (e) {
    console.error('[confirmarEmision]', e);
    if (window.toast) window.toast('Error: ' + (e.message || 'no se pudo enviar'), 'err');
  }
};

// ══════════════════════════════════════════════════════════════════
// 3 + 4. GALLERY + MODAL DETALLE (oM) → MOVIDO a src/domains/inmuebles/detail-modal.js
// ══════════════════════════════════════════════════════════════════

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
      // Notificar a los usuarios que tienen este inmueble en favoritos
      if (window.notificarCambioPrecioFavorito) {
        window.notificarCambioPrecioFavorito(id, oldPV, newPV).catch(e=>console.warn('[notifFav venta]',e));
      }
    }
    if(newPA!==oldPA&&(newPA>0||oldPA>0)){
      await SB().from('historial').insert({inmueble_id:id,usuario_id:u.id,accion:'cambio_precio',campo_modificado:'precio_arriendo',valor_anterior:String(oldPA),valor_nuevo_detalle:String(newPA)});
      await window.noti('cambio_precio','rojo','💲 Precio arriendo cambió: '+desc,u.nombre+' cambió arriendo de '+desc+': '+fm(oldPA)+' → '+fm(newPA),null,'all',id);
      if (window.notificarCambioPrecioFavorito) {
        window.notificarCambioPrecioFavorito(id, oldPA, newPA).catch(e=>console.warn('[notifFav arr]',e));
      }
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
    const eh=window.escapeHtml||(s=>String(s||''));
    return`<div class="ait"><div class="aim"><b>👤 ${eh(a.autor?a.autor.nombre:'?')}</b> · ${f} ${vis}</div>${eh(a.texto)}</div>`;
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
// 7 + 8. STATE CHANGES + PIPELINE ACTIONS → MOVIDO a src/domains/inmuebles/lifecycle.js
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 9. SHARE (WhatsApp)
// ══════════════════════════════════════════════════════════════════

window.shareInm = function(id) {
  const p=findInm(id);if(!p)return;const u=U();
  // TRACK: compartir por whatsapp
  if (window.trackEvent) {
    window.trackEvent('compartir_wa', {
      inmueble_id: id, ciudad: p.ciudad, barrio: p.barrio,
      tipo_inmueble: p.tipo, negociacion: p.negociacion,
      precio: p.precio_venta || p.precio_arriendo, habitaciones: p.habitaciones,
    });
  }
  const tip=p.tipo||'Inmueble',ciu=p.ciudad||'',cod=p.codigo_house||'';
  const ubPub=p.direccion_publica||p.barrio||ciu;
  const pv=p.precio_venta||0,pa=p.precio_arriendo||0;
  const hab=p.habitaciones||'',ban=p.banos||'',area=p.area_construida||'',est=p.estrato||'';
  const capTel=HOUSE_PHONE;
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
const fTp=[{id:'Casa',i:'🏠'},{id:'Apartamento',i:'🏢'},{id:'Apartaestudio',i:'🏬'},{id:'Finca',i:'🌾'},{id:'Local comercial',i:'🏪'},{id:'Oficina',i:'💼'},{id:'Lote',i:'🌳'},{id:'Casa campestre',i:'🌿'},{id:'Bodega',i:'🏭'},{id:'Penthouse',i:'👑'}];
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
h+=`</div></div><div class="ff"><label class="ffl">📷 Fotos</label><div id="fotoUpReg"></div></div><div class="ff"><label class="ffl">Descripción del inmueble <span style="font-size:10px;font-weight:600;color:var(--b600);background:var(--b50);padding:2px 8px;border-radius:10px;margin-left:6px">👁️ Visible para clientes</span></label><textarea class="ffi" style="min-height:80px;resize:vertical" placeholder="Describe lo más atractivo del inmueble: ubicación, vista, acabados, cercanía a servicios..." onchange="fD.observaciones=this.value">${fD.observaciones}</textarea><div style="font-size:10px;color:var(--sub);margin-top:4px">Este texto se mostrará en la página pública del inmueble.</div></div>`;
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
  // Auto-moderación PII (Fase 1): se analiza el campo público (descripcion_cliente).
  // Las observaciones internas no se moderan porque nunca llegan al portal.
  const _modReport=analyzeContent(fD.observaciones||'');
  let newInm=null,error=null,_skipMod=false;
  for(let attempt=0;attempt<3;attempt++){
    const codigo=await nextHouseCode();
    const _basePayload={captador_id:u.id,codigo_house:codigo,tipo:fD.tipo,negociacion:neg,direccion:fD.direccion,ciudad:fD.ciudad,barrio:fD.barrio,precio_venta:fD.precioVenta?parseFloat(fD.precioVenta):null,precio_arriendo:fD.precioArriendo?parseFloat(fD.precioArriendo):null,area_construida:fD.area?parseFloat(fD.area):null,area_total:fD.areaTotal?parseFloat(fD.areaTotal):null,estrato:fD.estrato?String(fD.estrato):null,habitaciones:fD.habitaciones||null,banos:fD.banos||null,parqueaderos:fD.parqueos||null,caracteristicas:fD.amenidades.join(', '),observaciones:fD.observaciones,descripcion_cliente:fD.observaciones,propietario_nombre:fD.nombre,propietario_telefono:fD.telefono,propietario_email:fD.email,estado:'Disponible'};
    const _payload=_skipMod?_basePayload:{..._basePayload,alertas_moderacion:_modReport};
    const res=await SB().from('inmuebles').insert(_payload).select().single();
    if(!res.error){newInm=res.data;error=null;break;}
    // Si la columna alertas_moderacion no existe (migración #19 sin correr),
    // reintenta sin ese campo y avisa por consola.
    if(!_skipMod&&/alertas_moderacion/i.test(res.error?.message||'')){_skipMod=true;console.warn('[fNx] columna alertas_moderacion no existe — corre sql/19-moderacion-pii.sql');continue;}
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
// 12. USERS + PROFILE + PORTALES → MOVIDO a src/domains/auth-perfil/index.js
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// 13. FILTERS (Inventario) → MOVIDO a src/domains/inmuebles/filters.js
// ══════════════════════════════════════════════════════════════════

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
  el.innerHTML = data.map(n => { const f = n.created_at ? new Date(n.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; return `<div class="conc-nota"><div class="conc-nota-meta">👤 ${(window.escapeHtml||String)(n.autor ? n.autor.nombre : '?')} · ${f}</div>${(window.escapeHtml||String)(n.texto)}</div>`; }).join('');
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
// 15. PUBLIC VIEW → MOVIDO a src/domains/public/view.js
// ══════════════════════════════════════════════════════════════════

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

// Toggle para mostrar/ocultar contraseña (ícono 👁️)
window.togglePwdVis = function(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input) return;
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  if (btn) btn.textContent = visible ? '👁️' : '🙈';
};

window.toggleResetForm = function() {
  const loginPanel = document.getElementById('lov_login');
  const regPanel = document.getElementById('lov_register');
  const resetPanel = document.getElementById('lov_reset');
  if (!loginPanel || !resetPanel) return;
  const showingReset = resetPanel.style.display !== 'none';
  loginPanel.style.display = showingReset ? '' : 'none';
  if (regPanel) regPanel.style.display = 'none';
  resetPanel.style.display = showingReset ? 'none' : '';
  // Clear fields + reset UI a modo fase 1 (email only)
  const rstErr = document.getElementById('rst_err');
  const rstOk = document.getElementById('rst_ok');
  const rstEmail = document.getElementById('rst_email');
  const rstPwd = document.getElementById('rst_pwd');
  const rstPwd2 = document.getElementById('rst_pwd2');
  const rstTitle = document.getElementById('rst_title');
  const rstHint = document.getElementById('rst_hint');
  const rstBtn = document.getElementById('rst_btn');
  if (rstErr) rstErr.style.display = 'none';
  if (rstOk) rstOk.style.display = 'none';
  // Solo resetear el estado si NO estamos en recovery activo
  if (!window._inPasswordRecovery) {
    if (rstEmail) { rstEmail.value = ''; rstEmail.style.display = ''; }
    const pwdWrap = document.getElementById('rst_pwd_wrap');
    const pwd2Wrap = document.getElementById('rst_pwd2_wrap');
    if (pwdWrap) pwdWrap.style.display = 'none';
    if (pwd2Wrap) pwd2Wrap.style.display = 'none';
    if (rstPwd) { rstPwd.value = ''; rstPwd.type = 'password'; }
    if (rstPwd2) { rstPwd2.value = ''; rstPwd2.type = 'password'; }
    if (rstTitle) rstTitle.textContent = '🔒 Recuperar contraseña';
    if (rstHint) rstHint.textContent = 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña';
    if (rstBtn) rstBtn.textContent = '🔒 Enviar enlace de recuperación';
  }
};

// Flujo de 2 fases con magic link:
//   Fase 1: usuario ingresa email → se envía enlace con token de recovery
//   Fase 2: usuario hace click en enlace → landing → introduce nueva pwd
// El flag window._inPasswordRecovery lo setea el listener PASSWORD_RECOVERY
// en auth.js initAuth, al detectar que la sesión actual es tipo 'recovery'.
window.resetPassword = async function() {
  const errEl = document.getElementById('rst_err');
  const okEl = document.getElementById('rst_ok');
  const btn = document.getElementById('rst_btn');
  const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } if (okEl) okEl.style.display = 'none'; };
  const showOk = (msg) => { if (okEl) { okEl.textContent = msg; okEl.style.display = 'block'; } if (errEl) errEl.style.display = 'none'; };

  const SBc = SB();

  // ── FASE 2: setear nueva contraseña (usuario vino del magic link) ──
  if (window._inPasswordRecovery) {
    const pwd = (document.getElementById('rst_pwd')?.value || '').trim();
    const pwd2 = (document.getElementById('rst_pwd2')?.value || '').trim();
    if (!pwd || pwd.length < 6) { showErr('La contraseña debe tener al menos 6 caracteres'); return; }
    if (pwd !== pwd2) { showErr('Las contraseñas no coinciden'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
    try {
      const { error } = await SBc.auth.updateUser({ password: pwd });
      if (error) throw error;
      showOk('✅ Contraseña actualizada. Abriendo tu cuenta...');
      window._inPasswordRecovery = false;
      // La sesión ya está activa tras updateUser → recargar para entrar al dashboard
      setTimeout(() => { location.hash = '#/portafolio'; location.reload(); }, 1500);
    } catch (e) {
      console.error('[resetPassword phase2]', e);
      showErr('Error: ' + (e.message || 'No se pudo actualizar'));
      if (btn) { btn.disabled = false; btn.textContent = '🔒 Guardar nueva contraseña'; }
    }
    return;
  }

  // ── FASE 1: pedir reset por email (magic link) ──
  const email = (document.getElementById('rst_email')?.value || '').trim();
  if (!email || !email.includes('@')) { showErr('Ingresa un email válido'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
  if (errEl) errEl.style.display = 'none';

  try {
    const { error } = await SBc.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + '/',
    });
    // Respuesta intencionalmente uniforme para evitar user enumeration:
    // no confirmamos ni negamos la existencia del email en la plataforma
    if (error) {
      console.warn('[resetPassword] Supabase error (suppressed):', error);
    }
    showOk('📧 Si existe una cuenta registrada con ese email, te enviamos un enlace. Revisa tu bandeja de entrada (y la carpeta de spam). El enlace expira en 1 hora.');
    if (document.getElementById('rst_email')) document.getElementById('rst_email').value = '';
  } catch (e) {
    console.error('[resetPassword phase1]', e);
    // Mantener respuesta uniforme incluso en error de red
    showOk('📧 Si existe una cuenta registrada con ese email, te enviamos un enlace. Revisa tu bandeja (y spam).');
  }
  if (btn) { btn.disabled = false; btn.textContent = '🔒 Enviar enlace de recuperación'; }
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
  // Sin pregunta de rol — crear directo como comprador
  completeEmailReg('comprador');
};

// Registration from landing roles page (with intención pre-selected)
window._registrarConIntencion = async function(intencion) {
  const nombre = (document.getElementById('lr_nombre')?.value || '').trim();
  const email = (document.getElementById('lr_email')?.value || '').trim();
  const pwd = (document.getElementById('lr_pwd')?.value || '').trim();
  const tel = (document.getElementById('lr_tel')?.value || '').trim();
  const errEl = document.getElementById('lr_err');
  const show = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };

  if (!nombre || !email || !pwd) { show('Nombre, email y contraseña son obligatorios'); return; }
  if (pwd.length < 4) { show('La contraseña debe tener al menos 4 caracteres'); return; }
  if (!email.includes('@')) { show('Ingresa un email válido'); return; }

  if (errEl) errEl.style.display = 'none';

  try {
    const { data: existing } = await SB().from('usuarios').select('id,activo').eq('email', email).maybeSingle();
    if (existing?.activo) { show('Este email ya está registrado. Inicia sesión.'); return; }

    const h2 = await window.hashPwd(pwd);
    const usuario = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const perfilesMap = { comprador: ['comprador'], vendedor: ['vendedor'], comisionista: ['comisionista'], arriendo_admin: ['vendedor'], arriendo_pub: ['vendedor'] };
    const perfiles = perfilesMap[intencion] || ['comprador'];
    const puedePublicar = intencion !== 'comprador';

    if (existing && !existing.activo) {
      await SB().from('usuarios').update({ activo: true, nombre, password_hash: h2, telefono_contacto: tel || null, perfiles_publicos: perfiles, intencion_registro: intencion, puede_publicar: puedePublicar }).eq('id', existing.id);
      const userData = { id: existing.id, email, nombre, rol: 'asesor', foto: '', usuario, telefono_contacto: tel || '', es_gestor_arriendos: false, tipo_usuario: 'publico', token: 'cred:' + usuario + ':' + h2, puede_publicar: puedePublicar, puede_referir: true, perfiles_publicos: perfiles };
      window.userStore.set(userData);
    } else {
      const { data: newUser, error } = await SB().from('usuarios').insert({
        email, nombre, foto: null, rol: 'asesor', tipo_usuario: 'publico', activo: true,
        usuario, password_hash: h2, telefono_contacto: tel || null,
        puede_publicar: puedePublicar, puede_referir: true,
        perfiles_publicos: perfiles, intencion_registro: intencion
      }).select().single();
      if (error) {
        if (/intencion_registro/i.test(error.message)) {
          // Column doesn't exist yet — retry without it
          const { data: newUser2, error: e2 } = await SB().from('usuarios').insert({
            email, nombre, foto: null, rol: 'asesor', tipo_usuario: 'publico', activo: true,
            usuario, password_hash: h2, telefono_contacto: tel || null,
            puede_publicar: puedePublicar, puede_referir: true, perfiles_publicos: perfiles
          }).select().single();
          if (e2) throw e2;
          const userData = { id: newUser2.id, email, nombre, rol: 'asesor', foto: '', usuario, telefono_contacto: tel || '', es_gestor_arriendos: false, tipo_usuario: 'publico', token: 'cred:' + usuario + ':' + h2, puede_publicar: puedePublicar, puede_referir: true, perfiles_publicos: perfiles };
          window.userStore.set(userData);
        } else throw error;
      } else {
        const userData = { id: newUser.id, email, nombre, rol: 'asesor', foto: '', usuario, telefono_contacto: tel || '', es_gestor_arriendos: false, tipo_usuario: 'publico', token: 'cred:' + usuario + ':' + h2, puede_publicar: puedePublicar, puede_referir: true, perfiles_publicos: perfiles };
        window.userStore.set(userData);
      }
    }

    // Notify admin with clear intention
    const descMap = { comprador: 'Busca inmueble para comprar o arrendar.', vendedor: 'Quiere vender su inmueble propio.', comisionista: 'Comisionista. Va a publicar inmuebles de terceros.', arriendo_admin: 'Quiere administración completa de arriendo. Contactar para visita.', arriendo_pub: 'Quiere publicación en portales ($100K/mes). Contactar para fotos.' };
    await window.noti('registro_externo', 'info', '👤 ' + nombre + ' — ' + (intencion || 'comprador'), (descMap[intencion] || '') + ' Tel: ' + (tel || 'sin tel'), null, 'admin', null);

    window._landingIntencion = null;
    if (typeof window.sApp === 'function') window.sApp();
    window.go('portafolio');
    if (typeof window.load === 'function') window.load();
    window.toast('✅ ¡Cuenta creada! Bienvenido a House.');
  } catch(e) {
    console.error('[_registrarConIntencion]', e);
    show('Error: ' + (e.message || 'No se pudo crear la cuenta'));
  }
};

window.completeEmailReg = async function(tipo) {
  const reg = window._pendingReg;
  if (!reg) return;
  const modal = document.getElementById('onbModal');
  if (modal) modal.innerHTML = '<div class="onb-box" style="padding:40px"><div style="font-size:32px;margin-bottom:10px">⏳</div><div style="font-size:13px;color:var(--sub)">Creando tu cuenta...</div></div>';

  try {
    const quierePublicar = tipo === 'vendedor';
    const perfiles = quierePublicar ? ['comprador','vendedor'] : ['comprador'];

    const { data: newUser, error } = await SB().from('usuarios').insert({
      email: reg.email, nombre: reg.nombre, foto: reg.foto || null,
      rol: 'asesor', tipo_usuario: 'publico', activo: true,
      usuario: reg.usuario, password_hash: reg.pwd_hash,
      telefono_contacto: reg.tel || null,
      puede_publicar: quierePublicar, puede_referir: true,
      perfiles_publicos: perfiles
    }).select().single();
    if (error) throw error;

    const notiTitulo = quierePublicar ? '👤 Nuevo usuario (quiere publicar)' : '👤 Nuevo usuario registrado';
    await window.noti('registro_externo', 'info', notiTitulo, reg.nombre + ' (' + reg.email + ') se registró' + (quierePublicar ? ' — quiere publicar inmuebles' : ''), null, 'admin', null);
    if (window.notificarPerfilNuevo) window.notificarPerfilNuevo(newUser.id, quierePublicar ? 'vendedor' : 'comprador').catch(e=>console.warn('[notifPerfilNuevo]',e));

    // Log in
    const userData = {
      id: newUser.id, email: newUser.email, nombre: newUser.nombre,
      rol: newUser.rol, foto: newUser.foto || '', usuario: newUser.usuario || '',
      telefono_contacto: newUser.telefono_contacto || '', es_gestor_arriendos: false,
      tipo_usuario: newUser.tipo_usuario, token: 'cred:' + newUser.usuario + ':' + reg.pwd_hash,
      puede_publicar: newUser.puede_publicar || false, puede_referir: newUser.puede_referir !== false,
      perfiles_publicos: newUser.perfiles_publicos || []
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
  // Sin pregunta de rol — crear directo como comprador
  const { email, nombre, foto } = googlePayload;
  selectProfile('comprador', email, nombre, foto);
};

window.selectProfile = async function(tipo, email, nombre, foto) {
  const modal = document.getElementById('onbModal');
  if (modal) modal.innerHTML = '<div class="onb-box" style="padding:40px"><div style="font-size:32px;margin-bottom:10px">⏳</div><div style="font-size:13px;color:var(--sub)">Creando tu cuenta...</div></div>';
  const quierePublicar = tipo === 'vendedor';
  const perfiles = quierePublicar ? ['comprador','vendedor'] : ['comprador'];
  try {
    // Check if user already exists (could be inactive)
    const { data: existingUser } = await SB().from('usuarios').select('*').eq('email', email).single();
    if (existingUser) {
      // Reactivate existing user (preserve interno tipo)
      const keepTipo = existingUser.tipo_usuario === 'interno' ? 'interno' : 'publico';
      await SB().from('usuarios').update({ activo: true, tipo_usuario: keepTipo, foto: foto || existingUser.foto }).eq('id', existingUser.id);
      const userData = { id: existingUser.id, email, nombre: existingUser.nombre, rol: existingUser.rol || 'asesor', foto: foto || existingUser.foto || '', usuario: existingUser.usuario || '', telefono_contacto: existingUser.telefono_contacto || '', es_gestor_arriendos: existingUser.es_gestor_arriendos || false, tipo_usuario: keepTipo, token: 'google:' + email, puede_publicar: existingUser.puede_publicar || false, puede_referir: existingUser.puede_referir !== false, perfiles_publicos: existingUser.perfiles_publicos || [] };
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
      rol: 'asesor', tipo_usuario: 'publico', activo: true,
      usuario: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,''),
      puede_publicar: quierePublicar, puede_referir: true,
      perfiles_publicos: perfiles
    }).select().single();
    if (error) throw error;

    const notiTitulo = quierePublicar ? '👤 Nuevo usuario (quiere publicar)' : '👤 Nuevo usuario registrado';
    await window.noti('registro_externo', 'info', notiTitulo, nombre + ' (' + email + ') se registró' + (quierePublicar ? ' — quiere publicar inmuebles' : ''), null, 'admin', null);
    if (window.notificarPerfilNuevo) window.notificarPerfilNuevo(newUser.id, quierePublicar ? 'vendedor' : 'comprador').catch(e=>console.warn('[notifPerfilNuevo]',e));

    // Log in the new user
    const userData = {
      id: newUser.id, email: newUser.email, nombre: newUser.nombre,
      rol: newUser.rol, foto: newUser.foto || '', usuario: newUser.usuario || '',
      telefono_contacto: '', es_gestor_arriendos: false,
      tipo_usuario: newUser.tipo_usuario, token: 'google:' + email,
      puede_publicar: newUser.puede_publicar || false, puede_referir: newUser.puede_referir !== false,
      perfiles_publicos: newUser.perfiles_publicos || []
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

// --- Compartir inmueble ---
// MOVIDO a src/domains/sharing/index.js

// --- Favoritos ---
// MOVIDO a src/domains/favoritos/index.js
// Sigue disponible en window.toggleFavorito, window.toggleFavFilter,
// window._favFilterActive y window.FAVS para compat con onclick inline
// y con el resto del CRM.

// --- Request upgrade to asesor externo ---
window.requestUpgrade = async function() {
  const u = U(); if (!u) return;
  const desc = prompt('Cuéntanos sobre ti (ej: "Soy propietario con 2 aptos en Pinares" o "Soy inmobiliaria XYZ")');
  if (!desc) return;
  try {
    await SB().from('registro_solicitudes').insert({ usuario_id: u.id, tipo_solicitado: 'vendedor', estado: 'pendiente', descripcion: desc });
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
    d.area_total = parseFloat(document.getElementById('ow_areatot')?.value) || 0;
    d.estrato = parseInt(document.getElementById('ow_est')?.value) || 0;
    d.parqueaderos = parseInt(document.getElementById('ow_parq')?.value) || 0;
    d.descripcion_cliente = document.getElementById('ow_desc')?.value || '';
    // amenidades already saved in d._amenidades via onclick
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
      <button style="width:100%;padding:14px;border:none;border-radius:10px;font-size:14px;font-weight:700;background:#25d366;color:#fff;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px" onclick="window.open('https://wa.me/${HOUSE_PHONE}?text=${waMsg}','_blank')">📲 Contactar para activar</button>
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

    // Auto-moderación PII (Fase 1): analiza la descripción antes de guardar.
    const _modReport = analyzeContent(d.descripcion_cliente || '');

    const pubTipo = window._publicacionTipo || 'vendedor';
    const _basePayload = {
      tipo: d.tipo, negociacion: d.negociacion, ciudad: d.ciudad,
      direccion: d.direccion, barrio: d.barrio, direccion_publica: d.barrio + ', ' + d.ciudad,
      precio_venta: d.precio_venta || 0, precio_arriendo: d.precio_arriendo || 0,
      habitaciones: d.habitaciones || 0, banos: d.banos || 0,
      area_construida: d.area_construida || 0, area_total: d.area_total || 0,
      estrato: d.estrato || 0,
      parqueaderos: d.parqueaderos || 0, descripcion_cliente: d.descripcion_cliente || '',
      caracteristicas: (d._amenidades || []).join(', '),
      captador_id: u.id, origen: 'externo', estado_revision: 'en_revision',
      estado: 'Disponible', codigo_house: code, eliminado: false
    };
    // Graceful: add publicado_por_tipo + comisionista_id if columns exist
    try { _basePayload.publicado_por_tipo = pubTipo; } catch(e) {}
    if (pubTipo === 'comisionista') { try { _basePayload.comisionista_id = u.id; } catch(e) {} }
    let { data: newInm, error } = await SB().from('inmuebles')
      .insert({ ..._basePayload, alertas_moderacion: _modReport })
      .select('id').single();
    // Si la migración SQL #19 aún no corrió, la columna no existe →
    // reintentamos sin ella para no romper el flujo de publicación.
    if (error && /alertas_moderacion/i.test(error.message || '')) {
      console.warn('[ownerPublish] columna alertas_moderacion no existe');
      ({ data: newInm, error } = await SB().from('inmuebles')
        .insert(_basePayload).select('id').single());
    }
    if (error && /publicado_por_tipo|comisionista_id/i.test(error.message || '')) {
      delete _basePayload.publicado_por_tipo; delete _basePayload.comisionista_id;
      ({ data: newInm, error } = await SB().from('inmuebles')
        .insert({ ..._basePayload, alertas_moderacion: _modReport }).select('id').single());
      if (error && /alertas_moderacion/i.test(error.message || '')) {
        ({ data: newInm, error } = await SB().from('inmuebles').insert(_basePayload).select('id').single());
      }
    }
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
    // Set puede_publicar + add vendedor profile
    const upd = { puede_publicar: true };
    const { data: usr } = await SB().from('usuarios').select('nombre,email,tipo_usuario,perfiles_publicos').eq('id', userId).single();
    const perfiles = usr?.perfiles_publicos || [];
    if (!perfiles.includes('vendedor')) { perfiles.push('vendedor'); upd.perfiles_publicos = perfiles; }
    await SB().from('usuarios').update(upd).eq('id', userId);
    await SB().from('registro_solicitudes').update({ estado: 'aprobado' }).eq('usuario_id', userId).eq('estado', 'pendiente');
    await window.noti('registro_aprobado', 'verde', '✅ Tu solicitud fue aprobada', 'Ya puedes publicar tus inmuebles en House.', usr?.email, null, null);
    // HOOK: notificar a admins que hay un perfil nuevo aprobado (vendedor)
    if (window.notificarPerfilNuevo) {
      window.notificarPerfilNuevo(userId, 'vendedor').catch(e => console.warn('[notifPerfilNuevo]', e));
    }
    window.toast('✅ Registro aprobado · puede publicar');
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) { console.error('[aprobarRegistro]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// Toggle puede_publicar for any user (admin action)
window.togglePublicar = async function(userId, nuevoValor) {
  try {
    await SB().from('usuarios').update({ puede_publicar: nuevoValor }).eq('id', userId);
    window.toast(nuevoValor ? '✅ Puede publicar' : '🔒 Publicación deshabilitada');
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) { console.error('[togglePublicar]', e); window.toast('Error: ' + e.message, 'terr'); }
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
    const { data: inm } = await SB().from('inmuebles').select('tipo,ciudad,captador_id,captador:usuarios!captador_id(nombre,email)').eq('id', inmId).single();
    const capEmail = inm?.captador?.email || '';
    await window.noti('inmueble_aprobado', 'verde', '✅ Tu inmueble fue aprobado', 'Tu ' + (inm?.tipo||'inmueble') + ' en ' + (inm?.ciudad||'') + ' ya está publicado.', capEmail, null, inmId);
    await window.noti('inmueble_aprobado', 'verde', '✅ Inmueble externo aprobado', (inm?.captador?.nombre||'Propietario') + ': ' + (inm?.tipo||'') + ' en ' + (inm?.ciudad||''), null, 'admin', inmId);
    if (inm?.captador_id) await window.mensajeDeNegocio({ inmuebleId: inmId, clienteId: inm.captador_id, contextoTipo: 'moderacion', tipoMensaje: 'sistema', texto: '✅ Tu ' + (inm?.tipo||'inmueble') + ' en ' + (inm?.ciudad||'') + ' fue aprobado y ya está publicado.' });
    // HOOK: notificar a compradores que hay un inmueble nuevo (genérico — todos los compradores)
    if (window.notificarInmuebleNuevo) {
      window.notificarInmuebleNuevo(inmId).catch(e => console.warn('[notifInmNuevo]', e));
    }
    // HOOK: sugerencias personalizadas (sólo a compradores con match >= 60)
    if (window.sugerirInmuebleNuevo) {
      window.sugerirInmuebleNuevo(inmId).then(r => {
        if (r?.sugeridos > 0) console.log('[sugerir] ' + r.sugeridos + ' sugerencias emitidas');
      }).catch(e => console.warn('[sugerir]', e));
    }
    window.toast('✅ Inmueble aprobado y publicado');
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) { console.error('[aprobarInmuebleExterno]', e); window.toast('Error: ' + e.message, 'terr'); }
};

window.rechazarInmuebleExterno = async function(inmId) {
  const motivo = prompt('Motivo del rechazo:');
  if (!motivo) return;
  try {
    await SB().from('inmuebles').update({ estado_revision: 'rechazado' }).eq('id', inmId);
    const { data: inm } = await SB().from('inmuebles').select('tipo,ciudad,captador_id,captador:usuarios!captador_id(nombre,email)').eq('id', inmId).single();
    await window.noti('inmueble_rechazado', 'rojo', '❌ Tu inmueble fue rechazado', 'Tu ' + (inm?.tipo||'') + ' en ' + (inm?.ciudad||'') + '. Motivo: ' + motivo, inm?.captador?.email, null, inmId);
    if (inm?.captador_id) await window.mensajeDeNegocio({ inmuebleId: inmId, clienteId: inm.captador_id, contextoTipo: 'moderacion', tipoMensaje: 'declinacion', texto: 'Tu ' + (inm?.tipo||'inmueble') + ' en ' + (inm?.ciudad||'') + ' no fue aprobado. Motivo: ' + motivo });
    window.toast('❌ Inmueble rechazado');
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) { console.error('[rechazarInmuebleExterno]', e); window.toast('Error: ' + e.message, 'terr'); }
};

// --- Fase 2: Pedir cambios sobre inmueble en revisión ---
// Abre un modal con checkboxes pre-seleccionados a partir de las
// alertas detectadas por el moderador (Fase 1) + textarea para motivos
// libres. Al enviar, deja el inmueble en estado_revision='cambios_solicitados'
// y notifica al captador con el detalle.
window.abrirPedirCambios = function(inmId) {
  const old = document.getElementById('pcDlg'); if (old) old.remove();
  const reportRaw = document.getElementById('pc-data-' + inmId)?.dataset?.alertas || '[]';
  let alertas = [];
  try { alertas = JSON.parse(reportRaw); } catch(e) {}

  // Agrupa alertas por tipo para no listar 5 checkboxes idénticos.
  const tipos = {};
  alertas.forEach(a => {
    if (!tipos[a.tipo]) tipos[a.tipo] = { label: a.label, emoji: a.emoji, count: 0 };
    tipos[a.tipo].count++;
  });

  const checks = Object.entries(tipos).map(([tipo, info]) =>
    `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--cd2);border:1.5px solid var(--brd);border-radius:8px;margin-bottom:6px;cursor:pointer;font-size:13px">
      <input type="checkbox" class="pc-chk" data-label="Eliminar ${info.label.toLowerCase()}${info.count>1?' ('+info.count+' encontrad'+(info.count>1?'as':'a')+')':''}" checked style="width:16px;height:16px;cursor:pointer">
      <span style="font-size:16px">${info.emoji}</span>
      <span style="flex:1;font-weight:600">Eliminar ${info.label.toLowerCase()}</span>
      ${info.count > 1 ? `<span style="font-size:10px;font-weight:700;background:var(--redbg);color:var(--red);padding:2px 7px;border-radius:10px">${info.count}</span>` : ''}
    </label>`
  ).join('');

  const html = `<div id="pcDlg" style="position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)this.remove()">
    <div style="background:var(--cd);border-radius:16px;padding:24px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--goldbg);display:flex;align-items:center;justify-content:center;font-size:18px">📝</div>
        <div style="font-family:Fraunces,serif;font-size:18px;font-weight:800">Pedir cambios al propietario</div>
      </div>
      <div style="font-size:12px;color:var(--sub);margin-bottom:16px">El inmueble vuelve al propietario para que corrija. Recibirá una notificación con el detalle.</div>

      ${alertas.length ? `<div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--sub);margin-bottom:8px">Detectado por el moderador</div>${checks}` : '<div style="font-size:12px;color:var(--sub);padding:12px;background:var(--cd2);border-radius:8px;margin-bottom:12px">No se detectaron alertas automáticas. Escribe abajo qué corregir.</div>'}

      <div style="margin-top:14px">
        <label style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--sub);display:block;margin-bottom:6px">Otros motivos (opcional)</label>
        <textarea id="pcLibre" placeholder="Ej: La foto principal está borrosa, falta indicar si tiene parqueadero..." style="width:100%;min-height:80px;padding:10px 12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;color:var(--tx);background:var(--cd)"></textarea>
      </div>

      <div style="display:flex;gap:8px;margin-top:18px">
        <button onclick="document.getElementById('pcDlg').remove()" style="flex:1;padding:12px;border:1.5px solid var(--brd);border-radius:10px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">Cancelar</button>
        <button onclick="window.pedirCambiosInmuebleExterno('${inmId}')" style="flex:2;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:800;background:var(--gold);color:#fff;cursor:pointer;font-family:inherit">📨 Enviar al propietario</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.pedirCambiosInmuebleExterno = async function(inmId) {
  const dlg = document.getElementById('pcDlg'); if (!dlg) return;
  const checks = Array.from(dlg.querySelectorAll('.pc-chk:checked')).map(c => '• ' + c.dataset.label);
  const libre = (document.getElementById('pcLibre')?.value || '').trim();
  if (!checks.length && !libre) { window.toast('Marca al menos un motivo o escribe el detalle', 'terr'); return; }
  const motivo = [...checks, libre ? '• ' + libre : ''].filter(Boolean).join('\n');
  try {
    await SB().from('inmuebles').update({
      estado_revision: 'cambios_solicitados',
      motivo_cambios: motivo,
      cambios_solicitados_at: new Date().toISOString(),
    }).eq('id', inmId);
    const { data: inm } = await SB().from('inmuebles').select('tipo,ciudad,captador_id,captador:usuarios!captador_id(nombre,email)').eq('id', inmId).single();
    const capEmail = inm?.captador?.email || '';
    await window.noti('inmueble_cambios_solicitados', 'amarillo',
      '📝 Pedimos ajustes en tu inmueble',
      'Tu ' + (inm?.tipo || 'inmueble') + ' en ' + (inm?.ciudad || '') + ' necesita correcciones antes de publicarse:\n\n' + motivo,
      capEmail, null, inmId);
    if (inm?.captador_id) await window.mensajeDeNegocio({ inmuebleId: inmId, clienteId: inm.captador_id, contextoTipo: 'moderacion', tipoMensaje: 'sistema', texto: '⚠️ Tu ' + (inm?.tipo||'inmueble') + ' necesita ajustes antes de publicarse:\n\n' + motivo });
    window.toast('📨 Cambios solicitados al propietario');
    dlg.remove();
    if (typeof window.rUsers === 'function') window.rUsers();
  } catch(e) {
    console.error('[pedirCambiosInmuebleExterno]', e);
    if (/motivo_cambios|cambios_solicitados_at/i.test(e.message || '')) {
      window.toast('Falta correr sql/20-cola-moderacion.sql', 'terr');
    } else {
      window.toast('Error: ' + e.message, 'terr');
    }
  }
};

// ══════════════════════════════════════════════════════════════════
// 19b + 19c. INTERESES + CALIFICAR → MOVIDO a src/domains/leads/index.js
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 19d. CITAS BILATERALES (FASE 5a)
// Captador propone fecha → cliente confirma → cualquiera puede cancelar
// ══════════════════════════════════════════════════════════════════

/**
 * Abre el modal "Proponer cita" desde un interés calificado.
 * Lo usa el captador del inmueble vinculado al interés.
 */
window.proponerCita = async function(interesId) {
  const u = U(); if (!u) return;
  // Cargar interés con relaciones
  const { data: it, error } = await SB().from('intereses_compradores')
    .select('*,inmueble:inmuebles(id,tipo,ciudad,barrio,captador_id),comprador:usuarios!usuario_id(id,nombre,email,telefono_contacto)')
    .eq('id', interesId).single();
  if (error || !it) { window.toast('Interés no encontrado', 'terr'); return; }

  const inm = it.inmueble || {};
  const c = it.comprador || {};
  // Solo el captador del inmueble (o admin) puede proponer
  const esCaptador = inm.captador_id === u.id;
  const esAdmin = u.rol === 'admin';
  if (!esCaptador && !esAdmin) { window.toast('Solo el captador del inmueble puede proponer la cita', 'terr'); return; }

  // Fecha mínima = mañana
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  document.getElementById('citDlg')?.remove();
  const html = `
  <div id="citDlg" class="modal-overlay" style="position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)">
    <div class="card" style="max-width:480px;width:100%;max-height:90vh;overflow:auto;border-radius:14px">
      <div class="cdh"><div class="chl"><div class="chi">📅</div><div><div class="cht">Proponer cita</div><div style="font-size:11px;color:var(--sub);margin-top:2px">${inm.tipo || ''} en ${inm.barrio || inm.ciudad || ''}</div></div></div>
        <button onclick="document.getElementById('citDlg').remove()" style="background:none;border:none;font-size:20px;color:var(--sub);cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div class="cdb" style="padding:18px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:14px;line-height:1.5">Estás proponiéndole una cita a <b>${(window.escapeHtml||String)(c.nombre || 'el cliente')}</b>. Recibirá la propuesta en su sección "Mis citas" y deberá confirmarla.</div>

        <div class="ff" style="margin-bottom:12px">
          <label class="ffl">Fecha <span class="ffr">*</span></label>
          <input id="cit_fecha" type="date" min="${tomorrow}" class="ffi">
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div class="ff" style="flex:1">
            <label class="ffl">Hora inicio <span class="ffr">*</span></label>
            <input id="cit_hi" type="time" class="ffi">
          </div>
          <div class="ff" style="flex:1">
            <label class="ffl">Hora fin <span class="ffr">*</span></label>
            <input id="cit_hf" type="time" class="ffi">
          </div>
        </div>
        <div class="ff" style="margin-bottom:12px">
          <label class="ffl">Punto de encuentro / lugar</label>
          <input id="cit_lugar" type="text" placeholder="Ej: en la portería del edificio" class="ffi">
        </div>
        <div class="ff" style="margin-bottom:14px">
          <label class="ffl">Mensaje al cliente (opcional)</label>
          <textarea id="cit_msg" placeholder="Ej: Te espero 5 minutos antes en la entrada principal..." style="width:100%;min-height:70px;padding:10px 12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;color:var(--tx);background:var(--cd)"></textarea>
        </div>

        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('citDlg').remove()" style="flex:1;padding:12px;border:1.5px solid var(--brd);border-radius:10px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">Cancelar</button>
          <button onclick="window.guardarPropuestaCita('${interesId}')" style="flex:2;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:800;background:var(--b600);color:#fff;cursor:pointer;font-family:inherit">📨 Enviar propuesta</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.guardarPropuestaCita = async function(interesId) {
  const u = U(); if (!u) return;
  const fecha = document.getElementById('cit_fecha')?.value;
  const hi = document.getElementById('cit_hi')?.value;
  const hf = document.getElementById('cit_hf')?.value;
  const lugar = (document.getElementById('cit_lugar')?.value || '').trim();
  const msg = (document.getElementById('cit_msg')?.value || '').trim();
  if (!fecha || !hi || !hf) { window.toast('Completa fecha y horas', 'terr'); return; }
  if (hf <= hi) { window.toast('La hora fin debe ser después de la hora inicio', 'terr'); return; }

  try {
    // Recargar interés (necesitamos inmueble + comprador IDs y datos)
    const { data: it } = await SB().from('intereses_compradores')
      .select('*,inmueble:inmuebles(id,tipo,ciudad,barrio,captador_id),comprador:usuarios!usuario_id(id,nombre,email,telefono_contacto)')
      .eq('id', interesId).single();
    if (!it) throw new Error('Interés no encontrado');
    const inm = it.inmueble || {};
    const c = it.comprador || {};

    const titulo = 'Visita: ' + (inm.tipo || 'inmueble') + ' en ' + (inm.barrio || inm.ciudad || '');
    const notaCompleta = [
      lugar ? '📍 Punto de encuentro: ' + lugar : '',
      msg ? '💬 ' + msg : '',
    ].filter(Boolean).join('\n');

    const { data: cita, error } = await SB().from('agenda').insert({
      usuario_id: inm.captador_id || u.id,  // captador es el dueño
      creado_por: u.id,
      inmueble_id: inm.id,
      cliente_id: c.id || null,
      interes_id: interesId,
      fecha,
      hora_inicio: hi,
      hora_fin: hf,
      tipo_evento: 'visita',
      es_personal: false,
      titulo,
      cliente_nombre: c.nombre || null,
      cliente_telefono: c.telefono_contacto || null,
      nota_admin: notaCompleta || null,
      estado: 'propuesta',
      confirmada_captador_at: new Date().toISOString(),
    }).select('id').single();
    if (error) throw error;

    // Marcar el interés como convertido en cita
    await SB().from('intereses_compradores').update({
      estado: 'convertido_cita', updated_at: new Date().toISOString(),
    }).eq('id', interesId);

    // Notificar al cliente
    if (c.email) {
      const fechaTxt = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday:'long', day:'2-digit', month:'long' });
      await window.noti('cita_propuesta', 'amarillo',
        '📅 Tienes una propuesta de cita',
        'El captador propone visitar el ' + (inm.tipo || 'inmueble') + ' en ' + (inm.barrio || inm.ciudad || '') +
        '\n\n📅 ' + fechaTxt + '\n🕐 ' + hi + ' - ' + hf +
        (lugar ? '\n📍 ' + lugar : '') +
        (msg ? '\n\n💬 ' + msg : '') +
        '\n\nConfirma o cancela en tu sección "Mis citas".',
        c.email, null, inm.id);
    }

    document.getElementById('citDlg')?.remove();
    window.toast('📨 Propuesta enviada al cliente');
    if (typeof window.rCitasInternal === 'function' && location.hash === '#/citas') window.rCitasInternal();
    if (typeof window.rUsers === 'function' && location.hash.startsWith('#/users')) window.rUsers();
  } catch(e) {
    console.error('[guardarPropuestaCita]', e);
    if (/cliente_id|interes_id|confirmada_captador_at/i.test(e.message || '')) {
      window.toast('Falta correr sql/22-citas-bilaterales.sql', 'terr');
    } else {
      window.toast('Error: ' + (e.message || 'desconocido'), 'terr');
    }
  }
};

window.confirmarCitaCliente = async function(citaId) {
  const u = U(); if (!u) return;
  try {
    const { data: cita, error: errLoad } = await SB().from('agenda')
      .select('*,inmueble:inmuebles(tipo,ciudad,barrio,captador:usuarios!captador_id(email,nombre))')
      .eq('id', citaId).single();
    if (errLoad || !cita) throw errLoad || new Error('Cita no encontrada');
    if (cita.cliente_id !== u.id) { window.toast('Esta cita no es tuya', 'terr'); return; }

    const now = new Date().toISOString();
    await SB().from('agenda').update({
      confirmada_cliente_at: now,
      estado: 'confirmada',  // ambos confirmados ya (captador lo hizo al proponer)
    }).eq('id', citaId);

    // TRACK: cita_solicitada (evento máximo de engagement del comprador)
    if (window.trackEvent) {
      const inm = cita.inmueble || {};
      window.trackEvent('cita_solicitada', {
        inmueble_id: cita.inmueble_id,
        ciudad: inm.ciudad, barrio: inm.barrio, tipo_inmueble: inm.tipo,
      });
    }
    // Si era sugerencia activa, conversión máxima
    SB().from('sugerencias_enviadas').update({ resultado: 'convertida', convertida_at: now })
      .eq('usuario_id', u.id).eq('inmueble_id', cita.inmueble_id).neq('resultado', 'convertida')
      .then(() => {}, e => console.warn('[sug conv cita]', e));

    // Notificar al captador
    const capEmail = cita.inmueble?.captador?.email;
    if (capEmail) {
      const fechaTxt = new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday:'long', day:'2-digit', month:'long' });
      await window.noti('cita_confirmada', 'verde',
        '✅ El cliente confirmó la cita',
        (u.nombre || 'El cliente') + ' confirmó la visita al ' + (cita.inmueble?.tipo || 'inmueble') +
        ' en ' + (cita.inmueble?.barrio || cita.inmueble?.ciudad || '') +
        '\n\n📅 ' + fechaTxt + '\n🕐 ' + cita.hora_inicio + ' - ' + cita.hora_fin,
        capEmail, null, cita.inmueble_id);
    }

    window.toast('✅ Cita confirmada');
    if (typeof window.rMisCitas === 'function') window.rMisCitas();
  } catch(e) {
    console.error('[confirmarCitaCliente]', e);
    window.toast('Error: ' + (e.message || 'desconocido'), 'terr');
  }
};

window.abrirCancelarCita = function(citaId) {
  document.getElementById('cancCitDlg')?.remove();
  const html = `
  <div id="cancCitDlg" class="modal-overlay" style="position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)">
    <div class="card" style="max-width:440px;width:100%;border-radius:14px">
      <div class="cdh"><div class="chl"><div class="chi">❌</div><div><div class="cht">Cancelar cita</div></div></div>
        <button onclick="document.getElementById('cancCitDlg').remove()" style="background:none;border:none;font-size:20px;color:var(--sub);cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div class="cdb" style="padding:18px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:14px;line-height:1.5">La otra parte recibirá una notificación con el motivo. Esta acción no se puede deshacer.</div>
        <textarea id="cancCitMot" placeholder="Ej: Tuve un imprevisto, ¿podemos reagendar?" style="width:100%;min-height:90px;padding:10px 12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;color:var(--tx);background:var(--cd);margin-bottom:14px"></textarea>
        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('cancCitDlg').remove()" style="flex:1;padding:12px;border:1.5px solid var(--brd);border-radius:10px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);cursor:pointer;font-family:inherit">Volver</button>
          <button onclick="window._aplicarCancelarCita('${citaId}')" style="flex:2;padding:12px;border:none;border-radius:10px;font-size:13px;font-weight:800;background:var(--red);color:#fff;cursor:pointer;font-family:inherit">❌ Cancelar cita</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window._aplicarCancelarCita = async function(citaId) {
  const u = U(); if (!u) return;
  const motivo = (document.getElementById('cancCitMot')?.value || '').trim();
  if (!motivo) { window.toast('Escribe un motivo', 'terr'); return; }
  try {
    const { data: cita, error: errLoad } = await SB().from('agenda')
      .select('*,inmueble:inmuebles(tipo,ciudad,barrio,captador:usuarios!captador_id(email,nombre)),cliente:usuarios!cliente_id(email,nombre)')
      .eq('id', citaId).single();
    if (errLoad || !cita) throw errLoad || new Error('Cita no encontrada');

    await SB().from('agenda').update({
      estado: 'cancelada',
      motivo_cancelacion: motivo,
      cancelada_por: u.id,
    }).eq('id', citaId);

    // Notificar a la OTRA parte (no a quien canceló)
    const esCliente = cita.cliente_id === u.id;
    const destinoEmail = esCliente ? cita.inmueble?.captador?.email : cita.cliente?.email;
    if (destinoEmail) {
      const fechaTxt = new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday:'long', day:'2-digit', month:'long' });
      await window.noti('cita_cancelada', 'rojo',
        '❌ Se canceló la cita',
        (u.nombre || (esCliente ? 'El cliente' : 'El captador')) + ' canceló la visita al ' +
        (cita.inmueble?.tipo || 'inmueble') + ' del ' + fechaTxt + ' a las ' + cita.hora_inicio +
        '\n\nMotivo: ' + motivo,
        destinoEmail, null, cita.inmueble_id);
    }

    document.getElementById('cancCitDlg')?.remove();
    window.toast('Cita cancelada');
    if (typeof window.rMisCitas === 'function' && location.hash === '#/mis-citas') window.rMisCitas();
    if (typeof window.rCitasInternal === 'function' && location.hash === '#/citas') window.rCitasInternal();
  } catch(e) {
    console.error('[_aplicarCancelarCita]', e);
    window.toast('Error: ' + (e.message || 'desconocido'), 'terr');
  }
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
  const rTipo=receptor?.tipo_usuario==='publico'?'Usuario':'Equipo';
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
    const esCli=u.tipo_usuario==='publico';
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
// 23 + 24. REFERRAL UX + PROGRAM → MOVIDO a src/domains/referrals/index.js
// ══════════════════════════════════════════════════════════════════

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
        <div class="regmx-logo"><img src="/img/logo.png" alt="House" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.textContent='H'"></div>
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
      rol: 'asesor', tipo_usuario: 'publico', activo: true,
      notificaciones_email: optInEmail,
      perfiles_publicos: ['comprador'], puede_publicar: false, puede_referir: true,
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

// ══════════════════════════════════════════════════════════════════
// 30. CIERRES + COMISIONES → MOVIDO a src/domains/cierres/index.js
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// 31. IDENTIFICACIÓN DINÁMICA DE ROLES POR ACCIÓN
// ══════════════════════════════════════════════════════════════════

// ── MOMENTO 1: Al publicar un inmueble ──
window.interceptarPublicacion = function() {
  const u = U();
  if (!u) { window.showAuthPrompt('publicar', { icono: '📝', titulo: 'Publicar inmueble', mensaje: 'Crea tu cuenta gratis para publicar.', beneficios: ['📝 Publica gratis hasta 3 inmuebles', '🔍 Nosotros buscamos compradores', '🔒 Datos protegidos'], cta: 'Crear cuenta gratis', ctaSecundario: 'Ahora no' }); return; }
  if (u.tipo_usuario === 'interno' || !u.tipo_usuario) { window.go('reg'); return; }
  // Navegar a publicar — rPublicar detecta que no hay _publicacionTipo y muestra la pregunta
  window.go('publicar');
};

window._mostrarPreguntaPublicacion = function() {
  const el = document.getElementById('publicarc'); if (!el) return;
  el.innerHTML = `
    <div style="padding:24px 20px;max-width:480px;margin:0 auto">
      <div style="font-size:13px;font-weight:700;letter-spacing:2px;color:#1a4f8b;text-transform:uppercase;margin-bottom:8px">Publicar inmueble</div>
      <div style="font-size:26px;font-weight:800;color:#122d4f;line-height:1.2;margin-bottom:8px">¿De quién es el inmueble?</div>
      <div style="font-size:16px;color:#5a5550;line-height:1.6;margin-bottom:28px">Nosotros le conseguimos el comprador. Tú solo publicas.</div>
      <div id="opt-propietario" onclick="window._seleccionarTipoPublicacion('vendedor')" style="background:#fff;border:2.5px solid #e0ddd8;border-radius:20px;padding:28px 24px;cursor:pointer;margin-bottom:16px;transition:all .25s cubic-bezier(.16,1,.3,1)">
        <div style="font-size:48px;margin-bottom:12px">🏡</div>
        <div style="font-size:20px;font-weight:800;color:#1a1a1a;line-height:1.2;margin-bottom:6px">Es mi propiedad</div>
        <div style="font-size:15px;color:#5a5550;line-height:1.6">Soy el dueño y quiero vender o arrendar mi inmueble.</div>
        <div style="margin-top:10px;padding:8px 12px;background:#10b98112;border-radius:10px;font-size:14px;font-weight:700;color:#065f46">💰 Comisión: 3% solo si se cierra el negocio</div>
      </div>
      <div id="opt-comisionista" onclick="window._seleccionarTipoPublicacion('comisionista')" style="background:#fff;border:2.5px solid #e0ddd8;border-radius:20px;padding:28px 24px;cursor:pointer;margin-bottom:16px;transition:all .25s cubic-bezier(.16,1,.3,1)">
        <div style="font-size:48px;margin-bottom:12px">💼</div>
        <div style="font-size:20px;font-weight:800;color:#1a1a1a;line-height:1.2;margin-bottom:6px">Es de otra persona</div>
        <div style="font-size:15px;color:#5a5550;line-height:1.6">Conozco al dueño y quiero ayudarle a vender o arrendar.</div>
        <div style="margin-top:10px;padding:10px 12px;background:#f59e0b12;border-radius:10px"><div style="font-size:14px;font-weight:700;color:#92400e">💰 Tu comisión: hasta 1.5% del valor de venta</div><div style="font-size:12px;color:#5a5550;margin-top:2px">50% del 3% total. Si hay otro comisionista, se divide entre los participantes.</div></div>
      </div>
      <div style="background:#f0f7ff;border-radius:14px;padding:14px 16px;border:1px solid rgba(26,79,139,.08)">
        <div style="font-size:14px;color:#122d4f;line-height:1.6">🔒 En ambos casos, protegemos la dirección exacta y los datos del propietario.</div>
      </div>
    </div>`;
}

window._seleccionarTipoPublicacion = async function(tipo) {
  window._publicacionTipo = tipo;
  await window.activarPerfilPublico(tipo);
  const optId = tipo === 'vendedor' ? 'opt-propietario' : 'opt-comisionista';
  const color = tipo === 'vendedor' ? '#10b981' : '#f59e0b';
  const el = document.getElementById(optId);
  if (el) { el.style.background = color; el.style.borderColor = color; el.style.transform = 'scale(1.02)'; el.style.boxShadow = '0 8px 24px ' + color + '30'; el.querySelectorAll('div').forEach(d => { if (d.style.color === '#1a1a1a' || d.style.color === 'rgb(26, 26, 26)') d.style.color = '#fff'; if (d.style.color === '#5a5550' || d.style.color === 'rgb(90, 85, 80)') d.style.color = '#ffffffcc'; }); }
  setTimeout(() => _mostrarConfirmacionPublicacion(tipo), 600);
};

function _mostrarConfirmacionPublicacion(tipo) {
  const esProp = tipo === 'vendedor';
  const color = esProp ? '#10b981' : '#f59e0b';
  const emoji = esProp ? '🏡' : '💼';
  const titulo = esProp ? '¡Perfecto!' : '¡Excelente!';
  const sub = esProp ? 'Nosotros le conseguimos el comprador calificado. Nuestro equipo revisa y publica tu inmueble en menos de 12 horas.' : 'Nosotros conseguimos el comprador calificado y coordinamos todo. Tú solo publicas el inmueble.';
  const pasos = esProp
    ? [{ e:'📝',t:'Llenas el formulario con fotos y precio' },{ e:'🔍',t:'Nosotros verificamos que todo esté seguro' },{ e:'✅',t:'Te avisamos cuando esté publicado' },{ e:'👤',t:'Solo te contactamos con compradores calificados' }]
    : [{ e:'📝',t:'Llenas el formulario con lo que sepas del inmueble' },{ e:'🔍',t:'Nosotros verificamos y buscamos compradores' },{ e:'📞',t:'Coordinamos todo con el propietario' },{ e:'💰',t:'Si se cierra, te transferimos tu parte' }];

  const el = document.getElementById('publicarc'); if (!el) return;
  el.innerHTML = `
    <div style="padding:24px 20px;max-width:480px;margin:0 auto">
      <button onclick="window._publicacionTipo=null;window._mostrarPreguntaPublicacion()" style="font-size:14px;color:#1a4f8b;font-weight:700;cursor:pointer;background:none;border:none;padding:0;font-family:inherit">← Cambiar opción</button>
      <div style="text-align:center;margin-top:16px">
        <div style="font-size:56px;margin-bottom:8px">${emoji}</div>
        <div style="font-size:22px;font-weight:800;color:${color}">${titulo}</div>
        <div style="font-size:16px;color:#5a5550;margin-top:8px;line-height:1.6">${sub}</div>
      </div>
      <div style="margin-top:24px;display:flex;flex-direction:column;gap:12px">
        ${pasos.map(p => '<div style="display:flex;gap:12px;align-items:center"><div style="width:44px;height:44px;border-radius:12px;background:' + color + '12;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">' + p.e + '</div><div style="font-size:15px;color:#1a1a1a;line-height:1.5">' + p.t + '</div></div>').join('')}
      </div>
      <div style="margin-top:20px;padding:16px;border-radius:14px;background:${color}12;border:2px solid ${color}30;text-align:center">
        <div style="font-size:13px;font-weight:700;color:${esProp ? '#065f46' : '#92400e'};margin-bottom:4px">${esProp ? '💰 COMISIÓN TRANSPARENTE' : '💰 TU COMISIÓN'}</div>
        <div style="font-size:28px;font-weight:900;color:${color}">${esProp ? '3%' : 'Hasta 1.5%'}</div>
        <div style="font-size:14px;color:#5a5550;margin-top:4px;line-height:1.5">${esProp ? 'Solo si se cierra el negocio. Si no se vende, no pagas nada.' : 'Del valor de venta. Solo si se cierra el negocio.'}</div>
        ${!esProp ? '<div style="margin-top:10px;padding:12px;background:#fff;border-radius:10px;border:1px solid #f59e0b30;text-align:left"><div style="font-size:14px;font-weight:800;color:#92400e;margin-bottom:8px">💰 Ejemplo con inmueble de $300.000.000:</div><div style="font-size:13px;color:#1a1a1a;line-height:1.8"><div>Comisión total (3%): <b>$9.000.000</b></div><div>🏢 House se queda con: <b>$4.500.000</b> (1.5%)</div><div>🤝 Tú recibes: <b>$4.500.000</b> (1.5%)</div></div><div style="margin-top:8px;padding:8px;background:#f0f0f0;border-radius:8px;font-size:12px;color:#5a5550;line-height:1.5">💡 Si otro comisionista trae al comprador, la comisión se reparte entre 3:<br>🏢 House: 1.5% · 🤝 Tú: 0.75% · 🤝 Otro: 0.75%<br><span style="color:#92400e;font-weight:700">La distribución final la configura el admin al cerrar.</span></div></div>' : ''}
      </div>
      <button onclick="window._ownerStep=1;window._ownerData={};rPublicar()" style="width:100%;padding:18px;border-radius:16px;border:none;background:${color};color:#fff;font-size:17px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px ${color}30;margin-top:16px;font-family:inherit">📝 Comenzar a publicar</button>
    </div>`;
}

// ── MOMENTO 2: Al mostrar interés en un inmueble ──
// (Se integra dentro de abrirInteres — ver modificación abajo)

// ══════════════════════════════════════════════════════════════════
// 31b. MENSAJES VINCULADOS A NEGOCIOS
// ══════════════════════════════════════════════════════════════════

/**
 * Envía un mensaje vinculado a un negocio/inmueble con contexto.
 * Se llama desde cada acción admin (aprobar, rechazar, calificar, declinar, cita, cerrar, pagar).
 *
 * @param {Object} opts
 * @param {string} opts.inmuebleId - UUID del inmueble
 * @param {string} opts.clienteId - UUID del receptor (cliente público)
 * @param {string} opts.contextoTipo - 'moderacion'|'interes'|'cita'|'negocio'
 * @param {string} opts.tipoMensaje - 'sistema'|'declinacion'|'texto'
 * @param {string} opts.texto - Contenido del mensaje
 */
window.mensajeDeNegocio = async function(opts) {
  const u = U(); if (!u) return;
  const { inmuebleId, clienteId, contextoTipo, tipoMensaje, texto } = opts;
  if (!clienteId || !texto) return;
  const convId = [u.id, clienteId].sort().join('_') + (inmuebleId ? '_' + inmuebleId : '');
  try {
    const row = {
      conversacion_id: convId,
      emisor_id: u.id,
      receptor_id: clienteId,
      inmueble_id: inmuebleId || null,
      texto,
      contexto_tipo: contextoTipo || null,
      contexto_id: inmuebleId || null,
      tipo_mensaje: tipoMensaje || 'texto',
    };
    const { error } = await SB().from('mensajes').insert(row);
    if (error && /contexto_tipo|contexto_id|tipo_mensaje/i.test(error.message)) {
      // Graceful: columns don't exist yet
      delete row.contexto_tipo; delete row.contexto_id; delete row.tipo_mensaje;
      await SB().from('mensajes').insert(row);
    } else if (error) {
      console.warn('[mensajeDeNegocio]', error.message);
    }
  } catch(e) { console.error('[mensajeDeNegocio]', e); }
};

console.log('[functions] ✅ All window functions registered');
