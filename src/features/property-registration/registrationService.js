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

  try {
    const { data: newInm, error } = await SB
      .from('inmuebles')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Save pending photos
    const fotos = registration.getPendingFotos();
    if (fotos.length > 0 && newInm) {
      for (let i = 0; i < fotos.length; i++) {
        await SB.from('fotos').insert({
          inmueble_id: newInm.id,
          url: fotos[i].url,
          url_thumb: fotos[i].thumb,
          origen: 'cloudinary',
          tipo: fotos[i].tipo || 'imagen',
          orden: i,
        });
      }
    }

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

    registration.setStatus('success');
    registration.reset();

    // Reload inventory
    if (typeof window !== 'undefined' && window.load) window.load();

    return { success: true, propertyId: newInm.id, houseCode: newInm.codigo_house };

  } catch (e) {
    const msg = e?.message || 'Error registrando inmueble';
    registration.setStatus('error', msg);
    return { success: false, error: msg };
  }
}

// Backward compat
if (typeof window !== 'undefined') {
  window.submitProperty = submitProperty;
}

export default { submitProperty };
