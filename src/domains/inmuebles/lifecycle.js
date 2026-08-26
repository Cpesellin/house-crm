/**
 * Módulo: domains/inmuebles/lifecycle
 *
 * Ciclo de vida del inmueble: cambios de estado, verificación de
 * disponibilidad, reasignación, eliminación/restauración, drag start,
 * y las solicitudes bilaterales entre asesores.
 *
 * Sec 7 (STATE CHANGES) + Sec 8 (PIPELINE ACTIONS) consolidadas.
 *
 * Superficie:
 *   chgE, confD, eliminarInm, restaurarInm, reasignarCap, delFoto
 *   quickMove (arrastre entre columnas), reVal (reset timer),
 *   dStart (dragstart), solicitarVerif, responderSol
 *
 * Deps window.*: cfShow, noti, toast, load, cmForce,
 *                abrirFormularioCierre (dominio cierres),
 *                oM (dominio detail-modal),
 *                sugerirInmuebleNuevo (matching engine),
 *                rPapelera, USERS
 */

import { getSupabaseClient } from '../../config/supabase.js';
import { actualizarEstadoInmueble, eliminarInmuebleSeguro } from './estado.js';

const SB = () => getSupabaseClient();
const U = () => window.userStore?.get();
const D = () => window.D || [];
const findInm = (id) => D().find((p) => p.id === id);
const descInm = (p) => window.descInm ? window.descInm(p) : (p ? (p.tipo || 'Inmueble') + ' en ' + (p.ciudad || '?') : 'inmueble');
const FINAL_STATES = window.FINAL_STATES || ['Arrendado', 'Vendido', 'Retirado'];

// ══════════════════════════════════════════════════════════════════════
// STATE CHANGES
// ══════════════════════════════════════════════════════════════════════

window.chgE = async function (id, e) {
  // Arrendado/Vendido → abrir formulario de cierre con comisiones (dominio cierres)
  if (e === 'Arrendado' || e === 'Vendido') { window.abrirFormularioCierre(id, e); return; }
  if (FINAL_STATES.includes(e)) {
    const ok = await window.cfShow('⛔', '¿Cambiar a ' + e + '?', 'Genera alertas a todo el equipo');
    if (!ok) return;
  }
  const p = findInm(id);
  const desc = descInm(p);
  const u = U();
  const capNom = p?.captador?.nombre || '?';
  const r = await actualizarEstadoInmueble(id, e);
  if (!r.ok) { window.toast('❌ ' + r.error, 'terr'); return; }
  await SB().from('historial').insert({ inmueble_id: id, usuario_id: u.id, accion: 'cambio_estado', campo: 'estado', valor_nuevo: e });
  if (FINAL_STATES.includes(e)) {
    await window.noti('cambio_estado', 'verde', '⛔ Cierre: ' + desc + ' → ' + e, u.nombre + ' cerró ' + desc + '. Captador: ' + capNom, null, 'all', id);
  } else {
    await window.noti('cambio_estado', 'info', '🔄 ' + desc + ' → ' + e, u.nombre + ' cambió ' + desc + ' a ' + e, null, 'all', id);
  }
  window.toast('✅ Estado: ' + e);
  window.load();
  window.cmForce();
};

window.confD = async function (id) {
  await SB().from('inmuebles').update({ ultima_confirmacion: new Date().toISOString(), fecha_estado: new Date().toISOString() }).eq('id', id);
  window.toast('✅ Confirmado');
  window.load();
  window.cmForce();
};

window.eliminarInm = async function (id) {
  const ok = await window.cfShow('🗑️', '¿Eliminar?', 'Se moverá a la papelera.');
  if (!ok) return;
  const u = U();
  const rDel = await eliminarInmuebleSeguro(id);
  if (!rDel.ok) { window.toast('❌ ' + rDel.error, 'terr'); return; }
  await SB().from('historial').insert({ inmueble_id: id, usuario_id: u.id, accion: 'eliminacion' });
  window.toast('🗑️ Enviado a papelera');
  window.load();
  window.cmForce();
};

window.restaurarInm = async function (id) {
  try {
    const { error } = await SB().from('inmuebles').update({ eliminado: false, eliminado_por: null, fecha_eliminacion: null }).eq('id', id);
    if (error) { console.error('[restaurar]', error); window.toast('Error: ' + error.message, 'terr'); return; }
    await SB().from('historial').insert({ inmueble_id: id, usuario_id: U().id, accion: 'restauracion' });
    window.toast('✅ Restaurado');
    if (window.rPapelera) window.rPapelera();
    window.load();
  } catch (e) { console.error('[restaurar]', e); window.toast('Error: ' + e.message, 'terr'); }
};

window.reasignarCap = async function (id) {
  const sel = document.getElementById('me_captador');
  if (!sel || !sel.value) { window.toast('Selecciona un asesor', 'twarn'); return; }
  const newUsr = (window.USERS || []).find((u2) => u2.id === sel.value);
  const ok = await window.cfShow('🔄', '¿Reasignar?', 'Mover a ' + (newUsr ? newUsr.nombre : '?'));
  if (!ok) return;
  await SB().from('inmuebles').update({ captador_id: sel.value, updated_at: new Date().toISOString() }).eq('id', id);
  window.toast('✅ Reasignado');
  window.load();
  window.cmForce();
};

window.delFoto = async function (fotoId, inmId) {
  const ok = await window.cfShow('🗑️', '¿Eliminar foto?', 'Permanente.');
  if (!ok) return;
  await SB().from('fotos').delete().eq('id', fotoId);
  window.toast('📷 Eliminada');
  window.load();
  const idx = D().findIndex((p) => p.id === inmId);
  if (idx >= 0) setTimeout(() => window.oM(idx), 500);
};

// ══════════════════════════════════════════════════════════════════════
// PIPELINE ACTIONS
// ══════════════════════════════════════════════════════════════════════

window.quickMove = async function (id, estado) {
  if (!id || !estado) return;
  // Arrendado/Vendido → abrir formulario de cierre
  if (estado === 'Arrendado' || estado === 'Vendido') { window.abrirFormularioCierre(id, estado); return; }
  const p = findInm(id);
  const desc = descInm(p);
  const u = U();
  const capNom = p?.captador?.nombre || '?';
  const capEmail = p?.captador?.usuario || p?.captador?.email || '';
  if (FINAL_STATES.includes(estado)) {
    const ok = await window.cfShow('⛔', '¿Mover a ' + estado + '?', 'Este inmueble dejará de aparecer en el inventario.\nSe notificará al administrador para revisión.');
    if (!ok) return;
  }
  const r = await actualizarEstadoInmueble(id, estado);
  if (!r.ok) { window.toast('❌ ' + r.error, 'terr'); return; }
  await SB().from('historial').insert({ inmueble_id: id, usuario_id: u.id, accion: 'cambio_estado', campo: 'estado', valor_nuevo: estado });
  if (estado === 'Verificar Disponibilidad') {
    await window.noti('verificar', 'rojo', '🔍 ' + u.nombre + ' solicita verificar: ' + desc, u.nombre + ' necesita saber si tu ' + desc + ' sigue disponible.', capEmail, null, id);
  } else if (estado === 'Aún Disponible') {
    await window.noti('cambio_estado', 'verde', '✅ ' + capNom + ' confirmó: ' + desc + ' disponible', capNom + ' verificó que ' + desc + ' está disponible.', null, 'all', id);
  } else if (FINAL_STATES.includes(estado)) {
    await window.noti('cambio_estado', 'verde', '⛔ Cierre: ' + desc + ' → ' + estado, u.nombre + ' cerró ' + desc + '.', null, 'all', id);
    await window.noti('eliminar_inmueble', 'rojo', '🗑️ Revisar: ' + desc + ' fue marcado como ' + estado, u.nombre + ' marcó ' + desc + ' como ' + estado + '. Revisar si se debe eliminar del sistema.', 'admin', null, id);
  } else {
    await window.noti('cambio_estado', 'info', '🔄 ' + desc + ' → ' + estado, u.nombre + ' movió ' + desc + ' a ' + estado, null, 'all', id);
  }

  // HOOK sugerencias: si vuelve a estar disponible, dispara matching
  if (estado === 'Disponible' || estado === 'Aún Disponible') {
    if (window.sugerirInmuebleNuevo) {
      window.sugerirInmuebleNuevo(id).catch((e) => console.warn('[sugerir-quickMove]', e));
    }
  }

  window.toast(estado === 'Retirado' ? '⛔ Retirado. Ya no aparecerá en inventario.' : '✅ Movido a ' + estado);
  window.load();
};

window.reVal = async function (id) {
  await SB().from('inmuebles').update({ fecha_estado: new Date().toISOString(), ultima_confirmacion: new Date().toISOString() }).eq('id', id);
  window.toast('✅ Timer reiniciado');
  window.load();
};

window.dStart = function (e, id) {
  e.dataTransfer.setData('text/plain', id);
  e.dataTransfer.effectAllowed = 'move';
  const card = document.getElementById('pkc-' + id);
  if (card) card.classList.add('dragging');
};

window.solicitarVerif = async function (inmId) {
  const p = findInm(inmId);
  const desc = descInm(p);
  const capNom = p?.captador?.nombre || '?';
  const u = U();
  const ok = await window.cfShow('🔍', '¿Consultar disponibilidad?', 'Se enviará solicitud a ' + capNom);
  if (!ok) return;
  const nota = prompt('Nota (opcional):', 'Mi cliente está interesado') || '';
  await SB().from('solicitudes').insert({ inmueble_id: inmId, solicitante_id: u.id, nota_solicitante: nota });
  const capEmail = p?.captador?.usuario || p?.captador?.email || '';
  await window.noti('verificar', 'rojo', '🔍 ' + u.nombre + ' consulta: ' + desc, u.nombre + ' pregunta si ' + desc + ' sigue disponible.' + (nota ? ' "' + nota + '"' : ''), capEmail, null, inmId);
  window.toast('🔍 Solicitud enviada');
  window.load();
};

window.responderSol = async function (solId, respuesta) {
  const u = U();
  const estados = { si: 'confirmado', no: 'no_disponible' };
  const { data: sol } = await SB().from('solicitudes').select('*,solicitante:usuarios!solicitante_id(nombre,usuario,email)').eq('id', solId).single();
  if (!sol) return;
  const p = findInm(sol.inmueble_id);
  const desc = descInm(p);
  const solEmail = sol.solicitante?.usuario || sol.solicitante?.email || '';
  const nota = prompt('Nota de respuesta (opcional):', respuesta === 'si' ? 'Disponible para visita' : 'Ya no está disponible') || '';
  await SB().from('solicitudes').update({ estado: estados[respuesta], nota_respuesta: nota, respondido_at: new Date().toISOString() }).eq('id', solId);
  if (respuesta === 'si') {
    await actualizarEstadoInmueble(sol.inmueble_id, 'Aún Disponible');
    await window.noti('cambio_estado', 'verde', '✅ ' + u.nombre + ' confirmó: ' + desc + ' disponible', u.nombre + ' confirmó a ' + sol.solicitante?.nombre, solEmail, null, sol.inmueble_id);
  } else {
    await window.noti('cambio_estado', 'rojo', '❌ ' + desc + ' no disponible', u.nombre + ' indicó que ' + desc + ' ya no está disponible.', solEmail, null, sol.inmueble_id);
  }
  window.toast(respuesta === 'si' ? '✅ Confirmado' : '❌ No disponible');
  window.load();
};
