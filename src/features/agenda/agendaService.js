// agendaService.js - API calls for the agenda table
// Handles CRUD operations against Supabase 'agenda' table

import { getSupabaseClient } from '../../config/supabase.js';
import { agenda } from './agendaStore.js';
import { escapeHtml } from '../../utils/sanitizer.js';
import { confirm } from '../../utils/notifications.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function _toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function _toast(msg) {
  if (window.toast) window.toast(msg);
  else if (window.showToast) window.showToast(msg);
  else console.log('[agendaService]', msg);
}

// ---------------------------------------------------------------------------
// fetchAgenda
// ---------------------------------------------------------------------------
async function fetchAgenda() {
  const SB = getSupabaseClient();
  const user = window.userStore?.getUser?.() ?? window.currentUser;
  if (!user) return { data: null, error: 'No user' };

  const isAdmin = user.rol === 'admin' || user.rol === 'oficina';

  const weekStartISO = _toISO(agenda.getWeekStart());
  const weekEndISO = _toISO(agenda.getWeekEnd());

  agenda.setLoading(true);

  let query = SB
    .from('agenda')
    .select('*,inmueble:inmuebles(id,tipo,ciudad,direccion,precio_arriendo,captador:usuarios!captador_id(nombre))')
    .gte('fecha', weekStartISO)
    .lte('fecha', weekEndISO)
    .order('hora_inicio');

  if (!isAdmin) {
    query = query.eq('usuario_id', user.id);
  }

  const { data, error } = await query;

  agenda.setEvents(data || []);
  agenda.setLoading(false);

  if (error) console.error('[agendaService] fetchAgenda error', error);

  return { data, error };
}

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------
async function createEvent(eventData) {
  const SB = getSupabaseClient();
  const user = window.userStore?.getUser?.() ?? window.currentUser;
  if (!user) return { success: false, error: 'No user' };

  const payload = {
    usuario_id: user.id,
    tipo_evento: eventData.tipo_evento,
    inmueble_id: eventData.inmueble_id || null,
    fecha: eventData.fecha,
    hora_inicio: eventData.hora_inicio,
    hora_fin: eventData.hora_fin,
    es_personal: eventData.es_personal || false,
    titulo: eventData.titulo,
    cliente_nombre: eventData.cliente_nombre || null,
    cliente_telefono: eventData.cliente_telefono || null,
    nota: eventData.nota || null,
    estado: 'pendiente'
  };

  const { data, error } = await SB.from('agenda').insert(payload).select();

  if (error) {
    console.error('[agendaService] createEvent error', error);
    return { success: false, error: error.message };
  }

  _toast('\uD83D\uDCC5 Evento agendado');
  await fetchAgenda();
  return { success: true };
}

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------
async function deleteEvent(id) {
  const confirmed = await confirm(
    '\uD83D\uDDD1\uFE0F',
    '\u00BFCancelar evento?',
    'Se eliminar\u00e1 de tu agenda.'
  );

  if (!confirmed) return { success: false };

  const SB = getSupabaseClient();
  const { error } = await SB.from('agenda').delete().eq('id', id);

  if (error) {
    console.error('[agendaService] deleteEvent error', error);
    return { success: false, error: error.message };
  }

  _toast('\u2705 Evento cancelado');
  await fetchAgenda();
  return { success: true };
}

// ---------------------------------------------------------------------------
// openEventModal
// ---------------------------------------------------------------------------
function openEventModal(inmuebleId, fecha, hora) {
  if (window.EventModal && typeof window.EventModal.open === 'function') {
    window.EventModal.open({ inmuebleId, fecha, hora });
  } else if (typeof window.abrirAgendarEvtLegacy === 'function') {
    window.abrirAgendarEvtLegacy(inmuebleId, fecha, hora);
  } else {
    console.warn('[agendaService] No EventModal or legacy handler available');
  }
}

// ---------------------------------------------------------------------------
// Backward compatibility
// ---------------------------------------------------------------------------

// guardarEvt - reads DOM values from legacy modal and calls createEvent
window.guardarEvt = async function () {
  const modal = document.getElementById('agModal');
  if (!modal) return;

  const val = (id) => {
    const el = modal.querySelector(`#${id}`) || document.getElementById(id);
    return el ? el.value?.trim() : '';
  };

  const eventData = {
    tipo_evento: val('agTipo') || 'otro',
    inmueble_id: val('agInmuebleId') || null,
    fecha: val('agFecha'),
    hora_inicio: val('agHoraInicio'),
    hora_fin: val('agHoraFin'),
    es_personal: !!modal.querySelector('#agPersonal')?.checked,
    titulo: val('agTitulo'),
    cliente_nombre: val('agClienteNombre'),
    cliente_telefono: val('agClienteTel'),
    nota: val('agNota')
  };

  const result = await createEvent(eventData);

  if (result.success && modal.close) {
    modal.close();
  } else if (result.success) {
    modal.style.display = 'none';
  }
};

window.cancelarEvt = deleteEvent;
window.abrirAgendarEvt = openEventModal;

window.rAgenda = async function () {
  await fetchAgenda();
  if (window.AgendaView && typeof window.AgendaView.render === 'function') {
    window.AgendaView.render();
  }
};

export { fetchAgenda, createEvent, deleteEvent, openEventModal };
