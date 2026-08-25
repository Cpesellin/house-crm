/**
 * HOUSE CRM — Registration Service
 *
 * Handles property submission (replaces fNx step 5 logic).
 * Inserts inmueble, saves photos, generates notifications.
 */

import { getSupabaseClient } from '../../config/supabase.js';
import { registration } from './registrationStore.js';
import { inventory, formatMoney } from '../inventory/inventoryStore.js';
import { noti } from '../../core/notifications.js';

function _getUser() {
  return typeof window !== 'undefined' && window.userStore ? window.userStore.get() : null;
}

function _getUsers() {
  return typeof window !== 'undefined' ? (window.USERS || []) : [];
}

/**
 * Submit the property from the wizard.
 * Identical logic to original fNx() step 5.
 *
 * @returns {Promise<{success:boolean, propertyId?:string, houseCode?:string, error?:string}>}
 */
export async function submitProperty() {
  const user = _getUser();
  if (!user) return { success: false, error: 'No user session' };

  const SB = getSupabaseClient();
  const fd = registration.getFormData();

  registration.setStatus('submitting');
  registration.updateField('_saveMemory', true); // triggers memory save in reset

  const payload = registration.buildPayload(user.id);

  // ── 1. Lo único crítico: crear el inmueble ────────────────────────
  // Va en su propio try. Antes, este insert compartía bloque con las
  // notificaciones y la recarga de inventario, así que un fallo POSTERIOR
  // devolvía success:false pese a que el inmueble ya existía. El usuario
  // reintentaba y quedaba duplicado — así nacieron HOUSE-245 y HOUSE-246.
  let newInm;
  try {
    const { data, error } = await SB
      .from('inmuebles')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    newInm = data;
  } catch (e) {
    const msg = e?.message || 'Error registrando inmueble';
    registration.setStatus('error', msg);
    return { success: false, error: msg };
  }

  // ── 2. Desde aquí el inmueble YA EXISTE ───────────────────────────
  // Nada de lo que sigue puede convertir la operación en un fracaso:
  // se reporta lo que falle, pero el resultado es éxito igual.
  const avisos = [];

  try {
    const fotos = registration.getPendingFotos();
    if (fotos.length > 0) {
      const filas = fotos.map((f, i) => ({
        inmueble_id: newInm.id,
        url: f.url,
        url_thumb: f.thumb,
        origen: 'cloudinary',
        tipo: f.tipo || 'imagen',
        orden: i,
      }));
      const { error } = await SB.from('fotos').insert(filas);
      if (error) throw error;
    }
  } catch (e) {
    console.error('[registro] fotos:', e);
    avisos.push('El inmueble quedó creado, pero las fotos no se guardaron. Agrégalas desde su ficha.');
  }

  try {
    // Generate notifications (EXACT original logic)
    const desc = (fd.tipo || 'Inmueble') + ' en ' + (fd.ciudad || '?');
    const precio = fd.precioVenta
      ? formatMoney(+fd.precioVenta)
      : fd.precioArriendo
        ? formatMoney(+fd.precioArriendo) + '/mes'
        : 'Sin precio';

    await noti('inmueble_nuevo', 'info',
      '🆕 ' + user.nombre + ' registró: ' + desc,
      user.nombre + ' registró nuevo ' + desc + '. ' + precio,
      null, 'all', newInm.id, user.id);

    await noti('inmueble_nuevo', 'info',
      '📋 Nuevo inmueble: ' + desc + ' — Revisar',
      user.nombre + ' registró ' + desc + '. ' + precio + '. Pendiente subir a portales.',
      null, 'admin', newInm.id, user.id);

    // Notify gestor de arriendos if applicable
    const neg = fd.negociacion;
    if (neg === 'ARRIENDO' || neg === 'AMBAS') {
      const gestor = _getUsers().find(u => u.es_gestor_arriendos && u.id !== user.id);
      if (gestor) {
        await noti('inmueble_nuevo', 'info',
          '🔑 Nuevo arriendo: ' + desc,
          user.nombre + ' registró ' + desc + ' en arriendo. ' + precio,
          gestor.usuario, null, newInm.id, user.id);
      }
    }

  } catch (e) {
    console.error('[registro] notificaciones:', e);
    avisos.push('El inmueble quedó creado, pero no se pudo avisar al equipo.');
  }

  // ── 3. Cerrar el wizard ───────────────────────────────────────────
  // Fuera de todo try anterior: pase lo que pase arriba, el botón tiene
  // que salir de "Enviando…" y el formulario limpiarse.
  registration.setStatus('success');
  registration.reset();

  try {
    if (typeof window !== 'undefined' && window.load) await window.load();
  } catch (e) {
    console.error('[registro] recarga de inventario:', e);
  }

  return {
    success: true,
    propertyId: newInm.id,
    houseCode: newInm.codigo_house,
    avisos,
  };
}

// Backward compat
if (typeof window !== 'undefined') {
  window.submitProperty = submitProperty;
}

export default { submitProperty };
