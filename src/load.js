/**
 * HOUSE CRM — Data Loader
 *
 * Central load() function that fetches ALL data from Supabase
 * and distributes it to the stores + legacy window globals.
 *
 * Replaces the original monolithic load() function.
 */

import { getSupabaseClient } from './config/supabase.js';

// ─── Helpers ─────────────────────────────────────────────────────

function diasDesde(f) {
  if (!f) return 999;
  return Math.floor((Date.now() - new Date(f).getTime()) / 864e5);
}

function fm(n) {
  return n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : '';
}

function emo(t) {
  t = (t || '').toLowerCase();
  if (t.includes('penthouse')) return '👑';
  if (t.includes('campestre')) return '🌿';
  if (t.includes('finca')) return '🌾';
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
  const D = window.D || [];
  const hst = document.getElementById('hst');
  const hsv = document.getElementById('hsv');
  const hsa = document.getElementById('hsa');
  const hsb = document.getElementById('hsb');
  if (hst) hst.textContent = D.length;
  if (hsv) hsv.textContent = D.filter(p => eV(p) && !eA2(p)).length;
  if (hsa) hsa.textContent = D.filter(p => eA(p) && !eA2(p)).length;
  if (hsb) hsb.textContent = D.filter(p => eA2(p)).length;
}

// ─── Welcome banner ──────────────────────────────────────────────

function renderWelcome() {
  const U = window.userStore?.get();
  const D = window.D || [];
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

  el.innerHTML = `<div class="wban-hi">${sal}, ${U.nombre.split(' ')[0]} 👋</div><div class="wban-sub">Tienes ${my.length} inmuebles · ${pendVer > 0 ? '¡' + pendVer + ' requieren acción!' : 'Todo bajo control'}</div><div class="wban-tasks">${tasks.join('')}</div>`;
  el.style.display = 'block';
}

// ─── Render inventory list ───────────────────────────────────────

function render(ls) {
  const el = document.getElementById('res');
  if (!el) return;
  const D = window.D || [];
  const U = window.userStore?.get();
  const SOL = window.SOL || [];

  if (!ls || !ls.length) {
    el.innerHTML = '<div class="emp"><span class="emp-i">🔍</span><h3>Sin resultados</h3></div>';
    return;
  }

  let h = `<div style="font-family:'Fraunces',serif;font-size:16px;font-weight:700;margin:10px 0">🎯 <b style="color:var(--b600)">${ls.length}</b> propiedades</div><div class="pgr">`;

  ls.slice(0, 60).forEach(p => {
    const idx = D.indexOf(p);
    const tip = p.tipo || 'Inmueble', ciu = p.ciudad || '';
    const ase = p.captador ? p.captador.nombre : '';
    const pv = p.precio_venta || 0, pa = p.precio_arriendo || 0;
    const hab = p.habitaciones || '', ban = p.banos || '';
    const area = p.area_construida || '', est = p.estrato || '';
    const dias = p._dias || 0;
    const am = eA2(p), sv = eV(p) && !am, sa = eA(p) && !am;
    const hc = am ? 'tb' : sv ? 'tv' : 'ta';
    const m2 = !!(p.url_metrocuadrado || '').trim();
    const fr = !!(p.url_fincaraiz || '').trim();
    const cod = p.codigo_house || '';
    const esMio = U && p.captador_id === U.id;

    const canSeeDir = esMio || U?.rol === 'admin' || U?.rol === 'oficina' ||
      (U?.es_gestor_arriendos && (p.negociacion || '').toLowerCase().includes('arriendo'));
    const dirTxt = canSeeDir ? (p.direccion || '') : (p.direccion_publica || '');
    const ubiTxt = dirTxt ? (dirTxt + (ciu ? ' · ' + ciu : '')) : ('📍 ' + ciu);

    let ab = '';
    if (dias !== null) {
      const cl = dias <= 7 ? 'agn' : dias <= 20 ? 'ago' : dias <= 40 ? 'agw' : 'agd';
      ab = `<span class="agb ${cl}">${dias === 0 ? 'Hoy' : dias + 'd'}</span>`;
    }

    let md = '';
    if (sv || am) md += '<span class="mb mbv">💰</span>';
    if (sa || am) md += '<span class="mb mba">🔑</span>';

    let pr = '<div class="pbl">';
    if (pv > 0) pr += `<div class="pvt">${fm(pv)} <small>venta</small></div>`;
    if (pa > 0) pr += `<div class="par">${fm(pa)} <small>/mes</small></div>`;
    if (!pv && !pa) pr += '<div style="font-size:10px;color:var(--g400)">Consultar</div>';
    pr += '</div>';

    const sp2 = [
      hab && hab != 0 ? `<span class="sp">🛏️${hab}</span>` : '',
      ban && ban != 0 ? `<span class="sp">🚿${ban}</span>` : '',
      area ? `<span class="sp">📐${area}m²</span>` : '',
      est ? `<span class="sp">E${est}</span>` : '',
    ].filter(Boolean).join('');

    const hasF = p.fotos && p.fotos.length > 0;
    const sortedFotos = hasF ? [...p.fotos].sort((a, b) => a.orden - b.orden) : [];

    let cardTop = '';
    if (hasF) {
      const fUrls = sortedFotos.map(f => f.url_thumb || f.url);
      const cid = 'car_' + idx;
      cardTop = `<div class="pc-car" id="${cid}" data-fotos='${JSON.stringify(fUrls)}' data-idx="0"><img src="${fUrls[0]}" onerror="drFallback&&drFallback(this)">`;
      if (sortedFotos.length > 1) cardTop += `<button class="car-nav prev" onclick="event.stopPropagation();cardNav&&cardNav('${cid}',-1)">‹</button><button class="car-nav next" onclick="event.stopPropagation();cardNav&&cardNav('${cid}',1)">›</button>`;
      if (sortedFotos.length > 1 && sortedFotos.length <= 6) cardTop += `<div class="car-dots">${sortedFotos.map((_, j) => `<div class="car-dot ${j === 0 ? 'act' : ''}"></div>`).join('')}</div>`;
      cardTop += `<span class="car-count">📷 ${sortedFotos.length}</span>${ab}</div>`;
    } else {
      cardTop = `<div class="pctop ${hc}" style="position:relative">${ab}<div class="pce">${emo(tip)}</div><div class="pctt">${tip}</div><div class="pccy">${ciu}</div></div><div class="pc-nofoto">📷 Sin foto disponible</div>`;
    }

    let actBtn = `<button class="vb" onclick="oM&&oM(${idx})">Ver detalle →</button>`;

    if (hasF) {
      h += `<div class="pc">${cardTop}<div class="pcbd"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:18px">${emo(tip)}</span><div style="flex:1"><div style="display:flex;align-items:center;gap:6px"><div style="font-size:14px;font-weight:800">${tip}</div>${cod ? `<span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${cod}');toast('📋 ${cod} copiado')">${cod}</span>` : ''}</div><div style="font-size:11px;color:var(--sub)">${ubiTxt}</div></div></div><div class="mods">${md}</div>${pr}${sp2 ? `<div class="sps">${sp2}</div>` : ''}${ase ? `<div class="asl">👤 ${ase}</div>` : ''}<div class="ptb">${m2 ? '<span class="pp ppok">M²✓</span>' : '<span class="pp ppno">M²</span>'}${fr ? '<span class="pp ppok">FR✓</span>' : '<span class="pp ppno">FR</span>'}</div>${actBtn}</div></div>`;
    } else {
      h += `<div class="pc">${cardTop}<div class="pcbd">${cod ? `<div style="margin-bottom:4px"><span class="cod-badge" onclick="event.stopPropagation();navigator.clipboard.writeText('${cod}');toast('📋 ${cod} copiado')">${cod}</span></div>` : ''}<div class="mods">${md}</div>${pr}${sp2 ? `<div class="sps">${sp2}</div>` : ''}${ase ? `<div class="asl">👤 ${ase}</div>` : ''}<div class="ptb">${m2 ? '<span class="pp ppok">M²✓</span>' : '<span class="pp ppno">M²</span>'}${fr ? '<span class="pp ppok">FR✓</span>' : '<span class="pp ppno">FR</span>'}</div>${actBtn}</div></div>`;
    }
  });

  h += '</div>';
  el.innerHTML = h;
}

// ─── Search / filter (simplified — works with window globals) ────

function doSearch() {
  const D = window.D || [];
  if (!D.length) return;
  render(D);
}

// ─── Main load function ──────────────────────────────────────────

export async function load() {
  const U = window.userStore?.get();
  if (!U) {
    console.warn('[load] No user session, skipping data load');
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

    // 5. Alertas
    const { data: als } = await SB
      .from('alertas')
      .select('*,emisor:usuarios!de_usuario(nombre)')
      .order('created_at', { ascending: false })
      .limit(100);

    window.ALS = (als || []).filter(a => a.para_rol === 'all' || a.para_rol === U.rol);
    window.ALU = (als || []).filter(a =>
      a.para_email === U.email || a.para_email === U.usuario ||
      a.para_rol === 'all' || a.para_rol === U.rol
    );

    const nl = window.ALU.filter(a => !a.leida).length;
    uB('habdg', nl);
    uB('malb', nl);

    // 6. Update UI
    uSt();
    sSt('ok', '✅ ' + D.length + ' propiedades');
    render(D);
    renderWelcome();

    document.getElementById('stt').textContent = 'Act. ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    if (rlb) rlb.style.display = 'flex';

    console.log('[load] ✅ Complete');

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
window.render = render;
window.doSearch = doSearch;
window.renderWelcome = renderWelcome;
window.findInm = (id) => (window.D || []).find(p => p.id === id);
window.descInm = (p) => p ? (p.tipo || 'Inmueble') + ' en ' + (p.ciudad || '?') : 'inmueble';
window.limpiar = () => render(window.D || []);
window.mostrarTodo = () => render(window.D || []);
window.autoSearch = doSearch;
