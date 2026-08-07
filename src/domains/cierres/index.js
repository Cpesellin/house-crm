/**
 * Módulo: domains/cierres
 *
 * Registro de cierres (venta/arriendo) con comisiones flexibles entre N
 * participantes y % libres. Se dispara cuando un inmueble cambia a estado
 * Arrendado o Vendido (ver ejecutarCambioEstado en functions.js).
 *
 * Flujo:
 *   abrirFormularioCierre(inmId, estado) → modal
 *     ├── porcentaje de comisión (preset 2/3/4/5% venta, 5/8/10% arriendo, custom)
 *     ├── distribución entre participantes (presets 100 | 50/50 | 60/40 | 34/33/33)
 *     ├── selector de "interesado" (auto-fill nombre desde intereses verdes)
 *     └── _guardarCierre → inserts cierres + participantes_comision,
 *                          mueve inmueble a Vendido/Arrendado,
 *                          notifica captador + cada participante.
 *
 * Post-cierre: marcarPagoParticipante(id) marca comisión pagada + notifica.
 *
 * Superficie expuesta en window.* (onclick inline en el modal):
 *   calcularComision, abrirFormularioCierre, _cierreFillNombre,
 *   _cierreRenderPctBar, _cierreRenderParticipantes, _cierreAddParticipante,
 *   _cierreApplyPreset, _cierreRefreshPreview, _guardarCierre,
 *   marcarPagoParticipante, marcarPagoCierre (legacy).
 */

import { getSupabaseClient } from '../../config/supabase.js';

// ─── Shortcuts locales ───────────────────────────────────────────────
const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const findInm = (id) => (window.D || []).find((p) => p.id === id);
const fm = window.fm || ((n) => (n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : ''));
const descInm = (p) => window.descInm ? window.descInm(p) : (p ? (p.tipo || 'Inmueble') + ' en ' + (p.ciudad || '?') : 'inmueble');

// ─── Configuración del dominio ───────────────────────────────────────
const _PCTS = { venta: 0.03, arriendo: 0.10 };
const _PCT_OPTS = { venta: [2, 3, 4, 5], arriendo: [5, 8, 10] };
const _ROL_LABELS = {
  house: '🏢 Inmobiliaria House',
  comisionista_inmueble: '🤝 Comisionista (inmueble)',
  comisionista_comprador: '🤝 Comisionista (comprador)',
  asesor_captador: '👤 Asesor captador',
  referidor: '🎁 Referidor',
  otro: '📋 Otro',
};
const _PRESETS = [[100], [50, 50], [60, 40], [40, 60], [34, 33, 33]];

window.calcularComision = function (tipo, precio, pct) {
  const p = pct || _PCTS[tipo] || 0.03;
  return Math.round(precio * p);
};

window.abrirFormularioCierre = function (inmId, estadoDestino) {
  const p = findInm(inmId);
  if (!p) { window.toast('Inmueble no encontrado', 'terr'); return; }
  const tipo = estadoDestino === 'Vendido' ? 'venta' : 'arriendo';
  const ico = tipo === 'venta' ? '💰' : '🔑';
  const precioSug = p.precio || 0;
  const pctDef = _PCTS[tipo];

  // Init participants: House 100%; si el inmueble lo publicó un comisionista, split 50/50
  window._cierreParticipantes = [{ rol: 'house', nombre: 'Inmobiliaria House', porcentaje: 100, usuario_id: null }];
  if (p.comisionista_id) {
    window._cierreParticipantes = [
      { rol: 'house', nombre: 'Inmobiliaria House', porcentaje: 50, usuario_id: null },
      { rol: 'comisionista_inmueble', nombre: p.captador?.nombre || 'Comisionista', porcentaje: 50, usuario_id: p.comisionista_id },
    ];
  }
  window._cierrePct = pctDef;

  // Cargar intereses verdes (calificados) de este inmueble como opciones
  let interesesOpts = '';
  const iDiv = document.getElementById('pc-intereses-' + inmId);
  if (iDiv) {
    try {
      JSON.parse(iDiv.textContent || '[]')
        .filter((i) => i.score === 'verde' && i.estado !== 'descartado')
        .forEach((i) => {
          interesesOpts += '<option value="' + i.id + '" data-nombre="' + (i.usuario?.nombre || '') + '">' + (i.usuario?.nombre || 'Sin nombre') + '</option>';
        });
    } catch (e) { /* noop */ }
  }

  const html = `
  <div class="modal-cierre" style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)this.remove()">
    <div style="background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()">
      <div style="padding:20px 20px 0"><div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><span style="font-size:28px">${ico}</span><div><div style="font-family:Fraunces,serif;font-size:18px;font-weight:800;color:var(--tx)">Registrar cierre</div><div style="font-size:12px;color:var(--sub)">${tipo === 'venta' ? 'Venta' : 'Arriendo'} · ${descInm(p)}</div></div></div></div>
      <div style="padding:0 20px 20px">
        <label style="display:block;margin-bottom:12px"><span style="font-size:12px;font-weight:700;color:var(--sub)">Precio final ${tipo === 'venta' ? 'de venta' : '(canon mensual)'} *</span>
          <input id="cierre-precio" type="text" value="${precioSug ? fm(precioSug) : ''}" oninput="window._cierreRefreshPreview('${tipo}')" style="width:100%;padding:10px 12px;border:1.5px solid var(--g200);border-radius:10px;font-size:15px;font-family:inherit;margin-top:4px;box-sizing:border-box"></label>
        <label style="display:block;margin-bottom:12px"><span style="font-size:12px;font-weight:700;color:var(--sub)">Fecha de cierre *</span>
          <input id="cierre-fecha" type="date" value="${new Date().toISOString().slice(0, 10)}" style="width:100%;padding:10px 12px;border:1.5px solid var(--g200);border-radius:10px;font-size:14px;font-family:inherit;margin-top:4px;box-sizing:border-box"></label>
        <label style="display:block;margin-bottom:12px"><span style="font-size:12px;font-weight:700;color:var(--sub)">${tipo === 'venta' ? 'Comprador' : 'Arrendatario'} (nombre)</span>
          ${interesesOpts ? '<select id="cierre-interes" onchange="window._cierreFillNombre(this)" style="width:100%;padding:10px 12px;border:1.5px solid var(--g200);border-radius:10px;font-size:14px;font-family:inherit;margin-top:4px;margin-bottom:6px;box-sizing:border-box"><option value="">— Seleccionar interesado —</option>' + interesesOpts + '</select>' : ''}
          <input id="cierre-contraparte" type="text" placeholder="Nombre" style="width:100%;padding:10px 12px;border:1.5px solid var(--g200);border-radius:10px;font-size:14px;font-family:inherit;margin-top:4px;box-sizing:border-box"></label>
        ${tipo === 'arriendo' ? '<label style="display:block;margin-bottom:12px"><span style="font-size:12px;font-weight:700;color:var(--sub)">Duración (meses)</span><input id="cierre-duracion" type="number" min="1" value="12" style="width:100%;padding:10px 12px;border:1.5px solid var(--g200);border-radius:10px;font-size:14px;font-family:inherit;margin-top:4px;box-sizing:border-box"></label>' : ''}
        <label style="display:block;margin-bottom:12px"><span style="font-size:12px;font-weight:700;color:var(--sub)">Nota (opcional)</span>
          <textarea id="cierre-nota" rows="2" placeholder="Observaciones..." style="width:100%;padding:10px 12px;border:1.5px solid var(--g200);border-radius:10px;font-size:14px;font-family:inherit;margin-top:4px;resize:vertical;box-sizing:border-box"></textarea></label>

        <div style="font-size:12px;font-weight:700;color:var(--sub);margin-bottom:6px">Porcentaje de comisión</div>
        <div id="cierre-pct-bar" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap"></div>

        <div style="font-size:12px;font-weight:700;color:var(--sub);margin-bottom:6px">Distribución de comisión</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
          ${_PRESETS.map((pr, i) => '<button onclick="window._cierreApplyPreset(' + i + ')" style="padding:5px 10px;border:1px solid var(--g200);border-radius:8px;font-size:11px;font-weight:700;background:#fff;cursor:pointer;font-family:inherit;color:var(--sub)">' + pr.join('/') + '</button>').join('')}
        </div>
        <div id="cierre-participantes"></div>
        <button onclick="window._cierreAddParticipante()" style="width:100%;padding:8px;border:1.5px dashed var(--g200);border-radius:10px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;font-family:inherit;color:var(--b600);margin-bottom:12px">+ Agregar participante</button>
        <div id="cierre-preview" style="background:var(--b50);border-radius:12px;padding:14px;margin-bottom:16px"></div>
        <div style="display:flex;gap:10px">
          <button onclick="this.closest('.modal-cierre').remove()" style="flex:1;padding:12px;border:1.5px solid var(--g200);border-radius:10px;background:#fff;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;color:var(--sub)">Cancelar</button>
          <button onclick="window._guardarCierre('${inmId}','${tipo}')" id="cierre-btn-guardar" style="flex:1;padding:12px;border:none;border-radius:10px;background:var(--b600);color:#fff;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer">${ico} Registrar cierre</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  window._cierreRenderPctBar(tipo);
  window._cierreRenderParticipantes(tipo);
  window._cierreRefreshPreview(tipo);
};

window._cierreFillNombre = function (sel) {
  const n = sel.options[sel.selectedIndex]?.dataset?.nombre || '';
  const inp = document.getElementById('cierre-contraparte');
  if (inp && n) inp.value = n;
};

window._cierreRenderPctBar = function (tipo) {
  const bar = document.getElementById('cierre-pct-bar');
  if (!bar) return;
  const opts = _PCT_OPTS[tipo] || [3];
  let h = '';
  opts.forEach((v) => {
    const sel = Math.round(window._cierrePct * 100) === v;
    h += '<button onclick="window._cierrePct=' + (v / 100) + ';window._cierreRenderPctBar(\'' + tipo + '\');window._cierreRefreshPreview(\'' + tipo + '\')" style="padding:8px 14px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;border:2px solid ' + (sel ? 'var(--b600)' : 'var(--g200)') + ';background:' + (sel ? 'var(--b600)' : '#fff') + ';color:' + (sel ? '#fff' : 'var(--tx)') + '">' + v + '%</button>';
  });
  h += '<input id="cierre-pct-custom" type="number" min="1" max="100" placeholder="%" value="" oninput="const v=parseFloat(this.value);if(v>0&&v<=100){window._cierrePct=v/100;window._cierreRefreshPreview(\'' + tipo + '\')}" style="width:60px;padding:8px;border:2px solid var(--g200);border-radius:10px;font-size:14px;font-weight:700;text-align:center;font-family:inherit">';
  bar.innerHTML = h;
};

window._cierreRenderParticipantes = function (tipo) {
  const el = document.getElementById('cierre-participantes');
  if (!el) return;
  const parts = window._cierreParticipantes || [];
  const raw = (document.getElementById('cierre-precio')?.value || '').replace(/[^0-9]/g, '');
  const precio = parseInt(raw) || 0;
  const total = window.calcularComision(tipo, precio, window._cierrePct);
  const suma = parts.reduce((s, p) => s + (p.porcentaje || 0), 0);
  const valid = Math.abs(suma - 100) < 0.01;

  let h = '';
  parts.forEach((p, i) => {
    const monto = Math.round(total * p.porcentaje / 100);
    const isHouse = p.rol === 'house';
    h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;padding:10px;background:#fff;border:1.5px solid var(--g200);border-radius:10px">';
    h += '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (_ROL_LABELS[p.rol] || p.rol) + '</div>';
    if (!isHouse && p.nombre !== 'Inmobiliaria House') h += '<div style="font-size:11px;color:var(--sub)">' + (p.nombre || '') + '</div>';
    h += '</div>';
    h += '<input type="number" min="0" max="100" value="' + p.porcentaje + '" onchange="window._cierreParticipantes[' + i + '].porcentaje=parseFloat(this.value)||0;window._cierreRenderParticipantes(\'' + tipo + '\');window._cierreRefreshPreview(\'' + tipo + '\')" style="width:55px;padding:6px;border:1.5px solid var(--g200);border-radius:8px;font-size:14px;font-weight:700;text-align:center;font-family:inherit">%';
    h += '<span style="font-size:13px;font-weight:700;color:var(--green);min-width:80px;text-align:right">' + fm(monto) + '</span>';
    if (!isHouse) h += '<button onclick="window._cierreParticipantes.splice(' + i + ',1);window._cierreRenderParticipantes(\'' + tipo + '\');window._cierreRefreshPreview(\'' + tipo + '\')" style="background:none;border:none;font-size:16px;cursor:pointer;color:var(--red);padding:4px">✕</button>';
    else h += '<span style="width:24px"></span>';
    h += '</div>';
  });
  h += '<div style="text-align:center;font-size:12px;font-weight:700;margin-top:4px;color:' + (valid ? 'var(--green)' : 'var(--red)') + '">' + (valid ? '✅' : '❌') + ' Suma: ' + Math.round(suma) + '%</div>';
  el.innerHTML = h;
  const btn = document.getElementById('cierre-btn-guardar');
  if (btn) { btn.disabled = !valid; btn.style.opacity = valid ? '1' : '.4'; }
};

window._cierreAddParticipante = function () {
  const parts = window._cierreParticipantes || [];
  const roles = Object.keys(_ROL_LABELS).filter((r) => r !== 'house');
  const usedRoles = parts.map((p) => p.rol);
  const nextRol = roles.find((r) => !usedRoles.includes(r)) || 'otro';
  parts.push({ rol: nextRol, nombre: '', porcentaje: 0, usuario_id: null });
  window._cierreParticipantes = parts;
  const tipo = document.querySelector('.modal-cierre')?.dataset?.tipo || 'venta';
  window._cierreRenderParticipantes(tipo);
};

window._cierreApplyPreset = function (idx) {
  const preset = _PRESETS[idx];
  if (!preset) return;
  const parts = window._cierreParticipantes || [];
  while (parts.length < preset.length) parts.push({ rol: parts.length === 1 ? 'comisionista_inmueble' : 'otro', nombre: '', porcentaje: 0, usuario_id: null });
  while (parts.length > preset.length) parts.pop();
  preset.forEach((pct, i) => { parts[i].porcentaje = pct; });
  window._cierreParticipantes = parts;
  const tipo = document.querySelector('.modal-cierre')?.dataset?.tipo || 'venta';
  window._cierreRenderParticipantes(tipo);
  window._cierreRefreshPreview(tipo);
};

window._cierreRefreshPreview = function (tipo) {
  const raw = (document.getElementById('cierre-precio')?.value || '').replace(/[^0-9]/g, '');
  const precio = parseInt(raw) || 0;
  const div = document.getElementById('cierre-preview');
  if (!div) return;
  if (!precio) { div.innerHTML = '<div style="font-size:13px;color:var(--sub);text-align:center">Ingresa el precio para ver la comisión</div>'; return; }
  const pct = window._cierrePct || _PCTS[tipo];
  const total = window.calcularComision(tipo, precio, pct);
  let h = '<div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:8px">Resumen</div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:var(--sub)">Comisión total (' + Math.round(pct * 100) + '%)</span><span style="font-weight:700">' + fm(total) + '</span></div>';
  const parts = window._cierreParticipantes || [];
  parts.forEach((p) => {
    const monto = Math.round(total * p.porcentaje / 100);
    h += '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:var(--sub)">' + (_ROL_LABELS[p.rol] || p.rol) + ' (' + p.porcentaje + '%)</span><span style="font-weight:600;color:var(--green)">' + fm(monto) + '</span></div>';
  });
  div.innerHTML = h;
  window._cierreRenderParticipantes(tipo);
};

window._guardarCierre = async function (inmId, tipo) {
  const raw = (document.getElementById('cierre-precio')?.value || '').replace(/[^0-9]/g, '');
  const precio = parseInt(raw) || 0;
  if (!precio) { window.toast('Ingresa el precio final', 'twarn'); return; }
  const fecha = document.getElementById('cierre-fecha')?.value;
  if (!fecha) { window.toast('Selecciona la fecha de cierre', 'twarn'); return; }
  const parts = window._cierreParticipantes || [];
  const suma = parts.reduce((s, p) => s + (p.porcentaje || 0), 0);
  if (Math.abs(suma - 100) >= 0.01) { window.toast('La distribución debe sumar 100%', 'twarn'); return; }
  const contraparte = document.getElementById('cierre-contraparte')?.value?.trim() || null;
  const duracion = parseInt(document.getElementById('cierre-duracion')?.value) || null;
  const nota = document.getElementById('cierre-nota')?.value?.trim() || null;
  const interesId = document.getElementById('cierre-interes')?.value || null;
  const p = findInm(inmId);
  const u = U();
  const pct = window._cierrePct || _PCTS[tipo];
  const total = window.calcularComision(tipo, precio, pct);
  const housePart = parts.find((x) => x.rol === 'house');
  const casaMonto = housePart ? Math.round(total * housePart.porcentaje / 100) : total;
  const captMonto = total - casaMonto;

  // 1. Insert cierre
  let cierreId;
  try {
    const row = {
      inmueble_id: inmId, tipo, precio_final: precio, fecha_cierre: fecha,
      contraparte_nombre: contraparte, duracion_meses: duracion,
      interes_id: interesId || null, nota,
      comision_total: total, comision_captador: captMonto, comision_casa: casaMonto,
      comision_porcentaje: pct,
      captador_id: p?.captador_id || u.id, cerrado_por: u.id,
    };
    const { data: cierre, error } = await SB().from('cierres').insert(row).select('id').single();
    if (error) {
      if (/cierres/i.test(error.message) && /does not exist/i.test(error.message)) {
        window.toast('⚠️ Falta correr sql/23-cierres.sql', 'terr');
        return;
      }
      throw error;
    }
    cierreId = cierre.id;
  } catch (e) {
    console.error('[_guardarCierre]', e);
    window.toast('Error: ' + e.message, 'terr');
    return;
  }

  // 2. Insert participantes
  try {
    const rows = parts.map((pt) => ({
      cierre_id: cierreId,
      usuario_id: pt.usuario_id || null,
      nombre_externo: pt.nombre || null,
      rol_comision: pt.rol,
      porcentaje: pt.porcentaje,
      monto: Math.round(total * pt.porcentaje / 100),
    }));
    await SB().from('participantes_comision').insert(rows);
  } catch (e) { console.warn('[_guardarCierre] participantes insert:', e.message); }

  // 3. Move inmueble a Vendido/Arrendado
  const estado = tipo === 'venta' ? 'Vendido' : 'Arrendado';
  await SB().from('inmuebles').update({
    estado, fecha_estado: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', inmId);
  await SB().from('historial').insert({
    inmueble_id: inmId, usuario_id: u.id, accion: 'cambio_estado',
    campo: 'estado', valor_nuevo: estado,
  });
  if (interesId) {
    await SB().from('intereses_compradores').update({
      estado: 'cerrado', updated_at: new Date().toISOString(),
    }).eq('id', interesId);
  }
  if (estado === 'Arrendado' && typeof window.registrarComisionArrendado === 'function') {
    try { await window.registrarComisionArrendado(inmId); } catch (e) { /* noop */ }
  }

  // 4. Notifications
  const desc = descInm(p);
  const ico = tipo === 'venta' ? '💰' : '🔑';
  await window.noti('cambio_estado', 'verde', ico + ' Cierre: ' + desc + ' → ' + estado, u.nombre + ' cerró ' + desc + '. Comisión: ' + fm(total), null, 'all', inmId);
  for (const pt of parts) {
    if (pt.usuario_id && pt.rol !== 'house') {
      const monto = Math.round(total * pt.porcentaje / 100);
      await window.noti('cierre_registrado', 'verde', '🏆 Negocio cerrado: ' + desc, 'Tu parte: ' + fm(monto) + ' (' + pt.porcentaje + '% de ' + fm(total) + ')', null, null, inmId);
      await window.mensajeDeNegocio({
        inmuebleId: inmId, clienteId: pt.usuario_id,
        contextoTipo: 'negocio', tipoMensaje: 'sistema',
        texto: '🎉 ¡Negocio cerrado! ' + desc + '. Tu comisión: ' + fm(monto) + ' (' + pt.porcentaje + '%). Te contactaremos para coordinar el pago.',
      });
    }
  }
  // Notifica al captador (propietario) si no está ya entre los participantes
  const captId = p?.captador_id;
  if (captId && !parts.some((pt) => pt.usuario_id === captId)) {
    await window.mensajeDeNegocio({
      inmuebleId: inmId, clienteId: captId,
      contextoTipo: 'negocio', tipoMensaje: 'sistema',
      texto: '🎉 ¡Tu ' + desc + ' se ' + (tipo === 'venta' ? 'vendió' : 'arrendó') + '! ' + (contraparte ? 'Con ' + contraparte + '. ' : '') + 'Te contactaremos para los siguientes pasos.',
    });
  }
  await window.noti('cierre_registrado', 'verde', '🏆 Cierre: ' + desc, u.nombre + ' registró cierre. Comisión total: ' + fm(total) + ' (' + Math.round(pct * 100) + '%). ' + parts.length + ' participantes.', null, 'admin', inmId);

  document.querySelector('.modal-cierre')?.remove();
  window.toast(ico + ' Cierre registrado. Comisión: ' + fm(total));
  window.load(); window.cmForce();
};

// Admin: marcar pago individual por participante
window.marcarPagoParticipante = async function (participanteId) {
  const ok = await window.cfShow('💵', '¿Marcar pago como realizado?', 'Se registrará como pagado.');
  if (!ok) return;
  const { error } = await SB().from('participantes_comision').update({
    pago_estado: 'pagado', pago_fecha: new Date().toISOString(),
  }).eq('id', participanteId);
  if (error) { window.toast('Error: ' + error.message, 'terr'); return; }
  const { data: pt } = await SB().from('participantes_comision')
    .select('usuario_id,monto,cierre_id,cierre:cierres(inmueble_id)')
    .eq('id', participanteId).single();
  if (pt?.usuario_id) {
    await window.noti('cierre_venta_pagada', 'verde', '💵 Pago registrado', 'Se te pagó ' + fm(pt.monto || 0) + ' por cierre.', null, null, pt?.cierre?.inmueble_id || null);
    await window.mensajeDeNegocio({
      inmuebleId: pt?.cierre?.inmueble_id, clienteId: pt.usuario_id,
      contextoTipo: 'negocio', tipoMensaje: 'sistema',
      texto: '✅ Tu comisión de ' + fm(pt.monto || 0) + ' fue pagada. ¡Gracias por confiar en House!',
    });
  }
  window.toast('💵 Pago registrado');
  if (typeof window.rMisNegocios === 'function') window.rMisNegocios();
};

// Backward compat: marcarPagoCierre viejo (para cierres previos al nuevo schema)
window.marcarPagoCierre = async function (cierreId, fase) {
  const campo = fase === 'a' ? 'fase_a_pagada' : fase === 'b' ? 'fase_b_pagada' : 'pagada';
  const ok = await window.cfShow('💵', '¿Marcar pago?', '');
  if (!ok) return;
  await SB().from('cierres').update({
    [campo]: true, [campo + '_at']: new Date().toISOString(),
  }).eq('id', cierreId);
  window.toast('💵 Pago registrado');
  if (typeof window.rMisNegocios === 'function') window.rMisNegocios();
};
