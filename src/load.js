/**
 * HOUSE CRM — Data Loader
 *
 * Central load() function that fetches ALL data from Supabase
 * and distributes it to the stores + legacy window globals.
 *
 * Replaces the original monolithic load() function.
 */

import { getSupabaseClient } from './config/supabase.js';
import { HOUSE_PHONE } from './core/constants.js';
import { ensureSearchIndex as _ensureSearchIndex } from './domains/inmuebles/search.js';
import { render } from './domains/inmuebles/cards.js';

// ─── Helpers ─────────────────────────────────────────────────────

function diasDesde(f) {
  if (!f) return 999;
  return Math.floor((Date.now() - new Date(f).getTime()) / 864e5);
}

// Índice de búsqueda MOVIDO a src/domains/inmuebles/search.js
// (_searchNorm / _buildSearchIndex / _ensureSearchIndex siguen en window.*)

function fm(n) {
  return n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : '';
}

function emo(t) {
  t = (t || '').toLowerCase();
  if (t.includes('penthouse')) return '👑';
  if (t.includes('campestre')) return '🌿';
  if (t.includes('finca')) return '🌾';
  if (t.includes('apartaestudio') || t.includes('aparta-estudio') || t.includes('aparta estudio')) return '🏬';
  if (t.includes('apto') || t.includes('apartamento')) return '🏢';
  if (t.includes('casa')) return '🏡';
  if (t.includes('local')) return '🏪';
  if (t.includes('oficina')) return '💼';
  if (t.includes('lote')) return '🌳';
  if (t.includes('bodega')) return '🏭';
  return '🏠';
}

function eV(p) { return (p.negociacion || '').toLowerCase().includes('venta'); }
function eA(p) { const n = (p.negociacion || '').toLowerCase(); return n.includes('arriendo') || n.includes('renta'); }
function eA2(p) { return eV(p) && eA(p); }

// ─── Status bar ──────────────────────────────────────────────────

function sSt(t, m) {
  const e = document.getElementById('stbdg');
  if (!e) return;
  e.className = 'sb ' + (t === 'ok' ? 'sbok' : t === 'err' ? 'sber' : 'sbld');
  e.innerHTML = t === 'load' ? '<em class="sbsp">⟳</em> ' + m : m;
}

function uB(id, n) {
  const e = document.getElementById(id);
  if (!e) return;
  if (n > 0) { e.textContent = n; e.style.display = 'inline-flex'; }
  else e.style.display = 'none';
}

function uSt() {
  const FINAL = window.FINAL_STATES || ['Arrendado', 'Vendido', 'Retirado'];
  const D = (window.D || []).filter(p => !FINAL.includes(p.estado));
  const t = D.length, v = D.filter(p => eV(p) && !eA2(p)).length, a = D.filter(p => eA(p) && !eA2(p)).length, b = D.filter(p => eA2(p)).length;
  // Hidden legacy
  const hst = document.getElementById('hst'); if (hst) hst.textContent = t;
  const hsv = document.getElementById('hsv'); if (hsv) hsv.textContent = v;
  const hsa = document.getElementById('hsa'); if (hsa) hsa.textContent = a;
  const hsb = document.getElementById('hsb'); if (hsb) hsb.textContent = b;
  // Visible header stats
  const hst2 = document.getElementById('hst2'); if (hst2) hst2.textContent = t;
  const hsv2 = document.getElementById('hsv2'); if (hsv2) hsv2.textContent = v;
  const hsa2 = document.getElementById('hsa2'); if (hsa2) hsa2.textContent = a;
  const hsb2 = document.getElementById('hsb2'); if (hsb2) hsb2.textContent = b;
}

// ─── Welcome banner ──────────────────────────────────────────────

function renderWelcome() {
  const U = window.userStore?.get();
  const FINAL = window.FINAL_STATES || ['Arrendado', 'Vendido', 'Retirado'];
  const D = (window.D || []).filter(p => !FINAL.includes(p.estado));
  if (!U || !D.length) return;

  const el = document.getElementById('wban');
  if (!el) return;

  const my = D.filter(p => p.captador_id === U.id);
  const pendVer = my.filter(p => p.estado === 'Verificar Disponibilidad').length;
  const risk = my.filter(p => diasDesde(p.fecha_estado) > 15).length;
  const fresh = my.filter(p => diasDesde(p.fecha_estado) <= 7).length;
  const pct = my.length > 0 ? Math.round(fresh / my.length * 100) : 100;

  let tasks = [];
  if (pendVer > 0) tasks.push(`<span class="wban-t urg" onclick="go('mis')">🔍 ${pendVer} verificación(es) pendiente(s)</span>`);
  if (risk > 0) tasks.push(`<span class="wban-t wrn" onclick="go('mis')">⚠️ ${risk} inmueble(s) necesitan atención</span>`);
  tasks.push(`<span class="wban-t ${pct >= 80 ? 'ok' : 'wrn'}">${pct >= 80 ? '✅' : '📊'} Portafolio ${pct}% al día</span>`);

  const h2 = new Date().getHours();
  const sal = h2 < 12 ? 'Buenos días' : h2 < 18 ? 'Buenas tardes' : 'Buenas noches';

  // Show as floating toast that auto-hides
  const _eh=window.escapeHtml||(s=>String(s||''));
  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><div style="font-size:13px;font-weight:700;color:var(--tx)">${sal}, ${_eh(U.nombre.split(' ')[0])} 👋</div><div style="font-size:10px;color:var(--sub)">· ${my.length} inmuebles${pendVer > 0 ? ' · ' + pendVer + ' pendientes' : ''}</div></div>`;
  el.style.cssText = 'display:block;position:fixed;top:58px;left:50%;transform:translateX(-50%);z-index:89;max-width:90%;width:auto;padding:8px 18px;background:var(--cd);border:1px solid var(--brd);border-radius:20px;box-shadow:0 4px 16px rgba(0,0,0,.1);animation:fi .3s';
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .5s'; setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; el.style.transition = ''; el.style.position = ''; el.style.top = ''; el.style.left = ''; el.style.transform = ''; el.style.zIndex = ''; el.style.maxWidth = ''; el.style.width = ''; el.style.padding = ''; el.style.background = ''; el.style.border = ''; el.style.borderRadius = ''; el.style.boxShadow = ''; }, 500); }, 3000);
}

// ─── Render inventory list ───────────────────────────────────────
// render(ls) MOVIDO a src/domains/inmuebles/cards.js
// (sigue expuesto en window.render; filters.doSearch lo llama)
//
// El doSearch local (fallback simplificado) también se removió — la
// versión completa vive en src/domains/inmuebles/filters.js.

// ─── Main load function ──────────────────────────────────────────

/**
 * Load public inventory for visitors and external users.
 * Limited fields, no internal data.
 */
export async function loadPublic(limit) {
  const SB = getSupabaseClient();
  try {
    let q = SB.from('inmuebles')
      .select('id,tipo,negociacion,ciudad,barrio,direccion_publica,precio_venta,precio_arriendo,habitaciones,banos,area_construida,estrato,codigo_house,descripcion_cliente,estado,origen,captador_id,estado_revision,created_at,captador:usuarios!captador_id(id,nombre,telefono_contacto),fotos(url,url_thumb,orden)')
      .eq('eliminado', false)
      .eq('estado_revision', 'aprobado')
      .in('estado', ['Disponible', 'Aún Disponible'])
      .order('created_at', { ascending: false });
    if (limit) q = q.limit(limit);
    const { data } = await q;
    window.PUB = data || [];
    return window.PUB;
  } catch(e) {
    console.error('[loadPublic]', e);
    window.PUB = [];
    return [];
  }
}
window.loadPublic = loadPublic;
window.PUB = [];

export async function load() {
  const U = window.userStore?.get();
  if (!U) {
    console.warn('[load] No user session, skipping data load');
    return;
  }

  // Public users: load public data into window.D so CRM UI works
  const tipoU2 = U.tipo_usuario || 'interno';
  if (tipoU2 === 'publico') {
    const pubData = await loadPublic();
    // Feed public data into the same window.D used by CRM render/filters
    window.D = pubData || [];
    window.D.forEach(p => { p._dias = diasDesde(p.fecha_estado || p.created_at); });
    _ensureSearchIndex(window.D);
    window.MIS = window.D.filter(p => p.captador_id === U.id);
    window.SOL = []; window.USERS = []; window.ALS = []; window.ALU = [];
    // Load favorites
    try {
      const { data: favs } = await getSupabaseClient().from('favoritos').select('inmueble_id').eq('usuario_id', U.id);
      window.FAVS = (favs || []).map(f => f.inmueble_id);
    } catch(e) { window.FAVS = []; }
    // Load unread message count
    try {
      const { count } = await getSupabaseClient().from('mensajes').select('id', { count: 'exact', head: true }).eq('receptor_id', U.id).eq('leido', false);
      const msgB = document.getElementById('msgBadge');
      if (msgB) { if (count > 0) { msgB.textContent = count; msgB.style.display = 'inline-flex'; } else msgB.style.display = 'none'; }
    } catch(e) {}
    // Load referidos badge count
    try {
      const isAdm = U.rol === 'admin' || U.rol === 'oficina';
      let refQ = getSupabaseClient().from('referidos').select('id', { count: 'exact', head: true });
      if (isAdm) refQ = refQ.in('estado', ['registrado', 'verificando']);
      else refQ = refQ.eq('referidor_id', U.id).not('estado', 'eq', 'rechazado');
      const { count: refCount } = await refQ;
      const refB = document.getElementById('mrefb');
      if (refB) { if (refCount > 0) { refB.textContent = refCount; refB.style.display = 'inline-flex'; } else refB.style.display = 'none'; }
    } catch(e) {}
    const _FIN = window.FINAL_STATES || ['Arrendado', 'Vendido', 'Retirado'];
    sSt('ok', window.D.filter(p => !_FIN.includes(p.estado)).length + ' inmuebles');
    render(window.D);
    uSt();
    if(window.renderAccOpts)window.renderAccOpts();
    if(window.populateAsesorFilter)window.populateAsesorFilter();
    renderWelcome();
    return;
  }

  const SB = getSupabaseClient();

  sSt('load', 'Cargando...');
  const rlb = document.getElementById('rlb');
  if (rlb) rlb.style.display = 'none';

  try {
    console.log('[load] Fetching inventory...');

    // 1. Inmuebles with relations
    const { data: inv, error: invErr } = await SB
      .from('inmuebles')
      .select('*,captador:usuarios!captador_id(id,nombre,email,usuario,foto),fotos(id,url,url_thumb,origen,orden)')
      .eq('eliminado', false)
      .order('created_at', { ascending: false });

    if (invErr) throw invErr;

    const D = inv || [];
    D.forEach(p => { p._dias = diasDesde(p.fecha_estado); });
    _ensureSearchIndex(D);

    // Set globals
    window.D = D;
    window.MIS = D.filter(p => p.captador_id === U.id);

    console.log('[load] Loaded', D.length, 'properties');

    // 2. Solicitudes
    const { data: sols } = await SB
      .from('solicitudes')
      .select('*,solicitante:usuarios!solicitante_id(id,nombre,usuario),inmueble:inmuebles!inmueble_id(id,tipo,ciudad,direccion,estado,captador_id,precio_venta,precio_arriendo)')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });
    window.SOL = sols || [];

    // 3. Users
    const { data: usrs } = await SB
      .from('usuarios')
      .select('id,nombre,usuario,rol,activo,es_gestor_arriendos')
      .eq('activo', true)
      .order('nombre');
    window.USERS = usrs || [];

    // 4. Agenda badge
    if (U.es_gestor_arriendos || U.rol === 'admin') {
      const hoy = new Date().toISOString().split('T')[0];
      const { data: agH } = await SB.from('agenda').select('id').eq('usuario_id', U.id).eq('fecha', hoy).eq('estado', 'pendiente');
      const agC = (agH || []).length;
      const agB = document.getElementById('magb');
      if (agB) {
        if (agC > 0) { agB.textContent = agC; agB.style.display = 'inline-flex'; }
        else agB.style.display = 'none';
      }
    }

    // 5. Notificaciones (sistema nuevo — tabla notificaciones)
    // Si la tabla no existe (migración pendiente), cae a la tabla legacy 'alertas'
    let notifs = null;
    try {
      const r = await SB
        .from('notificaciones')
        .select('*,emisor:usuarios!emisor_id(nombre)')
        .eq('destinatario_id', U.id)
        .eq('descartada', false)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!r.error) notifs = r.data;
      else console.warn('[load] notificaciones no disponible, usando alertas legacy:', r.error.message);
    } catch (e) {
      console.warn('[load] notificaciones query failed:', e?.message);
    }

    if (notifs === null) {
      // Fallback legacy: tabla alertas
      const { data: als } = await SB
        .from('alertas')
        .select('*,emisor:usuarios!de_usuario(nombre)')
        .order('created_at', { ascending: false })
        .limit(100);
      notifs = (als || []).filter(a =>
        a.para_email === U.email || a.para_email === U.usuario ||
        a.para_rol === 'all' || a.para_rol === U.rol
      ).map(a => ({
        id: a.id,
        titulo: a.titulo,
        mensaje: a.mensaje,
        tipo: a.tipo,
        categoria: 'sistema',
        prioridad: a.nivel === 'rojo' ? 'alta' : 'normal',
        icono: '📌',
        color: '#3b82f6',
        accion_tipo: a.inmueble_id ? 'abrir_inmueble' : 'abrir_seccion',
        accion_destino: a.inmueble_id || null,
        contexto_id: a.inmueble_id || null,
        contexto_tipo: a.inmueble_id ? 'inmueble' : null,
        leida: a.leida || false,
        descartada: false,
        emisor: a.emisor,
        created_at: a.created_at,
      }));
    }

    window.NOTIFS = notifs || [];
    // Compat: ALS/ALU mantienen las mismas referencias para código legacy
    window.ALS = window.NOTIFS;
    window.ALU = window.NOTIFS;

    const nl = window.NOTIFS.filter(n => !n.leida).length;
    window.NOTIF_COUNT = nl;
    uB('habdg', nl);
    uB('malb', nl);

    // Procesar escalamientos (solo admin, ejecuta una vez por carga)
    if (U.rol === 'admin' && typeof window.procesarEscalamientos === 'function') {
      window.procesarEscalamientos().catch(e => console.warn('[escalamiento]', e));
    }

    // 6. Referidos badge
    try {
      const isAdmI = U.rol === 'admin' || U.rol === 'oficina';
      let refQI = SB.from('referidos').select('id', { count: 'exact', head: true });
      if (isAdmI) refQI = refQI.in('estado', ['registrado', 'verificando']);
      else refQI = refQI.eq('referidor_id', U.id).not('estado', 'eq', 'rechazado');
      const { count: refCI } = await refQI;
      const refBI = document.getElementById('mrefb');
      if (refBI) { if (refCI > 0) { refBI.textContent = refCI; refBI.style.display = 'inline-flex'; } else refBI.style.display = 'none'; }
    } catch(e) {}

    // 7. Update UI
    uSt();
    if(window.renderAccOpts)window.renderAccOpts();
    if(window.populateAsesorFilter)window.populateAsesorFilter();
    const FINAL_S = window.FINAL_STATES || ['Arrendado', 'Vendido', 'Retirado'];
    const activeCount = D.filter(p => !FINAL_S.includes(p.estado)).length;
    sSt('ok', '✅ ' + activeCount + ' propiedades');
    render(D);
    renderWelcome();

    // Hero float removed — only welcome banner shows

    document.getElementById('stt').textContent = 'Act. ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    if (rlb) rlb.style.display = 'flex';

    console.log('[load] ✅ Complete');
    // Badge de interesados sin actividad (módulo Interesados)
    if (typeof window.actualizarBadgeInteresados === 'function') {
      setTimeout(() => window.actualizarBadgeInteresados(), 500);
    }

  } catch (e) {
    console.error('[load] Error:', e);
    sSt('err', '❌ ' + e.message);
    if (rlb) rlb.style.display = 'flex';
  }
}

// ─── Expose globals ──────────────────────────────────────────────

window.load = load;
window.D = window.D || [];
window.MIS = window.MIS || [];
window.SOL = window.SOL || [];
window.USERS = window.USERS || [];
window.ALS = window.ALS || [];
window.ALU = window.ALU || [];
window.diasDesde = diasDesde;
window.fm = fm;
window.emo = emo;
window.eV = eV;
window.eA = eA;
window.eA2 = eA2;
window.sSt = sSt;
window.uSt = uSt;
window.uB = uB;
// window.render se registra desde domains/inmuebles/cards.js
// window.doSearch se registra desde domains/inmuebles/filters.js
window.renderWelcome = renderWelcome;
window.findInm = (id) => (window.D || []).find(p => p.id === id);
window.descInm = (p) => p ? (p.tipo || 'Inmueble') + ' en ' + (p.ciudad || '?') : 'inmueble';
window.limpiar = () => {
  for(const k of Object.keys(window.F||{}))window.F[k]?.clear?.();
  const q=document.getElementById('q');if(q)q.value='';
  const qC=document.getElementById('qClear');if(qC)qC.style.display='none';
  const arMin=document.getElementById('arMin');if(arMin)arMin.value='';
  const arMax=document.getElementById('arMax');if(arMax)arMax.value='';
  const vnMin=document.getElementById('vnMin');if(vnMin)vnMin.value='';
  const vnMax=document.getElementById('vnMax');if(vnMax)vnMax.value='';
  // Reset toggles
  window._myFilter=false;
  const myBtn=document.getElementById('pillMis');
  if(myBtn)myBtn.className='pill pill-mis pill-off';
  window._favFilterActive=false;
  const favBtn=document.getElementById('pillFav');
  if(favBtn)favBtn.className='pill pill-fav pill-off';
  window._tiempoFiltro=null;
  if(window.setTiempo)window.setTiempo(null);
  window._asesorFilter=null;
  window._openPanel=null;
  if(window.togglePanel)window.togglePanel(null);
  if(window.updatePills)window.updatePills();
  if(window.renderSel)window.renderSel();
  render(window.D||[]);
};
window.mostrarTodo = window.limpiar;
// window.autoSearch se registra desde domains/inmuebles/filters.js
