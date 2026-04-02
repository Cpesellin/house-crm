/**
 * HOUSE CRM — Notifications Service
 *
 * Extracted from the global noti() function.
 * Inserts alerts into the 'alertas' table.
 */

import { getSupabaseClient } from '../config/supabase.js';

/**
 * Create a notification/alert in the database.
 * Identical logic to the original noti() function.
 *
 * @param {string} tipo - Alert type: verificar, cambio_estado, cambio_precio, inmueble_nuevo, portal_listo, actualizar_portal
 * @param {string} nivel - Severity: rojo, amarillo, verde, info
 * @param {string} titulo - Short title
 * @param {string} mensaje - Detailed message
 * @param {string|null} paraEmail - Target user email/username (null = no specific user)
 * @param {string|null} paraRol - Target role: 'admin', 'all', or null
 * @param {string|null} inmId - Related property UUID
 * @param {string} fromUserId - Who is sending (current user ID)
 */
export async function noti(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId, fromUserId) {
  const SB = getSupabaseClient();
  try {
    await SB.from('alertas').insert({
      tipo,
      nivel,
      titulo,
      mensaje,
      para_email: paraEmail || null,
      para_rol: paraRol || null,
      inmueble_id: inmId || null,
      de_usuario: fromUserId,
    });
  } catch (e) {
    console.error('[notifications] Error inserting alert:', e);
  }
}

/**
 * Convenience: create notification using current user from userStore.
 * This is the most common usage — avoids passing fromUserId every time.
 */
export async function notify(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId) {
  const userId = typeof window !== 'undefined' && window.userStore
    ? window.userStore.get()?.id
    : null;
  if (!userId) {
    console.warn('[notifications] No current user, skipping notification');
    return;
  }
  return noti(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId, userId);
}

/**
 * Toast helper (UI feedback). Uses the existing toast() on window.
 */
export function toast(msg, type = 'tok') {
  if (typeof window !== 'undefined' && window.toast) {
    window.toast(msg, type);
  }
}

/**
 * Confirm dialog helper. Uses the existing cfShow() on window.
 */
export function confirm(icon, title, msg) {
  if (typeof window !== 'undefined' && window.cfShow) {
    return window.cfShow(icon, title, msg);
  }
  return Promise.resolve(window.confirm(title + '\n' + msg));
}

// Backward compat
if (typeof window !== 'undefined') {
  const _origNoti = window.noti;
  window.noti = async function(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId) {
    const userId = window.userStore?.get()?.id || window.U?.id;
    return noti(tipo, nivel, titulo, mensaje, paraEmail, paraRol, inmId, userId);
  };
}

export default { noti, notify, toast, confirm };
