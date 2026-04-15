/**
 * HOUSE CRM — UI del módulo Interesados/Leads (Fase 2)
 *
 * Vistas:
 *   - rInteresados (Kanban + filtros)
 *   - abrirCrearInteresado(inmuebleId)
 *   - abrirDetalleInteresado(id) con timeline
 *   - abrirAgendarVisitaLead(interesadoId, inmuebleId)
 *   - badgeInteresadosInmueble(inmuebleId) para tarjetas
 */

// ============================================================
// BADGE DE ALERTAS en menú (leads sin actividad > 72h)
// ============================================================

window.actualizarBadgeInteresados = async function() {
  try {
    const u = window.userStore?.get();
    if (!u || u.tipo_usuario === 'publico') return;
    if (typeof window.leadsSinActividad !== 'function') return;
    const esAdmin = ['admin','oficina','gestor'].includes(u.rol);
    // Para admin: todos los leads sin actividad; para asesor: solo los suyos
    const stale = await window.leadsSinActividad(72, esAdmin ? null : u.id);
    const n = (stale || []).length;
    const el = document.getElementById('mintb');
    if (el) {
      if (n > 0) {
        el.textContent = n;
        el.style.display = 'inline-flex';
        el.style.background = '#ef4444';
        el.style.color = '#fff';
      } else {
        el.style.display = 'none';
      }
    }

    // Escalamiento silencioso: leads >7 días sin actividad → notificar a admin/gestor una vez
    if (esAdmin && n > 0) {
      const escalables = stale.filter(l => {
        const h = (Date.now() - new Date(l.fecha_ultima_actividad).getTime()) / 3600000;
        return h >= 168; // 7 días
      });
      if (escalables.length && typeof window.notificar === 'function') {
        // Evita spam: solo notifica si no se ha hecho en las últimas 24h para este admin
        const key = 'int_escal_' + u.id;
        const last = parseInt(localStorage.getItem(key) || '0');
        if (Date.now() - last > 24 * 3600000) {
          const admins = typeof window.getAdminIds === 'function' ? await window.getAdminIds() : [];
          await window.notificar({
            tipo: 'sistema_escalamiento',
            categoria: 'sistema',
            titulo: `⚠️ ${escalables.length} lead${escalables.length>1?'s':''} sin actividad >7 días`,
            mensaje: 'Requieren atención urgente o deben descartarse.',
            icono: '⚠️', color: '#ef4444', prioridad: 'critica',
            accion_tipo: 'abrir_seccion', accion_seccion: 'interesados',
            destinatarios: admins,
          });
          localStorage.setItem(key, String(Date.now()));
        }
      }
    }
  } catch (e) { console.warn('[badge interesados]', e); }
};

// Se auto-ejecuta cada vez que carga data
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.actualizarBadgeInteresados?.(), 3000);
  });
  // Re-ejecuta cada 5 min
  setInterval(() => { try { window.actualizarBadgeInteresados?.(); } catch {} }, 5 * 60000);
}

// Inyectar CSS responsive una sola vez
if (typeof document !== 'undefined' && !document.getElementById('int-mobile-css')) {
  const s = document.createElement('style');
  s.id = 'int-mobile-css';
  s.textContent = `
    @media (max-width: 640px) {
      #interesadosc .kcol { flex: 0 0 260px !important; }
      #interesadosc .kcard { padding: 14px !important; font-size: 13px !important; }
      #interesadosc input, #interesadosc select, #interesadosc textarea { font-size: 16px !important; }
      #intOv > div, #detLeadOv > div, #visOv > div, #notaOv > div {
        max-height: 100vh !important;
        height: 100vh;
        border-radius: 0 !important;
      }
      #intOv, #detLeadOv, #visOv, #notaOv { padding: 0 !important; align-items: stretch !important; }
      #detLeadOv button, #detLeadOv select { min-height: 44px !important; }
    }
    @media (max-width: 480px) {
      #interesadosc .kcol { flex: 0 0 calc(100vw - 60px) !important; max-width: 340px; }
    }
    /* Evita zoom en iOS cuando input <16px */
    #intOv input, #intOv select, #intOv textarea,
    #detLeadOv input, #detLeadOv select, #detLeadOv textarea,
    #visOv input, #visOv select, #visOv textarea,
    #notaOv input, #notaOv select, #notaOv textarea { font-size: 16px; }
  `;
  document.head.appendChild(s);
}

const _TIP = () => window.TIPIFICACIONES || {};
const _CAN = () => window.CANAL_ORIGEN_LEAD || {};

// Estado UI
window._intState = window._intState || {
  filtroAsesor: 'todos',
  filtroInmueble: null,
  filtroUrgencia: '',
  filtroCanal: '',
  search: '',
  cargando: false,
  view: 'pipeline', // 'pipeline' | 'por_inmueble'
  inmueblesExpandidos: {}, // { inmueble_id: true/false }
};

window.setIntFiltro = function(k, v) {
  window._intState[k] = v || '';
  window.rInteresados();
};

window.setIntSearch = function(v) {
  window._intState.search = (v || '').trim().toLowerCase();
  clearTimeout(window._intSrchT);
  window._intSrchT = setTimeout(() => window.rInteresados(), 250);
};

window.limpiarFiltrosInt = function() {
  window._intState.search = '';
  window._intState.filtroUrgencia = '';
  window._intState.filtroCanal = '';
  window._intState.filtroAsesor = 'todos';
  window.rInteresados();
};

window.setIntView = function(v) {
  window._intState.view = v;
  window.rInteresados();
};

window.toggleInmExp = function(inmId) {
  window._intState.inmueblesExpandidos[inmId] = !window._intState.inmueblesExpandidos[inmId];
  window.rInteresados();
};

// ============================================================
// renderer principal — KANBAN
// ============================================================

window.rInteresados = async function() {
  const el = document.getElementById('interesadosc');
  if (!el) return;
  const u = window.userStore?.get();
  if (!u) { el.innerHTML = '<div class="emp"><h3>Sin sesión</h3></div>'; return; }

  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--sub)">⏳ Cargando interesados...</div>';

  try {
    const esAdmin = ['admin','oficina','gestor'].includes(u.rol);
    const F = window._intState;
    const filtrosQ = esAdmin ? {} : { asesor_id: u.id };
    // Si admin filtra por asesor específico
    if (esAdmin && F.filtroAsesor && F.filtroAsesor !== 'todos') filtrosQ.asesor_id = F.filtroAsesor;
    const leadsAll = await window.listarInteresados(filtrosQ);

    // Filtros cliente (búsqueda + urgencia + canal)
    const leads = leadsAll.filter(l => {
      if (F.filtroUrgencia && l.urgencia !== F.filtroUrgencia) return false;
      if (F.filtroCanal && l.canal_origen !== F.filtroCanal) return false;
      if (F.search) {
        const q = F.search;
        const hay = (
          (l.nombre_completo || '').toLowerCase() +
          ' ' + (l.telefono || '') +
          ' ' + (l.email || '').toLowerCase() +
          ' ' + (l.inmueble?.codigo_house || '').toLowerCase() +
          ' ' + (l.inmueble?.barrio || '').toLowerCase()
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // KPIs por tipificación (basado en filtrado)
    const porTip = {};
    Object.keys(_TIP()).forEach(k => porTip[k] = []);
    leads.forEach(l => {
      if (!porTip[l.tipificacion]) porTip[l.tipificacion] = [];
      porTip[l.tipificacion].push(l);
    });

    // Lista de asesores únicos (para filtro admin)
    let asesoresUnicos = [];
    if (esAdmin) {
      const map = {};
      leadsAll.forEach(l => {
        if (l.asignado?.id && !map[l.asignado.id]) map[l.asignado.id] = l.asignado.nombre || l.asignado.id;
      });
      asesoresUnicos = Object.entries(map).map(([id, nombre]) => ({ id, nombre }));
    }

    let h = '';
    const vistaActual = window._intState.view || 'pipeline';

    // Header
    h += `<div class="card" style="margin-bottom:12px"><div class="cdh">
      <div class="chl"><div class="chi">👤</div><div>
        <div class="cht">Interesados / Leads</div>
        <div class="chsb">${leads.length} leads ${esAdmin ? 'totales' : 'míos'}${vistaActual === 'pipeline' ? ' · Pipeline con drag & drop' : ' · Agrupados por inmueble'}</div>
      </div></div>
      <button onclick="abrirCrearInteresadoLibre()" style="padding:8px 14px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer">+ Nuevo Lead</button>
    </div></div>`;

    // Toggle vista
    h += `<div style="display:flex;gap:6px;margin-bottom:10px;padding:4px;background:var(--cd);border:1.5px solid var(--brd);border-radius:10px;max-width:360px">
      <button onclick="setIntView('pipeline')" style="flex:1;padding:9px 14px;border:none;border-radius:7px;font-size:12px;font-weight:800;cursor:pointer;background:${vistaActual==='pipeline'?'#3b82f6':'transparent'};color:${vistaActual==='pipeline'?'#fff':'var(--tx)'}">📋 Pipeline</button>
      <button onclick="setIntView('por_inmueble')" style="flex:1;padding:9px 14px;border:none;border-radius:7px;font-size:12px;font-weight:800;cursor:pointer;background:${vistaActual==='por_inmueble'?'#3b82f6':'transparent'};color:${vistaActual==='por_inmueble'?'#fff':'var(--tx)'}">🏠 Por Inmueble</button>
    </div>`;

    // Barra de búsqueda + filtros
    const hayFiltros = !!(F.search || F.filtroUrgencia || F.filtroCanal || (F.filtroAsesor && F.filtroAsesor !== 'todos'));
    h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
      <div style="position:relative;flex:1;min-width:200px">
        <input id="int_search" type="search" placeholder="🔍 Buscar nombre, teléfono, código, barrio…"
          oninput="setIntSearch(this.value)" value="${(F.search || '').replace(/"/g,'&quot;')}"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
      </div>
      <select onchange="setIntFiltro('filtroUrgencia',this.value)" style="padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:12px;background:var(--cd);color:var(--tx);font-weight:600">
        <option value="">⚡ Urgencia</option>
        <option value="inmediata" ${F.filtroUrgencia==='inmediata'?'selected':''}>🔴 Inmediata</option>
        <option value="1-3_meses" ${F.filtroUrgencia==='1-3_meses'?'selected':''}>🟡 1-3 meses</option>
        <option value="6+_meses" ${F.filtroUrgencia==='6+_meses'?'selected':''}>🟢 6+ meses</option>
      </select>
      <select onchange="setIntFiltro('filtroCanal',this.value)" style="padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:12px;background:var(--cd);color:var(--tx);font-weight:600">
        <option value="">📱 Canal</option>
        ${Object.entries(_CAN()).map(([k,v]) => `<option value="${k}" ${F.filtroCanal===k?'selected':''}>${v.emoji} ${v.label}</option>`).join('')}
      </select>
      ${esAdmin && asesoresUnicos.length ? `<select onchange="setIntFiltro('filtroAsesor',this.value||'todos')" style="padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:12px;background:var(--cd);color:var(--tx);font-weight:600">
        <option value="todos">👥 Todos los asesores</option>
        ${asesoresUnicos.map(a => `<option value="${a.id}" ${F.filtroAsesor===a.id?'selected':''}>${a.nombre}</option>`).join('')}
      </select>` : ''}
      ${hayFiltros ? `<button onclick="limpiarFiltrosInt()" style="padding:8px 12px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;font-size:11px;font-weight:700;color:var(--b600);cursor:pointer">✕ Limpiar</button>` : ''}
      ${hayFiltros ? `<div style="font-size:11px;color:var(--sub);padding:8px 6px;font-weight:600">${leads.length} / ${leadsAll.length}</div>` : ''}
    </div>`;

    // Dispatcher de vista
    if (vistaActual === 'por_inmueble') {
      h += _renderVistaPorInmueble(leads, porTip);
      el.innerHTML = h;
      return;
    }

    // KPIs compactos
    h += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:14px">`;
    Object.values(_TIP()).sort((a,b) => a.orden - b.orden).forEach(t => {
      const n = (porTip[t.id] || []).length;
      h += `<div style="padding:10px;background:var(--cd);border:1.5px solid ${t.color}40;border-left:4px solid ${t.color};border-radius:8px;text-align:center">
        <div style="font-family:Fraunces,serif;font-size:22px;font-weight:800;color:${t.color}">${n}</div>
        <div style="font-size:9px;color:var(--sub);font-weight:700;text-transform:uppercase;letter-spacing:.5px">${t.emoji} ${t.label}</div>
      </div>`;
    });
    h += `</div>`;

    // Kanban columnas (solo las 5 principales del pipeline; 6-8 más compactas al final)
    const cols = ['nuevo','contactado','visita_agendada','visita_realizada','negociacion','cierre_ganado','cierre_perdido','en_seguimiento'];
    h += `<div id="kanbanScroll" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:10px;min-height:450px">`;
    cols.forEach(cid => {
      const t = _TIP()[cid];
      const items = porTip[cid] || [];
      h += `<div class="kcol" data-tip="${cid}"
          style="flex:0 0 280px;background:var(--cd);border:1.5px solid var(--brd);border-top:4px solid ${t.color};border-radius:10px;padding:10px"
          ondrop="onDropLead(event,'${cid}')" ondragover="event.preventDefault();this.style.background='${t.color}10'" ondragleave="this.style.background=''">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:800;color:${t.color}">${t.emoji} ${t.label}</div>
          <div style="font-size:11px;color:var(--sub);background:${t.color}22;padding:2px 8px;border-radius:10px;font-weight:700">${items.length}</div>
        </div>
        <div class="kcol-items" style="display:flex;flex-direction:column;gap:6px">`;
      if (!items.length) {
        h += `<div style="padding:18px;text-align:center;font-size:11px;color:var(--sub);opacity:.6">—</div>`;
      } else {
        items.forEach(l => {
          const inm = l.inmueble || {};
          const dias = Math.floor((Date.now() - new Date(l.fecha_ultima_actividad).getTime()) / 864e5);
          const urgent = dias > 3 ? '🔴' : dias > 1 ? '🟡' : '🟢';
          const canal = _CAN()[l.canal_origen] || {};
          const otrasTips = Object.values(_TIP()).filter(t => t.id !== l.tipificacion).sort((a,b)=>a.orden-b.orden);
          const fotoK = _fotoInm(l.inmueble_id);
          const emoK = _emoInm(inm.tipo);
          const thumbK = fotoK
            ? `<div style="width:48px;height:48px;border-radius:8px;background-image:url('${fotoK}');background-size:cover;background-position:center;flex-shrink:0"></div>`
            : `<div style="width:48px;height:48px;border-radius:8px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${emoK}</div>`;
          h += `<div class="kcard" draggable="true" ondragstart="onDragStartLead(event,'${l.id}')"
              onclick="abrirDetalleInteresado('${l.id}')"
              style="padding:10px;background:#fff;border:1px solid var(--brd);border-radius:10px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.05)">
            <div style="display:flex;gap:8px;align-items:flex-start">
              ${thumbK}
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700;color:var(--tx);line-height:1.25">${(l.nombre_completo || 'Sin nombre').slice(0,40)}</div>
                ${inm.codigo_house ? `<div style="font-size:10.5px;color:var(--b600);font-weight:700;margin-top:2px">${inm.codigo_house}</div>` : ''}
                <div style="font-size:10.5px;color:var(--sub);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${inm.tipo || ''}${inm.barrio ? ' · ' + inm.barrio : inm.ciudad ? ' · ' + inm.ciudad : ''}</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
              <div style="font-size:11px;color:var(--sub)">${canal.emoji || '📱'} ${l.telefono || '—'}</div>
              <div style="font-size:11px;font-weight:700">${urgent} ${dias}d</div>
            </div>
            <select onclick="event.stopPropagation()" onchange="moverLeadDesdeTarjeta('${l.id}',this.value,event);this.value=''" style="width:100%;margin-top:8px;padding:7px;border:1px dashed var(--brd);border-radius:6px;font-size:11px;color:var(--sub);background:var(--b50);cursor:pointer">
              <option value="">⇄ Mover a…</option>
              ${otrasTips.map(t => `<option value="${t.id}">${t.emoji} ${t.label}</option>`).join('')}
            </select>
          </div>`;
        });
      }
      h += `</div></div>`;
    });
    h += `</div>`;

    el.innerHTML = h;
  } catch (e) {
    console.error('[rInteresados] Error:', e, 'message:', e?.message, 'code:', e?.code, 'details:', e?.details);
    const msg = e?.message || e?.error_description || JSON.stringify(e) || 'desconocido';
    el.innerHTML = `<div class="card"><div class="cdb"><div class="emp"><span class="emp-i">⚠️</span><h3>Error al cargar interesados</h3><p style="font-size:12px;color:var(--sub);max-width:520px;margin:0 auto">${msg}</p><p style="font-size:10px;color:var(--sub);margin-top:10px">Si persiste, comparte este mensaje con soporte</p></div></div></div>`;
  }
};

// ============================================================
// AUTOCOMPLETE @ para menciones
// ============================================================

window._mentionCache = window._mentionCache || { users: null, inmuebles: null, ts: 0 };

async function _cargarDatosMenciones() {
  const cache = window._mentionCache;
  if (cache.users && cache.inmuebles && (Date.now() - cache.ts < 60000)) return cache;
  try {
    const SB = window.SB || null;
    // Fetch desde módulo supabase
    const mod = await import('./config/supabase.js');
    const SBc = mod.getSupabaseClient();
    const [rUsers, rInms] = await Promise.all([
      SBc.from('usuarios').select('id,nombre,usuario,foto').eq('activo', true).neq('tipo_usuario', 'publico').limit(100),
      SBc.from('inmuebles').select('id,codigo_house,tipo,ciudad,barrio').not('codigo_house', 'is', null).limit(300),
    ]);
    cache.users = rUsers.data || [];
    cache.inmuebles = rInms.data || [];
    cache.ts = Date.now();
  } catch (e) { console.warn('[mention cache]', e); }
  return cache;
}

/**
 * Adjunta autocomplete a un <textarea> o <input>.
 * Detecta "@algo" en la posición del cursor y muestra popup con usuarios + inmuebles + @todos.
 */
window.attachMentionAutocomplete = function(el) {
  if (!el || el.dataset.mentionAttached) return;
  el.dataset.mentionAttached = '1';

  let pop = null;
  const cerrar = () => { pop?.remove(); pop = null; };

  el.addEventListener('blur', () => setTimeout(cerrar, 150));
  el.addEventListener('keydown', (ev) => {
    if (pop && (ev.key === 'Escape')) { cerrar(); ev.preventDefault(); }
  });

  el.addEventListener('input', async () => {
    const pos = el.selectionStart;
    const txt = el.value.substring(0, pos);
    const m = txt.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
    if (!m) { cerrar(); return; }
    const q = (m[1] || '').toLowerCase();
    const data = await _cargarDatosMenciones();
    if (!data.users) { cerrar(); return; }

    // Matches
    const uMatches = (data.users || []).filter(u =>
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.usuario || '').toLowerCase().includes(q)
    ).slice(0, 5);
    const iMatches = (data.inmuebles || []).filter(i =>
      (i.codigo_house || '').toLowerCase().includes(q)
    ).slice(0, 5);

    const matches = [];
    // @todos / @equipo (solo roles altos)
    const uAct = window.userStore?.get();
    if (uAct && ['admin','oficina','gestor'].includes(uAct.rol) && ('todos'.startsWith(q) || 'equipo'.startsWith(q))) {
      matches.push({ type: 'team', label: '@todos', sub: 'Todo el equipo interno', insert: 'todos' });
    }
    uMatches.forEach(u => matches.push({
      type: 'user',
      label: '@' + (u.usuario || u.nombre?.split(' ')[0] || 'usuario'),
      sub: u.nombre || '',
      insert: u.usuario || u.nombre?.split(' ')[0] || 'usuario',
      foto: u.foto,
    }));
    iMatches.forEach(i => matches.push({
      type: 'inm',
      label: '@' + i.codigo_house,
      sub: (i.tipo || '') + (i.barrio ? ' en ' + i.barrio : i.ciudad ? ' en ' + i.ciudad : ''),
      insert: i.codigo_house,
    }));

    if (!matches.length) { cerrar(); return; }

    // Posición del popup: bajo el textarea
    const rect = el.getBoundingClientRect();
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'mentPop';
      pop.style.cssText = 'position:fixed;z-index:10050;background:#fff;border:1.5px solid #3b82f6;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);max-width:320px;max-height:260px;overflow-y:auto;font-family:inherit';
      document.body.appendChild(pop);
    }
    pop.style.left = rect.left + 'px';
    pop.style.top = (rect.bottom + 4) + 'px';
    pop.style.width = Math.min(rect.width, 320) + 'px';

    pop.innerHTML = matches.map((m, idx) => {
      const ico = m.type === 'team' ? '👥' : m.type === 'inm' ? '🏠' : '👤';
      const avatar = m.foto
        ? `<div style="width:28px;height:28px;border-radius:50%;background-image:url('${m.foto}');background-size:cover;flex-shrink:0"></div>`
        : `<div style="width:28px;height:28px;border-radius:50%;background:${m.type==='inm'?'#dbeafe':m.type==='team'?'#fef3c7':'#e0e7ff'};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${ico}</div>`;
      return `<div data-idx="${idx}" style="display:flex;gap:8px;align-items:center;padding:8px 10px;cursor:pointer;border-bottom:1px solid #f3f4f6">
        ${avatar}
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;color:#1f2937">${m.label}</div>
          <div style="font-size:10px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.sub}</div>
        </div>
      </div>`;
    }).join('');

    // Click handler
    pop.querySelectorAll('[data-idx]').forEach(row => {
      row.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        const idx = parseInt(row.getAttribute('data-idx'));
        const match = matches[idx];
        if (!match) return;
        // Reemplazar el "@parcial" por "@insert "
        const before = el.value.substring(0, pos).replace(/@[a-zA-Z0-9_.-]*$/, '@' + match.insert + ' ');
        const after = el.value.substring(pos);
        el.value = before + after;
        const newPos = before.length;
        el.setSelectionRange(newPos, newPos);
        cerrar();
        el.focus();
      });
      row.addEventListener('mouseenter', () => row.style.background = '#eff6ff');
      row.addEventListener('mouseleave', () => row.style.background = '');
    });
  });
};

// ============================================================
// VISTA: POR INMUEBLE (agrupada)
// ============================================================

// Helper: obtener foto thumb del inmueble desde window.D (ya cargado)
function _fotoInm(inmuebleId) {
  const p = (window.D || []).find(x => x.id === inmuebleId);
  if (!p || !p.fotos || !p.fotos.length) return null;
  const sorted = [...p.fotos].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  return sorted[0].url_thumb || sorted[0].url || null;
}

// Emoji de fallback según tipo
function _emoInm(tipo) {
  if (typeof window.emo === 'function') return window.emo(tipo);
  const t = (tipo || '').toLowerCase();
  if (t.includes('apto') || t.includes('apartamento')) return '🏢';
  if (t.includes('casa')) return '🏡';
  if (t.includes('lote')) return '🌳';
  if (t.includes('local')) return '🏪';
  if (t.includes('oficina')) return '💼';
  if (t.includes('bodega')) return '🏭';
  if (t.includes('finca')) return '🌾';
  return '🏠';
}

function _renderVistaPorInmueble(leads, porTip) {
  if (!leads.length) {
    return `<div class="card"><div class="cdb"><div class="emp"><span class="emp-i">📭</span><h3>Sin interesados aún</h3><p>Crea el primero desde cualquier tarjeta de inmueble.</p></div></div></div>`;
  }

  // Agrupar por inmueble_id
  const porInm = {};
  leads.forEach(l => {
    const k = l.inmueble_id;
    if (!porInm[k]) porInm[k] = { inmueble: l.inmueble || {}, leads: [] };
    porInm[k].leads.push(l);
  });

  // Ordenar inmuebles por cantidad de leads descendente
  const grupos = Object.entries(porInm)
    .map(([id, g]) => ({ id, ...g, count: g.leads.length }))
    .sort((a, b) => b.count - a.count);

  const expandidos = window._intState.inmueblesExpandidos || {};
  // Por defecto expandidos los top 3
  grupos.slice(0, 3).forEach(g => { if (expandidos[g.id] === undefined) expandidos[g.id] = true; });

  let h = `<div style="display:flex;flex-direction:column;gap:10px">`;

  grupos.forEach(g => {
    const inm = g.inmueble;
    const expandido = expandidos[g.id] !== false; // true por defecto si no está explícitamente colapsado

    // Conteo por tipificación dentro del inmueble
    const countsTip = {};
    Object.keys(_TIP()).forEach(k => countsTip[k] = 0);
    g.leads.forEach(l => { countsTip[l.tipificacion] = (countsTip[l.tipificacion] || 0) + 1; });

    // Foto del inmueble (desde window.D)
    const foto = _fotoInm(g.id);
    const emoFallback = _emoInm(inm.tipo);
    const thumbHtml = foto
      ? `<div style="width:72px;height:72px;border-radius:10px;background-image:url('${foto}');background-size:cover;background-position:center;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,.15)"></div>`
      : `<div style="width:72px;height:72px;border-radius:10px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0">${emoFallback}</div>`;

    // Header del inmueble (click toggle)
    h += `<div style="background:var(--cd);border:1.5px solid var(--brd);border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)">
      <div onclick="toggleInmExp('${g.id}')" style="padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:12px;background:linear-gradient(90deg,#eff6ff,transparent);border-left:4px solid #3b82f6">
        ${thumbHtml}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:15px;font-weight:800;color:var(--tx)">${inm.codigo_house || '(sin código)'}</span>
            <span style="font-size:12px;color:var(--sub);font-weight:600">${inm.tipo || ''}${inm.barrio ? ' · ' + inm.barrio : inm.ciudad ? ' · ' + inm.ciudad : ''}</span>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">
            ${Object.values(_TIP()).sort((a,b)=>a.orden-b.orden).filter(t => countsTip[t.id] > 0).map(t => `<span style="font-size:10px;font-weight:800;background:${t.color}22;color:${t.color};padding:2px 8px;border-radius:10px">${t.emoji} ${countsTip[t.id]}</span>`).join('')}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <button onclick="event.stopPropagation();abrirCrearInteresado('${g.id}')" style="padding:6px 10px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">+ Nuevo</button>
          <div style="background:#3b82f6;color:#fff;font-weight:800;font-size:13px;padding:4px 10px;border-radius:12px">${g.count}</div>
          <div style="font-size:16px;color:var(--sub);transform:rotate(${expandido?'0':'-90'}deg);transition:transform .2s">▼</div>
        </div>
      </div>`;

    if (expandido) {
      // Agrupar sus leads por tipificación
      const tipsConLeads = Object.values(_TIP()).sort((a,b)=>a.orden-b.orden)
        .filter(t => countsTip[t.id] > 0);

      h += `<div style="padding:10px 14px 14px">`;
      tipsConLeads.forEach(t => {
        const leadsTip = g.leads.filter(l => l.tipificacion === t.id);
        h += `<div style="margin-bottom:10px">
          <div style="font-size:10px;font-weight:800;color:${t.color};text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;padding-left:4px;border-left:3px solid ${t.color}">${t.emoji} ${t.label} (${leadsTip.length})</div>
          <div style="display:flex;flex-direction:column;gap:5px">`;
        leadsTip.forEach(l => {
          const canal = _CAN()[l.canal_origen] || {};
          const dias = Math.floor((Date.now() - new Date(l.fecha_ultima_actividad).getTime()) / 864e5);
          const urgent = dias > 3 ? '🔴' : dias > 1 ? '🟡' : '🟢';
          const otrasTips = Object.values(_TIP()).filter(tt => tt.id !== l.tipificacion).sort((a,b)=>a.orden-b.orden);
          h += `<div onclick="abrirDetalleInteresado('${l.id}')" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:#fff;border:1px solid var(--brd);border-left:3px solid ${t.color};border-radius:8px;cursor:pointer">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;color:var(--tx)">${(l.nombre_completo || 'Sin nombre').slice(0,60)}</div>
              <div style="font-size:11px;color:var(--sub);margin-top:2px">${canal.emoji || '📱'} ${l.telefono || '—'}${l.asignado?.nombre ? ' · ' + l.asignado.nombre : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              <span style="font-size:11px">${urgent} ${dias}d</span>
              <select onclick="event.stopPropagation()" onchange="moverLeadDesdeTarjeta('${l.id}',this.value,event);this.value=''" style="padding:5px 6px;border:1px solid var(--brd);border-radius:5px;font-size:10px;background:var(--cd);color:var(--tx);cursor:pointer">
                <option value="">⇄</option>
                ${otrasTips.map(tt => `<option value="${tt.id}">${tt.emoji} ${tt.label}</option>`).join('')}
              </select>
            </div>
          </div>`;
        });
        h += `</div></div>`;
      });
      h += `</div>`;
    }

    h += `</div>`;
  });

  h += `</div>`;
  return h;
}

// ============================================================
// DRAG & DROP
// ============================================================

window.onDragStartLead = function(ev, leadId) {
  ev.dataTransfer.setData('lead_id', leadId);
  ev.dataTransfer.effectAllowed = 'move';
};

window.onDropLead = async function(ev, nuevaTip) {
  ev.preventDefault();
  ev.currentTarget.style.background = '';
  const leadId = ev.dataTransfer.getData('lead_id');
  if (!leadId) return;
  try {
    // Si va a cierre_ganado, pedir confirmación
    if (nuevaTip === 'cierre_ganado' || nuevaTip === 'cierre_perdido') {
      const ok = await (window.cfShow ? window.cfShow('🏆', `¿Mover a ${_TIP()[nuevaTip].label}?`, 'Esta acción cambia el estado del lead y queda registrada en el historial.') : window.confirm(`¿Mover a ${_TIP()[nuevaTip].label}?`));
      if (!ok) return;
    }
    await window.cambiarTipificacion(leadId, nuevaTip);
    if (window.toast) window.toast('✅ Movido a ' + _TIP()[nuevaTip].label);
    window.rInteresados();
  } catch (e) {
    if (e.message === 'requiere_visita_realizada') {
      window.toast('❌ Cierre ganado requiere visita realizada previa', 'terr');
    } else {
      window.toast('Error: ' + (e.message || 'no se pudo mover'), 'terr');
    }
  }
};

// ============================================================
// MODAL CREAR INTERESADO
// ============================================================

// Versión con inmueble pre-cargado (desde tarjeta)
window.abrirCrearInteresado = function(inmuebleId) {
  _renderModalCrear(inmuebleId);
};

// Versión libre (desde sección Interesados) — pide seleccionar inmueble
window.abrirCrearInteresadoLibre = function() {
  _renderModalCrear(null);
};

function _renderModalCrear(inmuebleIdPre) {
  document.getElementById('intOv')?.remove();
  const ov = document.createElement('div');
  ov.id = 'intOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };

  // Lista de inmuebles disponibles (para selector si no hay preload)
  const inms = (window.D || []).filter(p => p.estado !== 'Arrendado' && p.estado !== 'Vendido' && p.estado !== 'Retirado');
  const inmuebleOptions = inmuebleIdPre
    ? null
    : inms.map(p => `<option value="${p.id}">${p.codigo_house ? p.codigo_house + ' · ' : ''}${p.tipo || 'Inmueble'}${p.barrio ? ' — ' + p.barrio : p.ciudad ? ' — ' + p.ciudad : ''}</option>`).join('');

  const inmPre = inmuebleIdPre ? (window.D || []).find(p => p.id === inmuebleIdPre) : null;
  const inmLabel = inmPre ? ((inmPre.codigo_house ? inmPre.codigo_house + ' · ' : '') + (inmPre.tipo || 'Inmueble') + (inmPre.barrio ? ' — ' + inmPre.barrio : inmPre.ciudad ? ' — ' + inmPre.ciudad : '')) : '';

  ov.innerHTML = `
    <div style="background:var(--cd);border-radius:14px;max-width:520px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 20px;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:16px;font-weight:800;color:var(--tx)">➕ Nuevo Interesado</div>
          ${inmLabel ? `<div style="font-size:11px;color:var(--sub);margin-top:2px">${inmLabel}</div>` : ''}</div>
        <button onclick="document.getElementById('intOv').remove()" style="background:none;border:none;font-size:22px;color:var(--sub);cursor:pointer">×</button>
      </div>
      <div style="padding:18px 20px">
        ${inmuebleIdPre ? `<input type="hidden" id="int_inm" value="${inmuebleIdPre}">` : `
        <div style="margin-bottom:12px">
          <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Inmueble *</label>
          <select id="int_inm" style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
            <option value="">— Selecciona un inmueble —</option>
            ${inmuebleOptions}
          </select>
        </div>`}

        <div style="margin-bottom:12px">
          <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Nombre completo *</label>
          <input id="int_nombre" type="text" maxlength="150" placeholder="Ej: María González"
            style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div style="flex:1">
            <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Teléfono *</label>
            <input id="int_tel" type="tel" placeholder="3001234567"
              style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
          </div>
          <div style="flex:1">
            <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Email</label>
            <input id="int_email" type="email" placeholder="maria@email.com"
              style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div style="flex:1">
            <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Canal</label>
            <select id="int_canal" style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
              ${Object.entries(_CAN()).map(([k,v]) => `<option value="${k}" ${k==='whatsapp'?'selected':''}>${v.emoji} ${v.label}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1">
            <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Urgencia</label>
            <select id="int_urg" style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
              <option value="">Sin definir</option>
              <option value="inmediata">Inmediata</option>
              <option value="1-3_meses">1-3 meses</option>
              <option value="6+_meses">6+ meses</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div style="flex:1">
            <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Presup. mín</label>
            <input id="int_pmin" type="number" placeholder="0"
              style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
          </div>
          <div style="flex:1">
            <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Presup. máx</label>
            <input id="int_pmax" type="number" placeholder="0"
              style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx)">
          </div>
        </div>

        <div style="margin-bottom:4px">
          <label style="font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Nota inicial *</label>
          <textarea id="int_nota" maxlength="1000" rows="3" placeholder="Contexto del lead: dónde te lo refirieron, qué busca, qué le interesó…"
            style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx);resize:vertical;font-family:inherit"></textarea>
          <div style="font-size:10px;color:var(--sub);margin-top:4px">Tip: usa @nombre para mencionar, @HOUSE-XXX para vincular otro inmueble</div>
        </div>
      </div>

      <div style="padding:14px 20px;border-top:1px solid var(--brd);display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('intOv').remove()" style="padding:10px 16px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;font-weight:700;cursor:pointer;color:var(--tx)">Cancelar</button>
        <button onclick="confirmarCrearInteresado()" style="padding:10px 18px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">💾 Guardar Lead</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  setTimeout(() => {
    const ta = document.getElementById('int_nota');
    if (ta && window.attachMentionAutocomplete) window.attachMentionAutocomplete(ta);
  }, 50);
}

window.confirmarCrearInteresado = async function() {
  const inm = document.getElementById('int_inm')?.value;
  const nombre = document.getElementById('int_nombre')?.value.trim();
  const tel = document.getElementById('int_tel')?.value.trim();
  const email = document.getElementById('int_email')?.value.trim();
  const canal = document.getElementById('int_canal')?.value;
  const urg = document.getElementById('int_urg')?.value;
  const pmin = parseFloat(document.getElementById('int_pmin')?.value) || null;
  const pmax = parseFloat(document.getElementById('int_pmax')?.value) || null;
  const nota = document.getElementById('int_nota')?.value.trim();

  if (!inm) return window.toast('Falta seleccionar inmueble', 'terr');
  if (!nombre || nombre.length < 3) return window.toast('Nombre demasiado corto', 'terr');
  if (!tel || tel.length < 7) return window.toast('Teléfono inválido', 'terr');
  if (!nota) return window.toast('La nota inicial es obligatoria', 'terr');

  try {
    await window.crearInteresado({
      inmueble_id: inm, nombre_completo: nombre, telefono: tel,
      email: email || null, canal_origen: canal, urgencia: urg || null,
      presupuesto_min: pmin, presupuesto_max: pmax, nota_inicial: nota,
    });
    document.getElementById('intOv')?.remove();
    window.toast('✅ Lead creado');
    if (location.hash.includes('interesados') && window.rInteresados) window.rInteresados();
    if (window.rInteresadosEnTarjeta) window.rInteresadosEnTarjeta(inm);
  } catch (e) {
    window.toast('Error: ' + (e.message || 'no se pudo crear'), 'terr');
  }
};

// ============================================================
// VISTA DETALLE + TIMELINE
// ============================================================

window.abrirDetalleInteresado = async function(id) {
  document.getElementById('detLeadOv')?.remove();
  const ov = document.createElement('div');
  ov.id = 'detLeadOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(4px)';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = '<div style="background:var(--cd);border-radius:14px;max-width:640px;width:100%;max-height:92vh;overflow-y:auto;padding:30px;text-align:center">⏳ Cargando…</div>';
  document.body.appendChild(ov);

  try {
    const [lead, hist, inmsAdic, visitas] = await Promise.all([
      window.obtenerInteresado(id),
      window.obtenerHistorial(id),
      window.obtenerInmueblesAdicionales(id),
      window.obtenerVisitas({ interesado_id: id }),
    ]);
    if (!lead) { ov.innerHTML = '<div style="color:#fff;text-align:center">No encontrado</div>'; return; }
    _pintarDetalle(ov, lead, hist, inmsAdic, visitas);
  } catch (e) {
    ov.innerHTML = `<div style="background:var(--cd);padding:30px;border-radius:10px;color:var(--tx)">Error: ${e.message || e}</div>`;
  }
};

function _pintarDetalle(ov, lead, hist, inmsAdic, visitas) {
  const tip = _TIP()[lead.tipificacion] || {};
  const inm = lead.inmueble || {};
  const asignado = lead.asignado || {};
  const creador = lead.creador || {};
  const canal = _CAN()[lead.canal_origen] || {};

  // Tipos de actividad icon
  const ICO = {
    nota:'📝', llamada:'📞', whatsapp:'💬', email:'📧',
    visita_agendada:'📅', visita_realizada:'✅',
    cambio_tipificacion:'🔄', mencion:'@', creacion:'➕', cambio_asesor:'👤',
  };

  const fmtFecha = iso => iso ? new Date(iso).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';

  let h = `<div style="background:var(--cd);border-radius:14px;max-width:700px;width:100%;max-height:92vh;overflow-y:auto">
    <div style="padding:16px 20px;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:start;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="font-size:18px;font-weight:800;color:var(--tx)">${lead.nombre_completo || 'Sin nombre'}</div>
        <div style="font-size:12px;color:var(--sub);margin-top:3px">
          📱 ${lead.telefono || '—'}${lead.email ? ' · ✉️ ' + lead.email : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <span style="font-size:10px;font-weight:800;background:${tip.color}22;color:${tip.color};padding:3px 9px;border-radius:10px">${tip.emoji} ${tip.label}</span>
          <span style="font-size:10px;font-weight:700;background:var(--b50);color:var(--b700);padding:3px 9px;border-radius:10px">${canal.emoji || ''} ${canal.label || lead.canal_origen}</span>
          ${lead.urgencia ? `<span style="font-size:10px;font-weight:700;background:#f59e0b22;color:#b45309;padding:3px 9px;border-radius:10px">⚡ ${lead.urgencia}</span>` : ''}
        </div>
      </div>
      <button onclick="document.getElementById('detLeadOv').remove()" style="background:none;border:none;font-size:24px;color:var(--sub);cursor:pointer">×</button>
    </div>

    <div style="padding:14px 20px;background:var(--b50);border-bottom:1px solid var(--brd);display:flex;gap:12px;align-items:flex-start">
      ${(() => {
        const f = _fotoInm(inm.id);
        const e = _emoInm(inm.tipo);
        return f
          ? `<div style="width:64px;height:64px;border-radius:10px;background-image:url('${f}');background-size:cover;background-position:center;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,.12)"></div>`
          : `<div style="width:64px;height:64px;border-radius:10px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${e}</div>`;
      })()}
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:var(--sub);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">🏠 Inmueble principal</div>
        <div style="font-size:13px;color:var(--tx);font-weight:700">${inm.codigo_house ? inm.codigo_house + ' · ' : ''}${inm.tipo || 'Inmueble'}${inm.barrio ? ' en ' + inm.barrio : inm.ciudad ? ' en ' + inm.ciudad : ''}</div>
        ${inm.negociacion ? `<div style="font-size:10px;color:var(--sub);margin-top:2px">${inm.negociacion}</div>` : ''}
        ${inmsAdic.length ? `<div style="font-size:11px;color:var(--sub);margin-top:6px">⭐ También interesado en: ${inmsAdic.map(x => x.inmueble?.codigo_house || '').filter(Boolean).join(', ')}</div>` : ''}
        ${asignado.nombre ? `<div style="font-size:11px;color:var(--sub);margin-top:4px">👤 Asignado a: ${asignado.nombre}${asignado.id !== creador.id && creador.nombre ? ' · Creado por: ' + creador.nombre : ''}</div>` : ''}
      </div>
    </div>

    ${(() => {
      // Banner de contacto del gestor cuando el inmueble es arriendo
      const esArr = (inm.negociacion || '').toLowerCase().includes('arriendo');
      if (!esArr) return '';
      const tel = asignado.telefono_contacto;
      const nom = asignado.nombre || 'Gestor de arriendos';
      if (!tel) {
        return `<div style="padding:10px 20px;background:#fef3c7;border-bottom:1px solid #fcd34d;font-size:11px;color:#92400e;display:flex;align-items:center;gap:8px">
          🔑 <strong>Arriendo</strong> — Asignado a <strong>${nom}</strong> (sin teléfono registrado)
        </div>`;
      }
      const telClean = tel.replace(/\D/g,'');
      const waUrl = 'https://wa.me/' + (telClean.startsWith('57') ? telClean : '57' + telClean);
      const telUrl = 'tel:+' + (telClean.startsWith('57') ? telClean : '57' + telClean);
      return `<div style="padding:12px 20px;background:linear-gradient(90deg,#fef3c7,#fde68a);border-bottom:1px solid #fcd34d;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px">
          <div style="font-size:10px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:.5px">🔑 Arriendo — Redirige a gestor</div>
          <div style="font-size:13px;font-weight:700;color:#78350f;margin-top:2px">${nom}</div>
          <div style="font-size:12px;color:#92400e;margin-top:1px">📱 ${tel}</div>
        </div>
        <a href="${waUrl}" target="_blank" onclick="event.stopPropagation()" style="padding:8px 14px;background:#25d366;color:#fff;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap">💬 WhatsApp</a>
        <a href="${telUrl}" onclick="event.stopPropagation()" style="padding:8px 14px;background:#2563eb;color:#fff;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap">📞 Llamar</a>
      </div>`;
    })()}

    <div style="padding:14px 20px;display:flex;gap:8px;flex-wrap:wrap">
      <select id="lead_chg_tip" onchange="onCambiarTipUI('${lead.id}',this.value)" style="padding:10px 12px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;font-weight:700;background:var(--cd);color:var(--tx);min-height:42px;flex:1;min-width:140px">
        ${Object.values(_TIP()).sort((a,b)=>a.orden-b.orden).map(t => `<option value="${t.id}" ${t.id===lead.tipificacion?'selected':''}>${t.emoji} ${t.label}</option>`).join('')}
      </select>
      <button onclick="abrirAgendarVisitaLead('${lead.id}','${inm.id}')" style="padding:10px 14px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;min-height:42px">📅 Agendar visita</button>
      <button onclick="abrirNotaLead('${lead.id}')" style="padding:10px 14px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;min-height:42px">📝 Nueva nota</button>
      ${window.userStore?.get()?.rol === 'admin' ? `<button onclick="confirmarEliminarLead('${lead.id}','${(lead.nombre_completo||'').replace(/'/g,'\\\'')}')" title="Eliminar lead" style="padding:10px 14px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;min-height:42px">🗑️ Eliminar</button>` : ''}
    </div>`;

  // Visitas pendientes
  if (visitas.length) {
    h += `<div style="padding:0 20px 10px"><div style="font-size:11px;color:var(--sub);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📅 Visitas</div>`;
    visitas.forEach(v => {
      const badges = { pendiente:['#f59e0b','pendiente'], realizada:['#22c55e','realizada'], cancelada:['#ef4444','cancelada'], no_asistio:['#6b7280','no asistió'], reprogramada:['#8b5cf6','reprogramada'] };
      const [col,lbl] = badges[v.estado] || ['#6b7280',v.estado];
      h += `<div style="padding:8px 10px;background:var(--b50);border-radius:8px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="font-size:12px;color:var(--tx)">${v.fecha_visita} · ${v.hora_visita} · ${v.tipo_visita}</div>
        <div style="display:flex;gap:4px;align-items:center">
          <span style="font-size:10px;font-weight:800;background:${col}22;color:${col};padding:2px 8px;border-radius:8px">${lbl}</span>
          ${v.estado==='pendiente' ? `<button onclick="marcarVisita('${v.id}','realizada')" title="Realizada" style="background:none;border:none;cursor:pointer;font-size:14px">✅</button><button onclick="marcarVisita('${v.id}','no_asistio')" title="No asistió" style="background:none;border:none;cursor:pointer;font-size:14px">⚪</button><button onclick="marcarVisita('${v.id}','cancelada')" title="Cancelar" style="background:none;border:none;cursor:pointer;font-size:14px">❌</button>` : ''}
        </div>
      </div>`;
    });
    h += `</div>`;
  }

  // Historial
  h += `<div style="padding:10px 20px 20px">
    <div style="font-size:11px;color:var(--sub);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📜 Historial</div>`;
  if (!hist.length) {
    h += `<div style="padding:20px;text-align:center;color:var(--sub);font-size:12px">Sin actividades registradas</div>`;
  } else {
    h += `<div style="position:relative;padding-left:18px;border-left:2px solid var(--brd)">`;
    hist.forEach(hh => {
      const ico = ICO[hh.tipo_actividad] || '•';
      const desc = (hh.descripcion || '').replace(/</g,'&lt;').replace(/@(HOUSE-\d+|[a-zA-Z0-9_.]+)/g, '<span style="background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:4px;font-weight:700">@$1</span>');
      h += `<div style="position:relative;padding:6px 0 12px 14px;margin-left:-2px">
        <div style="position:absolute;left:-23px;top:4px;width:26px;height:26px;background:var(--cd);border:2px solid var(--brd);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">${ico}</div>
        <div style="font-size:12px;color:var(--tx);line-height:1.5">${desc}</div>
        <div style="font-size:10px;color:var(--sub);margin-top:3px">${hh.asesor?.nombre || 'Sistema'} · ${fmtFecha(hh.created_at)}</div>
      </div>`;
    });
    h += `</div>`;
  }
  h += `</div></div>`;

  ov.innerHTML = h;
}

// ============================================================
// ACCIONES DENTRO DEL DETALLE
// ============================================================

window.confirmarEliminarLead = async function(leadId, nombre) {
  const motivo = prompt(`¿Eliminar lead "${nombre}"?\n\nSe marca como descartado (no se borra físicamente).\n\nMotivo (opcional):`);
  if (motivo === null) return; // usuario canceló
  try {
    await window.eliminarInteresado(leadId, motivo || null);
    document.getElementById('detLeadOv')?.remove();
    window.toast('🗑️ Lead eliminado');
    if (location.hash.includes('interesados') && window.rInteresados) window.rInteresados();
  } catch (e) {
    if (e.message === 'solo_admin_elimina') window.toast('❌ Solo admin puede eliminar', 'terr');
    else window.toast('Error: ' + e.message, 'terr');
  }
};

// Mobile-friendly: cambiar tipificación desde la tarjeta del Kanban
window.moverLeadDesdeTarjeta = async function(leadId, nuevaTip, ev) {
  ev?.stopPropagation();
  if (!nuevaTip) return;
  try {
    if (nuevaTip === 'cierre_ganado' || nuevaTip === 'cierre_perdido') {
      const ok = await (window.cfShow ? window.cfShow('🏆', `¿Mover a ${_TIP()[nuevaTip].label}?`, 'Esta acción cambia el estado del lead y queda registrada en el historial.') : window.confirm(`¿Mover a ${_TIP()[nuevaTip].label}?`));
      if (!ok) return;
    }
    await window.cambiarTipificacion(leadId, nuevaTip);
    window.toast('✅ Movido a ' + _TIP()[nuevaTip].label);
    window.rInteresados();
  } catch (e) {
    if (e.message === 'requiere_visita_realizada') window.toast('❌ Requiere visita realizada previa', 'terr');
    else window.toast('Error: ' + (e.message || 'no se pudo mover'), 'terr');
  }
};

window.onCambiarTipUI = async function(leadId, nuevaTip) {
  try {
    await window.cambiarTipificacion(leadId, nuevaTip);
    window.toast('✅ Estado cambiado');
    window.abrirDetalleInteresado(leadId);
    if (window.rInteresados && location.hash.includes('interesados')) window.rInteresados();
  } catch (e) {
    if (e.message === 'requiere_visita_realizada') {
      window.toast('❌ Cierre ganado requiere visita realizada previa', 'terr');
    } else {
      window.toast('Error: ' + (e.message || 'no se pudo cambiar'), 'terr');
    }
    window.abrirDetalleInteresado(leadId);
  }
};

window.abrirNotaLead = function(leadId) {
  document.getElementById('notaOv')?.remove();
  const ov = document.createElement('div');
  ov.id = 'notaOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:14px';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div style="background:var(--cd);border-radius:14px;max-width:500px;width:100%">
    <div style="padding:16px 20px;border-bottom:1px solid var(--brd);font-weight:800;color:var(--tx)">📝 Nueva nota</div>
    <div style="padding:18px 20px">
      <select id="nota_tipo" style="width:100%;padding:10px;border:1.5px solid var(--brd);border-radius:8px;margin-bottom:10px;background:var(--cd);color:var(--tx)">
        <option value="nota">📝 Nota general</option>
        <option value="llamada">📞 Llamada</option>
        <option value="whatsapp">💬 WhatsApp</option>
        <option value="email">📧 Email</option>
      </select>
      <textarea id="nota_txt" rows="5" placeholder="Describe la interacción. Usa @nombre para mencionar, @HOUSE-XXX para vincular inmuebles, @todos para todo el equipo."
        style="width:100%;padding:10px;border:1.5px solid var(--brd);border-radius:8px;font-size:13px;background:var(--cd);color:var(--tx);resize:vertical;font-family:inherit"></textarea>
    </div>
    <div style="padding:14px 20px;border-top:1px solid var(--brd);display:flex;justify-content:flex-end;gap:8px">
      <button onclick="document.getElementById('notaOv').remove()" style="padding:10px 16px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;font-weight:700;color:var(--tx);cursor:pointer">Cancelar</button>
      <button onclick="confirmarNota('${leadId}')" style="padding:10px 18px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">Guardar</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(() => {
    const ta = document.getElementById('nota_txt');
    if (ta) {
      ta.focus();
      if (window.attachMentionAutocomplete) window.attachMentionAutocomplete(ta);
    }
  }, 50);
};

window.confirmarNota = async function(leadId) {
  const tipo = document.getElementById('nota_tipo')?.value || 'nota';
  const txt = document.getElementById('nota_txt')?.value.trim();
  if (!txt) return window.toast('Escribe la nota', 'terr');
  try {
    await window.agregarNotaHistorial(leadId, tipo, txt);
    document.getElementById('notaOv')?.remove();
    window.toast('✅ Nota agregada');
    window.abrirDetalleInteresado(leadId);
  } catch (e) { window.toast('Error: ' + e.message, 'terr'); }
};

// ============================================================
// AGENDAR VISITA
// ============================================================

window.abrirAgendarVisitaLead = function(leadId, inmuebleId) {
  document.getElementById('visOv')?.remove();
  const manana = new Date(Date.now() + 864e5).toISOString().split('T')[0];
  const ov = document.createElement('div');
  ov.id = 'visOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:14px';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div style="background:var(--cd);border-radius:14px;max-width:440px;width:100%">
    <div style="padding:16px 20px;border-bottom:1px solid var(--brd);font-weight:800;color:var(--tx)">📅 Agendar visita</div>
    <div style="padding:18px 20px">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1"><label style="font-size:11px;font-weight:800;color:var(--sub)">Fecha *</label>
          <input id="vis_fecha" type="date" min="${manana}" value="${manana}" style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;background:var(--cd);color:var(--tx)">
        </div>
        <div style="flex:1"><label style="font-size:11px;font-weight:800;color:var(--sub)">Hora *</label>
          <input id="vis_hora" type="time" value="10:00" style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;background:var(--cd);color:var(--tx)">
        </div>
      </div>
      <div style="margin-bottom:10px"><label style="font-size:11px;font-weight:800;color:var(--sub)">Tipo</label>
        <select id="vis_tipo" style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;background:var(--cd);color:var(--tx)">
          <option value="presencial">🚶 Presencial</option>
          <option value="virtual">💻 Virtual</option>
        </select>
      </div>
      <div><label style="font-size:11px;font-weight:800;color:var(--sub)">Notas (opcional)</label>
        <textarea id="vis_notas" rows="2" placeholder="Ej: en la portería del edificio…" style="width:100%;margin-top:4px;padding:10px;border:1.5px solid var(--brd);border-radius:8px;background:var(--cd);color:var(--tx);resize:vertical;font-family:inherit"></textarea>
      </div>
    </div>
    <div style="padding:14px 20px;border-top:1px solid var(--brd);display:flex;justify-content:flex-end;gap:8px">
      <button onclick="document.getElementById('visOv').remove()" style="padding:10px 16px;background:var(--cd);border:1px solid var(--brd);border-radius:8px;font-weight:700;color:var(--tx);cursor:pointer">Cancelar</button>
      <button onclick="confirmarAgendarVisita('${leadId}','${inmuebleId}')" style="padding:10px 18px;background:#f97316;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">📨 Agendar</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(() => {
    const ta = document.getElementById('vis_notas');
    if (ta && window.attachMentionAutocomplete) window.attachMentionAutocomplete(ta);
  }, 50);
};

window.confirmarAgendarVisita = async function(leadId, inmuebleId) {
  const fecha = document.getElementById('vis_fecha')?.value;
  const hora = document.getElementById('vis_hora')?.value;
  const tipo = document.getElementById('vis_tipo')?.value;
  const notas = document.getElementById('vis_notas')?.value.trim();
  if (!fecha || !hora) return window.toast('Fecha y hora son obligatorias', 'terr');
  try {
    await window.agendarVisita({
      interesado_id: leadId, inmueble_id: inmuebleId,
      fecha_visita: fecha, hora_visita: hora, tipo_visita: tipo,
      notas_visita: notas || null,
    });
    document.getElementById('visOv')?.remove();
    window.toast('✅ Visita agendada');
    window.abrirDetalleInteresado(leadId);
  } catch (e) {
    if (e.message === 'conflicto_horario') window.toast('❌ Ya tienes una visita a esa hora', 'terr');
    else window.toast('Error: ' + (e.message || e), 'terr');
  }
};

window.marcarVisita = async function(visitaId, nuevoEstado) {
  try {
    let notas = null;
    if (nuevoEstado === 'realizada') {
      notas = prompt('Notas de la visita (opcional):') || null;
    }
    await window.cambiarEstadoVisita(visitaId, nuevoEstado, notas);
    window.toast('✅ Visita actualizada');
    // Refrescar detalle abierto
    const leadId = document.getElementById('lead_chg_tip')?.getAttribute('onchange')?.match(/'([^']+)'/)?.[1];
    if (leadId) window.abrirDetalleInteresado(leadId);
  } catch (e) { window.toast('Error: ' + e.message, 'terr'); }
};

// ============================================================
// BADGE EN TARJETA DE INMUEBLE
// ============================================================

/**
 * Devuelve el HTML del botón + badge de interesados para incrustar
 * en las tarjetas del pipeline/portafolio. Carga count async.
 */
window.badgeInteresadosInmueble = function(inmuebleId) {
  const id = 'badgeInt-' + inmuebleId;
  setTimeout(async () => {
    try {
      const n = await window.contarInteresadosPorInmueble(inmuebleId);
      const el = document.getElementById(id);
      if (el) {
        el.querySelector('.int-count').textContent = n;
        if (n > 0) {
          el.style.background = '#3b82f6';
          el.style.color = '#fff';
          el.style.borderColor = '#3b82f6';
        }
      }
    } catch {}
  }, 50);
  return `<button id="${id}" onclick="event.stopPropagation();abrirCrearInteresado('${inmuebleId}')"
    title="Ver/agregar interesados"
    style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1.5px solid #3b82f6;background:#eff6ff;border-radius:8px;font-size:13px;font-weight:800;color:#1d4ed8;cursor:pointer;white-space:nowrap;box-shadow:0 1px 2px rgba(59,130,246,.08)">
    👤 <span class="int-count">0</span>
  </button>`;
};
