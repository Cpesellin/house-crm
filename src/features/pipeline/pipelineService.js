/**
 * HOUSE CRM — Pipeline Service
 *
 * Business logic for state transitions: quickMove, reVal, confirmations, notifications.
 * Extracted from the original quickMove(), reVal(), and related alert logic.
 *
 * CRITICAL: Notification logic is preserved EXACTLY from the original.
 * Each state transition generates specific alerts to specific recipients.
 */

import { getSupabaseClient } from '../../config/supabase.js';
import { inventory, FINAL_STATES } from '../inventory/inventoryStore.js';
import { pipeline } from './pipelineStore.js';
import { noti, toast, confirm } from '../../core/notifications.js';

// ─── Helpers ─────────────────────────────────────────────────────

function _getUser() {
  return typeof window !== 'undefined' && window.userStore ? window.userStore.get() : null;
}

function _descInm(p) {
  return p ? (p.tipo || 'Inmueble') + ' en ' + (p.ciudad || '?') : 'inmueble';
}

function _reload() {
  if (typeof window !== 'undefined' && window.load) window.load();
}

// ─── quickMove ───────────────────────────────────────────────────
// EXACT logic from original quickMove() including all notification branches.

/**
 * Move a property to a new pipeline state.
 * Handles: confirmation dialog, optimistic UI, DB update, history, notifications, reload.
 *
 * @param {string} id - Property UUID
 * @param {string} estado - Target state (from PCOLS)
 * @returns {Promise<boolean>} true if move succeeded
 */
export async function quickMove(id, estado) {
  if (!id || !estado) return false;

  const user = _getUser();
  if (!user) return false;

  // ── Confirm final states ──
  if (FINAL_STATES.includes(estado)) {
    const ok = await confirm(
      estado === 'Arrendado' ? '🔑' : estado === 'Vendido' ? '💰' : '⛔',
      '¿Mover a ' + estado + '?',
      'Genera alertas a todo el equipo'
    );
    if (!ok) return false;
  }

  const p = inventory.getById(id);
  const desc = _descInm(p);
  const capNom = p?.captador?.nombre || '?';
  const capEmail = p?.captador?.usuario || p?.captador?.email || '';

  // ── Optimistic UI: move card visually before API ──
  const cardEl = document.getElementById('pkc-' + id);
  const targetCol = document.querySelector(`.pcol[data-estado="${estado}"] .pcb`);
  if (cardEl && targetCol) {
    cardEl.classList.remove('dragging');
    targetCol.prepend(cardEl);
    // Update counters in column headers
    document.querySelectorAll('.pcol').forEach(c => {
      const n = c.querySelector('.pcb')?.children.length || 0;
      const cc = c.querySelector('.pcc');
      if (cc) cc.textContent = n;
    });
    toast('✅ Movido a ' + estado);
  }

  pipeline.optimisticMove(id, estado);

  // ── DB update ──
  const SB = getSupabaseClient();
  const { error } = await SB.from('inmuebles').update({
    estado,
    fecha_estado: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  // ── History ──
  await SB.from('historial').insert({
    inmueble_id: id,
    usuario_id: user.id,
    accion: 'cambio_estado',
    campo: 'estado',
    valor_nuevo: estado,
  });

  // ── Notifications (EXACT original logic) ──
  if (estado === 'Verificar Disponibilidad') {
    await noti('verificar', 'rojo',
      '🔍 ' + user.nombre + ' solicita verificar: ' + desc,
      user.nombre + ' necesita saber si tu ' + desc + ' sigue disponible. Responde lo antes posible.',
      capEmail, null, id, user.id);
    await noti('verificar', 'rojo',
      '🔍 Verificación solicitada: ' + desc,
      user.nombre + ' → ' + capNom + ': ¿' + desc + ' sigue disponible?',
      null, 'admin', id, user.id);
  }
  else if (estado === 'Aún Disponible') {
    await noti('cambio_estado', 'verde',
      '✅ ' + capNom + ' confirmó: ' + desc + ' sigue disponible',
      capNom + ' verificó que su ' + desc + ' está disponible.',
      null, 'all', id, user.id);
  }
  else if (estado === 'Retirado' && p?.estado === 'Verificar Disponibilidad') {
    await noti('cambio_estado', 'rojo',
      '❌ ' + capNom + ' reportó: ' + desc + ' ya no disponible',
      capNom + ' indicó que su ' + desc + ' fue retirado.',
      null, 'all', id, user.id);
  }
  else if (FINAL_STATES.includes(estado)) {
    const ico = estado === 'Arrendado' ? '🔑' : estado === 'Vendido' ? '💰' : '⛔';
    await noti('cambio_estado', 'verde',
      ico + ' Cierre: ' + desc + ' → ' + estado,
      user.nombre + ' movió ' + desc + ' a ' + estado + '.',
      null, 'all', id, user.id);
    await noti('cambio_estado', 'verde',
      ico + ' CIERRE por ' + user.nombre + ': ' + desc,
      user.nombre + ' cerró ' + desc + ' como ' + estado + '. Captador: ' + capNom,
      null, 'admin', id, user.id);
  }
  else {
    await noti('cambio_estado', 'info',
      '🔄 ' + desc + ' → ' + estado,
      user.nombre + ' movió ' + desc + ' a ' + estado + '.',
      null, 'all', id, user.id);
  }

  if (error) {
    toast('❌ Error — revirtiendo', 'terr');
  }

  _reload();
  return !error;
}

// ─── reVal ───────────────────────────────────────────────────────
// Reset freshness timer. EXACT original logic.

/**
 * Reset the freshness timer for a property.
 * Updates fecha_estado and ultima_confirmacion to now.
 *
 * @param {string} id - Property UUID
 * @returns {Promise<boolean>}
 */
export async function reVal(id) {
  const SB = getSupabaseClient();
  const { error } = await SB.from('inmuebles').update({
    fecha_estado: new Date().toISOString(),
    ultima_confirmacion: new Date().toISOString(),
  }).eq('id', id);

  if (!error) {
    toast('✅ Timer reiniciado');
    _reload();
    return true;
  }
  toast('Error', 'terr');
  return false;
}

// ─── responderSol ────────────────────────────────────────────────
// Respond to a solicitud (availability request from another asesor).

/**
 * @param {string} solId - Solicitud UUID
 * @param {'si'|'no'} respuesta
 */
export async function responderSol(solId, respuesta) {
  const SB = getSupabaseClient();
  const user = _getUser();
  if (!user) return;

  const estados = { si: 'confirmado', no: 'no_disponible' };

  const { data: sol } = await SB.from('solicitudes')
    .select('*,solicitante:usuarios!solicitante_id(nombre,usuario,email)')
    .eq('id', solId).single();
  if (!sol) return;

  const p = inventory.getById(sol.inmueble_id);
  const desc = _descInm(p);
  const solNom = sol.solicitante?.nombre || '?';
  const solEmail = sol.solicitante?.usuario || sol.solicitante?.email || '';

  const nota = respuesta === 'si'
    ? prompt('Nota de respuesta (opcional):', 'Sí, disponible para visita')
    : prompt('Nota de respuesta (opcional):', 'Ya no está disponible');

  await SB.from('solicitudes').update({
    estado: estados[respuesta],
    nota_respuesta: nota || '',
    respondido_at: new Date().toISOString(),
  }).eq('id', solId);

  if (respuesta === 'si') {
    await SB.from('inmuebles').update({
      estado: 'Aún Disponible',
      fecha_estado: new Date().toISOString(),
      ultima_confirmacion: new Date().toISOString(),
    }).eq('id', sol.inmueble_id);

    await noti('cambio_estado', 'verde',
      '✅ ' + user.nombre + ' confirmó: ' + desc + ' disponible',
      user.nombre + ' confirmó a ' + solNom + ' que ' + desc + ' sigue disponible.' + (nota ? ' "' + nota + '"' : ''),
      solEmail, null, sol.inmueble_id, user.id);
    await noti('cambio_estado', 'verde',
      '✅ Confirmado: ' + desc,
      user.nombre + ' → ' + solNom + ': disponible.' + (nota ? ' "' + nota + '"' : ''),
      null, 'admin', sol.inmueble_id, user.id);
  } else {
    await noti('cambio_estado', 'rojo',
      '❌ ' + user.nombre + ': ' + desc + ' no disponible',
      user.nombre + ' indicó a ' + solNom + ' que ' + desc + ' ya no está disponible.' + (nota ? ' "' + nota + '"' : ''),
      solEmail, null, sol.inmueble_id, user.id);
    await noti('cambio_estado', 'rojo',
      '❌ No disponible: ' + desc,
      user.nombre + ' → ' + solNom + ': no disponible.' + (nota ? ' "' + nota + '"' : ''),
      null, 'admin', sol.inmueble_id, user.id);
  }

  toast(respuesta === 'si' ? '✅ Confirmado disponible' : '❌ Reportado no disponible');
  _reload();
}

// ─── dStart (drag start) ─────────────────────────────────────────

/**
 * Handle drag start. Sets dataTransfer and visual state.
 */
export function dStart(event, id) {
  event.dataTransfer.setData('text/plain', id);
  event.dataTransfer.effectAllowed = 'move';
  const card = document.getElementById('pkc-' + id);
  if (card) card.classList.add('dragging');
  pipeline.setDragging(id);
}

// ─── Backward compat ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.quickMove = quickMove;
  window.reVal = reVal;
  window.dStart = dStart;
  window.responderSol = responderSol;
}

export default { quickMove, reVal, responderSol, dStart };
