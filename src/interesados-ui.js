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

const _TIP = () => window.TIPIFICACIONES || {};
const _CAN = () => window.CANAL_ORIGEN_LEAD || {};

// Estado UI
window._intState = window._intState || {
  filtroAsesor: 'todos',
  filtroInmueble: null,
  filtroUrgencia: null,
  cargando: false,
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
    const filtros = esAdmin ? {} : { asesor_id: u.id };
    const leads = await window.listarInteresados(filtros);

    // KPIs por tipificación
    const porTip = {};
    Object.keys(_TIP()).forEach(k => porTip[k] = []);
    leads.forEach(l => {
      if (!porTip[l.tipificacion]) porTip[l.tipificacion] = [];
      porTip[l.tipificacion].push(l);
    });

    let h = '';

    // Header
    h += `<div class="card" style="margin-bottom:12px"><div class="cdh">
      <div class="chl"><div class="chi">👤</div><div>
        <div class="cht">Interesados / Leads</div>
        <div class="chsb">${leads.length} leads ${esAdmin ? 'totales' : 'míos'} · Pipeline con drag & drop</div>
      </div></div>
      <button onclick="abrirCrearInteresadoLibre()" style="padding:8px 14px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:8px;font-weight:800;font-size:12px;cursor:pointer">+ Nuevo Lead</button>
    </div></div>`;

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
          h += `<div class="kcard" draggable="true" ondragstart="onDragStartLead(event,'${l.id}')"
              onclick="abrirDetalleInteresado('${l.id}')"
              style="padding:10px;background:#fff;border:1px solid var(--brd);border-radius:8px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.04)">
            <div style="font-size:12px;font-weight:700;color:var(--tx);line-height:1.3">${(l.nombre_completo || 'Sin nombre').slice(0,40)}</div>
            ${inm.codigo_house ? `<div style="font-size:10px;color:var(--b600);font-weight:700;margin-top:2px">${inm.codigo_house}</div>` : ''}
            <div style="font-size:10px;color:var(--sub);margin-top:3px">${inm.tipo || ''}${inm.barrio ? ' · ' + inm.barrio : inm.ciudad ? ' · ' + inm.ciudad : ''}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
              <div style="font-size:10px;color:var(--sub)">${canal.emoji || '📱'} ${l.telefono || '—'}</div>
              <div style="font-size:10px">${urgent} ${dias}d</div>
            </div>
          </div>`;
        });
      }
      h += `</div></div>`;
    });
    h += `</div>`;

    el.innerHTML = h;
  } catch (e) {
    console.error('[rInteresados]', e);
    el.innerHTML = '<div class="card"><div class="cdb"><div class="emp"><span class="emp-i">⚠️</span><h3>Error</h3><p>' + (e.message || e) + '</p></div></div></div>';
  }
};

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

    <div style="padding:14px 20px;background:var(--b50);border-bottom:1px solid var(--brd)">
      <div style="font-size:11px;color:var(--sub);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">🏠 Inmueble principal</div>
      <div style="font-size:13px;color:var(--tx);font-weight:700">${inm.codigo_house ? inm.codigo_house + ' · ' : ''}${inm.tipo || 'Inmueble'}${inm.barrio ? ' en ' + inm.barrio : inm.ciudad ? ' en ' + inm.ciudad : ''}</div>
      ${inmsAdic.length ? `<div style="font-size:11px;color:var(--sub);margin-top:6px">⭐ También interesado en: ${inmsAdic.map(x => x.inmueble?.codigo_house || '').filter(Boolean).join(', ')}</div>` : ''}
      ${asignado.nombre ? `<div style="font-size:11px;color:var(--sub);margin-top:4px">👤 Asignado a: ${asignado.nombre}${asignado.id !== creador.id && creador.nombre ? ' · Creado por: ' + creador.nombre : ''}</div>` : ''}
    </div>

    <div style="padding:14px 20px;display:flex;gap:8px;flex-wrap:wrap">
      <select id="lead_chg_tip" onchange="onCambiarTipUI('${lead.id}',this.value)" style="padding:8px 10px;border:1.5px solid var(--brd);border-radius:8px;font-size:12px;font-weight:700;background:var(--cd);color:var(--tx)">
        ${Object.values(_TIP()).sort((a,b)=>a.orden-b.orden).map(t => `<option value="${t.id}" ${t.id===lead.tipificacion?'selected':''}>${t.emoji} ${t.label}</option>`).join('')}
      </select>
      <button onclick="abrirAgendarVisitaLead('${lead.id}','${inm.id}')" style="padding:8px 14px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📅 Agendar visita</button>
      <button onclick="abrirNotaLead('${lead.id}')" style="padding:8px 14px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📝 Nueva nota</button>
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
  setTimeout(() => document.getElementById('nota_txt')?.focus(), 50);
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
  // Carga async del count
  setTimeout(async () => {
    try {
      const n = await window.contarInteresadosPorInmueble(inmuebleId);
      const el = document.getElementById(id);
      if (el) {
        el.querySelector('.int-count').textContent = n;
        if (n > 0) el.style.background = '#3b82f622';
      }
    } catch {}
  }, 50);
  return `<button id="${id}" onclick="event.stopPropagation();abrirCrearInteresado('${inmuebleId}')"
    title="Agregar interesado"
    style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid var(--brd);background:var(--cd);border-radius:6px;font-size:10px;font-weight:700;color:var(--tx);cursor:pointer">
    👤 <span class="int-count">·</span> +
  </button>`;
};
