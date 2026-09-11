/**
 * Módulo: domains/inmuebles/desactivados
 *
 * Los inmuebles que están fuera de la vitrina, y por qué.
 *
 * POR QUÉ EXISTE
 *   Un inmueble se baja y meses después toca volver a subirlo. Hasta
 *   ahora eso no dejaba rastro: la ficha sólo guardaba la fecha del
 *   último cambio de estado, así que nadie podía responder "¿por qué
 *   bajamos éste en marzo?" ni "¿es la tercera vez que el dueño lo
 *   retira?".
 *
 *   Y los inmuebles retirados quedaban dispersos en el inventario, sin
 *   un sitio donde revisarlos de vez en cuando. Un inmueble olvidado
 *   fuera de la vitrina es inventario que no produce.
 *
 * NO ES LA PAPELERA
 *   La papelera son los eliminados (`eliminado = true`). Esto son los
 *   que siguen siendo del negocio pero no se están mostrando.
 *
 * DE DÓNDE SALEN LOS DATOS
 *   El historial lo escribe un trigger en la base (sql/67), no esta
 *   pantalla: el estado se cambia desde varios sitios del CRM y si cada
 *   uno tuviera que acordarse de registrarlo, el historial tendría
 *   huecos.
 */

import { getSupabaseClient } from '../../config/supabase.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const eh = (s) => (window.escapeHtml ? window.escapeHtml(String(s ?? '')) : String(s ?? ''));

/**
 * Motivos por los que se baja un inmueble.
 *
 * Es una lista cerrada y no texto libre para poder contarlos: si el 40%
 * se retira porque el dueño no contesta, eso es un problema de gestión
 * que conviene ver. La nota libre queda aparte.
 */
export const MOTIVOS_DESACTIVAR = [
  { v: 'dueno_retiro',       l: 'El dueño lo retiró',            e: '🙋' },
  { v: 'vendido_por_fuera',  l: 'Se vendió por fuera',           e: '🏷️' },
  { v: 'arrendado_por_fuera', l: 'Se arrendó por fuera',         e: '🔑' },
  { v: 'remodelacion',       l: 'En remodelación o arreglos',    e: '🔨' },
  { v: 'precio_revision',    l: 'Precio en revisión',            e: '💲' },
  { v: 'sin_contacto',       l: 'No logramos contactar al dueño', e: '📵' },
  { v: 'documentos',         l: 'Papeles o escrituras pendientes', e: '📄' },
  { v: 'temporada',          l: 'Fuera de temporada',            e: '📆' },
  { v: 'otro',               l: 'Otro motivo',                   e: '•' },
];

const MOTIVO_LABEL = Object.fromEntries(MOTIVOS_DESACTIVAR.map((m) => [m.v, m.e + ' ' + m.l]));

function fecha(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return ''; }
}

/** Hace cuánto, en palabras. "Bajado hace 8 meses" pesa más que una fecha. */
function hace(d) {
  if (!d) return '';
  const dias = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (dias < 1) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return 'hace ' + dias + ' días';
  const meses = Math.round(dias / 30);
  if (meses < 12) return 'hace ' + meses + (meses === 1 ? ' mes' : ' meses');
  const anios = Math.floor(meses / 12);
  return 'hace ' + anios + (anios === 1 ? ' año' : ' años');
}

// ══════════════════════════════════════════════════════════════════
// Sección: lista de inmuebles fuera de la vitrina
// ══════════════════════════════════════════════════════════════════

window.rDesact = async function () {
  const el = document.getElementById('desc');
  if (!el) return;
  const u = U();
  if (!u) return;

  el.innerHTML = '<div class="ldr"><div class="lds"><div class="ld"></div><div class="ld"></div><div class="ld"></div></div></div>';

  try {
    const { data, error } = await SB()
      .from('inmuebles')
      .select('id,codigo_house,tipo,ciudad,barrio,direccion,precio_venta,precio_arriendo,estado,fecha_estado,captador:usuarios!captador_id(nombre)')
      .eq('eliminado', false)
      .eq('estado', 'Retirado')
      .order('fecha_estado', { ascending: false });
    if (error) throw error;

    if (!data || !data.length) {
      el.innerHTML = '<div class="emp"><span class="emp-i">✅</span><h3>Ningún inmueble desactivado</h3>'
        + '<p style="font-size:12px;color:var(--sub);margin-top:6px">Todo el inventario está en la vitrina.</p></div>';
      return;
    }

    // El último movimiento de cada uno, para saber POR QUÉ está abajo.
    // Una consulta para todos, no una por inmueble.
    const ids = data.map((p) => p.id);
    let ultimos = {};
    try {
      const { data: hist } = await SB()
        .from('inmueble_estado_historial')
        .select('inmueble_id,motivo,nota,usuario_nombre,created_at,estado_nuevo')
        .in('inmueble_id', ids)
        .eq('estado_nuevo', 'Retirado')
        .order('created_at', { ascending: false });
      (hist || []).forEach((h) => { if (!ultimos[h.inmueble_id]) ultimos[h.inmueble_id] = h; });
    } catch (e) {
      // Sin la migración aplicada se sigue viendo la lista, sin el motivo.
      console.debug('[desactivados] sin historial:', e?.message || e);
    }

    const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));
    const emo = window.emo || (() => '🏠');

    const cab = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <div style="font-size:12px;color:var(--sub)"><b style="color:var(--tx)">${data.length}</b> ${data.length === 1 ? 'inmueble fuera' : 'inmuebles fuera'} de la vitrina</div>
    </div>`;

    el.innerHTML = cab + data.map((p) => {
      const h = ultimos[p.id];
      const motivo = h && h.motivo ? (MOTIVO_LABEL[h.motivo] || h.motivo) : 'Sin motivo registrado';
      const quien = h && h.usuario_nombre ? h.usuario_nombre : (p.captador?.nombre || '');
      const cuando = h ? h.created_at : p.fecha_estado;
      const precio = p.precio_venta ? fm(p.precio_venta) : (p.precio_arriendo ? fm(p.precio_arriendo) + '/mes' : '');
      return `<div style="display:flex;gap:10px;align-items:flex-start;padding:12px;background:var(--cd);border:1.5px solid var(--brd);border-left:4px solid #94a3b8;border-radius:10px;margin-bottom:6px">
        <span style="font-size:20px;flex-shrink:0">${emo(p.tipo)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700">${eh(p.tipo || '')}${p.barrio ? ' · ' + eh(p.barrio) : ''}${p.ciudad ? ' · ' + eh(p.ciudad) : ''}</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">${eh(p.codigo_house || '')}${precio ? ' · ' + precio : ''}</div>
          <div style="font-size:11.5px;color:var(--tx);margin-top:5px">${eh(motivo)}</div>
          ${h && h.nota ? `<div style="font-size:11px;color:var(--sub);margin-top:2px;font-style:italic">“${eh(h.nota)}”</div>` : ''}
          <div style="font-size:10.5px;color:var(--sub);margin-top:4px">Bajado ${hace(cuando)}${cuando ? ' · ' + fecha(cuando) : ''}${quien ? ' · por ' + eh(quien) : ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
          <button onclick="reactivarInmueble('${p.id}')" style="padding:8px 13px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid var(--gb);background:var(--greenbg);color:#065f46;cursor:pointer;font-family:inherit">▶️ Reactivar</button>
          <button onclick="verHistorialEstado('${p.id}')" style="padding:7px 13px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid var(--brd);background:var(--cd);color:var(--sub);cursor:pointer;font-family:inherit">🕓 Historial</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('[desactivados]', e);
    el.innerHTML = `<div class="emp"><span class="emp-i">⚠️</span><h3>No se pudo cargar</h3><p style="font-size:12px;color:var(--sub)">${eh(e.message || '')}</p></div>`;
  }
};

// ══════════════════════════════════════════════════════════════════
// Desactivar (pide motivo) · Reactivar · Historial
// ══════════════════════════════════════════════════════════════════

/** Ventana para elegir el motivo. El motivo es obligatorio: sin él, el
 *  historial no sirve para nada dentro de seis meses. */
window.desactivarInmueble = function (id) {
  if (document.getElementById('dsDlg')) return;
  const d = document.createElement('div');
  d.id = 'dsDlg';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
  d.onclick = (ev) => { if (ev.target === d) d.remove(); };
  d.innerHTML = `<div onclick="event.stopPropagation()" style="max-width:440px;width:100%;max-height:88vh;overflow:auto;background:var(--cd);border-radius:16px;padding:20px">
    <div style="font-size:18px;font-weight:800;color:var(--tx)">Sacar de la vitrina</div>
    <div style="font-size:13px;color:var(--sub);line-height:1.5;margin-top:5px">Deja de verse en la marketplace. Sigue aquí con sus fotos, sus interesados y su historial, y se puede reactivar cuando quieras.</div>
    <div style="font-size:12px;font-weight:700;color:var(--tx);margin:16px 0 7px">¿Por qué?</div>
    <div id="dsMotivos" style="display:flex;flex-direction:column;gap:5px">
      ${MOTIVOS_DESACTIVAR.map((m) => `<label style="display:flex;align-items:center;gap:9px;padding:9px 11px;border:1.5px solid var(--brd);border-radius:9px;cursor:pointer;font-size:13px">
        <input type="radio" name="dsM" value="${m.v}" style="margin:0">
        <span>${m.e} ${m.l}</span>
      </label>`).join('')}
    </div>
    <textarea id="dsNota" rows="2" placeholder="Nota (opcional): algo que ayude a entenderlo después" style="width:100%;box-sizing:border-box;margin-top:10px;padding:10px;border:1.5px solid var(--brd);border-radius:9px;font:inherit;font-size:13px;background:var(--bg);color:var(--tx);resize:vertical"></textarea>
    <div id="dsMsg" style="font-size:12px;color:var(--red);min-height:16px;margin-top:7px"></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button onclick="document.getElementById('dsDlg').remove()" style="flex:1;padding:12px;border-radius:9px;border:1.5px solid var(--brd);background:var(--cd);color:var(--tx);font:inherit;font-size:13px;font-weight:700;cursor:pointer">Cancelar</button>
      <button id="dsOk" onclick="window._desactivarConfirmar('${id}')" style="flex:1;padding:12px;border-radius:9px;border:none;background:#475569;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer">Sacar de la vitrina</button>
    </div>
  </div>`;
  document.body.appendChild(d);
};

window._desactivarConfirmar = async function (id) {
  const sel = document.querySelector('input[name="dsM"]:checked');
  const msg = document.getElementById('dsMsg');
  const btn = document.getElementById('dsOk');
  if (!sel) { if (msg) msg.textContent = 'Elige un motivo.'; return; }

  btn.disabled = true;
  const antes = btn.textContent;
  btn.textContent = 'Guardando…';
  try {
    const { data, error } = await SB().rpc('desactivar_inmueble', {
      p_id: id,
      p_motivo: sel.value,
      p_nota: (document.getElementById('dsNota')?.value || '').trim() || null,
    });
    if (error) throw error;
    if (data && data.ok === false) throw new Error(data.error || 'no se pudo');

    document.getElementById('dsDlg')?.remove();
    if (window.toast) window.toast('Inmueble fuera de la vitrina');
    if (window.closeModal) window.closeModal();
    if (window.ldAn) await window.ldAn();
    if (window.rDesact) window.rDesact();
  } catch (e) {
    console.error('[desactivar]', e);
    if (msg) {
      msg.textContent = /function|PGRST202|42883/i.test(e.message || '')
        ? 'Falta aplicar la migración 67 en la base.'
        : (e.message || 'No se pudo');
    }
    btn.disabled = false; btn.textContent = antes;
  }
};

window.reactivarInmueble = async function (id) {
  if (!confirm('¿Volver a poner este inmueble en la vitrina?\n\nQuedará como "Verificar Disponibilidad" hasta que confirmes con el dueño que sigue disponible.')) return;
  try {
    const { data, error } = await SB().rpc('reactivar_inmueble', { p_id: id, p_nota: null });
    if (error) throw error;
    if (data && data.ok === false) throw new Error(data.error || 'no se pudo');
    if (window.toast) window.toast('Reactivado · confirma disponibilidad con el dueño');
    if (window.ldAn) await window.ldAn();
    if (window.rDesact) window.rDesact();
  } catch (e) {
    console.error('[reactivar]', e);
    if (window.toast) window.toast(e.message || 'No se pudo reactivar', 'terr');
  }
};

/** Línea de tiempo de todos los cambios de estado del inmueble. */
window.verHistorialEstado = async function (id) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
  d.onclick = (ev) => { if (ev.target === d) d.remove(); };
  d.innerHTML = `<div onclick="event.stopPropagation()" style="max-width:440px;width:100%;max-height:86vh;overflow:auto;background:var(--cd);border-radius:16px;padding:20px">
    <div style="font-size:17px;font-weight:800;margin-bottom:12px">🕓 Historial de estados</div>
    <div id="hstBody" style="font-size:13px;color:var(--sub)">Cargando…</div>
    <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;margin-top:14px;padding:11px;border-radius:9px;border:1.5px solid var(--brd);background:var(--cd);color:var(--tx);font:inherit;font-size:13px;font-weight:700;cursor:pointer">Cerrar</button>
  </div>`;
  document.body.appendChild(d);

  const body = d.querySelector('#hstBody');
  try {
    const { data, error } = await SB()
      .from('inmueble_estado_historial')
      .select('estado_anterior,estado_nuevo,motivo,nota,usuario_nombre,created_at')
      .eq('inmueble_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) {
      body.innerHTML = 'Sin movimientos registrados todavía.<br><span style="font-size:11.5px">El historial empieza a llenarse con el próximo cambio de estado: no reconstruye lo que pasó antes.</span>';
      return;
    }
    body.innerHTML = data.map((h) => `<div style="display:flex;gap:9px;padding:9px 0;border-bottom:1px solid var(--brd)">
      <div style="width:7px;height:7px;border-radius:50%;background:${h.estado_nuevo === 'Retirado' ? '#94a3b8' : '#10b981'};margin-top:6px;flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:700;color:var(--tx)">${eh(h.estado_anterior || 'Alta')} → ${eh(h.estado_nuevo)}</div>
        ${h.motivo ? `<div style="font-size:11.5px;color:var(--tx);margin-top:2px">${eh(MOTIVO_LABEL[h.motivo] || h.motivo)}</div>` : ''}
        ${h.nota ? `<div style="font-size:11px;font-style:italic;margin-top:2px">“${eh(h.nota)}”</div>` : ''}
        <div style="font-size:10.5px;margin-top:3px">${fecha(h.created_at)} · ${hace(h.created_at)}${h.usuario_nombre ? ' · ' + eh(h.usuario_nombre) : ''}</div>
      </div>
    </div>`).join('');
  } catch (e) {
    body.innerHTML = /permission|policy/i.test(e.message || '')
      ? 'No tienes permiso para ver el historial.'
      : 'No se pudo cargar el historial.';
  }
};

export default { MOTIVOS_DESACTIVAR };
